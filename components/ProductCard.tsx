import React from 'react';
import { Star, ShoppingBag, Zap, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, e?: React.MouseEvent) => void;
  onFastCheckout?: (product: Product, e?: React.MouseEvent) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onAddToCart,
  onFastCheckout
}) => {
  const [addedRecently, setAddedRecently] = React.useState(false);

  const [imgSrc, setImgSrc] = React.useState(product.image);

  // Keep image in sync if product prop changes
  React.useEffect(() => {
    setImgSrc(product.image);
  }, [product.image]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product, e);
    setAddedRecently(true);
    setTimeout(() => setAddedRecently(false), 1800);
  };

  const handleFastBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFastCheckout) {
      onFastCheckout(product, e);
    }
  };

  return (
    <div 
      onClick={() => onSelectProduct(product)}
      className="group cursor-pointer bg-white border border-stone-200/80 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lg hover:border-stone-300 relative"
    >
      {/* Top badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
        {product.intent && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium tracking-wider uppercase bg-stone-900/80 text-white backdrop-blur-sm shadow-sm">
            {product.intent}
          </span>
        )}
        {product.compareAtPrice && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-medium tracking-wider uppercase bg-amber-600/90 text-white backdrop-blur-sm">
            Save ${(product.compareAtPrice - product.price).toFixed(0)}
          </span>
        )}
      </div>

      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <img 
          src={imgSrc} 
          alt={product.name} 
          referrerPolicy="no-referrer"
          onError={() => {
            setImgSrc('https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80');
          }}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        
        {/* Quick action bar overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-stone-900/70 via-stone-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2 justify-center items-center">
          <button
            onClick={handleAdd}
            className="py-1.5 px-3 rounded-lg bg-white/95 hover:bg-white text-stone-900 font-sans text-xs font-medium tracking-wide flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
            title="Add to Bag"
          >
            {addedRecently ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Bag</span>
              </>
            )}
          </button>
          
          {onFastCheckout && (
            <button
              onClick={handleFastBuy}
              className="py-1.5 px-3 rounded-lg bg-stone-900/95 hover:bg-stone-900 text-white font-sans text-xs font-medium tracking-wide flex items-center gap-1 shadow-sm transition-all hover:scale-105"
              title="Fast Checkout"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Fast Buy</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-sans mb-1">
            <span className="tracking-wider uppercase">{product.category}</span>
            <span className="opacity-80">{product.volume}</span>
          </div>

          <h4 className="font-serif text-lg text-stone-900 leading-snug group-hover:text-stone-700 transition-colors">
            {product.name}
          </h4>

          {product.botanicalName && (
            <p className="text-[11px] font-serif italic text-stone-500 mb-2 truncate">
              {product.botanicalName}
            </p>
          )}

          <p className="text-xs text-stone-600 font-sans line-clamp-2 leading-relaxed mb-3">
            {product.subtitle || product.description}
          </p>
        </div>

        <div>
          {/* Rating and Price */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="font-medium text-stone-800">{product.rating.toFixed(1)}</span>
              <span className="text-[10px] text-stone-400">({product.reviewCount})</span>
            </div>

            <div className="flex items-baseline gap-1.5">
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-stone-400 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
              <span className="font-serif text-lg font-semibold text-stone-900">
                {product.sizeOptions && product.sizeOptions.length > 1 ? `From $${product.price.toFixed(2)}` : `$${product.price.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
