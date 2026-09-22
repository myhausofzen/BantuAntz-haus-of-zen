export interface FastCheckoutPayload {
  items: { productId: string; name: string; quantity: number; price: number; volume?: string; image?: string; squareVariationId?: string }[];
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: 'card' | 'apple_pay' | 'google_pay' | 'cash_app' | 'square_hosted';
  sourceId?: string;
  shippingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

export interface CheckoutResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  receiptUrl?: string;
  paymentLinkUrl?: string;
  totalCharged: number;
  timestamp: string;
  paymentMethod: string;
  environment: 'production' | 'sandbox';
  isLive: boolean;
  squareHttpStatus?: number;
  isFailedOk?: boolean;
  errorCode?: string;
  errorDetail?: string;
  message?: string;
  pendingPayment?: boolean;
}

export interface SquareStatusResponse {
  configured: boolean;
  hasToken: boolean;
  hasLocation: boolean;
  hasAppId: boolean;
  environment: 'production' | 'sandbox';
  isProduction: boolean;
  baseUrl: string;
  locationId?: string;
  appId?: string;
}

export interface SquareTestPaymentResult {
  success: boolean;
  squareHttpStatus?: number;
  errorCode?: string;
  errorDetail?: string;
  errorCategory?: string;
  allErrors?: any[];
  endpoint?: string;
  environment?: string;
  durationMs?: number;
  testedAt?: string;
  isFailedOk?: boolean;
  message?: string;
  paymentId?: string;
  orderId?: string;
  receiptUrl?: string;
  stage?: string;
  instructions?: string;
}

// Helper to safely fetch and parse JSON without crashing on non-JSON/HTML error pages
async function safeFetchJson<T = any>(
  url: string, 
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; errorText?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        return { ok: res.ok, status: res.status, data: json };
      } catch {
        return {
          ok: false,
          status: res.status,
          errorText: `Gateway returned invalid JSON (HTTP ${res.status}): ${text.substring(0, 100)}`
        };
      }
    } else {
      // Non-JSON response (e.g. HTML 404 or proxy error page)
      const cleanSnippet = text.replace(/<[^>]*>/g, '').trim().substring(0, 120);
      return {
        ok: false,
        status: res.status,
        errorText: res.status === 404
          ? `Square API route was not found (HTTP 404). ${cleanSnippet || ''}`
          : `Server returned non-JSON response (HTTP ${res.status}): ${cleanSnippet || 'HTML/Text page'}`
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      errorText: err.message || 'Network connection to payment service failed'
    };
  }
}

// 1. Fetch current Square status from server
export const getSquareStatus = async (): Promise<SquareStatusResponse> => {
  const result = await safeFetchJson<SquareStatusResponse>('/api/square/status');
  if (result.ok && result.data) {
    return result.data;
  }
  return {
    configured: false,
    hasToken: false,
    hasLocation: false,
    hasAppId: false,
    environment: 'production',
    isProduction: true,
    baseUrl: 'https://connect.squareup.com'
  };
};

// 2. Run Test Payment directly through Square Live API
export const runSquareTestPayment = async (amountCents = 100, sourceId = 'cnon:card-nonce-ok'): Promise<SquareTestPaymentResult> => {
  const result = await safeFetchJson<SquareTestPaymentResult>('/api/square/test-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountCents, sourceId })
  });

  if (result.data) {
    return result.data;
  }

  return {
    success: false,
    errorDetail: result.errorText || 'Could not connect to Square test gateway',
    endpoint: 'https://connect.squareup.com/v2/payments',
    environment: 'production',
    isFailedOk: false,
    testedAt: new Date().toISOString(),
    message: result.errorText || 'Failed to communicate with payment gateway'
  };
};

// 3. Create a Square Live Payment Link (Hosted Square Checkout)
export const createSquarePaymentLink = async (payload: {
  items: { name: string; quantity: number; price: number }[];
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  redirectUrl?: string;
}) => {
  const result = await safeFetchJson<any>('/api/square/create-payment-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (result.data) {
    return result.data;
  }

  return {
    success: false,
    error: result.errorText || 'Network error creating Square payment link'
  };
};

// 4. Check Order Payment Status on Square
export const checkSquareOrderStatus = async (orderId: string): Promise<{
  success: boolean;
  orderId?: string;
  state?: string;
  isPaid: boolean;
  totalMoney?: any;
  tendersCount?: number;
}> => {
  const result = await safeFetchJson<any>(`/api/square/order-status/${encodeURIComponent(orderId)}`);
  if (result.ok && result.data) {
    return result.data;
  }
  return { success: false, isPaid: false };
};

// 5. Notify Square backend of transactions (including failed/declined attempts)
export const notifySquareTransaction = async (details: {
  transactionType: 'product_order' | 'appointment_deposit';
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
}) => {
  return safeFetchJson('/api/square/notify-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details)
  });
};

// 6. Direct Card Charge via Square API
export const chargeSquareCard = async (payload: {
  amountCents: number;
  sourceId?: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  referenceId?: string;
  items?: { name: string; quantity: number | string; price?: number }[];
  transactionType?: 'product_order' | 'appointment_deposit';
}) => {
  const result = await safeFetchJson<any>('/api/square/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountCents: payload.amountCents,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      note: payload.note,
      referenceId: payload.referenceId,
      items: payload.items,
      transactionType: payload.transactionType,
      sourceId: payload.sourceId
    })
  });

  return result.data || {
    success: false,
    error: result.errorText || 'Payment processing failed'
  };
};

