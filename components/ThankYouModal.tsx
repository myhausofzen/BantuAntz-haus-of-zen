import React from 'react';
import { 
  X, CheckCircle2, ShoppingBag, Sparkles, Heart, 
  ExternalLink, Calendar, PackageCheck, Flower2, ArrowRight
} from 'lucide-react';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  customerEmail?: string | null;
  onContinueShopping: () => void;
  onExploreConsultations?: () => void;
}

export const ThankYouModal: React.FC<ThankYouModalProps> = ({
  isOpen,
  onClose,
  orderId,
  customerEmail,
  onContinueShopping,
  onExploreConsultations
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#faf8f5] border border-amber-200/80 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-9 relative text-stone-900"
        style={{ backgroundImage: 'radial-gradient(#f5efe6 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Botanical Sacred Header Emblem */}
        <div className="text-center pt-2 pb-1">
          <div className="relative inline-block mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-100 to-amber-50 border-2 border-amber-300/80 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
              <Flower2 className="w-8 h-8 text-amber-800 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/70 border border-amber-300/60 text-[10px] font-sans tracking-widest uppercase text-amber-900 font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Sacred Order Confirmed</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 tracking-tight font-medium">
            Thank You for Your Order
          </h2>
          <p className="font-serif italic text-base text-amber-900/90 mt-1">
            Haus of Zen Apothecary
          </p>
        </div>

        {/* Haus of Zen Botanical Story & Gratitude Card */}
        <div className="mt-5 bg-white/90 border border-amber-200/80 rounded-2xl p-5 shadow-xs text-stone-800 space-y-3 text-left">
          <div className="flex items-center gap-2 text-stone-900 font-serif text-base font-medium">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500 flex-shrink-0" />
            <span>With deep gratitude & warm botanical blessings</span>
          </div>
          
          <p className="text-xs font-sans text-stone-600 leading-relaxed">
            Your support allows our sacred apothecary to thrive. Every herbal tea blend, restorative womb tonic, and small-batch herbal formula is lovingly handcrafted in our sanctuary using pure whole-plant organic botanicals, reverence, and healing intention to nourish your body, soul, and sovereign vitality.
          </p>

          {orderId && (
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-sans">
              <span className="text-stone-500 font-medium">Square Order Reference:</span>
              <span className="font-mono text-stone-800 font-semibold bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                {orderId}
              </span>
            </div>
          )}

          {customerEmail && (
            <div className="text-[11px] font-sans text-stone-500 flex items-center gap-1.5">
              <span>Confirmation receipt sent to:</span>
              <span className="font-semibold text-stone-800">{customerEmail}</span>
            </div>
          )}
        </div>

        {/* Fulfillment Ritual Steps */}
        <div className="mt-4 bg-stone-100/80 border border-stone-200/80 rounded-2xl p-4 text-xs font-sans space-y-2.5">
          <p className="font-semibold uppercase tracking-wider text-[10px] text-stone-500">
            What Happens Next:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-stone-700">
            <div className="bg-white/80 p-2.5 rounded-xl border border-stone-200/60">
              <span className="block font-semibold text-stone-900 text-[11px] mb-0.5">1. Handcrafting</span>
              <span className="text-[10px] text-stone-500 leading-tight">Freshly blended in our apothecary sanctuary.</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-stone-200/60">
              <span className="block font-semibold text-stone-900 text-[11px] mb-0.5">2. Sacred Packing</span>
              <span className="text-[10px] text-stone-500 leading-tight">Eco-friendly pouch with custom ritual brewing guide.</span>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-stone-200/60">
              <span className="block font-semibold text-stone-900 text-[11px] mb-0.5">3. Swift Delivery</span>
              <span className="text-[10px] text-stone-500 leading-tight">Tracking details emailed directly to your inbox.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={onContinueShopping}
            className="w-full py-4 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-200 font-sans text-xs tracking-widest uppercase font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span>Continue Shopping & Explore Remedies</span>
          </button>

          {onExploreConsultations && (
            <button
              type="button"
              onClick={onExploreConsultations}
              className="w-full py-3 px-6 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-sans text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>Book a Holistic Wellness Consultation</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-stone-400 hover:text-stone-700 font-sans text-[11px] uppercase tracking-wider transition-colors cursor-pointer text-center"
          >
            Return to Sanctuary Home
          </button>
        </div>

      </div>
    </div>
  );
};
