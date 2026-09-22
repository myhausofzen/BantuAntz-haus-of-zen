import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSquareLiveCatalog } from '../../services/squareCatalogSync';

function getSquareCredentials() {
  const token = process.env.SQUARE_ACCESS_TOKEN || process.env.VITE_SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.SQUARE_APPLICATION_ID || process.env.VITE_SQUARE_APP_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || process.env.VITE_SQUARE_LOCATION_ID || '';
  const env = (process.env.SQUARE_ENVIRONMENT || process.env.VITE_SQUARE_ENVIRONMENT || 'production').toLowerCase();
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
  // Extract path action: /api/square/[action]
  // On Vercel, query.action or URL path can be used
  const url = req.url || '';
  const actionMatch = url.match(/\/api\/square\/([a-zA-Z0-9_-]+)/);
  const action = (req.query?.action as string) || (actionMatch ? actionMatch[1] : '');

  const creds = getSquareCredentials();

  // Route 1: Status
  if (action === 'status') {
    return res.status(200).json({
      configured: !!creds.token,
      hasToken: !!creds.token,
      hasLocation: !!creds.locationId,
      hasAppId: !!creds.appId,
      environment: creds.env,
      isProduction: creds.isProduction,
      baseUrl: creds.baseUrl,
      locationId: creds.locationId ? `${creds.locationId.substring(0, 4)}••••` : '',
      appId: creds.appId ? `${creds.appId.substring(0, 6)}••••` : ''
    });
  }

  // Route 2: Locations
  if (action === 'locations') {
    if (!creds.token) {
      return res.status(401).json({
        success: false,
        error: 'SQUARE_ACCESS_TOKEN is missing in environment variables.'
      });
    }

    try {
      const response = await fetch(`${creds.baseUrl}/v2/locations`, {
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.errors?.[0]?.detail || 'Failed to fetch Square locations',
          rawErrors: data.errors
        });
      }

      return res.status(200).json({
        success: true,
        locations: data.locations || [],
        environment: creds.env
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Error communicating with Square API'
      });
    }
  }

  // Route 3: Create Payment Link
  if (action === 'create-payment-link') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!creds.token) {
      return res.status(401).json({
        success: false,
        error: 'Square Access Token not configured in environment variables.',
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
          redirect_url: redirectUrl || 'https://www.myhausofzen.com',
          ask_for_shipping_address: true,
          accepted_payment_methods: {
            apple_pay: true,
            google_pay: true,
            cash_app_pay: true,
            afterpay_clearpay: true
          }
        }
      };

      if (customerEmail || customerName) {
        payload.pre_populated_data = {
          buyer_email: customerEmail || undefined,
          buyer_phone_number: customerPhone || undefined
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

  // Route 4: Direct Pay
  if (action === 'pay') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

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

  // Route 5: Test Payment Endpoint
  if (action === 'test-payment') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const testAmountCents = Number(req.body?.amountCents) || 100;
    const cardNonce = req.body?.sourceId || 'cnon:card-nonce-ok';

    if (!creds.token) {
      return res.status(200).json({
        success: false,
        endpoint: `${creds.baseUrl}/v2/payments`,
        environment: creds.env,
        testedAt: new Date().toISOString(),
        stage: 'CREDENTIALS_CHECK',
        message: 'Square Access Token is not yet configured in environment variables.',
        instructions: 'Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in your environment variables.',
        isFailedOk: true
      });
    }

    try {
      const idempotencyKey = `hz_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const startTime = Date.now();

      const squareRes = await fetch(`${creds.baseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          source_id: cardNonce,
          amount_money: {
            amount: testAmountCents,
            currency: 'USD'
          },
          location_id: creds.locationId || undefined,
          note: 'Haus of Zen - Live API Test Transaction',
          statement_description_identifier: 'HAUSOFZEN-TEST'
        })
      });

      const durationMs = Date.now() - startTime;
      const data = await squareRes.json();

      if (!squareRes.ok) {
        const errorItem = data.errors?.[0] || {};
        return res.status(200).json({
          success: false,
          squareHttpStatus: squareRes.status,
          errorCode: errorItem.code || 'SQUARE_DECLINE',
          errorDetail: errorItem.detail || 'Square rejected payment',
          errorCategory: errorItem.category,
          allErrors: data.errors,
          endpoint: `${creds.baseUrl}/v2/payments`,
          environment: creds.env,
          durationMs,
          testedAt: new Date().toISOString(),
          isFailedOk: true,
          message: `Square Live API responded with HTTP ${squareRes.status} (${errorItem.code || 'DECLINED'}). Verified direct connection to Square Live servers.`
        });
      }

      return res.status(200).json({
        success: true,
        squareHttpStatus: 200,
        paymentId: data.payment?.id,
        orderId: data.payment?.order_id,
        receiptUrl: data.payment?.receipt_url,
        status: data.payment?.status,
        amountMoney: data.payment?.amount_money,
        endpoint: `${creds.baseUrl}/v2/payments`,
        environment: creds.env,
        durationMs,
        testedAt: new Date().toISOString(),
        message: 'Square Live test payment was successfully approved and recorded in your Square Dashboard.'
      });
    } catch (err: any) {
      return res.status(200).json({
        success: false,
        errorDetail: err.message || 'Network error reaching Square',
        endpoint: `${creds.baseUrl}/v2/payments`,
        environment: creds.env,
        isFailedOk: true,
        testedAt: new Date().toISOString()
      });
    }
  }

  // Route 6: Catalog
  if (action === 'catalog' || action === 'catalog-refresh' || action === 'refresh') {
    const forceRefresh =
      action === 'catalog-refresh' ||
      action === 'refresh' ||
      req.query?.forceRefresh === 'true' ||
      req.method === 'POST';

    const result = await getSquareLiveCatalog(forceRefresh);
    return res.status(200).json({
      success: true,
      count: result.count,
      products: result.products,
      lastSynced: result.lastSynced,
      source: result.source
    });
  }

  return res.status(404).json({ error: 'Endpoint not found on /api/square' });
}
