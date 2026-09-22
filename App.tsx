import React, { useEffect, useState } from 'react';
import { ShoppingBag, Sparkles, ShieldCheck } from 'lucide-react';
import { Logo } from './components/Logo';
import { Home } from './components/Home';
import { Manifesto } from './components/Manifesto';
import { Journal } from './components/Journal';
import { Contact } from './components/Contact';
import { Shop } from './components/Shop';
import { ProductDetail } from './components/ProductDetail';
import { Appointments } from './components/Appointments';
import { CartDrawer } from './components/CartDrawer';
import { FastCheckoutModal } from './components/FastCheckoutModal';
import { ThankYouModal } from './components/ThankYouModal';

import { Page, Product, CartItem } from './types';
import { INITIAL_PRODUCTS } from './services/productData';
import { CheckoutResult } from './services/checkoutService';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const CART_STORAGE_KEY = 'haus_of_zen_cart_items';

const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Products state - initialized immediately with botanical products & consultation packages
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Synchronize products live with Square Catalog
  const syncSquareCatalog = async (force = false) => {
    try {
      setIsCatalogSyncing(true);
      const url = force ? '/api/square/catalog/refresh' : '/api/square/catalog';
      const method = force ? 'POST' : 'GET';
      const res = await fetch(url, { method });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
        const timestamp = data.lastSynced ? new Date(data.lastSynced) : new Date();
        setLastSyncTime(timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.warn('Square catalog live sync notice:', err);
    } finally {
      setIsCatalogSyncing(false);
    }
  };

  useEffect(() => {
    // Initial fetch from Square live catalog
    syncSquareCatalog(false);

    // Auto-sync every 60 seconds so any changes made in the Square POS / app automatically reflect
    const interval = setInterval(() => {
      syncSquareCatalog(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isFastCheckoutOpen, setIsFastCheckoutOpen] = useState(false);
  const [fastCheckoutItems, setFastCheckoutItems] = useState<
    { productId: string; name: string; quantity: number; price: number; volume?: string; image?: string }[]
  >([]);

  // Post-checkout Thank You Modal state
  const [thankYouOrder, setThankYouOrder] = useState<{
    isOpen: boolean;
    orderId?: string | null;
    customerEmail?: string | null;
  }>({
    isOpen: false,
    orderId: 'KRL5aRqPnUdImij1usE7WwMAT0SZY',
    customerEmail: 'patron@myhausofzen.com'
  });

  // Listen for return from Square Checkout
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const orderStatus = urlParams.get('order_status');
      const orderId = urlParams.get('orderId') || urlParams.get('order_id') || urlParams.get('transactionId');
      const checkoutStatus = urlParams.get('checkout');

      if (orderStatus === 'success' || checkoutStatus === 'success' || (orderId && !urlParams.has('error'))) {
        // Clear cart
        setCartItems([]);
        localStorage.removeItem(CART_STORAGE_KEY);

        // Open elegant thank you modal
        setThankYouOrder({
          isOpen: true,
          orderId: orderId || null,
          customerEmail: urlParams.get('buyer_email') || null
        });

        // Clean the URL without page reload
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('Error reading order parameters from URL', e);
    }
  }, []);

  // Sync cart with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Could not persist cart', e);
    }
  }, [cartItems]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
  }, [currentPage, selectedProduct]);

  // Cart actions
  const handleAddToCart = (product: Product, quantity: number = 1, selectedSize?: string, customPrice?: number) => {
    const activeVolume = selectedSize || product.volume;
    const activePrice = customPrice !== undefined 
      ? customPrice 
      : (product.sizePrices && selectedSize && product.sizePrices[selectedSize] !== undefined
          ? product.sizePrices[selectedSize]
          : product.price);

    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id && item.selectedVolume === activeVolume);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        next[existingIdx].selectedPrice = activePrice;
        return next;
      }
      return [...prev, { product, quantity, selectedVolume: activeVolume, selectedPrice: activePrice }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number, selectedVolume?: string) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId, selectedVolume);
      return;
    }
    setCartItems(prev => prev.map(item => {
      const match = selectedVolume !== undefined
        ? (item.product.id === productId && item.selectedVolume === selectedVolume)
        : (item.product.id === productId);
      return match ? { ...item, quantity } : item;
    }));
  };

  const handleRemoveCartItem = (productId: string, selectedVolume?: string) => {
    setCartItems(prev => prev.filter(item => {
      if (selectedVolume !== undefined) {
        return !(item.product.id === productId && item.selectedVolume === selectedVolume);
      }
      return item.product.id !== productId;
    }));
  };

  // Product Selection
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentPage('product-detail');
  };

  // Fast Checkout triggers
  const handleTriggerFastCheckoutForProduct = (product: Product, quantity: number = 1, selectedSize?: string, customPrice?: number) => {
    const activeVolume = selectedSize || product.volume;
    const activePrice = customPrice !== undefined 
      ? customPrice 
      : (product.sizePrices && selectedSize && product.sizePrices[selectedSize] !== undefined
          ? product.sizePrices[selectedSize]
          : product.price);

    setFastCheckoutItems([{
      productId: product.id,
      name: product.name,
      quantity,
      price: activePrice,
      volume: activeVolume,
      image: product.image,
      squareVariationId: product.squareVariationId
    }]);
    setIsFastCheckoutOpen(true);
  };

  const handleTriggerFastCheckoutFromCart = () => {
    if (cartItems.length === 0) return;
    setFastCheckoutItems(cartItems.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.selectedPrice ?? item.product.price,
      volume: item.selectedVolume || item.product.volume,
      image: item.product.image,
      squareVariationId: item.product.squareVariationId
    })));
    setIsCartOpen(false);
    setIsFastCheckoutOpen(true);
  };

  const handleOrderSuccess = (result: CheckoutResult) => {
    // Empty cart
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
    setIsFastCheckoutOpen(false);

    // Open elegant thank you modal
    setThankYouOrder({
      isOpen: true,
      orderId: result.orderId || null,
      customerEmail: null
    });
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const NavLink = ({ page, label }: { page: Page; label: string }) => (
    <button 
      onClick={() => {
        setSelectedProduct(null);
        setCurrentPage(page);
      }}
      className={`font-sans text-xs tracking-widest uppercase transition-colors relative group py-1
        ${scrolled || currentPage !== 'home' 
          ? (currentPage === page && !selectedProduct ? 'text-stone-900 font-semibold' : 'text-stone-600 hover:text-stone-900') 
          : 'text-stone-200 hover:text-white'
        }`}
    >
      {label}
      <span className={`absolute -bottom-1 left-0 w-full h-px bg-current transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${currentPage === page && !selectedProduct ? 'scale-x-100' : ''}`}></span>
    </button>
  );

  const renderPage = () => {
    if (currentPage === 'product-detail' && selectedProduct) {
      return (
        <ProductDetail
          product={selectedProduct}
          allProducts={products}
          onBackToShop={() => setCurrentPage('shop')}
          onAddToCart={handleAddToCart}
          onFastCheckout={handleTriggerFastCheckoutForProduct}
          onSelectProduct={handleSelectProduct}
        />
      );
    }

    switch(currentPage) {
      case 'home':
        return (
          <Home
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onFastCheckout={handleTriggerFastCheckoutForProduct}
            onNavigateToShop={() => setCurrentPage('shop')}
            onNavigateToAppointments={() => setCurrentPage('appointments')}
          />
        );
      case 'shop':
        return (
          <Shop
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onFastCheckout={(p) => handleTriggerFastCheckoutForProduct(p, 1)}
            onSyncSquareCatalog={() => syncSquareCatalog(true)}
            isSyncingCatalog={isCatalogSyncing}
            lastSyncTime={lastSyncTime}
          />
        );
      case 'appointments':
        return (
          <Appointments 
            onNavigateToShop={() => {
              setSelectedProduct(null);
              setCurrentPage('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        );
      case 'manifesto': return <Manifesto />;
      case 'journal': return <Journal />;
      case 'contact': return <Contact />;
      default:
        return (
          <Home
            products={products}
            onSelectProduct={handleSelectProduct}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onFastCheckout={(p) => handleTriggerFastCheckoutForProduct(p, 1)}
            onNavigateToShop={() => setCurrentPage('shop')}
            onNavigateToAppointments={() => setCurrentPage('appointments')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 selection:bg-sage-200 selection:text-stone-900 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-40 transition-all duration-500 
        ${scrolled || currentPage !== 'home' 
          ? 'bg-white/95 backdrop-blur-md py-3 sm:py-3.5 shadow-sm border-b border-stone-200/60' 
          : 'bg-stone-950/95 backdrop-blur-md lg:bg-transparent py-3 sm:py-3.5 lg:py-7 border-b border-stone-800/40 lg:border-transparent'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          
          <button 
            onClick={() => {
              setSelectedProduct(null);
              setCurrentPage('home');
            }} 
            className="group flex items-center"
            aria-label="Haus of Zen Home"
          >
            <Logo 
              className="transition-all duration-300"
              imgClassName={scrolled || currentPage !== 'home' ? 'h-9 sm:h-10 md:h-11' : 'h-9 sm:h-10 lg:h-14'}
              variant={scrolled || currentPage !== 'home' ? 'light' : 'dark'}
            />
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-7">
            <NavLink page="shop" label="Shop" />
            <NavLink page="appointments" label="Appointments" />
            <NavLink page="manifesto" label="Manifesto" />
            <NavLink page="journal" label="Journal" />
            <NavLink page="contact" label="Contact" />
          </div>

          {/* Desktop Right Actions: Shopping Bag */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 rounded-full transition-colors flex items-center justify-center ${
                scrolled || currentPage !== 'home'
                  ? 'text-stone-800 hover:bg-stone-100'
                  : 'text-stone-50 hover:text-white hover:bg-white/10'
              }`}
              title="Open Botanical Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] font-sans font-bold flex items-center justify-center shadow-sm">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Menu & Cart Buttons */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsCartOpen(true)}
              className={`relative p-2 rounded-full ${
                scrolled || currentPage !== 'home' ? 'text-stone-800' : 'text-stone-50'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] font-sans font-bold flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </button>

            <button 
              className="p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <div className={`w-6 h-0.5 mb-1.5 transition-all ${scrolled || currentPage !== 'home' ? 'bg-stone-800' : 'bg-stone-50'} ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
              <div className={`w-6 h-0.5 mb-1.5 transition-all ${scrolled || currentPage !== 'home' ? 'bg-stone-800' : 'bg-stone-50'} ${isMenuOpen ? 'opacity-0' : ''}`}></div>
              <div className={`w-6 h-0.5 transition-all ${scrolled || currentPage !== 'home' ? 'bg-stone-800' : 'bg-stone-50'} ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
            </button>
          </div>

        </div>

        {/* Mobile Menu Drawer */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white border-b border-stone-200 py-6 px-6 flex flex-col gap-4 lg:hidden animate-fade-in shadow-xl">
            <div className="pb-3 mb-1 border-b border-stone-100 flex justify-center">
              <Logo imgClassName="h-10 w-auto" variant="light" />
            </div>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('shop'); setIsMenuOpen(false); }} 
              className="text-left font-serif text-2xl text-stone-800 hover:text-stone-950 flex items-center justify-between"
            >
              <span>Shop Apothecary</span>
              <span className="text-xs font-sans text-stone-400 uppercase tracking-widest">Products</span>
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('appointments'); setIsMenuOpen(false); }} 
              className="text-left font-serif text-2xl text-stone-800 hover:text-stone-950 flex items-center justify-between"
            >
              <span>Book Appointment</span>
              <span className="text-xs font-sans text-stone-400 uppercase tracking-widest">Rituals</span>
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('manifesto'); setIsMenuOpen(false); }} 
              className="text-left font-serif text-2xl text-stone-800 hover:text-stone-950"
            >
              Manifesto
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('journal'); setIsMenuOpen(false); }} 
              className="text-left font-serif text-2xl text-stone-800 hover:text-stone-950"
            >
              Journal
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('contact'); setIsMenuOpen(false); }} 
              className="text-left font-serif text-2xl text-stone-800 hover:text-stone-950"
            >
              Contact
            </button>
          </div>
        )}
      </nav>

      {/* Main Page Content - Starts cleanly below the mobile nav bar */}
      <main className="pt-16 sm:pt-20 lg:pt-0">
        {renderPage()}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleTriggerFastCheckoutFromCart}
        onFastCheckout={handleTriggerFastCheckoutFromCart}
      />

      {/* Fast Checkout Modal */}
      <FastCheckoutModal
        isOpen={isFastCheckoutOpen}
        onClose={() => setIsFastCheckoutOpen(false)}
        items={fastCheckoutItems}
        onSuccess={handleOrderSuccess}
        onContinueShopping={() => {
          setIsFastCheckoutOpen(false);
          setSelectedProduct(null);
          setCurrentPage('shop');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Elegant Post-Purchase Thank You Modal */}
      <ThankYouModal
        isOpen={thankYouOrder.isOpen}
        orderId={thankYouOrder.orderId}
        customerEmail={thankYouOrder.customerEmail}
        onClose={() => setThankYouOrder({ isOpen: false })}
        onContinueShopping={() => {
          setThankYouOrder({ isOpen: false });
          setSelectedProduct(null);
          setCurrentPage('shop');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onExploreConsultations={() => {
          setThankYouOrder({ isOpen: false });
          setSelectedProduct(null);
          setCurrentPage('appointments');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Footer */}
      <footer className={`py-14 px-6 border-t border-stone-800/10 ${currentPage === 'manifesto' ? 'bg-stone-900 text-stone-400 border-stone-800' : 'bg-stone-100 text-stone-500'}`}>
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center md:items-start text-center md:text-left gap-8">
          <div>
            <Logo 
              className={`justify-center md:justify-start mb-3 ${currentPage === 'manifesto' ? 'text-stone-200' : 'text-stone-800'}`} 
              imgClassName="h-12 sm:h-14 w-auto"
              variant={currentPage === 'manifesto' ? 'dark' : 'light'}
            />
            <p className="text-xs font-sans max-w-xs leading-relaxed opacity-80 mb-2">
              Long Beach, CA<br/>
              Handcrafted all-natural herbal teas & botanical wellness specializing in womb health.
            </p>
            <p className="text-xs font-sans text-stone-600 mb-3 space-y-0.5">
              <a href="tel:+13109250920" className="hover:text-stone-900 transition-colors block">+1 310-925-0920</a>
              <a href="mailto:info@myhausofzen.com" className="hover:text-stone-900 transition-colors block">info@myhausofzen.com</a>
              <a href="https://www.myhausofzen.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors block">www.myhausofzen.com</a>
            </p>
            <p className="text-[11px] font-sans text-stone-400">
              © {new Date().getFullYear()} Haus of Zen. All rights reserved.
            </p>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap justify-center gap-8 text-xs tracking-widest uppercase font-sans">
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('shop'); }} 
              className="hover:text-stone-900 transition-colors"
            >
              Shop
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('appointments'); }} 
              className="hover:text-stone-900 transition-colors"
            >
              Appointments
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('manifesto'); }} 
              className="hover:text-stone-900 transition-colors"
            >
              Manifesto
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('journal'); }} 
              className="hover:text-stone-900 transition-colors"
            >
              Journal
            </button>
            <button 
              onClick={() => { setSelectedProduct(null); setCurrentPage('contact'); }} 
              className="hover:text-stone-900 transition-colors"
            >
              Contact
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] tracking-widest uppercase font-sans opacity-80">
             <a href="#" className="hover:underline underline-offset-4">Privacy Policy</a>
             <a href="#" className="hover:underline underline-offset-4">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Vercel Web Analytics & Speed Insights */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
};

export default App;
