import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Compass } from 'lucide-react';
import { GALLERY_IMAGES, TRANSLATIONS } from '../data';
import { Language } from '../types';

interface GalleryProps {
  lang: Language;
}

export default function Gallery({ lang }: GalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedImage, setSelectedImage] = useState<typeof GALLERY_IMAGES[0] | null>(null);
  const t = TRANSLATIONS[lang];

  const categories = [
    { id: 'all', name: t.cat_all },
    { id: 'rooms', name: t.cat_rooms },
    { id: 'cafe', name: t.cat_cafe },
    { id: 'pool', name: t.cat_pool },
    { id: 'grounds', name: t.cat_grounds },
  ];

  const filteredImages = activeCategory === 'all'
    ? GALLERY_IMAGES
    : GALLERY_IMAGES.filter(img => img.category === activeCategory);

  return (
    <section id="gallery" className="py-24 bg-brand-50 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-brand-100 rounded-full filter blur-3xl opacity-40 -ml-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-700 border border-brand-200/85 px-4 py-1.5 rounded-full bg-brand-100 inline-block">
            VISUAL STORY
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-brand-950 mt-3 leading-tight">
            {t.galleryTitle}
          </h2>
          <div className="w-12 h-[2px] bg-brand-300 mx-auto mt-4 mb-4" />
          <p className="text-stone-600 text-sm sm:text-base mt-2">
            {t.gallerySubtitle}
          </p>
        </div>

        {/* Categories Tab */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-brand-700 text-white border border-brand-800 shadow-sm'
                  : 'bg-brand-100/60 text-brand-950/80 hover:bg-brand-200/60 border border-brand-200/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Images Grid */}
        <motion.div 
          layout 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {filteredImages.map((img, idx) => (
            <motion.div
              layout
              key={img.url}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onClick={() => setSelectedImage(img)}
              className="relative h-64 overflow-hidden rounded-xl group cursor-pointer border border-brand-200/80 hover:border-brand-300 transition-colors"
            >
              <img
                src={img.url}
                alt={img.title[lang]}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-3xs" />
              
              {/* Zoom search icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-3 bg-brand-50 text-brand-800 rounded-full shadow-md transform translate-y-2 group-hover:translate-y-0 transition-transform border border-brand-200">
                  <Search className="w-5 h-5 text-brand-700" />
                </div>
              </div>

              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white transform translate-y-1 group-hover:translate-y-0 transition-transform">
                <span className="text-[10px] text-brand-300 font-semibold uppercase tracking-widest">{img.category}</span>
                <p className="text-xs sm:text-sm font-medium truncate mt-0.5">{img.title[lang]}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Lightbox Modal */}
        <AnimatePresence>
          {selectedImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
              <div className="absolute inset-0" onClick={() => setSelectedImage(null)} />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-4xl max-h-[85vh] z-10 flex flex-col items-center"
              >
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>

                <img
                  src={selectedImage.url}
                  alt={selectedImage.title[lang]}
                  className="w-full max-h-[75vh] object-contain rounded-xl shadow-2xl bg-black border border-brand-800"
                />

                <div className="text-center mt-4 text-white">
                  <span className="text-xs uppercase tracking-widest text-brand-300 font-semibold flex items-center justify-center gap-1">
                    <Compass className="w-3.5 h-3.5 animate-spin-slow" />
                    {selectedImage.category}
                  </span>
                  <h4 className="text-lg font-serif mt-1 font-medium">{selectedImage.title[lang]}</h4>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
