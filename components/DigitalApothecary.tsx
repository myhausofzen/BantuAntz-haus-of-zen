import React, { useState } from 'react';
import { Send, Feather, Loader2 } from 'lucide-react';
import { getNarrativePrescription } from '../services/geminiService';

export const DigitalApothecary: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [prescription, setPrescription] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setPrescription(null);
    
    try {
      const result = await getNarrativePrescription(input);
      setPrescription(result);
    } catch (err) {
      setPrescription("The ether is cloudy. Try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 p-8 bg-white/50 backdrop-blur-sm border border-stone-200 rounded-xl shadow-sm transition-all duration-500">
      <div className="text-center mb-8">
        <h3 className="font-serif text-2xl text-stone-800 italic mb-2">The Digital Apothecary</h3>
        <p className="text-stone-500 font-sans text-sm tracking-wide">
          While our doors are being crafted, tell us your narrative. <br/>
          Receive a poetic prescription for the soul.
        </p>
      </div>

      {!prescription ? (
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="How does your spirit feel today? (e.g., scattered, heavy, hopeful)"
              className="w-full bg-transparent border-b border-stone-300 py-4 px-2 text-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:border-sage-500 transition-colors font-serif italic text-center"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-sage-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="animate-fade-in text-center">
          <div className="mb-6 inline-block p-3 rounded-full bg-stone-100">
            <Feather className="w-6 h-6 text-stone-600" />
          </div>
          <p className="font-serif text-xl md:text-2xl text-stone-800 leading-relaxed italic">
            "{prescription}"
          </p>
          <button 
            onClick={() => {
              setPrescription(null);
              setInput('');
            }}
            className="mt-8 text-xs font-sans uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors border-b border-transparent hover:border-stone-400 pb-0.5"
          >
            Seek Another Truth
          </button>
        </div>
      )}
    </div>
  );
};