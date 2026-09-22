import React, { useState } from 'react';
import { ArrowDown, Instagram, Facebook, Mail, Calendar, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';
import { DigitalApothecary } from './DigitalApothecary';
import { FeaturedProducts } from './FeaturedProducts';
import { VitaliteaSpotlight } from './VitaliteaSpotlight';
import { Product } from '../types';

interface HomeProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number, selectedSize?: string, customPrice?: number) => void;
  onFastCheckout: (product: Product, quantity?: number, selectedSize?: string, customPrice?: number) => void;
  onNavigateToShop: () => void;
  onNavigateToAppointments: () => void;
}

export const Home: React.FC<HomeProps> = ({
  products,
  onSelectProduct,
  onAddToCart,
  onFastCheckout,
  onNavigateToShop,
  onNavigateToAppointments
}) => {
  const [heroImgSrc, setHeroImgSrc] = useState<string>('/yonisteam_1.png');

  return (
    <>
      {/* Full Screen Hero Section with yonisteam_1.png */}
      <div className="relative min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] lg:h-screen w-full overflow-hidden flex items-center justify-center py-10 lg:py-0">
        
        {/* Hero Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImgSrc}
            alt="Haus of Zen Sacred Botanical Yoni Steam Ritual"
            referrerPolicy="no-referrer"
            onError={() => {
              setHeroImgSrc('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=2000&q=85');
            }}
            className="w-full h-full object-cover object-center scale-100 transition-all duration-1000"
          />
          {/* Overlay for text readability and warm sanctuary atmosphere */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/50 to-stone-950/40"></div>
          <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[0.5px]"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 text-center text-stone-50 mt-0 lg:mt-20">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 py-1.5 px-5 border border-stone-50/30 rounded-full text-[11px] tracking-[0.2em] uppercase backdrop-blur-sm mb-6 text-stone-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Specializing in Womb Health</span>
            </div>
            
            <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] mb-8 drop-shadow-sm tracking-tight text-white">
              Herbal Teas & <br/>
              <span className="italic font-light text-amber-100/90">Botanical Wellness</span>
            </h1>
            
            <p className="font-sans text-base md:text-xl text-stone-200 leading-relaxed max-w-xl mx-auto mb-10 drop-shadow-sm font-light">
              Handcrafted, all-natural herbal teas and botanical wellness remedies formulated to honor your sacred center, harmonize cyclical rhythms, and support lifelong womb health.
            </p>

            {/* Quick Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
              <button
                onClick={onNavigateToShop}
                className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-stone-50 hover:bg-white text-stone-900 font-sans text-xs tracking-widest uppercase font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Explore Teas & Botanicals
              </button>
              <button
                onClick={onNavigateToAppointments}
                className="w-full sm:w-auto py-3.5 px-8 rounded-full bg-stone-900/70 hover:bg-stone-900 border border-stone-100/30 text-stone-50 font-sans text-xs tracking-widest uppercase font-medium backdrop-blur-sm transition-all hover:scale-105"
              >
                Book Consultation
              </button>
            </div>

            <div className="w-full max-w-md mx-auto mb-12">
              <WaitlistForm />
            </div>

            <div className="flex justify-center gap-8 text-stone-300">
              <a href="#" className="hover:text-white transition-colors hover:scale-110 transform duration-300"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors hover:scale-110 transform duration-300"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors hover:scale-110 transform duration-300"><Mail className="w-5 h-5" /></a>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-stone-300/50">
          <ArrowDown className="w-6 h-6" />
        </div>
      </div>

      {/* Featured Botanical Products Section on Homepage */}
      <FeaturedProducts
        products={products}
        onSelectProduct={onSelectProduct}
        onAddToCart={(p) => onAddToCart(p, 1)}
        onFastCheckout={(p) => onFastCheckout(p, 1)}
        onNavigateToShop={onNavigateToShop}
      />

      {/* Product Advertisement Spotlight: Vitalitea */}
      <VitaliteaSpotlight
        product={products.find(p => p.id === 'VITALITEA-ENERGY-SUPPORT' || p.name.toLowerCase().includes('vitalitea'))}
        onSelectProduct={onSelectProduct}
        onAddToCart={onAddToCart}
        onFastCheckout={onFastCheckout}
      />

      {/* Narrative & Digital Apothecary Section */}
      <main className="bg-stone-50 relative z-20">
        <div className="container mx-auto max-w-4xl px-6 py-24">
          
          <div className="text-center mb-16">
             <h2 className="font-serif text-4xl text-stone-900 mb-6">The Art of Botanical Healing</h2>
             <p className="font-sans text-stone-600 leading-relaxed max-w-2xl mx-auto">
               We believe that true vitality begins in the sacred center. Our apothecary pairs time-honored
               herbalism with pure, all-natural compounding—crafting restorative teas, cycle-nourishing
               elixirs, and holistic womb wellness rituals.
             </p>
          </div>

          <DigitalApothecary />

        </div>
      </main>

      {/* Appointments Sanctuary Banner */}
      <section className="py-20 px-6 bg-stone-900 text-stone-100 relative overflow-hidden">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="max-w-xl text-center md:text-left">
            <span className="text-[10px] font-sans tracking-widest uppercase text-amber-300 font-semibold flex items-center justify-center md:justify-start gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Sanctuary Appointments & Consultations
            </span>
            <h3 className="font-serif text-3xl md:text-5xl text-white leading-tight">
              One-on-One Bodily Mapping & Custom Compounding
            </h3>
            <p className="text-xs md:text-sm text-stone-300 font-sans mt-3 leading-relaxed">
              Step into our tranquil dispensary for clinical herbalism, somatic singing bowl resonance, or blend your own bespoke 100ml amber bottle tincture.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={onNavigateToAppointments}
              className="py-3.5 px-8 rounded-xl bg-white text-stone-900 font-sans text-xs tracking-wider uppercase font-semibold hover:bg-stone-100 transition-all text-center flex items-center justify-center gap-2 shadow-lg hover:scale-105"
            >
              <span>Schedule Consultation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </>
  );
};
