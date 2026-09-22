import React, { useState } from 'react';
import { 
  ArrowLeft, Star, ShoppingBag, Zap, ShieldCheck, 
  RotateCcw, Truck, Sparkles, Check, ChevronDown, 
  ChevronUp, Heart, Share2, Copy
} from 'lucide-react';
import { Product } from '../types';

interface ProductDetailProps {
  product: Product;
  allProducts: Product[];
  onBackToShop: () => void;
  onAddToCart: (product: Product, quantity: number, selectedSize?: string, customPrice?: number) => void;
  onFastCheckout: (product: Product, quantity: number, selectedSize?: string, customPrice?: number) => void;
  onSelectProduct: (product: Product) => void;
}

const FALLBACK_DETAIL_IMAGE = 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=1000&q=80';

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  allProducts,
  onBackToShop,
  onAddToCart,
  onFastCheckout,
  onSelectProduct
}) => {
  const [selectedImage, setSelectedImage] = useState<string>(product.image || FALLBACK_DETAIL_IMAGE);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizeOptions?.[0] || product.volume
  );
  const [activeAccordion, setActiveAccordion] = useState<'narrative' | 'ingredients' | 'ritual'>('narrative');
  const [copiedId, setCopiedId] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  React.useEffect(() => {
    setSelectedImage(product.image || FALLBACK_DETAIL_IMAGE);
    setSelectedSize(product.sizeOptions?.[0] || product.volume);
  }, [product]);

  // Gallery list
  const gallery = (product.gallery && product.gallery.filter(Boolean).length > 0)
    ? product.gallery.filter(Boolean)
    : [product.image || FALLBACK_DETAIL_IMAGE];

  // Related pairings (products in same intent or category, excluding current)
  const relatedProducts = allProducts
    .filter(p => p.id !== product.id && (p.intent === product.intent || p.category === product.category))
    .slice(0, 3);

  const currentPrice = (product.sizePrices && selectedSize && product.sizePrices[selectedSize] !== undefined)
    ? product.sizePrices[selectedSize]
    : product.price;

  const currentCompareAtPrice = (product.sizeCompareAtPrices && selectedSize && product.sizeCompareAtPrices[selectedSize] !== undefined)
    ? product.sizeCompareAtPrices[selectedSize]
    : product.compareAtPrice;

  const handleAdd = () => {
    onAddToCart(product, quantity, selectedSize, currentPrice);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleFastBuy = () => {
    onFastCheckout(product, quantity, selectedSize, currentPrice);
  };

  const copySku = () => {
    navigator.clipboard.writeText(product.sku || product.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="pt-4 sm:pt-6 lg:pt-28 pb-32 bg-stone-50 min-h-screen">
      <div className="container mx-auto max-w-6xl px-6">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between py-4 mb-6 border-b border-stone-200/60 text-xs font-sans text-stone-500">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToShop}
              className="flex items-center gap-1.5 text-stone-600 hover:text-stone-950 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Apothecary</span>
            </button>
            <span className="text-stone-300">/</span>
            <span className="text-stone-400 hidden sm:inline">{product.category}</span>
            <span className="text-stone-300 hidden sm:inline">/</span>
            <span className="text-stone-800 font-medium truncate max-w-xs">{product.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              In Stock & Freshly Compounded
            </span>
          </div>
        </div>

        {/* Main Product Hero Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6">
            <div className="sticky top-28 space-y-4">
              
              {/* Primary Image Viewport */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-sm">
                <img 
                  src={selectedImage} 
                  alt={product.name} 
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setSelectedImage('https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=1000&q=80');
                  }}
                  className="w-full h-full object-cover object-center transition-all duration-500"
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-sans font-medium tracking-wider uppercase bg-stone-900/85 text-white backdrop-blur-sm shadow-sm">
                    {product.intent}
                  </span>
                  {currentCompareAtPrice && currentCompareAtPrice > currentPrice && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wider uppercase bg-amber-600/90 text-white backdrop-blur-sm shadow-sm">
                      Save ${((currentCompareAtPrice - currentPrice) * quantity).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-sans text-stone-700 shadow-sm">
                  SKU: {product.sku || product.id}
                </div>
              </div>

              {/* Thumbnails */}
              {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                        selectedImage === img 
                          ? 'border-stone-900 shadow-md scale-95' 
                          : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`View ${idx + 1}`} 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="w-full h-full object-cover" 
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Formulation Certifications */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-sans text-stone-600">
                <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                  <span className="font-semibold block text-stone-900">100% Organic</span>
                  <span>Pure Botanicals</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                  <span className="font-semibold block text-stone-900">Biodynamic</span>
                  <span>Sustainably Wildcrafted</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                  <span className="font-semibold block text-stone-900">Third-Party</span>
                  <span>Lab Certificate</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                  <span className="font-semibold block text-stone-900">Zero Synthetic</span>
                  <span>Cruelty-Free</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Product Narrative & Purchasing Engine */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              
              {/* Category & Botanical Name */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-sans tracking-widest uppercase text-stone-500 font-semibold">
                  {product.category}
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-xs font-sans text-stone-400">
                  {product.volume}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl text-stone-900 leading-tight mb-2">
                {product.name}
              </h1>

              {product.botanicalName && (
                <p className="font-serif italic text-base text-stone-500 mb-3">
                  {product.botanicalName}
                </p>
              )}

              {/* Price & Reviews */}
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-stone-200">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif text-3xl font-bold text-stone-900">
                    ${(currentPrice * quantity).toFixed(2)}
                  </span>
                  {currentCompareAtPrice && (
                    <span className="font-serif text-lg text-stone-400 line-through">
                      ${(currentCompareAtPrice * quantity).toFixed(2)}
                    </span>
                  )}
                  {quantity > 1 && (
                    <span className="text-xs text-stone-500 font-sans">
                      (${currentPrice.toFixed(2)} each)
                    </span>
                  )}
                </div>

                <div className="h-6 w-px bg-stone-200" />

                <div className="flex items-center gap-1.5 text-xs font-sans">
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="font-semibold text-stone-800">{product.rating}</span>
                  <span className="text-stone-400">({product.reviewCount} reviews)</span>
                </div>
              </div>

              {/* Description preview */}
              <p className="font-sans text-sm text-stone-600 leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Size / Format Selector */}
              {product.sizeOptions && product.sizeOptions.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-2">
                    Select Size / Volume
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {product.sizeOptions.map((sz) => {
                      const szPrice = product.sizePrices?.[sz];
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`py-2 px-4 rounded-xl text-xs font-sans tracking-wide transition-all border flex items-center gap-2 ${
                            selectedSize === sz
                              ? 'bg-stone-900 text-white border-stone-900 font-medium shadow-sm'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                          }`}
                        >
                          <span>{sz}</span>
                          {szPrice !== undefined && (
                            <span className={selectedSize === sz ? 'text-amber-300 font-semibold' : 'text-stone-500 font-semibold'}>
                              • ${szPrice.toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Controls */}
              <div className="mb-8 flex items-center gap-4">
                <label className="text-xs font-sans font-medium uppercase tracking-wider text-stone-600">
                  Quantity:
                </label>
                <div className="flex items-center border border-stone-300 rounded-xl bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors text-base font-semibold"
                  >
                    –
                  </button>
                  <span className="w-12 text-center text-xs font-sans font-semibold text-stone-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-stone-600 hover:bg-stone-100 transition-colors text-base font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS: Add to Bag & Fast Checkout */}
              <div className="space-y-3 mb-8">
                
                {/* 1. Fast Checkout Button */}
                <button
                  type="button"
                  onClick={handleFastBuy}
                  className="w-full py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-widest uppercase font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                >
                  <Zap className="w-4 h-4 fill-stone-950 text-stone-950 group-hover:scale-110 transition-transform" />
                  <span>Instant Checkout • ${(currentPrice * quantity).toFixed(2)}</span>
                </button>

                {/* 2. Standard Add to Bag / Checkout */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs tracking-widest uppercase font-medium transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Added to Your Bag</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to Bag</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={copySku}
                    className="p-3.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 transition-colors"
                    title="Copy SKU"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Fast Checkout guarantee badges */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-stone-500 font-sans">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    256-Bit Encrypted Checkout
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-stone-400" />
                    Direct Square Fulfillment
                  </span>
                  <span className="flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                    30-Day Ritual Guarantee
                  </span>
                </div>

              </div>

              {/* Accordions: Narrative, Botanicals, Ritual */}
              <div className="border-t border-stone-200 divide-y divide-stone-200">
                
                {/* 1. Narrative & Benefits */}
                <div>
                  <button
                    onClick={() => setActiveAccordion(activeAccordion === 'narrative' ? '' as any : 'narrative')}
                    className="w-full py-4 flex items-center justify-between text-left font-serif text-lg text-stone-900 hover:text-stone-700"
                  >
                    <span>The Narrative & Formulatory Wisdom</span>
                    {activeAccordion === 'narrative' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activeAccordion === 'narrative' && (
                    <div className="pb-5 text-xs text-stone-600 font-sans leading-relaxed space-y-2 animate-fade-in">
                      <p>{product.description}</p>
                      {product.scentNotes && (
                        <p className="pt-1">
                          <strong className="text-stone-900">Aromatic Profile:</strong> {product.scentNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Active Botanicals */}
                <div>
                  <button
                    onClick={() => setActiveAccordion(activeAccordion === 'ingredients' ? '' as any : 'ingredients')}
                    className="w-full py-4 flex items-center justify-between text-left font-serif text-lg text-stone-900 hover:text-stone-700"
                  >
                    <span>Full Botanical Ingredients List</span>
                    {activeAccordion === 'ingredients' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activeAccordion === 'ingredients' && (
                    <div className="pb-5 text-xs text-stone-600 font-sans leading-relaxed animate-fade-in">
                      <ul className="list-disc pl-5 space-y-1.5">
                        {product.ingredients.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-stone-400 mt-3">
                        Compounded without synthetic parabens, artificial fragrances, silicones, petrochemicals, or synthetic binders.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. The Ritual & Dosage */}
                <div>
                  <button
                    onClick={() => setActiveAccordion(activeAccordion === 'ritual' ? '' as any : 'ritual')}
                    className="w-full py-4 flex items-center justify-between text-left font-serif text-lg text-stone-900 hover:text-stone-700"
                  >
                    <span>Recommended Ritual & Dosage</span>
                    {activeAccordion === 'ritual' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {activeAccordion === 'ritual' && (
                    <div className="pb-5 text-xs text-stone-600 font-sans leading-relaxed space-y-2 animate-fade-in">
                      <p><strong className="text-stone-900">Recommended Dosage:</strong> {product.dosage}</p>
                      <p><strong className="text-stone-900">Ritual Guide:</strong> {product.ritualGuide}</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Harmonizing Ritual Pairings */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-stone-200">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-[10px] font-sans tracking-widest uppercase text-stone-500 font-semibold">
                Complimentary Medicine
              </span>
              <h3 className="font-serif text-3xl text-stone-900 mt-1">
                Harmonizing Ritual Pairings
              </h3>
              <p className="text-xs text-stone-600 font-sans mt-2">
                These formulations amplify and integrate the therapeutic actions of {product.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((relProduct) => (
                <div 
                  key={relProduct.id}
                  onClick={() => onSelectProduct(relProduct)}
                  className="group cursor-pointer bg-white border border-stone-200 rounded-xl overflow-hidden p-4 flex gap-4 items-center hover:shadow-md transition-all hover:border-stone-400"
                >
                  <img 
                    src={relProduct.image} 
                    alt={relProduct.name} 
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-sans tracking-wider uppercase text-stone-400 block">
                      {relProduct.intent}
                    </span>
                    <h4 className="font-serif text-base text-stone-900 group-hover:text-stone-700 truncate">
                      {relProduct.name}
                    </h4>
                    <span className="font-serif font-semibold text-stone-900 text-sm">
                      ${relProduct.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
