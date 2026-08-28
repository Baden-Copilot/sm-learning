import React from 'react';
import { Video, ArrowRight, Bookmark, Pencil, Trash2 } from 'lucide-react';
import { MaterialItem } from '../types';
import { AVATAR_STUDENT_URL, AVATAR_TEACHER_URL } from '../data/materials';

interface MaterialCardFeaturedProps {
  material: MaterialItem;
  onOpen: (material: MaterialItem) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (material: MaterialItem) => void;
  onDelete?: (id: string) => void;
}

export const MaterialCardFeatured: React.FC<MaterialCardFeaturedProps> = ({
  material,
  onOpen,
  onToggleBookmark,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) => {
  return (
    <article
      id={`card-${material.id}`}
      className="col-span-1 md:col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col md:flex-row hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
    >
      {/* Left/Top Media Cover */}
      <div className="md:w-1/2 h-56 md:h-auto relative overflow-hidden bg-slate-100 flex-shrink-0">
        <img
          src={material.imageUrl}
          alt={material.imageAlt}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="eager"
        />
        {/* Level Tag (SD) */}
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-sm text-xs font-extrabold uppercase tracking-wider shadow-md">
          {material.badgeTag || material.level}
        </div>

        {/* Favorite/Bookmark & Edit/Delete Controls */}
        <div className="absolute top-4 right-4 flex items-center space-x-1.5 z-10">
          {canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(material);
              }}
              className="p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md hover:text-blue-600 transition-all cursor-pointer"
              title="Edit Materi"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(material.id);
              }}
              className="p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white shadow-md hover:text-red-600 transition-all cursor-pointer"
              title="Hapus Materi"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => onToggleBookmark(material.id, e)}
            className={`p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
              material.bookmarked
                ? 'bg-amber-400 text-slate-900 shadow-md'
                : 'bg-black/35 text-white hover:bg-black/50'
            }`}
            title="Simpan ke favorit"
            aria-label="Simpan ke favorit"
          >
            <Bookmark className={`w-4 h-4 ${material.bookmarked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Right/Bottom Details */}
      <div className="p-6 md:p-8 md:w-1/2 flex flex-col justify-center bg-white">
        {/* Metadata tag */}
        <div className="flex items-center space-x-2 text-[#0a1d37] text-xs font-semibold mb-3">
          <Video className="w-4 h-4 text-blue-600" />
          <span>{material.typeLabel}</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-medium">{material.metadataText}</span>
        </div>

        {/* Title */}
        <h3 
          onClick={() => onOpen(material)}
          className="font-headline text-xl md:text-2xl font-bold text-[#0a1d37] mb-3 leading-tight hover:text-blue-600 transition-colors cursor-pointer"
        >
          {material.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 mb-6 line-clamp-3 leading-relaxed">
          {material.description}
        </p>

        {/* Card Footer */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-4">
          {/* Social Proof Avatars */}
          <div className="flex items-center -space-x-2">
            <img
              src={AVATAR_STUDENT_URL}
              alt="Student Avatar"
              className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-2xs"
              referrerPolicy="no-referrer"
            />
            <img
              src={AVATAR_TEACHER_URL}
              alt="Teacher Avatar"
              className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-2xs"
              referrerPolicy="no-referrer"
            />
            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[11px] text-slate-700 font-bold shadow-2xs">
              +1.2k
            </div>
          </div>

          {/* Primary Action CTA */}
          <button
            id="btn-mulai-belajar-featured"
            onClick={() => onOpen(material)}
            className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span>Mulai Belajar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
