import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export const WaitlistForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
      setEmail('');
    }, 1500);
  };

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center gap-2 text-sage-700 bg-sage-50 py-3 px-6 rounded-full animate-fade-in">
        <Check className="w-4 h-4" />
        <span className="font-sans text-sm font-medium tracking-wide">You are on the list. Peace be with you.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="flex-1 bg-white border border-stone-200 text-stone-800 px-6 py-3 rounded-full focus:outline-none focus:ring-1 focus:ring-stone-400 font-sans text-sm transition-shadow shadow-sm hover:shadow-md"
        required
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-stone-900 text-stone-50 px-8 py-3 rounded-full font-sans text-sm tracking-wide hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg hover:shadow-xl"
      >
        <span>{status === 'loading' ? 'Joining...' : 'Notify Me'}</span>
        {!status && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  );
};