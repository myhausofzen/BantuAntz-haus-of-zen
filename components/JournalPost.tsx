import React, { useEffect } from 'react';
import { ArrowLeft, Clock, Share2, Bookmark } from 'lucide-react';
import { Logo } from './Logo';

export interface ArticleData {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  image: string;
  content: React.ReactNode;
}

interface JournalPostProps {
  article: ArticleData;
  onBack: () => void;
}

export const JournalPost: React.FC<JournalPostProps> = ({ article, onBack }) => {
  
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-stone-50 min-h-screen animate-fade-in">
      {/* Article Header Image */}
      <div className="relative h-[60vh] w-full">
        <img 
          src={article.image} 
          alt={article.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-stone-900/20"></div>
        
        {/* Navigation Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-white/90 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full transition-all duration-300 font-sans text-xs tracking-widest uppercase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Journal</span>
          </button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 -mt-24 relative z-10 mb-24">
        {/* Title Card */}
        <div className="bg-white p-8 md:p-12 shadow-xl shadow-stone-200/50 rounded-sm mb-12">
          <div className="flex justify-between items-start mb-6">
            <span className="inline-block py-1 px-3 bg-sage-50 text-sage-700 font-sans text-[10px] tracking-widest uppercase rounded-sm">
              {article.category}
            </span>
            <span className="flex items-center gap-2 text-stone-400 font-sans text-xs">
              <Clock className="w-3 h-3" /> {article.readTime}
            </span>
          </div>
          
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-stone-900 leading-[1.1] mb-6">
            {article.title}
          </h1>

          <div className="flex justify-between items-end border-t border-stone-100 pt-6 mt-8">
            <div className="flex flex-col">
              <span className="font-sans text-[10px] text-stone-400 uppercase tracking-widest mb-1">Published</span>
              <span className="font-serif text-lg text-stone-800 italic">{article.date}</span>
            </div>
            <div className="flex gap-4">
              <button className="text-stone-400 hover:text-sage-600 transition-colors"><Share2 className="w-5 h-5" strokeWidth={1.5} /></button>
              <button className="text-stone-400 hover:text-sage-600 transition-colors"><Bookmark className="w-5 h-5" strokeWidth={1.5} /></button>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <div className="prose prose-stone prose-lg md:prose-xl mx-auto font-serif text-stone-600 leading-relaxed selection:bg-sage-200 selection:text-stone-900">
          <p className="font-sans text-lg md:text-xl text-stone-800 leading-relaxed font-light mb-10 border-l-2 border-sage-500 pl-6 italic">
            {article.excerpt}
          </p>
          {article.content}
        </div>

        {/* Footer / Author Block */}
        <div className="mt-16 pt-12 border-t border-stone-200 text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-stone-100 mb-4 shadow-sm">
            <Logo imgClassName="h-12 w-auto" variant="light" />
          </div>
          <p className="font-serif text-xl italic text-stone-800 mb-2">Curated by Haus of Zen</p>
          <p className="font-sans text-xs text-stone-500 uppercase tracking-widest">Wellness Redefined</p>
        </div>
      </article>
    </div>
  );
};