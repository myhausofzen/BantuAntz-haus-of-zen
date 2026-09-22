import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ShieldCheck, Zap, CreditCard, CheckCircle2, Lock, 
  AlertCircle, ExternalLink, RefreshCw, Activity, ShoppingBag, Sparkles, Heart,
  Smartphone, ArrowRight, Loader2
} from 'lucide-react';
import { 
  executeFastCheckout, 
  runSquareTestPayment, 
  getSquareStatus, 
  checkSquareOrderStatus,
  CheckoutResult, 
  SquareStatusResponse, 
  SquareTestPaymentResult 
} from '../services/checkoutService';

interface FastCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: { productId: string; name: string; quantity: number; price: number; volume?: string; image?: string; squareVariationId?: string }[];
  onSuccess: (result: CheckoutResult) => void;
  onContinueShopping?: () => void;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onSuccess,
  onContinueShopping
}) => {
  const [activeView, setActiveView] = useState<'checkout' | 'test-payment'>('checkout');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay' | 'cash_app' | 'square_hosted'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('90802');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<CheckoutResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Square Web Payments SDK state
  const cardInstanceRef = useRef<any>(null);
  const [squareCardReady, setSquareCardReady] = useState(false);
  const [isInitializingCard, setIsInitializingCard] = useState(false);
  const [sdkLoadError, setSdkLoadError] = useState<string | null>(null);

  // Pending Hosted Checkout state (Apple Pay, Cash App, Google Pay, Square Hosted)
  const [pendingHostedOrder, setPendingHostedOrder] = useState<{
    orderId: string;
    paymentLinkUrl: string;
    grandTotal: number;
    method: string;
  } | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const [squareStatus, setSquareStatus] = useState<SquareStatusResponse | null>(null);

  // Test Payment State
  const [isTestingPayment, setIsTestingPayment] = useState(false);
  const [testResult, setTestResult] = useState<SquareTestPaymentResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      getSquareStatus().then(setSquareStatus).catch(() => {});
      setPaymentError(null);
      setVerificationNotice(null);
    }
  }, [isOpen]);

  // Mount Square Web Payments SDK Card element
  useEffect(() => {
    if (!isOpen || paymentMethod !== 'card' || !squareStatus?.appId || !squareStatus?.locationId) {
      return;
    }

    let isMounted = true;

    async function waitForSquareSDK(): Promise<boolean> {
      if (typeof window === 'undefined') return false;
      if ((window as any).Square) return true;

      // Ensure script tag exists
      let script = document.querySelector('script[src*="square.js"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://web.squarecdn.com/v1/square.js';
        script.type = 'text/javascript';
        document.head.appendChild(script);
      }

      // Retry up to 5 seconds
      for (let i = 0; i < 25; i++) {
        if ((window as any).Square) return true;
        await new Promise((r) => setTimeout(r, 200));
      }
      return !!(window as any).Square;
    }

    async function initSquarePaymentCard() {
      try {
        setIsInitializingCard(true);
        setSdkLoadError(null);

        const isReady = await waitForSquareSDK();
        if (!isMounted) return;

        if (!isReady || !(window as any).Square) {
          setSdkLoadError('Square Payments script is taking longer to load.');
          setSquareCardReady(false);
          return;
        }

        if (cardInstanceRef.current) {
          try {
            await cardInstanceRef.current.destroy();
          } catch (e) {}
          cardInstanceRef.current = null;
        }

        const payments = (window as any).Square.payments(
          squareStatus.appId,
          squareStatus.locationId
        );

        const card = await payments.card({
          style: {
            input: {
              fontSize: '14px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#1c1917'
            },
            'input::placeholder': {
              color: '#a8a29e'
            },
            '.input-container': {
              borderColor: '#e7e5e4',
              borderRadius: '10px'
            },
            '.input-container.is-focus': {
              borderColor: '#1c1917'
            }
          }
        });

        if (!isMounted) {
          await card.destroy();
          return;
        }

        const container = document.getElementById('square-card-container');
        if (container) {
          await card.attach('#square-card-container');
          cardInstanceRef.current = card;
          setSquareCardReady(true);
          setSdkLoadError(null);
        }
      } catch (err: any) {
        console.warn('Square Web Payments Card initialization notice:', err);
        setSdkLoadError(err.message || 'Direct card form could not mount in this view.');
        setSquareCardReady(false);
      } finally {
        if (isMounted) {
          setIsInitializingCard(false);
        }
      }
    }

    const timer = setTimeout(() => {
      initSquarePaymentCard();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (cardInstanceRef.current) {
        try {
          cardInstanceRef.current.destroy();
        } catch (e) {}
        cardInstanceRef.current = null;
      }
      setSquareCardReady(false);
    };
  }, [isOpen, paymentMethod, squareStatus?.appId, squareStatus?.locationId]);

  // Card formatting and brand detection
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (/^4/.test(clean)) return { name: 'Visa', bg: 'bg-blue-900 text-white' };
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return { name: 'Mastercard', bg: 'bg-red-700 text-white' };
    if (/^3[47]/.test(clean)) return { name: 'Amex', bg: 'bg-sky-700 text-white' };
    if (/^(6011|65|64[4-9])/.test(clean)) return { name: 'Discover', bg: 'bg-amber-700 text-white' };
    return null;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const isAmex = /^3[47]/.test(raw);
    const maxDigits = isAmex ? 15 : 16;
    const trimmed = raw.substring(0, maxDigits);
    
    // Group in blocks
    let formatted = '';
    if (isAmex) {
      if (trimmed.length > 10) {
        formatted = `${trimmed.substring(0, 4)} ${trimmed.substring(4, 10)} ${trimmed.substring(10, 15)}`;
      } else if (trimmed.length > 4) {
        formatted = `${trimmed.substring(0, 4)} ${trimmed.substring(4, 10)}`;
      } else {
        formatted = trimmed;
      }
    } else {
      const parts = [];
      for (let i = 0; i < trimmed.length; i += 4) {
        parts.push(trimmed.substring(i, i + 4));
      }
      formatted = parts.join(' ');
    }
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (raw.length >= 3) {
      setExpiry(`${raw.substring(0, 2)}/${raw.substring(2, 4)}`);
    } else {
      setExpiry(raw);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
      setCustomerPhone(`(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`);
    } else {
      setCustomerPhone(raw);
    }
  };

  if (!isOpen) return null;

  // Check if testing "tea time" or similar zero-shipping test item
  const isTeaTimeTest = items.some(item => 
    (item.name || '').toLowerCase().includes('tea time') || 
    (item.productId || '').toLowerCase().includes('tea time') ||
    item.productId === 'TFAII2LGXG7XLHZHNPG6O75Y'
  );

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // No local shipping or handling fee: all fees and fulfillment are handled directly on Square
  const grandTotal = subtotal;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setVerificationNotice(null);

    if (!customerEmail) {
      setPaymentError('Please enter your email address for your order receipt.');
      return;
    }

    let sourceId: string | undefined = undefined;

    if (paymentMethod === 'card' && cardInstanceRef.current && squareCardReady) {
      try {
        setIsProcessing(true);
        const tokenResult = await cardInstanceRef.current.tokenize();
        if (tokenResult.status === 'OK') {
          sourceId = tokenResult.token;
        } else {
          const firstErr = tokenResult.errors?.[0];
          setPaymentError(firstErr?.message || 'Please check your card details.');
          setIsProcessing(false);
          return;
        }
      } catch (tokenErr: any) {
        console.warn('Square card tokenization error:', tokenErr);
        setPaymentError(tokenErr.message || 'Could not tokenize card.');
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(true);
    setOrderResult(null);

    const result = await executeFastCheckout({
      items,
      customerEmail,
      customerName: customerName || 'Apothecary Patron',
      customerPhone,
      paymentMethod,
      sourceId,
      shippingAddress: {
        line1: '123 Serenity Blvd',
        city: 'Long Beach',
        state: 'CA',
        postalCode: postalCode || '90802'
      }
    });

    setIsProcessing(false);

    // If Square accepted payment immediately (Card)
    if (result.success) {
      setOrderResult(result);
      onSuccess(result);
      return;
    }

    // If Apple Pay, Cash App, or Google Pay initiated via Square Hosted Checkout
    if (result.pendingPayment && result.paymentLinkUrl) {
      setPendingHostedOrder({
        orderId: result.orderId,
        paymentLinkUrl: result.paymentLinkUrl,
        grandTotal,
        method: paymentMethod
      });
      // Try opening the Square checkout link directly
      try {
        window.open(result.paymentLinkUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Could not auto-open checkout popup', e);
      }
      return;
    }

    // If Square declined or payment failed
    setPaymentError(
      result.errorDetail || 
      result.message || 
      'Payment was not accepted by Square. Please check your payment details or try a different payment method.'
    );
  };

  // Verify payment status with Square for hosted orders
  const handleVerifySquarePayment = async () => {
    if (!pendingHostedOrder) return;

    setIsVerifyingPayment(true);
    setVerificationNotice(null);

    const status = await checkSquareOrderStatus(pendingHostedOrder.orderId);
    setIsVerifyingPayment(false);

    if (status.isPaid) {
      const acceptedResult: CheckoutResult = {
        success: true,
        orderId: pendingHostedOrder.orderId,
        totalCharged: pendingHostedOrder.grandTotal,
        timestamp: new Date().toISOString(),
        paymentMethod: pendingHostedOrder.method,
        environment: 'production',
        isLive: true,
        message: 'Square Live Payment accepted and verified.'
      };

      try {
        const existing = JSON.parse(localStorage.getItem('haus_of_zen_orders') || '[]');
        localStorage.setItem('haus_of_zen_orders', JSON.stringify([acceptedResult, ...existing]));
      } catch (e) {
        console.warn('Could not save order', e);
      }

      setPendingHostedOrder(null);
      setOrderResult(acceptedResult);
      onSuccess(acceptedResult);
    } else {
      setVerificationNotice(
        'Square has not yet received confirmation of this payment. Please finish submitting your payment in the Square window and click Verify again.'
      );
    }
  };

  const handleReturnToShop = () => {
    setOrderResult(null);
    setPendingHostedOrder(null);
    onClose();
    if (onContinueShopping) {
      onContinueShopping();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-stone-50 border border-stone-200 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-6 md:p-8">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-2xl text-stone-900">Live Checkout</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Live
                </span>
              </div>
              <p className="text-[11px] font-sans text-stone-500">
                connect.squareup.com • Official Square Production Gateway
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. ORDER PLACED & ACCEPTED (SWEET THANK YOU SCREEN) */}
        {orderResult?.success ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[10px] font-sans tracking-widest uppercase text-amber-900 font-semibold mb-2">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Order Placed & Payment Accepted</span>
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl text-stone-900 mb-2">
              Thank You for Shopping with Us!
            </h2>

            {/* Personalized botanical thank you message */}
            <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4 sm:p-5 mb-5 text-stone-700 font-sans text-xs leading-relaxed space-y-2 text-center">
              <p className="font-semibold text-stone-900 text-sm flex items-center justify-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline flex-shrink-0" />
                <span>With deep gratitude & warm botanical blessings</span>
              </p>
              <p className="text-stone-600 text-xs max-w-md mx-auto leading-relaxed">
                Your order has been officially accepted and paid. We handcraft every herbal tea blend, restorative womb tonic, and small-batch apothecary remedy with pure organic botanicals, sacred care, and healing intention.
              </p>
              {customerEmail && (
                <p className="text-[11px] text-stone-500 pt-2 border-t border-amber-200/50">
                  A confirmation receipt and order summary have been sent to <span className="font-semibold text-stone-800">{customerEmail}</span>.
                </p>
              )}
            </div>

            {/* Order summary info */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 text-left text-xs font-sans space-y-2 mb-5 shadow-xs">
              <div className="flex justify-between">
                <span className="text-stone-500">Square Order ID:</span>
                <span className="font-mono text-stone-900 font-semibold">{orderResult.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Payment Status:</span>
                <span className="font-semibold text-emerald-700 uppercase">Paid & Accepted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Processing Gateway:</span>
                <span className="font-semibold text-stone-700">Square Live Production</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-100 text-stone-900 font-bold">
                <span>Total Paid:</span>
                <span className="font-serif text-base text-stone-900">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {orderResult.receiptUrl && (
              <a
                href={orderResult.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 mb-3 shadow-sm cursor-pointer"
              >
                <span>View Square Payment Receipt</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Return to Shop */}
            <button
              type="button"
              onClick={handleReturnToShop}
              className="w-full py-3.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs tracking-widest uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>Return to Haus of Zen & Keep Shopping</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-2 py-2 text-stone-500 hover:text-stone-800 font-sans text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : pendingHostedOrder ? (
          /* 2. PENDING SQUARE HOSTED CHECKOUT (APPLE PAY, CASH APP, GOOGLE PAY) */
          <div className="py-4 space-y-4 animate-fade-in">
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs font-sans space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-amber-700" />
                <span>Square Checkout Window Opened</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Please complete your <strong>${pendingHostedOrder.grandTotal.toFixed(2)}</strong> payment using {pendingHostedOrder.method === 'cash_app' ? 'Cash App Pay' : pendingHostedOrder.method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} in the Square checkout window.
              </p>
              <p className="text-[10px] text-stone-500">
                Your order is not finalized until payment is accepted by Square.
              </p>
            </div>

            {verificationNotice && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-sans flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">{verificationNotice}</p>
              </div>
            )}

            <div className="space-y-2">
              <a
                href={pendingHostedOrder.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Re-open Square Checkout Window</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleVerifySquarePayment}
                className="w-full py-3.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
              >
                {isVerifyingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Verifying with Square Live...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>I Have Completed Payment (Verify & Accept Order)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingHostedOrder(null);
                  setPaymentError(null);
                }}
                className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-700 font-sans text-xs hover:bg-stone-100 transition-colors"
              >
                Change Payment Method / Enter Card Details
              </button>
            </div>
          </div>
        ) : (
          /* 3. CHECKOUT FORM (CUSTOMER ENTERS PAYMENT DETAILS) */
          <form onSubmit={handlePay} className="space-y-4">
            
            {/* Payment Error / Decline Alert */}
            {paymentError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-sans space-y-2 animate-fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Payment Not Accepted</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800">{paymentError}</p>

                {paymentError.toLowerCase().includes('square_access_token') && (
                  <div className="mt-2 p-2.5 bg-white/90 rounded-lg border border-rose-200 text-[11px] text-stone-700 space-y-1.5 shadow-xs">
                    <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                      <span>Vercel Deployment Setup Required</span>
                    </p>
                    <p className="text-stone-600 leading-normal">
                      When deployed on Vercel, Square environment variables must be added to your Vercel Project Settings:
                    </p>
                    <div className="font-mono text-[10px] bg-stone-100 p-2 rounded border border-stone-200 space-y-0.5 text-stone-800">
                      <div>SQUARE_ACCESS_TOKEN = (Your Square Production Access Token)</div>
                      <div>SQUARE_APPLICATION_ID = (Your Square App ID)</div>
                      <div>SQUARE_LOCATION_ID = (Your Square Location ID)</div>
                      <div>SQUARE_ENVIRONMENT = production</div>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Go to <span className="font-semibold">Vercel Dashboard → Project Settings → Environment Variables</span>, add these variables, and click <span className="font-semibold">Redeploy</span>.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Order Items Preview */}
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 divide-y divide-stone-100">
              {items.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between py-1.5 ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-9 h-9 rounded-lg object-cover" />
                    )}
                    <div>
                      <h5 className="font-serif text-sm text-stone-900 leading-tight">{item.name}</h5>
                      <span className="text-[10px] text-stone-500 font-sans">
                        Qty: {item.quantity} {item.volume ? `• ${item.volume}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="font-serif text-sm font-semibold text-stone-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Payment Method Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-600">
                  Payment Method *
                </label>
                <span className="text-[10px] font-sans text-stone-400">
                  Direct Card or Digital Wallet
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    setPaymentError(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-[11px] font-sans font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === 'card'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span className="truncate">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('square_hosted');
                    setPaymentError(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-[11px] font-sans font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === 'square_hosted'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="truncate">Square Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('apple_pay');
                    setPaymentError(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-[11px] font-sans font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === 'apple_pay'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="truncate">Apple Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cash_app');
                    setPaymentError(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-[11px] font-sans font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === 'cash_app'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="truncate">Cash App</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('google_pay');
                    setPaymentError(null);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-[11px] font-sans font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === 'google_pay'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="truncate">Google Pay</span>
                </button>
              </div>
            </div>

            {/* Credit Card Fields if selected (Square Web Payments SDK) */}
            {paymentMethod === 'card' ? (
              <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2.5 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Square Secure Card Processing</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 font-sans">
                    <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">VISA</span>
                    <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">MC</span>
                    <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">AMEX</span>
                    <span className="px-1 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">DISC</span>
                  </div>
                </div>

                {isInitializingCard && (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Connecting to Square encrypted card form...</span>
                  </div>
                )}

                {/* Container where Square Web Payments SDK attaches */}
                <div 
                  id="square-card-container" 
                  className={`w-full transition-opacity min-h-[95px] ${squareCardReady ? 'opacity-100 block' : 'opacity-70'}`} 
                />

                {sdkLoadError && !squareCardReady && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-stone-900">Direct Square Payment</p>
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          When viewed inside embedded preview frames, bank regulations require an unnested window or Square checkout link to complete your payment directly to your Haus of Zen account.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('square_hosted')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <span>Continue with Square Checkout</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 font-sans font-medium text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <span>Open in Full Browser Tab</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-100">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-stone-400" />
                    256-bit SSL encrypted by Square Live
                  </span>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('square_hosted')}
                    className="text-stone-500 hover:text-stone-900 underline"
                  >
                    Prefer Square checkout page?
                  </button>
                </div>
              </div>
            ) : paymentMethod === 'square_hosted' ? (
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 text-xs text-stone-700 flex items-start gap-3 animate-fade-in shadow-xs">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-[11px] leading-tight space-y-1">
                  <p className="font-semibold text-stone-900">
                    Square Hosted Checkout Link
                  </p>
                  <p className="text-stone-600">
                    Generates an official Square payment link for ${grandTotal.toFixed(2)}. Accepts all Credit Cards, Debit Cards, Apple Pay, Google Pay, and Cash App.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-xl p-3.5 text-xs text-stone-600 flex items-center gap-3 animate-fade-in shadow-xs">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-800 flex-shrink-0">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div className="text-[11px] leading-tight space-y-0.5">
                  <p className="font-semibold text-stone-900">
                    {paymentMethod === 'apple_pay' && 'Apple Pay via Square Live'}
                    {paymentMethod === 'cash_app' && 'Cash App Pay via Square Live'}
                    {paymentMethod === 'google_pay' && 'Google Pay via Square Live'}
                  </p>
                  <p className="text-stone-500">
                    You will be directed to Square's secure checkout. Once accepted by Square, your order will be confirmed with a receipt.
                  </p>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Email Address for Order Confirmation & Receipt *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="patron@myhausofzen.com"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Julian Rhys"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Phone <span className="text-[10px] font-normal text-stone-400">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    placeholder="(310) 925-0920"
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="pt-2 border-t border-stone-200 text-xs font-sans text-stone-600 space-y-1">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>Shipping &amp; Fees:</span>
                <span className="text-stone-700 font-medium">Handled directly on Square ($0.00 here)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                <span>Total Due:</span>
                <span className="font-serif text-lg text-stone-900">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-widest uppercase font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                  <span>Processing Payment with Square...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {paymentMethod === 'card'
                      ? `Pay $${grandTotal.toFixed(2)} & Place Order`
                      : `Proceed to Square Checkout ($${grandTotal.toFixed(2)})`}
                  </span>
                </>
              )}
            </button>

            <div className="text-center text-[10px] text-stone-400 font-sans flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Orders are only confirmed once payment is accepted by Square Live.</span>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
