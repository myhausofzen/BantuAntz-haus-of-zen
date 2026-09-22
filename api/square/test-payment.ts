import type { VercelRequest, VercelResponse } from '@vercel/node';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const creds = getSquareCredentials();
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
