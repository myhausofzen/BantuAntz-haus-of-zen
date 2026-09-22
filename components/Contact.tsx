import React, { useState } from 'react';
import { Mail, MapPin, Phone, Globe, Send, Loader2, Check, AlertCircle } from 'lucide-react';

export const Contact: React.FC = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) return;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name,
          email: formState.email,
          message: formState.message
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to deliver message.');
      }

      setStatus('success');
      setFormState({ name: '', email: '', message: '' });
    } catch (err: any) {
      console.error('Contact submission error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unable to deliver message at this moment.');
    }
  };

  return (
    <div className="bg-stone-50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="bg-stone-900 pt-10 lg:pt-32 pb-16 lg:pb-20 px-6 text-center text-stone-50">
        <h1 className="font-serif text-5xl md:text-7xl italic mb-6">Get in Touch</h1>
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-stone-400">Speak to the Apothecary</p>
      </div>

      <div className="container mx-auto px-6 py-24 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24">
          
          {/* Contact Info */}
          <div>
            <h2 className="font-serif text-3xl text-stone-900 mb-8">Visit the Sanctuary</h2>
            <p className="font-sans text-stone-600 leading-relaxed mb-12">
              While our digital doors are always open, our sanctuary is a dedicated refuge for restoration and womb wellness. 
              We welcome your questions, consultation requests, and connections.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-stone-200 rounded-full text-stone-700">
                    <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-stone-800 mb-1">Location</h3>
                  <p className="font-sans text-sm text-stone-500 leading-relaxed">
                    Long Beach, CA
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-stone-200 rounded-full text-stone-700">
                    <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-stone-800 mb-1">Phone</h3>
                  <p className="font-sans text-sm text-stone-500 leading-relaxed">
                    <a href="tel:+13109250920" className="hover:text-stone-900 transition-colors">
                      +1 310-925-0920
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-stone-200 rounded-full text-stone-700">
                    <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-stone-800 mb-1">Email</h3>
                  <p className="font-sans text-sm text-stone-500 leading-relaxed">
                    <a href="mailto:info@myhausofzen.com" className="hover:text-stone-900 transition-colors">
                      info@myhausofzen.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                 <div className="p-3 bg-stone-200 rounded-full text-stone-700">
                    <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-stone-800 mb-1">Website</h3>
                  <p className="font-sans text-sm text-stone-500 leading-relaxed">
                    <a href="https://www.myhausofzen.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 transition-colors">
                      www.myhausofzen.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 md:p-12 shadow-xl shadow-stone-200/50 rounded-sm">
            <h2 className="font-serif text-3xl text-stone-900 mb-2">Send a Message</h2>
            <p className="font-sans text-xs tracking-widest uppercase text-stone-400 mb-8">We listen to every story</p>

            {status === 'success' ? (
              <div className="h-72 flex flex-col items-center justify-center text-center animate-fade-in p-6">
                <div className="w-16 h-16 bg-stone-900 text-amber-300 rounded-full flex items-center justify-center mb-6 shadow-md border border-stone-800">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl text-stone-900 mb-2">Message Delivered</h3>
                <p className="font-sans text-stone-600 text-sm max-w-md leading-relaxed">
                  Thank you for reaching out. Your note has been delivered to our sanctuary team via Resend. We will review your message and reply promptly.
                </p>
                <button 
                  onClick={() => {
                    setStatus('idle');
                    setErrorMessage(null);
                  }} 
                  className="mt-8 text-xs font-sans uppercase tracking-widest text-stone-500 hover:text-stone-900 border-b border-stone-300 pb-1 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3 text-xs leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-900">Delivery Notice</p>
                      <p className="text-amber-800">{errorMessage}</p>
                      <p className="pt-1">
                        You can also reach us directly anytime at{' '}
                        <a href="mailto:info@myhausofzen.com" className="underline font-medium hover:text-amber-950">
                          info@myhausofzen.com
                        </a>{' '}
                        or call{' '}
                        <a href="tel:+13109250920" className="underline font-medium hover:text-amber-950">
                          +1 310-925-0920
                        </a>.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block font-sans text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Name</label>
                  <input 
                    type="text" 
                    id="name"
                    required
                    value={formState.name}
                    onChange={e => {
                      setFormState({...formState, name: e.target.value});
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full bg-stone-50 border-b border-stone-200 focus:border-stone-900 px-4 py-3 text-stone-800 outline-none transition-colors font-serif text-lg"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block font-sans text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Email</label>
                  <input 
                    type="email" 
                    id="email"
                    required
                    value={formState.email}
                    onChange={e => {
                      setFormState({...formState, email: e.target.value});
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full bg-stone-50 border-b border-stone-200 focus:border-stone-900 px-4 py-3 text-stone-800 outline-none transition-colors font-serif text-lg"
                    placeholder="email@address.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block font-sans text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Message</label>
                  <textarea 
                    id="message"
                    required
                    rows={4}
                    value={formState.message}
                    onChange={e => {
                      setFormState({...formState, message: e.target.value});
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full bg-stone-50 border-b border-stone-200 focus:border-stone-900 px-4 py-3 text-stone-800 outline-none transition-colors font-serif text-lg resize-none"
                    placeholder="Tell us what is on your mind..."
                  />
                </div>

                <button 
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full bg-stone-900 text-stone-50 py-4 mt-4 hover:bg-stone-800 transition-colors duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 rounded-xl"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                      <span className="font-sans text-xs tracking-[0.2em] uppercase">Sending to Sanctuary...</span>
                    </>
                  ) : (
                    <>
                      <span className="font-sans text-xs tracking-[0.2em] uppercase">Send Message</span>
                      <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};