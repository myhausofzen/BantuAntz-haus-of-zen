import type { VercelRequest, VercelResponse } from '@vercel/node';

function getSquareCredentials() {
  const token = process.env.SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.SQUARE_APPLICATION_ID || process.env.VITE_SQUARE_APP_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || process.env.VITE_SQUARE_LOCATION_ID || '';
  const env = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
  const isProduction = env !== 'sandbox';
  const baseUrl = isProduction ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

  return {
    token,
    appId,
    locationId,
    env: isProduction ? 'production' : 'sandbox',
    isProduction,
    baseUrl
  };
}

function formatE164Phone(rawPhone?: string): string | undefined {
  if (!rawPhone) return undefined;
  const trimmed = rawPhone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return undefined;

  if (trimmed.startsWith('+')) {
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
  }

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const creds = getSquareCredentials();
  if (!creds.token) {
    return res.status(401).json({
      success: false,
      error: 'Square Access Token not configured in environment variables. Please set SQUARE_ACCESS_TOKEN.',
      environment: creds.env
    });
  }

  try {
    const { items, customerEmail, customerName, customerPhone, redirectUrl } = req.body || {};
    
    const lineItems = Array.isArray(items) && items.length > 0 ? items.map((item: any) => ({
      name: item.name || 'Haus of Zen Botanical Formulation',
      quantity: String(item.quantity || 1),
      base_price_money: {
        amount: Math.round(Number(item.price || 0) * 100),
        currency: 'USD'
      }
    })) : [{
      name: 'Haus of Zen Apothecary Order',
      quantity: '1',
      base_price_money: {
        amount: 4999,
        currency: 'USD'
      }
    }];

    const idempotencyKey = `hz_link_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const payload: any = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: creds.locationId,
        line_items: lineItems
      },
      checkout_options: {
        redirect_url: redirectUrl || 'https://www.myhausofzen.com?order_status=success',
        ask_for_shipping_address: true,
        accepted_payment_methods: {
          apple_pay: true,
          google_pay: true,
          cash_app_pay: true,
          afterpay_clearpay: true
        }
      }
    };

    const sanitizedPhone = formatE164Phone(customerPhone);
    if (customerEmail || customerName || sanitizedPhone) {
      payload.pre_populated_data = {
        buyer_email: customerEmail || undefined,
        buyer_phone_number: sanitizedPhone || undefined
      };
    }

    const squareRes = await fetch(`${creds.baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await squareRes.json();
    if (!squareRes.ok) {
      return res.status(squareRes.status).json({
        success: false,
        error: data.errors?.[0]?.detail || `Square API error (${squareRes.status})`,
        rawErrors: data.errors,
        environment: creds.env
      });
    }

    return res.status(200).json({
      success: true,
      paymentLinkUrl: data.payment_link?.url,
      orderId: data.payment_link?.order_id,
      paymentLinkId: data.payment_link?.id,
      environment: creds.env,
      message: 'Live Square payment link created successfully'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create Square payment link'
    });
  }
}
