import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Coffee, Sparkles, Flame, Check } from 'lucide-react';
import { CafeItem, Language } from '../types';
import { CAFE_ITEMS, TRANSLATIONS } from '../data';

interface CafeMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export default function CafeMenuModal({ isOpen, onClose, lang }: CafeMenuModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const t = TRANSLATIONS[lang];

  const categories = [
    { id: 'all', name: t.all },
    { id: 'coffee', name: t.coffee },
    { id: 'herbal', name: t.herbal },
    { id: 'food', name: t.food },
    { id: 'snack', name: t.snack },
  ];

  const filteredItems = activeCategory === 'all' 
    ? CAFE_ITEMS 
    : CAFE_ITEMS.filter(item => item.category === activeCategory);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="cafe-menu-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          {/* Overlay click */}
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-brand-50 rounded-xl shadow-2xl overflow-hidden z-10 my-8 border border-brand-200"
          >
            {/* Header */}
            <div className="relative bg-brand-800 text-white p-6 sm:p-8">
              <button 
                id="close-cafe-menu"
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <Coffee className="w-6 h-6 text-brand-300 animate-pulse" />
                <span className="text-xs uppercase tracking-widest font-semibold text-brand-200">Zegan Traditional Cafe</span>
              </div>
              <h3 className="text-3xl font-serif font-normal text-stone-50">{t.cafeMenuTitle}</h3>
              <p className="text-brand-100/80 text-sm mt-1 font-light">{t.cafeMenuSubtitle}</p>
            </div>

            {/* Content Container */}
            <div className="p-6 sm:p-8 max-h-[70vh] overflow-y-auto bg-brand-50">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-2 mb-8 border-b border-brand-200 pb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-brand-700 text-brand-100 shadow-sm'
                        : 'bg-brand-100/60 text-stone-700 hover:bg-brand-200/40 border border-brand-200/80'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu items grid */}
              <div className="grid sm:grid-cols-2 gap-6">
                {filteredItems.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id}
                    className="flex gap-4 p-4 bg-brand-100/30 rounded-lg border border-brand-200 hover:border-brand-350 transition-colors relative overflow-hidden"
                  >
                    {item.isBestSeller && (
                      <span className="absolute top-0 left-0 bg-brand-700 text-brand-100 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-br-lg flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-brand-300" />
                        {t.bestSeller}
                      </span>
                    )}

                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shrink-0 bg-brand-100 border border-brand-200"
                    />

                    <div className="flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-brand-950 text-sm sm:text-base">{item.name}</h4>
                          <span className="text-xs font-semibold text-brand-700 whitespace-nowrap bg-brand-100 border border-brand-200/60 px-2 py-0.5 rounded-sm">
                            Rp{item.price.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2 font-light">
                          {item.description[lang]}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-brand-600 font-semibold uppercase tracking-wider">
                        <Check className="w-3.5 h-3.5 text-brand-500" />
                        Authentic Local Source
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer notice */}
            <div className="bg-brand-100 text-stone-600 p-4 text-center text-xs border-t border-brand-200/80 flex justify-center items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="font-light">{lang === 'id' ? 'Cafe buka untuk umum dan tamu menginap' : 'Cafe open for both public and staying guests'}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
