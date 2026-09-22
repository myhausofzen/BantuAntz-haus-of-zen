import React, { useState } from 'react';
import { ArrowRight, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Product, ProductIntent } from '../types';
import { ProductCard } from './ProductCard';

interface FeaturedProductsProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onFastCheckout: (product: Product) => void;
  onNavigateToShop: () => void;
}

export const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  products,
  onSelectProduct,
  onAddToCart,
  onFastCheckout,
  onNavigateToShop
}) => {
  const [selectedIntent, setSelectedIntent] = useState<ProductIntent>('All');

  const intents: ProductIntent[] = ['All', 'Sleep', 'Clarity', 'Calm', 'Immunity', 'Balance', 'Radiance'];

  const filteredProducts = selectedIntent === 'All' 
    ? products.slice(0, 6) 
    : products.filter(p => p.intent === selectedIntent).slice(0, 6);

  return (
    <section className="py-24 px-6 bg-stone-100/60 border-t border-stone-200/70">
      <div className="container mx-auto max-w-6xl">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-sans tracking-widest uppercase bg-stone-200/80 text-stone-700 font-medium">
                <Sparkles className="w-3 h-3 text-amber-700" />
                The Apothecary Dispensary
              </span>
            </div>

            <h2 className="font-serif text-3xl md:text-5xl text-stone-900 leading-tight">
              Handcrafted Teas & Botanical Wellness
            </h2>
            <p className="font-sans text-sm text-stone-600 max-w-xl mt-2 leading-relaxed">
              All-natural herbal teas, restorative tinctures, and sacred botanical remedies handcrafted to support womb vitality, hormonal harmony, and deep autonomic calm.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToShop}
              className="group inline-flex items-center gap-2 font-sans text-xs tracking-widest uppercase text-stone-800 hover:text-stone-900 font-semibold transition-colors pb-1 border-b border-stone-800"
            >
              <span>Explore All Products ({products.length})</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Intent Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-sans mr-2 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Intent:</span>
          </div>
          {intents.map((intent) => (
            <button
              key={intent}
              onClick={() => setSelectedIntent(intent)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans tracking-wide transition-all flex-shrink-0 ${
                selectedIntent === intent
                  ? 'bg-stone-900 text-white font-medium shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {intent}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              onFastCheckout={onFastCheckout}
            />
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="mt-14 p-8 rounded-2xl bg-stone-900 text-stone-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="text-center md:text-left">
            <span className="text-[10px] tracking-widest uppercase text-stone-400 font-sans">
              Bespoke Prescriptions
            </span>
            <h3 className="font-serif text-2xl md:text-3xl mt-1 text-white">
              Need a personalized herbal protocol?
            </h3>
            <p className="text-xs text-stone-300 font-sans mt-1.5 max-w-md leading-relaxed">
              Book a 1-on-1 consultation with our clinical herbalists to blend custom tinctures suited to your constitutional narrative.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={onNavigateToShop}
              className="py-3 px-6 rounded-xl bg-white text-stone-900 font-sans text-xs tracking-wider uppercase font-medium hover:bg-stone-100 transition-all text-center"
            >
              View Full Apothecary
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
