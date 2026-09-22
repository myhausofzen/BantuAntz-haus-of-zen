import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { JournalPost, ArticleData } from './JournalPost';

// Full Mock Data with Content
const JOURNAL_DATA: ArticleData[] = [
  {
    id: 'morning-silence',
    category: "Ritual",
    title: "The Chemistry of Morning Silence",
    excerpt: "Why the first ten minutes of your day define your neurochemistry, and how to reclaim them from the digital noise.",
    date: "October 12, 2024",
    readTime: "4 min read",
    image: "https://images.pexels.com/photos/3771836/pexels-photo-3771836.jpeg",
    content: (
      <>
        <p>
          The sun has not yet crested the horizon, but your hand is already reaching for the glowing rectangle on your nightstand. Before your feet touch the floor, your mind is flooded with the world’s emergencies, the curated lives of strangers, and the urgent pings of productivity.
        </p>
        <p>
          Biologically, you have just hijacked your cortisol awakening response.
        </p>
        <h3>The Sacred Window</h3>
        <p>
          In the narrative of the day, the opening sentence sets the tone for the entire chapter. Neuroscientists call the state immediately following sleep "hypnagogia"—a fluid, dream-like state where the brain is uniquely plastic and creative. By flooding this state with high-dopamine digital input, we shock the system into a reactive beta-wave state.
        </p>
        <p>
          We propose a radical intervention: <strong>Ten minutes of nothing.</strong>
        </p>
        <p>
          No phone. No news. No conversation. Just the raw, unedited sensory experience of being alive. The texture of the floorboards, the steam rising from a cup of tea, the sound of your own breath.
        </p>
        <h3>The Prescription</h3>
        <p>
          Begin tomorrow. Place your phone in another room tonight. Let the silence be the first thing you consume. It is not empty; it is full of you.
        </p>
      </>
    )
  },
  {
    id: 'ashwagandha',
    category: "Ingredients",
    title: "Ashwagandha: The Ancient Adaptogen",
    excerpt: "Exploring the root that helps the body manage stress. A deep dive into the 'smell of the horse' and its grounding properties.",
    date: "October 08, 2024",
    readTime: "6 min read",
    image: "https://images.pexels.com/photos/6738596/pexels-photo-6738596.jpeg",
    content: (
      <>
        <p>
          In Sanskrit, <em>Ashwagandha</em> translates roughly to "smell of the horse." While less poetic than we might like, the name refers not just to its distinct earthy aroma, but to the belief that consuming it imparts the strength and virility of a stallion.
        </p>
        <p>
          But in our modern, hyper-accelerated context, we value this root for a different quality: <strong>Resilience.</strong>
        </p>
        <h3>The Science of Adaptation</h3>
        <p>
          Ashwagandha is classified as an adaptogen. Unlike stimulants (coffee) that borrow energy from tomorrow, or sedatives (alcohol) that numb the senses, adaptogens work with the body's hypothalamic-pituitary-adrenal (HPA) axis to normalize cortisol levels.
        </p>
        <p>
          Think of it as a thermostat for your stress response. If you are too high, it brings you down. If you are too low, it lifts you up.
        </p>
        <p>
          We source our roots from semi-arid regions where the plant struggles to survive. It is this struggle that creates the potent withanolides—the active compounds that pass their resilience on to you. We are literally consuming the plant's triumph over its environment.
        </p>
      </>
    )
  },
  {
    id: 'stone-bottles',
    category: "Philosophy",
    title: "Why We Use Stone Bottles",
    excerpt: "Tactility is a forgotten sense in the digital age. Discover the design philosophy behind our heavy, cool-to-the-touch vessels.",
    date: "September 29, 2024",
    readTime: "3 min read",
    image: "https://images.pexels.com/photos/8354719/pexels-photo-8354719.jpeg",
    content: (
      <>
        <p>
          Pick up a standard plastic vitamin bottle. It is light, warm, and frictionless. It feels cheap because it is cheap. It tells your subconscious that the contents are trivial.
        </p>
        <p>
          Now, imagine a vessel carved from stone.
        </p>
        <h3>Weight is Value</h3>
        <p>
          At Haus of Zen, our packaging is not an afterthought; it is part of the medicinal delivery system. We use weighted ceramic and stone composites because weight signals importance to the human brain.
        </p>
        <p>
          When you pick up one of our jars, the coolness of the stone against your palm activates your tactile senses. It grounds you in the physical moment. The act of unscrewing a heavy lid becomes a ritual, a deliberate pause.
        </p>
        <p>
          We are not just selling supplements; we are selling the moment of care you take to administer them. If the bottle feels precious, you will treat yourself as precious.
        </p>
      </>
    )
  },
  {
    id: 'digital-detox',
    category: "Mindfulness",
    title: "The Digital Detox Paradox",
    excerpt: "We cannot escape technology, but we can curate it. How to build a 'digital apothecary' on your own phone.",
    date: "September 15, 2024",
    readTime: "5 min read",
    image: "https://images.pexels.com/photos/5081395/pexels-photo-5081395.jpeg",
    content: (
      <>
        <p>
          The idea of a full "digital detox" is a romantic fantasy for most. We work on screens, we connect on screens, we navigate our world through screens. To reject them entirely is to reject modern life.
        </p>
        <p>
          Instead of rejection, we advocate for <strong>curation</strong>.
        </p>
        <h3>The Garden vs. The Highway</h3>
        <p>
          Most of our phones look like highways—billboards everywhere, red notification badges screaming for attention, infinite roads leading nowhere.
        </p>
        <p>
          Turn your phone into a garden.
        </p>
        <ul className="list-disc pl-5 space-y-2 my-6">
          <li><strong>Grayscale Mode:</strong> Remove the slot-machine colors. Make the device a tool, not a toy.</li>
          <li><strong>Notification Purge:</strong> If it is not a human being trying to speak to you, it does not deserve to interrupt you.</li>
          <li><strong>The Empty Home Screen:</strong> Keep your first page blank. Let your wallpaper be art. Make yourself swipe to find a distraction.</li>
        </ul>
        <p>
          When the tool becomes beautiful and quiet, it ceases to be a weapon against your attention span.
        </p>
      </>
    )
  }
];

