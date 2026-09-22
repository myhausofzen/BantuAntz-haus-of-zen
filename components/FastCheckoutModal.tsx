import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Lock, CheckCircle2, AlertCircle, ExternalLink, 
  RefreshCw, ShoppingBag, Heart, Loader2, ArrowRight
} from 'lucide-react';
import { 
  executeFastCheckout, 
  getSquareStatus, 
  checkSquareOrderStatus,
  CheckoutResult, 
  SquareStatusResponse 
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
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<CheckoutResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // Square Web Payments SDK state
  const cardInstanceRef = useRef<any>(null);
  const [squareCardReady, setSquareCardReady] = useState(false);
  const [isInitializingCard, setIsInitializingCard] = useState(false);
  const [sdkLoadError, setSdkLoadError] = useState<string | null>(null);

  // Square Hosted Checkout state (Apple Pay, Cash App, Google Pay or Fallback)
  const [pendingHostedOrder, setPendingHostedOrder] = useState<{
    orderId: string;
    paymentLinkUrl: string;
    grandTotal: number;
  } | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  const [squareStatus, setSquareStatus] = useState<SquareStatusResponse | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const grandTotal = subtotal;

  useEffect(() => {
    if (isOpen) {
      getSquareStatus().then(setSquareStatus).catch(() => {});
      setPaymentError(null);
      setVerificationNotice(null);
    }
  }, [isOpen]);

  // Mount Square Web Payments SDK Card element
  useEffect(() => {
    if (!isOpen || !squareStatus?.appId || !squareStatus?.locationId) {
      return;
    }

    let isMounted = true;

    async function waitForSquareSDK(): Promise<boolean> {
      if (typeof window === 'undefined') return false;
      if ((window as any).Square) return true;

      let script = document.querySelector('script[src*="square.js"]') as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://web.squarecdn.com/v1/square.js';
        script.type = 'text/javascript';
        document.head.appendChild(script);
      }

      for (let i = 0; i < 20; i++) {
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
          setSdkLoadError('Square Payments SDK script unavailable');
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
              fontFamily: 'Montserrat, sans-serif',
              color: '#1c1917'
            },
            'input::placeholder': {
              color: '#a8a29e'
            },
            '.input-container': {
              borderColor: '#e7e5e4',
              borderRadius: '8px'
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
        setSdkLoadError(err.message || 'Direct card form could not mount');
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
  }, [isOpen, squareStatus?.appId, squareStatus?.locationId]);

  if (!isOpen) return null;

  // Handle direct card payment
  const handleCardPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setVerificationNotice(null);

    if (!customerEmail.trim()) {
      setPaymentError('Please enter your email address for your order confirmation receipt.');
      return;
    }

    // If card is ready in direct view, tokenize
    let sourceId: string | undefined = undefined;
    if (squareCardReady && cardInstanceRef.current) {
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
        setPaymentError(tokenErr.message || 'Could not tokenize card.');
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(true);

    const result = await executeFastCheckout({
      items,
      customerEmail: customerEmail.trim(),
      customerName: customerName.trim() || 'Apothecary Patron',
      paymentMethod: sourceId ? 'card' : 'square_hosted',
      sourceId,
      shippingAddress: {
        line1: 'Direct Order',
        city: 'Haus of Zen',
        state: 'CA',
        postalCode: '90802'
      }
    });

    setIsProcessing(false);

    if (result.success) {
      setOrderResult(result);
      onSuccess(result);
      return;
    }

    if (result.pendingPayment && result.paymentLinkUrl) {
      setPendingHostedOrder({
        orderId: result.orderId,
        paymentLinkUrl: result.paymentLinkUrl,
        grandTotal
      });
      try {
        window.open(result.paymentLinkUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {}
      return;
    }

    setPaymentError(
      result.errorDetail || 
      result.message || 
      'Payment was not accepted by Square. Please try again.'
    );
  };

  // Handle Square Hosted Checkout directly (Apple Pay, Google Pay, Cash App, or fallback)
  const handleHostedPay = async () => {
    setPaymentError(null);
    if (!customerEmail.trim()) {
      setPaymentError('Please enter your email address so we can send your receipt.');
      return;
    }

    setIsProcessing(true);
    const result = await executeFastCheckout({
      items,
      customerEmail: customerEmail.trim(),
      customerName: customerName.trim() || 'Apothecary Patron',
      paymentMethod: 'square_hosted',
      shippingAddress: {
        line1: 'Direct Order',
        city: 'Haus of Zen',
        state: 'CA',
        postalCode: '90802'
      }
    });
    setIsProcessing(false);

    if (result.pendingPayment && result.paymentLinkUrl) {
      setPendingHostedOrder({
        orderId: result.orderId,
        paymentLinkUrl: result.paymentLinkUrl,
        grandTotal
      });
      try {
        window.open(result.paymentLinkUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {}
      return;
    }

    if (result.success) {
      setOrderResult(result);
      onSuccess(result);
      return;
    }

    setPaymentError(result.errorDetail || result.message || 'Unable to open Square checkout.');
  };

  // Verify hosted payment
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
        paymentMethod: 'square_hosted',
        environment: 'production',
        isLive: true,
        message: 'Square Live Payment accepted and verified.'
      };

      try {
        const existing = JSON.parse(localStorage.getItem('haus_of_zen_orders') || '[]');
        localStorage.setItem('haus_of_zen_orders', JSON.stringify([acceptedResult, ...existing]));
      } catch (e) {}

      setPendingHostedOrder(null);
      setOrderResult(acceptedResult);
      onSuccess(acceptedResult);
    } else {
      setVerificationNotice(
        'Square has not confirmed payment completion yet. Please finish checking out in the Square window and click Verify.'
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
      <div className="bg-white border border-stone-200/90 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-7">
        
        {/* Simple, Calm Header */}
        <div className="flex justify-between items-center pb-4 border-b border-stone-100 mb-5">
          <div>
            <h3 className="font-serif text-2xl text-stone-900 font-medium">Checkout</h3>
            <p className="text-xs text-stone-500 font-sans mt-0.5">Haus of Zen Apothecary</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. ORDER SUCCESS SCREEN */}
        {orderResult?.success ? (
          <div className="text-center py-4 animate-fade-in space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h2 className="font-serif text-2xl text-stone-900 font-medium">
                Thank You for Your Order
              </h2>
              <p className="text-xs text-stone-600 font-sans mt-1">
                Your payment of <span className="font-semibold text-stone-900">${grandTotal.toFixed(2)}</span> has been confirmed.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 text-xs font-sans text-stone-700 leading-relaxed text-center space-y-1.5">
              <p className="font-semibold text-stone-900 flex items-center justify-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
                <span>Handcrafted with Care & Healing Intention</span>
              </p>
              <p className="text-[11px] text-stone-600">
                A confirmation receipt has been sent to <span className="font-semibold text-stone-900">{customerEmail}</span>.
              </p>
            </div>

            {orderResult.receiptUrl && (
              <a
                href={orderResult.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-sans text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Square Receipt</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              type="button"
              onClick={handleReturnToShop}
              className="w-full py-3.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-amber-300" />
              <span>Continue Shopping</span>
            </button>
          </div>
        ) : pendingHostedOrder ? (
          /* 2. PENDING SQUARE WINDOW (VERIFY PAYMENT) */
          <div className="py-2 space-y-4 animate-fade-in text-center">
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 text-xs font-sans text-stone-700 space-y-2">
              <p className="font-semibold text-stone-900 text-sm">
                Square Checkout Window Opened
              </p>
              <p className="text-[12px] text-stone-600">
                Complete your payment of <strong>${pendingHostedOrder.grandTotal.toFixed(2)}</strong> in the Square tab.
              </p>
            </div>

            {verificationNotice && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-sans flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{verificationNotice}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <a
                href={pendingHostedOrder.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Re-open Square Checkout</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleVerifySquarePayment}
                className="w-full py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
              >
                {isVerifyingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Verifying with Square...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>I Finished Payment (Verify Order)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingHostedOrder(null);
                  setPaymentError(null);
                }}
                className="text-stone-500 hover:text-stone-800 text-xs underline font-sans pt-1"
              >
                Back to Checkout
              </button>
            </div>
          </div>
        ) : (
          /* 3. STREAMLINED CHECKOUT FORM */
          <form onSubmit={handleCardPay} className="space-y-4">
            
            {/* Error Message */}
            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-sans flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{paymentError}</span>
              </div>
            )}

            {/* Compact Order Items */}
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 divide-y divide-stone-200/50">
              {items.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between py-1 text-xs font-sans ${idx === 0 ? 'pt-0' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded-md object-cover" />
                    )}
                    <div>
                      <p className="font-serif text-sm text-stone-900 font-medium leading-tight">{item.name}</p>
                      <p className="text-[11px] text-stone-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-stone-900">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-stone-200/70 text-stone-900">
                <span className="text-xs font-sans font-medium text-stone-600">Total:</span>
                <span className="font-serif text-lg font-bold">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Contact Email Field */}
            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-600 mb-1">
                Email for Receipt *
              </label>
              <input
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors"
              />
            </div>

            {/* Full Name (Optional) */}
            <div>
              <label className="block text-[11px] font-sans font-semibold uppercase tracking-wider text-stone-600 mb-1">
                Name <span className="text-[10px] font-normal text-stone-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Julian Rhys"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900 transition-colors"
              />
            </div>

            {/* Payment Options */}
            <div className="space-y-3 pt-1">
              
              {/* Direct Card Container (Loads when supported) */}
              <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-700 pb-1 border-b border-stone-200/50">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-stone-600 font-sans">
                    Credit / Debit Card
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-stone-400 font-mono">
                    <span>VISA</span>
                    <span>•</span>
                    <span>MC</span>
                    <span>•</span>
                    <span>AMEX</span>
                  </div>
                </div>

                {isInitializingCard && (
                  <div className="py-3 flex items-center justify-center gap-2 text-xs text-stone-500">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                    <span>Preparing secure card form...</span>
                  </div>
                )}

                {/* Square Card Form Mount */}
                <div 
                  id="square-card-container" 
                  className="w-full min-h-[90px]"
                />

                {/* Primary Card Pay Button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Pay ${grandTotal.toFixed(2)} with Card</span>
                    </>
                  )}
                </button>
              </div>

              {/* Digital Wallets & Square Checkout Button */}
              <div className="text-center space-y-2 pt-1">
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-stone-200 w-full"></div>
                  <span className="bg-white px-3 text-[10px] uppercase tracking-widest text-stone-400 font-sans font-semibold">
                    or quick pay with
                  </span>
                  <div className="border-t border-stone-200 w-full"></div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleHostedPay}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                >
                  <span>Apple Pay, Google Pay, or Cash App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Footer Trust */}
            <div className="pt-2 text-center text-[10px] text-stone-400 font-sans flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-stone-400" />
              <span>Secured by Square • 256-bit encryption</span>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