export function formatE164Phone(rawPhone?: string): string | undefined {
  if (!rawPhone) return undefined;
  const trimmed = rawPhone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return undefined;

  if (trimmed.startsWith('+')) {
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) return `+${digitsOnly}`;
  }
  if (digitsOnly.length === 10) return `+1${digitsOnly}`;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`;
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) return `+${digitsOnly}`;

  return undefined;
}

// 7. Main checkout execution calling Square Live API
// CRITICAL: Strictly enforces that payment MUST be placed and accepted BEFORE returning success.
export const executeFastCheckout = async (payload: FastCheckoutPayload): Promise<CheckoutResult> => {
  const isTeaTimeTest = payload.items.some(item => 
    (item.name || '').toLowerCase().includes('tea time') || 
    (item.productId || '').toLowerCase().includes('tea time') ||
    item.productId === 'TFAII2LGXG7XLHZHNPG6O75Y'
  );

  const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // No local shipping or handling fee: all fees and fulfillment are handled directly on Square
  const grandTotal = subtotal;
  const totalCents = Math.round(grandTotal * 100);
  const refId = `HZ-ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const sanitizedPhone = formatE164Phone(payload.customerPhone);

  // PATH A: Customer has a verified tokenized card nonce from Square Web Payments SDK
  if (payload.paymentMethod === 'card' && payload.sourceId) {
    const payRes = await chargeSquareCard({
      amountCents: totalCents,
      sourceId: payload.sourceId,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      customerPhone: sanitizedPhone,
      note: `Haus of Zen Apothecary - ${payload.customerName}`,
      referenceId: refId,
      items: payload.items,
      transactionType: 'product_order'
    });

    if (payRes.success && (payRes.status === 'COMPLETED' || payRes.status === 'APPROVED')) {
      const successResult: CheckoutResult = {
        success: true,
        orderId: payRes.orderId || refId,
        transactionId: payRes.paymentId || `sq_pay_${Date.now()}`,
        receiptUrl: payRes.receiptUrl,
        totalCharged: grandTotal,
        timestamp: new Date().toISOString(),
        paymentMethod: 'card',
        environment: 'production',
        isLive: true,
        message: 'Payment successfully processed and accepted by Square.'
      };

      try {
        const existing = JSON.parse(localStorage.getItem('haus_of_zen_orders') || '[]');
        localStorage.setItem('haus_of_zen_orders', JSON.stringify([successResult, ...existing]));
      } catch (e) {
        console.warn('Could not save order', e);
      }

      return successResult;
    }

    return {
      success: false,
      orderId: refId,
      totalCharged: grandTotal,
      timestamp: new Date().toISOString(),
      paymentMethod: 'card',
      environment: 'production',
      isLive: true,
      isFailedOk: true,
      squareHttpStatus: payRes.squareStatus || 400,
      errorCode: payRes.code || 'CARD_DECLINED',
      errorDetail: payRes.detail || payRes.error || 'Payment was declined by Square. Please try again.',
      message: `Square Live declined payment: ${payRes.detail || 'Card could not be authorized'}`
    };
  }

  // PATH B: Customer chose Square Hosted Checkout, or Card without in-iframe token, or Apple Pay, Cash App, Google Pay
  // Must generate Square Hosted Checkout Link, redirect or open, and verify payment accepted before thank you
  try {
    const linkRes = await createSquarePaymentLink({
      items: payload.items,
      customerEmail: payload.customerEmail,
      customerName: payload.customerName,
      customerPhone: sanitizedPhone,
      redirectUrl: typeof window !== 'undefined' ? window.location.origin : 'https://www.myhausofzen.com'
    });

    if (linkRes.success && linkRes.paymentLinkUrl) {
      // Return pendingPayment: true! Do NOT return success: true yet!
      return {
        success: false,
        pendingPayment: true,
        orderId: linkRes.orderId || refId,
        transactionId: linkRes.paymentLinkId,
        paymentLinkUrl: linkRes.paymentLinkUrl,
        totalCharged: grandTotal,
        timestamp: new Date().toISOString(),
        paymentMethod: payload.paymentMethod,
        environment: 'production',
        isLive: true,
        message: 'Square Hosted Checkout opened. Waiting for payment authorization on Square.'
      };
    }

    // If Square returned an error
    const squareErrorMsg = linkRes.error || 'Square Live API could not generate checkout session';
    await notifySquareTransaction({
      transactionType: 'product_order',
      status: 'FAILED_DECLINED',
      referenceId: refId,
      amountCents: totalCents,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: sanitizedPhone,
      items: payload.items,
      errorCode: 'LINK_GENERATION_FAILED',
      errorDetail: squareErrorMsg
    });

    return {
      success: false,
      orderId: refId,
      totalCharged: grandTotal,
      timestamp: new Date().toISOString(),
      paymentMethod: payload.paymentMethod,
      environment: 'production',
      isLive: true,
      isFailedOk: true,
      errorCode: 'SQUARE_GATEWAY_NOTICE',
      errorDetail: squareErrorMsg,
      message: `Square Gateway Notice: ${squareErrorMsg}`
    };

  } catch (err: any) {
    await notifySquareTransaction({
      transactionType: 'product_order',
      status: 'FAILED_DECLINED',
      referenceId: refId,
      amountCents: totalCents,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: sanitizedPhone,
      items: payload.items,
      errorCode: 'NETWORK_ERROR',
      errorDetail: err.message
    });

    return {
      success: false,
      orderId: refId,
      totalCharged: grandTotal,
      timestamp: new Date().toISOString(),
      paymentMethod: payload.paymentMethod,
      environment: 'production',
      isLive: true,
      isFailedOk: false,
      errorCode: 'NETWORK_ERROR',
      errorDetail: err.message || 'Could not reach Square Live API server',
      message: 'Square Live API could not be reached. Transaction halted.'
    };
  }
};