export const Journal: React.FC = () => {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const handleArticleClick = (id: string) => {
    setSelectedArticleId(id);
  };

  const handleBack = () => {
    setSelectedArticleId(null);
  };

  const currentArticle = JOURNAL_DATA.find(a => a.id === selectedArticleId);

  if (selectedArticleId && currentArticle) {
    return <JournalPost article={currentArticle} onBack={handleBack} />;
  }

  return (
    <div className="bg-stone-50 min-h-screen">
       {/* Header */}
       <div className="bg-stone-900 pt-10 lg:pt-32 pb-16 lg:pb-20 px-6 text-center text-stone-50">
        <h1 className="font-serif text-5xl md:text-7xl italic mb-6">The Journal</h1>
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-stone-400">Notes from the Apothecary</p>
      </div>

      <div className="container mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-20 max-w-5xl mx-auto">
          {JOURNAL_DATA.map((article) => (
            <div key={article.id} onClick={() => handleArticleClick(article.id)} className="group cursor-pointer">
              <div className="relative overflow-hidden mb-6 aspect-[4/3]">
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-500"></div>
              </div>
              <div className="flex justify-between items-start mb-2">
                <span className="font-sans text-[10px] tracking-widest uppercase text-sage-600">{article.category}</span>
                <span className="font-sans text-[10px] text-stone-400">{article.date}</span>
              </div>
              <h3 className="font-serif text-2xl text-stone-800 mb-3 group-hover:text-sage-800 transition-colors">{article.title}</h3>
              <p className="font-sans text-sm text-stone-500 leading-relaxed mb-4 line-clamp-3">{article.excerpt}</p>
              <div className="flex items-center gap-1 text-xs font-medium text-stone-800 uppercase tracking-wide group-hover:gap-2 transition-all">
                Read Entry <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <button className="px-8 py-3 border border-stone-300 rounded-full text-stone-600 font-sans text-xs tracking-widest uppercase hover:bg-stone-800 hover:text-stone-50 hover:border-stone-800 transition-all duration-300">
            Load More Archives
          </button>
        </div>
      </div>
    </div>
  );
};