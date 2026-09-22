import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Sparkles, X, ArrowUpDown, ShieldCheck } from 'lucide-react';
import { Product, ProductCategory, ProductIntent } from '../types';
import { ProductCard } from './ProductCard';

interface ShopProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onFastCheckout: (product: Product) => void;
}

export const Shop: React.FC<ShopProps> = ({
  products,
  onSelectProduct,
  onAddToCart,
  onFastCheckout
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIntent, setSelectedIntent] = useState<ProductIntent>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);

  const categories: string[] = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [products]);

  const intents: ProductIntent[] = [
    'All',
    'Calm',
    'Sleep',
    'Clarity',
    'Immunity',
    'Balance',
    'Radiance'
  ];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesBotanical = product.botanicalName?.toLowerCase().includes(q);
        const matchesDesc = product.description.toLowerCase().includes(q);
        const matchesIngredient = product.ingredients.some(i => i.toLowerCase().includes(q));
        if (!matchesName && !matchesBotanical && !matchesDesc && !matchesIngredient) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All' && product.category !== selectedCategory) {
        return false;
      }

      // Intent
      if (selectedIntent !== 'All' && product.intent !== selectedIntent) {
        return false;
      }

      // In stock
      if (onlyInStock && !product.inStock) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rating') return b.rating - a.rating;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [products, searchQuery, selectedCategory, selectedIntent, sortBy, onlyInStock]);

  const activeFilterCount = (selectedCategory !== 'All' ? 1 : 0) + 
                            (selectedIntent !== 'All' ? 1 : 0) + 
                            (onlyInStock ? 1 : 0) + 
                            (searchQuery ? 1 : 0);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedIntent('All');
    setOnlyInStock(false);
  };

  return (
    <div className="pt-4 sm:pt-6 lg:pt-28 pb-32 bg-stone-50 min-h-screen">
      {/* Hero / Header */}
      <div className="border-b border-stone-200/80 bg-white/70 backdrop-blur-md pb-12 pt-6">
        <div className="container mx-auto max-w-6xl px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-sans tracking-widest uppercase text-stone-500 font-semibold">
                  Haus of Zen • Dispensary
                </span>
              </div>

              <h1 className="font-serif text-4xl md:text-6xl text-stone-900 leading-tight">
                The Apothecary Shop
              </h1>
              <p className="font-sans text-sm text-stone-600 max-w-xl mt-2 leading-relaxed">
                Small-batch biodynamic botanical tinctures, ceremonial teas, and somatic wellness artifacts crafted to restore equilibrium.
              </p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between pt-4 border-t border-stone-100">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search herbs, formulas, feelings (e.g. Sleep, Lion's Mane)..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & In-Stock filter */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-sans text-stone-600 bg-stone-50 px-3 py-2 rounded-xl border border-stone-200 select-none">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <span>In Stock Only</span>
              </label>

              <div className="relative flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-stone-500 mr-2" />
                <span className="text-[11px] text-stone-500 mr-1.5 font-sans">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-stone-800 font-sans focus:outline-none cursor-pointer pr-4"
                >
                  <option value="featured">Featured Curations</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-stone-500 hover:text-stone-900 underline font-sans flex items-center gap-1"
                >
                  Reset ({activeFilterCount})
                </button>
              )}
            </div>

          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-5 pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-sans tracking-wide transition-all whitespace-nowrap flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-white font-medium shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Intent Sub-Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
            <span className="text-[11px] text-stone-400 font-sans flex-shrink-0 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              Mindful State:
            </span>
            {intents.map((intent) => (
              <button
                key={intent}
                onClick={() => setSelectedIntent(intent)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-sans transition-colors whitespace-nowrap flex-shrink-0 ${
                  selectedIntent === intent
                    ? 'bg-sage-100 text-sage-800 font-semibold border border-sage-300'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
              >
                {intent}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="container mx-auto max-w-6xl px-6 pt-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-xs font-sans text-stone-500">
            Showing <span className="font-semibold text-stone-900">{filteredProducts.length}</span> handcrafted formulations
          </p>
          <div className="text-[11px] font-sans text-stone-500">
            All fees &amp; checkout handled directly via Square
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        ) : (
          <div className="py-20 text-center bg-white border border-stone-200 rounded-2xl p-8 max-w-lg mx-auto">
            <SlidersHorizontal className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h3 className="font-serif text-xl text-stone-800 mb-1">No formulations match your criteria</h3>
            <p className="text-xs text-stone-500 font-sans mb-4">
              Try adjusting your search terms or clearing current category and intent filters.
            </p>
            <button
              onClick={clearAllFilters}
              className="py-2 px-4 rounded-lg bg-stone-900 text-white font-sans text-xs tracking-wider uppercase"
            >
              Clear All Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
