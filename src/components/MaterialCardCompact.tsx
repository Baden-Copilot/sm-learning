import React from 'react';
import { Play, Clock, HelpCircle, BookOpen } from 'lucide-react';
import { MaterialItem } from '../types';

interface MaterialCardCompactProps {
  material: MaterialItem;
  onOpen: (material: MaterialItem) => void;
}

export const MaterialCardCompact: React.FC<MaterialCardCompactProps> = ({
  material,
  onOpen,
}) => {
  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'TK/PAUD':
        return 'bg-emerald-100 text-emerald-800';
      case 'SD':
        return 'bg-red-100 text-red-800';
      case 'SMP':
        return 'bg-blue-100 text-blue-800';
      case 'SMA':
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getSubMeta = () => {
    if (material.type === 'video' || material.duration) {
      return (
        <p className="text-xs text-slate-500 flex items-center mt-1">
          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
          <span>{material.duration || material.metadataText}</span>
        </p>
      );
    }
    if (material.type === 'kuis' || material.questionsCount) {
      return (
        <p className="text-xs text-slate-500 flex items-center mt-1">
          <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />
          <span>{material.questionsCount || 15} Pertanyaan</span>
        </p>
      );
    }
    return (
      <p className="text-xs text-slate-500 flex items-center mt-1">
        <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
        <span>{material.metadataText || 'Baca Artikel'}</span>
      </p>
    );
  };

  return (
    <article
      id={`compact-card-${material.id}`}
      onClick={() => onOpen(material)}
      className="col-span-1 md:col-span-6 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-start space-x-4 cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 relative">
        <img
          src={material.imageUrl}
          alt={material.imageAlt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {material.type === 'video' && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/40 transition-colors">
            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-md">
              <Play className="w-3.5 h-3.5 text-[#0a1d37] fill-[#0a1d37] ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <span className={`inline-block px-2 py-0.5 ${getBadgeStyle(material.level)} text-[11px] font-extrabold rounded-xs mb-1 uppercase tracking-wide`}>
          {material.badgeTag || material.level}
        </span>
        <h4 className="font-semibold text-sm text-[#0a1d37] group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {material.title}
        </h4>
        {getSubMeta()}
      </div>
    </article>
  );
};
