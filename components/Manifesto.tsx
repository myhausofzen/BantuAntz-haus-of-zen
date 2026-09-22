import React, { useState } from 'react';
import { Sparkles, Leaf, Heart, BookOpen } from 'lucide-react';

export const Manifesto: React.FC = () => {
  const [heroImgSrc, setHeroImgSrc] = useState<string>('/hozserene_1.png');

  return (
    <div className="bg-stone-900 min-h-screen text-stone-50">
      
      {/* Visual Hero Section with hozserene_1.png */}
      <div className="relative min-h-[50vh] md:min-h-[80vh] w-full overflow-hidden flex items-center justify-center pt-8 lg:pt-24 pb-16">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImgSrc} 
            alt="Haus of Zen Apothecary - Whole Plant Medicine & Herbalist Sanctuary" 
            referrerPolicy="no-referrer"
            onError={() => {
              setHeroImgSrc('https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=2000&q=85');
            }}
            className="w-full h-full object-cover object-center filter brightness-[0.88] scale-100 transition-all duration-1000"
          />
          {/* Dual warm gradient overlays for contrast and luxury aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-stone-950/70"></div>
          <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[0.5px]"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 border border-stone-100/30 rounded-full text-[11px] tracking-[0.2em] uppercase backdrop-blur-md mb-6 text-amber-200 bg-stone-900/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>The Apothecary Ethos</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl italic text-white leading-[1.05] mb-6 drop-shadow-md">
            Health is a Narrative
          </h1>

          <p className="font-sans text-base sm:text-lg md:text-xl text-stone-200 leading-relaxed font-light max-w-2xl mx-auto drop-shadow-sm">
            We return to the roots. Behind every glass jar, wildcrafted tincture, and hand-rolled botanical blend is a commitment to honoring cyclical biology, sacred pause, and sovereign self-care.
          </p>

          <div className="flex items-center justify-center gap-6 mt-8 text-xs font-sans tracking-widest uppercase text-stone-300">
            <span className="flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-sage-400" />
              Whole-Plant Compounding
            </span>
            <span className="h-1 w-1 rounded-full bg-stone-400"></span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-amber-300" />
              Womb Sanctuary
            </span>
          </div>
        </div>
      </div>

      {/* Pillars Section */}
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <div className="text-center mb-16">
          <span className="text-[10px] font-sans tracking-[0.25em] uppercase text-stone-400 block mb-2">Four Foundational Pillars</span>
          <h2 className="font-serif text-3xl md:text-4xl text-stone-100">The Architecture of Wellness</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-12 sm:gap-16 mb-24">
          <div className="p-8 rounded-2xl bg-stone-800/40 border border-stone-800">
            <span className="text-sage-400 font-serif text-4xl block mb-4">01.</span>
            <h3 className="text-2xl font-serif mb-3 text-stone-100">Health is a Narrative</h3>
            <p className="font-sans text-stone-300 leading-relaxed text-sm">
              We do not treat symptoms; we treat stories. The body listens to the mind, and the mind is shaped by the words we speak to ourselves. A prescription is not just a chemical intervention—it is a plot twist.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-stone-800/40 border border-stone-800">
            <span className="text-sage-400 font-serif text-4xl block mb-4">02.</span>
            <h3 className="text-2xl font-serif mb-3 text-stone-100">Silence is Medicine</h3>
            <p className="font-sans text-stone-300 leading-relaxed text-sm">
              In a world of constant noise, the most radical act of self-care is silence. We design products and experiences that create pauses in the sentence of your day, allowing your nervous system to reset.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-stone-800/40 border border-stone-800">
            <span className="text-sage-400 font-serif text-4xl block mb-4">03.</span>
            <h3 className="text-2xl font-serif mb-3 text-stone-100">Nature is the Architect</h3>
            <p className="font-sans text-stone-300 leading-relaxed text-sm">
              We return to the roots. Literally. Our formulations mimic the complexity of the natural world, rejecting the synthetic isolation of modern pharma in favor of whole-plant wisdom.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-stone-800/40 border border-stone-800">
            <span className="text-sage-400 font-serif text-4xl block mb-4">04.</span>
            <h3 className="text-2xl font-serif mb-3 text-stone-100">Beauty is Functional</h3>
            <p className="font-sans text-stone-300 leading-relaxed text-sm">
              Aesthetics are not superficial; they are the language of the soul. We believe that surrounding yourself with beauty signals safety to the brain, unlocking the body's innate healing capacity.
            </p>
          </div>
        </div>

        <div className="text-center p-12 bg-stone-800/50 border border-stone-700/60 rounded-2xl">
          <p className="font-serif text-2xl md:text-3xl italic leading-relaxed text-stone-200 mb-8">
            "We are building a sanctuary where the ancient and the avant-garde meet. Welcome to the new era of the apothecary."
          </p>
          <div className="h-px w-20 bg-sage-500 mx-auto"></div>
        </div>
      </div>
    </div>
  );
};