import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import { INITIAL_PRODUCTS } from './services/productData';
import { getSquareLiveCatalog, invalidateCatalogCache } from './services/squareCatalogSync';

const PORT = 3000;

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getSquareCredentials() {
  const token = process.env.SQUARE_ACCESS_TOKEN || process.env.VITE_SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.SQUARE_APPLICATION_ID || process.env.VITE_SQUARE_APP_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || process.env.VITE_SQUARE_LOCATION_ID || '';
  // Default to 'production' (live) mode per explicit requirement
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

function formatE164Phone(rawPhone?: string): string | undefined {
  if (!rawPhone) return undefined;
  const trimmed = rawPhone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return undefined;

  // If already starts with +
  if (trimmed.startsWith('+')) {
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
  }

  // 10 digits US standard (e.g. 3109250920 -> +13109250920)
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // 11 digits starting with 1
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  // International 10-15 digits
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  // If it does not strictly meet E.164, return undefined so Square does not decline with "Invalid phone number."
  return undefined;
}

async function startServer() {
  const app = express();

  app.use(express.json());

  // 1. Square API Status
  app.get('/api/square/status', async (req, res) => {
    const creds = getSquareCredentials();
    res.json({
      configured: !!creds.token,
      hasToken: !!creds.token,
      hasLocation: !!creds.locationId,
      hasAppId: !!creds.appId,
      environment: creds.env,
      isProduction: creds.isProduction,
      baseUrl: creds.baseUrl,
      locationId: creds.locationId,
      appId: creds.appId,
      maskedLocationId: creds.locationId ? `${creds.locationId.substring(0, 4)}••••` : '',
      maskedAppId: creds.appId ? `${creds.appId.substring(0, 6)}••••` : ''
    });
  });

  // 2. Fetch Square Locations
  app.get('/api/square/locations', async (req, res) => {
    const creds = getSquareCredentials();
    if (!creds.token) {
      return res.status(401).json({
        success: false,
        error: 'SQUARE_ACCESS_TOKEN is missing in environment variables. Configure SQUARE_ACCESS_TOKEN in Settings.'
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

      res.json({
        success: true,
        locations: data.locations || [],
        environment: creds.env
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Error communicating with Square API'
      });
    }
  });

  // Live Square Catalog endpoint
  app.get('/api/square/catalog', async (req, res) => {
    const forceRefresh = req.query.forceRefresh === 'true';
    const result = await getSquareLiveCatalog(forceRefresh);
    res.json({
      success: true,
      count: result.count,
      products: result.products,
      lastSynced: result.lastSynced,
      source: result.source
    });
  });

  // Force Refresh Square Catalog
  app.post('/api/square/catalog/refresh', async (req, res) => {
    const result = await getSquareLiveCatalog(true);
    res.json({
      success: true,
      count: result.count,
      products: result.products,
      lastSynced: result.lastSynced,
      source: result.source,
      message: 'Square Catalog freshly re-synchronized'
    });
  });

  // Two-Way Sync: Update an Item or Price directly in Square from the app
  app.post('/api/square/catalog/update-item', async (req, res) => {
    const creds = getSquareCredentials();
    if (!creds.token) {
      return res.status(401).json({ success: false, error: 'Square Access Token not configured.' });
    }

    const { itemId, variationId, name, price, description } = req.body || {};
    if (!itemId) {
      return res.status(400).json({ success: false, error: 'itemId is required' });
    }

    try {
      // 1. Fetch current object to acquire latest version
      const getRes = await fetch(`${creds.baseUrl}/v2/catalog/object/${itemId}`, {
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${creds.token}`
        }
      });
      const currentData = await getRes.json();
      if (!getRes.ok || !currentData.object) {
        return res.status(getRes.status).json({
          success: false,
          error: currentData.errors?.[0]?.detail || 'Could not locate item in Square catalog'
        });
      }

      const currentObj = currentData.object;
      if (name) currentObj.item_data.name = name;
      if (description !== undefined) currentObj.item_data.description = description;

      if (price !== undefined && currentObj.item_data?.variations) {
        const targetVar = variationId
          ? currentObj.item_data.variations.find((v: any) => v.id === variationId)
          : currentObj.item_data.variations[0];
        if (targetVar && targetVar.item_variation_data) {
          targetVar.item_variation_data.price_money = {
            amount: Math.round(Number(price) * 100),
            currency: 'USD'
          };
        }
      }

      // 2. Upsert back to Square
      const idempotencyKey = `hz_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const upsertRes = await fetch(`${creds.baseUrl}/v2/catalog/object`, {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          object: currentObj
        })
      });

      const upsertData = await upsertRes.json();
      if (!upsertRes.ok) {
        return res.status(upsertRes.status).json({
          success: false,
          error: upsertData.errors?.[0]?.detail || 'Failed to update item in Square'
        });
      }

      // Invalidate cache immediately so updates reflect instantly
      invalidateCatalogCache();

      res.json({
        success: true,
        message: 'Product successfully updated in Square and synced to live website',
        catalogObject: upsertData.catalog_object
      });
    } catch (err: any) {
      console.error('Error updating Square catalog item:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Square Webhook Listener for real-time catalog & inventory push events
  app.post('/api/square/webhook', (req, res) => {
    const event = req.body || {};
    const type = event?.type;
    console.log('Received Square Webhook notification:', type);
    if (type === 'catalog.version.updated' || type === 'inventory.count.updated') {
      console.log('Invalidating Square catalog cache due to webhook push:', type);
      invalidateCatalogCache();
    }
    res.json({ success: true, received: true });
  });

  // 3. Create Square Live Payment Link (Hosted Square Checkout)
  app.post('/api/square/create-payment-link', async (req, res) => {
    const creds = getSquareCredentials();
    if (!creds.token) {
      return res.status(401).json({
        success: false,
        error: 'Square Access Token not configured. Please set SQUARE_ACCESS_TOKEN in your environment.',
        environment: creds.env
      });
    }

    try {
      const { items, customerEmail, customerName, customerPhone, redirectUrl, note } = req.body;
      
      const lineItems = Array.isArray(items) && items.length > 0 ? items.map((item: any) => {
        const lineItem: any = {
          name: item.name || 'Haus of Zen Botanical Formulation',
          quantity: String(item.quantity || 1),
          base_price_money: {
            amount: Math.round(Number(item.price || 0) * 100),
            currency: 'USD'
          }
        };
        if (item.squareVariationId) {
          lineItem.catalog_object_id = item.squareVariationId;
        }
        return lineItem;
      }) : [{
        name: 'Haus of Zen Apothecary Order',
        quantity: '1',
        base_price_money: {
          amount: 4999,
          currency: 'USD'
        }
      }];

      const isTeaTimeTest = Array.isArray(items) && items.some((item: any) => 
        (item.name || '').toLowerCase().includes('tea time') || 
        (item.productId || '').toLowerCase().includes('tea time') ||
        item.productId === 'TFAII2LGXG7XLHZHNPG6O75Y'
      );

      const idempotencyKey = `hz_link_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const payload: any = {
        idempotency_key: idempotencyKey,
        order: {
          location_id: creds.locationId,
          line_items: lineItems
        },
        checkout_options: {
          redirect_url: redirectUrl || 'https://www.myhausofzen.com',
          ask_for_shipping_address: !isTeaTimeTest,
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

      res.json({
        success: true,
        paymentLinkUrl: data.payment_link?.url,
        orderId: data.payment_link?.order_id,
        paymentLinkId: data.payment_link?.id,
        environment: creds.env,
        message: 'Live Square payment link created successfully'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to create Square payment link'
      });
    }
  });

  // Square Backend Notification Helper: Sends transaction record (approved or failed) to Square
  async function notifySquareTransaction(creds: any, details: {
    transactionType: 'product_order' | 'appointment_deposit' | 'test_charge';
    status: 'ACCEPTED' | 'FAILED_DECLINED';
    referenceId: string;
    amountCents: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    items?: { name: string; quantity: number | string; price?: number }[];
    errorCode?: string;
    errorDetail?: string;
    paymentId?: string;
  }) {
    if (!creds.token || !creds.locationId) return null;

    try {
      const lineItems = (details.items && details.items.length > 0)
        ? details.items.map((i: any) => ({
            name: details.status === 'FAILED_DECLINED' ? `[DECLINED] ${i.name}` : i.name,
            quantity: String(i.quantity || 1),
            base_price_money: {
              amount: Math.round(Number(i.price ? i.price * 100 : details.amountCents)),
              currency: 'USD'
            }
          }))
        : [{
            name: details.status === 'FAILED_DECLINED'
              ? `[FAILED TRANSACTION] ${details.transactionType === 'appointment_deposit' ? 'Consultation Deposit' : 'Botanical Order'}`
              : (details.transactionType === 'appointment_deposit' ? 'Consultation Deposit' : 'Botanical Order'),
            quantity: '1',
            base_price_money: {
              amount: Math.max(Math.round(details.amountCents || 100), 100),
              currency: 'USD'
            }
          }];

      const idempotencyKey = `hz_notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const metadata: Record<string, string> = {
        app: 'HausOfZen',
        type: details.transactionType,
        status: details.status,
        timestamp: new Date().toISOString(),
        ...(details.customerName ? { customer_name: details.customerName.substring(0, 50) } : {}),
        ...(details.customerEmail ? { customer_email: details.customerEmail.substring(0, 50) } : {}),
        ...(details.customerPhone ? { customer_phone: details.customerPhone.substring(0, 20) } : {}),
        ...(details.paymentId ? { payment_id: details.paymentId } : {}),
        ...(details.errorCode ? { error_code: details.errorCode.substring(0, 50) } : {}),
        ...(details.errorDetail ? { error_detail: details.errorDetail.substring(0, 100) } : {})
      };

      const orderRes = await fetch(`${creds.baseUrl}/v2/orders`, {
        method: 'POST',
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${creds.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          order: {
            location_id: creds.locationId,
            reference_id: details.referenceId,
            line_items: lineItems,
            state: 'DRAFT',
            metadata
          }
        })
      });

      const data = await orderRes.json();
      // Record transaction notification audit to Square orders
      if (details.status === 'ACCEPTED') {
        console.log(`[Square Order Log] Recorded ACCEPTED order (${details.referenceId}) in Square: ${data.order?.id}`);
      } else {
        console.info(`[Square Order Log] Recorded DECLINED transaction (${details.referenceId}) in Square audit trail: ${data.order?.id}`);
      }
      return data.order;
    } catch (err) {
      console.error('[Square Notification Error] Failed to record transaction to Square:', err);
      return null;
    }
  }

  // 4. Square Direct Payments API (Charge Card / Nonce)
  app.post('/api/square/pay', async (req, res) => {
    const creds = getSquareCredentials();
    if (!creds.token) {
      return res.status(401).json({
        success: false,
        error: 'SQUARE_ACCESS_TOKEN is missing. Provide an Access Token in environment variables.',
        environment: creds.env
      });
    }

    const { sourceId, amountCents, customerEmail, customerName, customerPhone, note, referenceId, items, transactionType } = req.body;
    const refId = referenceId || `HZ-PAY-${Date.now()}`;
    const cents = Math.round(Number(amountCents) || 100);

    if (creds.isProduction && (!sourceId || sourceId.startsWith('cnon:card-nonce-'))) {
      return res.status(400).json({
        success: false,
        code: 'CARD_NONCE_REQUIRED',
        error: 'A valid production card payment token is required by Square. Please use Square Web Payments SDK or Square Hosted Checkout.',
        requiresHostedCheckout: true
      });
    }

    try {
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
            amount: cents,
            currency: 'USD'
          },
          location_id: creds.locationId,
          buyer_email_address: customerEmail,
          note: note || `Haus of Zen Apothecary - ${customerName || 'Customer'}`,
          reference_id: refId,
          statement_description_identifier: 'HAUS OF ZEN'
        })
      });

      const data = await squareRes.json();
      if (!squareRes.ok) {
        // Real Square decline / error response
        const firstError = data.errors?.[0];
        const errorDetail = firstError?.detail || 'Square payment failed';
        const errorCode = firstError?.code || 'SQUARE_PAYMENT_ERROR';

        // Notify Square of FAILED / DECLINED transaction
        await notifySquareTransaction(creds, {
          transactionType: transactionType || 'product_order',
          status: 'FAILED_DECLINED',
          referenceId: refId,
          amountCents: cents,
          customerName,
          customerEmail,
          customerPhone,
          items,
          errorCode,
          errorDetail
        });

        return res.status(squareRes.status).json({
          success: false,
          squareStatus: squareRes.status,
          code: errorCode,
          detail: errorDetail,
          category: firstError?.category,
          rawErrors: data.errors,
          environment: creds.env,
          isFailedOk: true
        });
      }

      // Successful payment on Square!
      const paymentStatus = data.payment?.status;
      const isAccepted = paymentStatus === 'COMPLETED' || paymentStatus === 'APPROVED';

      // Notify Square of ACCEPTED transaction
      await notifySquareTransaction(creds, {
        transactionType: transactionType || 'product_order',
        status: isAccepted ? 'ACCEPTED' : 'FAILED_DECLINED',
        referenceId: refId,
        amountCents: cents,
        customerName,
        customerEmail,
        customerPhone,
        items,
        paymentId: data.payment?.id
      });

      res.json({
        success: isAccepted,
        payment: data.payment,
        paymentId: data.payment?.id,
        orderId: data.payment?.order_id || refId,
        receiptUrl: data.payment?.receipt_url,
        status: paymentStatus,
        environment: creds.env
      });
    } catch (err: any) {
      // Notify Square of network / unexpected error
      await notifySquareTransaction(creds, {
        transactionType: transactionType || 'product_order',
        status: 'FAILED_DECLINED',
        referenceId: refId,
        amountCents: cents,
        customerName,
        customerEmail,
        customerPhone,
        items,
        errorCode: 'SERVER_EXCEPTION',
        errorDetail: err.message
      });

      res.status(500).json({
        success: false,
        error: err.message || 'Failed to process payment with Square'
      });
    }
  });

  // 4b. Notify Square of Transaction (e.g. front-end failed attempts or appointment cancellations)
  app.post('/api/square/notify-transaction', async (req, res) => {
    const creds = getSquareCredentials();
    const { transactionType, status, referenceId, amountCents, customerName, customerEmail, customerPhone, items, errorCode, errorDetail } = req.body;
    
    const squareOrder = await notifySquareTransaction(creds, {
      transactionType: transactionType || 'product_order',
      status: status || 'FAILED_DECLINED',
      referenceId: referenceId || `HZ-NOTIF-${Date.now()}`,
      amountCents: Number(amountCents) || 100,
      customerName,
      customerEmail,
      customerPhone,
      items,
      errorCode,
      errorDetail
    });

    res.json({ success: !!squareOrder, squareOrderId: squareOrder?.id });
  });

  // 4c. Verify Order Payment Status on Square
  app.get('/api/square/order-status/:orderId', async (req, res) => {
    const creds = getSquareCredentials();
    const { orderId } = req.params;

    if (!creds.token) {
      return res.status(401).json({ success: false, error: 'Square Access Token not configured' });
    }

    try {
      const squareRes = await fetch(`${creds.baseUrl}/v2/orders/${orderId}`, {
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${creds.token}`
        }
      });

      const data = await squareRes.json();
      if (!squareRes.ok) {
        return res.status(squareRes.status).json({
          success: false,
          error: data.errors?.[0]?.detail || 'Order not found on Square'
        });
      }

      const order = data.order;
      const tenders = order?.tenders || [];
      const hasCompletedTender = tenders.some((t: any) => (t.type || t.card_details || t.cash_details));
      const isPaid = order?.state === 'COMPLETED' || hasCompletedTender;

      res.json({
        success: true,
        orderId: order?.id,
        state: order?.state,
        isPaid,
        totalMoney: order?.total_money,
        tendersCount: tenders.length,
        createdAt: order?.created_at
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error checking order status' });
    }
  });

  // 5. Test Payment Endpoint (Strictly calls Square Live API & returns raw outcome)
  app.post('/api/square/test-payment', async (req, res) => {
    const creds = getSquareCredentials();
    const testAmountCents = Number(req.body.amountCents) || 100; // $1.00 test charge
    const cardNonce = req.body.sourceId || 'cnon:card-nonce-ok';

    if (!creds.token) {
      return res.status(200).json({
        success: false,
        endpoint: `${creds.baseUrl}/v2/payments`,
        environment: creds.env,
        testedAt: new Date().toISOString(),
        stage: 'CREDENTIALS_CHECK',
        message: 'Square Access Token is not yet configured in environment variables.',
        instructions: 'Please set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in your environment variables via Settings.',
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

      res.json({
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
      res.status(200).json({
        success: false,
        errorDetail: err.message || 'Network error reaching Square',
        endpoint: `${creds.baseUrl}/v2/payments`,
        environment: creds.env,
        isFailedOk: true,
        testedAt: new Date().toISOString()
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Gemini AI Prescription Endpoint
  let genAiClient: any = null;
  app.post('/api/prescription', async (req, res) => {
    try {
      const feeling = req.body?.feeling || 'contemplative';
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          prescription: 'We prescribe three moments of stillness under the open sky, and warm botanical tea to anchor the spirit.'
        });
      }

      if (!genAiClient) {
        const { GoogleGenAI } = await import('@google/genai');
        genAiClient = new GoogleGenAI({ apiKey });
      }

      const response = await genAiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are the curator of "Haus of Zen", a modern apothecary that believes health is a narrative. 
The user is feeling: "${feeling}".

Generate a short, poetic, and abstract "prescription" (max 2 sentences). 
Focus on metaphors of nature, tea, herbs, silence, or light. 
Do not give medical advice. 
The tone should be ethereal, grounded, and healing.

Example format: "We prescribe three moments of silence at dawn and a cup of warm ginger to ignite the inner hearth."`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const prescription = response.text?.trim() || 'The silence speaks when words fail. Breathe deeply.';
      res.json({ success: true, prescription });
    } catch (err: any) {
      console.error('Prescription generation error:', err);
      res.json({
        success: true,
        prescription: 'We prescribe slow diaphragmatic breaths and a quiet space to let stillness restore clarity.'
      });
    }
  });

  // 12. Contact Form Submission via Resend
  app.post('/api/contact', async (req, res) => {
    try {
      const { name, email, message, subject } = req.body || {};

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'A valid email address is required' });
      }
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      const resend = getResendClient();
      if (!resend) {
        return res.status(503).json({
          success: false,
          error: 'Resend API key is not configured in settings. Please add RESEND_API_KEY to your environment variables to receive contact messages.'
        });
      }

      // Sanitize fromEmail: Resend rejects public webmail domains like @gmail.com as senders
      let fromEmail = (process.env.RESEND_FROM_EMAIL || '').trim();
      const isPublicWebmail = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol)\.com$/i.test(fromEmail);
      if (!fromEmail || isPublicWebmail) {
        fromEmail = 'Haus of Zen <onboarding@resend.dev>';
      }

      let toEmail = (process.env.RESEND_TO_EMAIL || 'info@myhausofzen.com').trim();
      const sanitizedName = name.trim();
      const sanitizedEmail = email.trim();
      const sanitizedMessage = message.trim();
      const emailSubject = subject || `New Sanctuary Inquiry from ${sanitizedName}`;

      const buildHtml = (deliveryNote?: string) => `
        <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; color: #1c1917;">
          <div style="background: #1c1917; color: #f5f5f4; padding: 28px 24px; text-align: center;">
            <h1 style="font-size: 26px; margin: 0; font-style: italic; letter-spacing: 0.04em;">Haus of Zen</h1>
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #d6d3d1; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Apothecary & Womb Wellness Sanctuary</p>
          </div>
          <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6;">
            <p style="color: #78716c; margin-top: 0; margin-bottom: 24px;">You have received a new message through the sanctuary contact portal:</p>
            
            <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; width: 80px; color: #a8a29e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Sender:</td>
                  <td style="padding: 6px 0; color: #1c1917; font-weight: 600;">${sanitizedName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #a8a29e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Email:</td>
                  <td style="padding: 6px 0;"><a href="mailto:${sanitizedEmail}" style="color: #d97706; text-decoration: none; font-weight: 500;">${sanitizedEmail}</a></td>
                </tr>
              </table>
              <div style="border-top: 1px solid #f5f5f4; margin: 16px 0 12px 0;"></div>
              <div style="color: #a8a29e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message:</div>
              <div style="white-space: pre-wrap; color: #292524; background: #fafaf9; border: 1px solid #f0eeec; padding: 16px; border-radius: 6px; font-family: Georgia, serif; font-size: 15px; line-height: 1.65;">${sanitizedMessage}</div>
            </div>

            <p style="font-size: 13px; color: #78716c; text-align: center; margin: 28px 0 0 0;">
              Tip: Click <em>Reply</em> in your email client to respond directly to <strong>${sanitizedEmail}</strong>.
            </p>
            ${deliveryNote ? `<div style="margin-top: 20px; padding: 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e; text-align: center;">${deliveryNote}</div>` : ''}
          </div>
        </div>
      `;

      const textContent = `Haus of Zen - New Sanctuary Inquiry\n\nFrom: ${sanitizedName} (${sanitizedEmail})\n\nMessage:\n${sanitizedMessage}\n\nReply directly to this email to respond to ${sanitizedEmail}.`;

      let result = await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        replyTo: sanitizedEmail,
        subject: emailSubject,
        html: buildHtml(),
        text: textContent
      });

      // If Resend rejected because testing emails can only go to the account owner
      if (result.error && typeof result.error.message === 'string' && result.error.message.includes('only send testing emails to your own email address')) {
        const match = result.error.message.match(/\(([^)]+@resend\.dev|[^)]+@gmail\.com|[^)]+@[^)]+)\)/i);
        const ownerEmail = match ? match[1] : 'bantuantstravelclub@gmail.com';
        console.warn(`Resend domain not yet verified. Falling back to account owner email: ${ownerEmail}`);
        
        result = await resend.emails.send({
          from: 'Haus of Zen <onboarding@resend.dev>',
          to: ownerEmail,
          replyTo: sanitizedEmail,
          subject: `${emailSubject} [Via Sanctuary Portal]`,
          html: buildHtml(`Delivered to your Resend account email (<strong>${ownerEmail}</strong>) while domain verification for <em>myhausofzen.com</em> is pending on <a href="https://resend.com/domains">resend.com/domains</a>.`),
          text: textContent
        });
      }

      if (result.error) {
        console.error('Resend delivery error:', result.error);
        return res.status(502).json({
          success: false,
          error: result.error.message || 'Failed to dispatch email via Resend'
        });
      }

      return res.json({
        success: true,
        message: 'Your message has been sent successfully.',
        id: result.data?.id
      });
    } catch (err: any) {
      console.error('Contact form submission error:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'An unexpected error occurred while processing your message.'
      });
    }
  });

  // Explicit API 404 handler: ensure any unmatched /api call returns JSON, NEVER HTML
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl || req.url}`,
      environment: getSquareCredentials().env
    });
  });

  // Vite middleware in dev, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Haus of Zen server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
