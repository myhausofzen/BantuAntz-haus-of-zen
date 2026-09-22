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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const creds = getSquareCredentials();
  if (!creds.token) {
    return res.status(401).json({
      success: false,
      error: 'SQUARE_ACCESS_TOKEN is missing in environment variables.',
      environment: creds.env
    });
  }

  try {
    const { sourceId, amountCents, customerEmail, customerName, note } = req.body || {};

    if (creds.isProduction && (!sourceId || sourceId.startsWith('cnon:card-nonce-'))) {
      return res.status(400).json({
        success: false,
        code: 'CARD_NONCE_REQUIRED',
        error: 'A valid production card payment token is required by Square. Please use Square Web Payments SDK or Square Hosted Checkout.',
        requiresHostedCheckout: true
      });
    }

    const idempotencyKey = `hz_pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const squareRes = await fetch(`${creds.baseUrl}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${creds.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        source_id: sourceId || 'cnon:card-nonce-ok',
        amount_money: {
          amount: Math.round(Number(amountCents) || 100),
          currency: 'USD'
        },
        location_id: creds.locationId,
        buyer_email_address: customerEmail,
        note: note || `Haus of Zen Apothecary - ${customerName || 'Customer'}`,
        statement_description_identifier: 'HAUS OF ZEN'
      })
    });

    const data = await squareRes.json();
    if (!squareRes.ok) {
      const firstError = data.errors?.[0];
      return res.status(squareRes.status).json({
        success: false,
        squareStatus: squareRes.status,
        code: firstError?.code || 'SQUARE_PAYMENT_ERROR',
        detail: firstError?.detail || 'Square payment failed',
        category: firstError?.category,
        rawErrors: data.errors,
        environment: creds.env,
        isFailedOk: true
      });
    }

    return res.status(200).json({
      success: true,
      payment: data.payment,
      paymentId: data.payment?.id,
      orderId: data.payment?.order_id,
      receiptUrl: data.payment?.receipt_url,
      status: data.payment?.status,
      environment: creds.env
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to process payment with Square'
    });
  }
}
