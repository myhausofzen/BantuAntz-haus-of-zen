import React, { useState, useEffect } from 'react';
import { Sparkles, ShoppingBag, Zap, Check, ArrowRight, ShieldCheck, Flame, HeartHandshake, Leaf } from 'lucide-react';
import { Product } from '../types';

interface VitaliteaSpotlightProps {
  product?: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number, selectedSize?: string, customPrice?: number) => void;
  onFastCheckout: (product: Product, quantity?: number, selectedSize?: string, customPrice?: number) => void;
}

export const VitaliteaSpotlight: React.FC<VitaliteaSpotlightProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onFastCheckout
}) => {
  const [addedRecently, setAddedRecently] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>(product?.image || '/vitaaaaality_1.png');
  const [selectedSize, setSelectedSize] = useState<string>("10 oz Pouch");

  useEffect(() => {
    if (product?.image) {
      setImgSrc(product.image);
    }
  }, [product?.image]);

  // Fallback product if not found
  const fallbackProduct: Product = {
    id: "VITALITEA-ENERGY-SUPPORT",
    name: "Vitalitea: Anti-Inflammatory & Energy Support",
    botanicalName: "Zingiber officinale, Hibiscus sabdariffa, Rosmarinus officinalis & Panax ginseng",
    subtitle: "Organic Caffeine-Free Energy, Cellular Revival & Anti-Inflammatory Blend",
    description: "Crafted in our apothecary with pure whole-plant botanicals, Vitalitea delivers sustained, clean vitality without nervous system jitter or afternoon crashes. Rich in bioactive gingerols and crimson hibiscus polyphenols to extinguish systemic inflammation while Korean ginseng and aromatic rosemary restore stamina, clarity, and sovereign womb vitality.",
    price: 14.99,
    compareAtPrice: 17.24,
    category: "Herbal Tea Blends",
    intent: "Immunity",
    image: "/vitaaaaality_1.png",
    gallery: ["/vitaaaaality_1.png"],
    volume: "10 oz Pouch or 20 oz Pack",
    sizeOptions: ["10 oz Pouch", "20 oz Pack"],
    sizePrices: {
      "10 oz Pouch": 14.99,
      "20 oz Pack": 24.99,
      "10 oz": 14.99,
      "20 oz": 24.99
    },
    sizeCompareAtPrices: {
      "10 oz Pouch": 17.24,
      "20 oz Pack": 29.99,
      "10 oz": 17.24,
      "20 oz": 29.99
    },
    inStock: true,
    featured: true,
    rating: 4.98,
    reviewCount: 48,
    ingredients: ["Organic Ginger Root", "Organic Hibiscus Petals", "Wildcrafted Rosemary", "Red Ginseng Root"],
    ritualGuide: "Steep 1 tablespoon in 10–12 oz of boiling spring water for 10–15 minutes covered. Enjoy hot or iced.",
    dosage: "1 to 2 cups daily for sustained cellular vitality",
    scentNotes: "Spicy ginger warmth, tart hibiscus blossom, crisp piney rosemary",
    certifications: ['100% Handcrafted', '100% Certified Organic', 'Caffeine Free', 'Non-GMO'],
    tags: ["Herbal Tea Blends", "Energy", "Anti-Inflammatory", "Featured"]
  };

  const activeProduct = product || fallbackProduct;

  const sizePrices: Record<string, number> = activeProduct.sizePrices || {
    "10 oz Pouch": 14.99,
    "20 oz Pack": 24.99,
    "10 oz": 14.99,
    "20 oz": 24.99
  };

  const sizeCompareAtPrices: Record<string, number> = activeProduct.sizeCompareAtPrices || {
    "10 oz Pouch": 17.24,
    "20 oz Pack": 29.99,
    "10 oz": 17.24,
    "20 oz": 29.99
  };

  const currentPrice = sizePrices[selectedSize] ?? activeProduct.price;
  const currentCompareAtPrice = sizeCompareAtPrices[selectedSize] ?? activeProduct.compareAtPrice;

  const handleAddToCart = () => {
    onAddToCart(activeProduct, 1, selectedSize, currentPrice);
    setAddedRecently(true);
    setTimeout(() => setAddedRecently(false), 2000);
  };

  const handleFastBuy = () => {
    onFastCheckout(activeProduct, 1, selectedSize, currentPrice);
  };

  return (
    <section id="vitalitea-spotlight" className="py-20 px-6 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-stone-100 relative overflow-hidden border-y border-amber-900/30">
      {/* Subtle organic light backdrop */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Product Visual Ad */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative group w-full max-w-md">
              {/* Gold botanical glow frame */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-amber-600/30 via-amber-400/20 to-red-600/20 rounded-3xl blur-xl group-hover:opacity-100 transition-opacity duration-700"></div>
              
              <div 
                onClick={() => onSelectProduct(activeProduct)}
                className="relative cursor-pointer bg-stone-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-2xl transition-all duration-500 group-hover:border-amber-400/60 group-hover:-translate-y-1"
              >
                {/* Feature tags */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans tracking-widest uppercase bg-amber-500/20 border border-amber-400/40 text-amber-200 font-semibold">
                    <Flame className="w-3 h-3 text-amber-400" />
                    Spotlight Botanical Formula
                  </span>
                  <span className="text-[11px] font-sans tracking-wider uppercase text-stone-300 bg-stone-800/80 px-2.5 py-0.5 rounded-full border border-stone-700">
                    {selectedSize === "20 oz Pack" ? "20 oz Pack" : "10 oz Pouch"}
                  </span>
                </div>

                {/* Main Product Image */}
                <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-xl overflow-hidden bg-stone-950/60 flex items-center justify-center p-2">
                  <img
                    src={imgSrc}
                    alt="Haus of Zen Vitalitea Anti-Inflammatory & Energy Support"
                    referrerPolicy="no-referrer"
                    onError={() => {
                      // High-resolution botanical tea photography fallback if local image is awaiting upload
                      setImgSrc('https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=1000&q=80');
                    }}
                    className="w-full h-full object-contain filter drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Badge overlay */}
                  <div className="absolute bottom-3 right-3 bg-stone-900/90 border border-stone-700/80 rounded-lg px-2.5 py-1 text-[10px] font-mono text-amber-300 backdrop-blur-sm">
                    100% Organic • Caffeine-Free
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                  <span className="flex items-center gap-1.5 text-amber-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Click to view complete apothecary guide
                  </span>
                  <span className="font-serif italic text-stone-300">Formulated in View Park, CA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Ad Copy & Direct Purchase CTAs */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-sans tracking-widest uppercase bg-amber-900/40 border border-amber-600/40 text-amber-300 font-semibold mb-3">
                <Leaf className="w-3 h-3 text-amber-400" />
                Special Apothecary Feature
              </div>

              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white leading-none">
                VITALITEA
              </h2>
              <p className="font-serif text-xl sm:text-2xl text-amber-200/90 italic mt-2">
                Anti-Inflammatory & Sustained Energy Support
              </p>
            </div>

            <p className="font-sans text-sm sm:text-base text-stone-300 leading-relaxed font-light">
              Crafted for sovereign stamina and daily renewal. Vitalitea pairs potent rhizome gingerols with antioxidant-rich crimson hibiscus to quench bodily inflammation, while wild rosemary and red ginseng sharpen mental acuity—delivering crisp, harmonious energy without caffeine jitters or afternoon crashes.
            </p>

            {/* Botanical Quad Highlights */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="font-serif text-amber-200 text-sm font-medium">Ginger Rhizome</div>
                <div className="text-[11px] text-stone-400 mt-0.5">Cellular anti-inflammatory & digestive warmth</div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="font-serif text-amber-200 text-sm font-medium">Hibiscus Petals</div>
                <div className="text-[11px] text-stone-400 mt-0.5">Tart botanical anthocyanins & circulation</div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="font-serif text-amber-200 text-sm font-medium">Rosemary Herb</div>
                <div className="text-[11px] text-stone-400 mt-0.5">Memory clarity & volatile piney freshness</div>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-800/60 border border-stone-700/60">
                <div className="font-serif text-amber-200 text-sm font-medium">Red Ginseng</div>
                <div className="text-[11px] text-stone-400 mt-0.5">Adaptogenic stamina & adrenal recharge</div>
              </div>
            </div>

            {/* Size Options: 10 oz Pouch vs 20 oz Pack */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="font-semibold uppercase tracking-wider text-stone-300">
                  Select Pouch Size:
                </span>
                <span className="text-amber-400 text-xs font-mono font-medium">
                  {selectedSize === "10 oz Pouch" ? "10 oz Pouch • $14.99" : "20 oz Pack • $24.99"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSize("10 oz Pouch")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    selectedSize === "10 oz Pouch"
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-400'
                      : 'bg-stone-900/70 border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-serif text-sm font-semibold text-white">10 oz Pouch</span>
                    <span className="text-xs font-mono font-bold text-amber-300">$14.99</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1">Standard Botanical Size</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSize("20 oz Pack")}
                  className={`p-3.5 rounded-xl border text-left transition-all relative ${
                    selectedSize === "20 oz Pack"
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-400'
                      : 'bg-stone-900/70 border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-serif text-sm font-semibold text-white">20 oz Pack</span>
                    <span className="text-xs font-mono font-bold text-amber-300">$24.99</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">Double Size • Save $5</div>
                </button>
              </div>
            </div>

            {/* Pricing & Guarantee */}
            <div className="flex items-baseline gap-4 pt-2">
              <span className="font-serif text-3xl sm:text-4xl text-white font-medium">
                ${currentPrice.toFixed(2)}
              </span>
              {currentCompareAtPrice && currentCompareAtPrice > currentPrice && (
                <span className="text-stone-400 line-through text-lg">
                  ${currentCompareAtPrice.toFixed(2)}
                </span>
              )}
              {currentCompareAtPrice && currentCompareAtPrice > currentPrice && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-sans font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Save ${(currentCompareAtPrice - currentPrice).toFixed(2)}
                </span>
              )}
            </div>

            {/* Actions: Add to Cart & Fast Live Checkout */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-sans text-xs tracking-wider uppercase font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02]"
              >
                {addedRecently ? (
                  <>
                    <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                    <span>Added to Sanctuary Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Bag • ${currentPrice.toFixed(2)}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleFastBuy}
                className="flex-1 py-4 px-6 rounded-xl bg-stone-100 hover:bg-white text-stone-950 font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02]"
              >
                <Zap className="w-4 h-4 text-amber-700 fill-amber-700" />
                <span>Instant Checkout • ${currentPrice.toFixed(2)}</span>
              </button>
            </div>

            {/* Micro guarantees */}
            <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-6 text-[11px] text-stone-400 font-sans">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Direct Square Live Protected
              </span>
              <span className="flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-300" />
                Hand-blended in Small Batches
              </span>
              <span className="flex items-center gap-1.5">
                <Leaf className="w-3.5 h-3.5 text-sage-400" />
                Zero Fillers or Additives
              </span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
