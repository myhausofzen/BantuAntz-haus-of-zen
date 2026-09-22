import React from 'react';
import { X, Trash2, ShoppingBag, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number, selectedVolume?: string) => void;
  onRemoveItem: (productId: string, selectedVolume?: string) => void;
  onCheckout: () => void;
  onFastCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onFastCheckout
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + (item.selectedPrice ?? item.product.price) * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-stone-50 border-l border-stone-200 shadow-2xl flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-stone-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-stone-800" />
                <h3 className="font-serif text-xl text-stone-900">Your Botanical Bag</h3>
                <span className="text-xs font-sans text-stone-400">
                  ({items.reduce((s, i) => s + i.quantity, 0)})
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shipping & Fees Notice */}
            <div className="bg-stone-100 rounded-xl p-3 text-xs font-sans text-stone-600">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-stone-800 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-700" />
                  No added handling fee
                </span>
                <span className="text-stone-500 text-[10px]">All fees handled directly on Square</span>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-stone-200/80">
            {items.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h4 className="font-serif text-lg text-stone-700">Your bag is currently empty</h4>
                <p className="text-xs text-stone-500 font-sans mt-1">
                  Discover our restorative tinctures, botanical teas, and temple balms.
                </p>
              </div>
            ) : (
              items.map(({ product, quantity, selectedVolume, selectedPrice }) => {
                const itemUnitPrice = selectedPrice ?? product.price;
                const itemTotal = itemUnitPrice * quantity;
                const itemKey = `${product.id}-${selectedVolume || 'default'}`;
                return (
                  <div key={itemKey} className="py-4 flex gap-4 items-start">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0 text-xs font-serif">
                        Zen
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-serif text-sm text-stone-900 font-semibold truncate">
                          {product.name}
                        </h4>
                        <button 
                          onClick={() => onRemoveItem(product.id, selectedVolume)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] text-amber-900 font-sans font-medium px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 inline-block truncate">
                          {selectedVolume || product.volume}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center border border-stone-200 rounded-lg bg-white overflow-hidden text-xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(product.id, quantity - 1, selectedVolume)}
                            className="px-2 py-0.5 text-stone-500 hover:bg-stone-100"
                          >
                            –
                          </button>
                          <span className="px-2 font-sans font-semibold text-stone-800">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(product.id, quantity + 1, selectedVolume)}
                            className="px-2 py-0.5 text-stone-500 hover:bg-stone-100"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="font-serif text-sm font-semibold text-stone-900">
                            ${itemTotal.toFixed(2)}
                          </span>
                          {quantity > 1 && (
                            <span className="block text-[10px] text-stone-400 font-sans">
                              ${itemUnitPrice.toFixed(2)} each
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-stone-200 bg-white space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-wider font-sans text-stone-500">Subtotal:</span>
                <span className="font-serif text-2xl font-bold text-stone-900">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-sans">
                Taxes and shipping calculated at checkout.
              </p>

              {/* 1. Fast Checkout */}
              <button
                type="button"
                onClick={onFastCheckout}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-widest uppercase font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-stone-950 text-stone-950" />
                <span>Express Fast Checkout</span>
              </button>

              {/* 2. Standard Checkout */}
              <button
                type="button"
                onClick={onCheckout}
                className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs tracking-widest uppercase font-medium transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1 text-[10px] text-stone-400 font-sans flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Encrypted 256-Bit SSL Payments</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
