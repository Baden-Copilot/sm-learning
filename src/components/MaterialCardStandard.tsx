import React from 'react';
import { BarChart3, FileText, Video, Eye, Download, ChevronRight, Bookmark } from 'lucide-react';
import { MaterialItem } from '../types';

interface MaterialCardStandardProps {
  material: MaterialItem;
  onOpen: (material: MaterialItem) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onDownloadAction?: (id: string, e: React.MouseEvent) => void;
}

export const MaterialCardStandard: React.FC<MaterialCardStandardProps> = ({
  material,
  onOpen,
  onToggleBookmark,
  onDownloadAction,
}) => {
  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'TK/PAUD':
        return 'bg-emerald-600';
      case 'SD':
        return 'bg-red-600';
      case 'SMP':
        return 'bg-blue-600';
      case 'SMA':
      default:
        return 'bg-slate-700';
    }
  };

  const getFormatIcon = (type: string) => {
    switch (type) {
      case 'infografis':
        return <BarChart3 className="w-4 h-4 text-blue-600" />;
      case 'video':
        return <Video className="w-4 h-4 text-blue-600" />;
      case 'modul':
      default:
        return <FileText className="w-4 h-4 text-blue-600" />;
    }
  };

  const isDownloadType = material.type === 'modul';

  return (
    <article
      id={`card-${material.id}`}
      className="col-span-1 md:col-span-6 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
    >
      {/* Top Media Cover */}
      <div className="h-48 relative overflow-hidden bg-slate-100 flex-shrink-0">
        <img
          src={material.imageUrl}
          alt={material.imageAlt}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {/* Education Level Badge */}
        <div className={`absolute top-4 left-4 ${getBadgeColor(material.level)} text-white px-3 py-1 rounded-sm text-xs font-extrabold uppercase tracking-wider shadow-md`}>
          {material.badgeTag || material.level}
        </div>

        {/* Favorite/Bookmark Toggle */}
        <button
          onClick={(e) => onToggleBookmark(material.id, e)}
          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-colors ${
            material.bookmarked 
              ? 'bg-amber-400 text-slate-900 shadow-md' 
              : 'bg-black/35 text-white hover:bg-black/50'
          }`}
          title="Simpan ke favorit"
          aria-label="Simpan ke favorit"
        >
          <Bookmark className={`w-3.5 h-3.5 ${material.bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-6 flex flex-col flex-1">
        {/* Metadata Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 text-[#0a1d37] text-xs font-semibold">
            {getFormatIcon(material.type)}
            <span>{material.typeLabel}</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">{material.metadataText}</span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onOpen(material)}
          className="font-headline text-lg font-bold text-[#0a1d37] mb-2 leading-snug hover:text-blue-600 transition-colors cursor-pointer"
        >
          {material.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
          {material.description}
        </p>

        {/* Card Footer */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          {/* Left stat */}
          {isDownloadType ? (
            <span className="text-xs text-slate-500 font-medium flex items-center">
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <span>{(material.downloads || 3200).toLocaleString()} unduhan</span>
            </span>
          ) : (
            <span className="text-xs text-slate-500 font-medium flex items-center">
              <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <span>{material.views} dilihat</span>
            </span>
          )}

          {/* Right Action */}
          {isDownloadType ? (
            <button
              id={`btn-download-${material.id}`}
              onClick={(e) => onDownloadAction ? onDownloadAction(material.id, e) : onOpen(material)}
              className="text-[#0a1d37] hover:text-blue-700 transition-colors text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>Unduh</span>
              <Download className="w-3.5 h-3.5 ml-0.5" />
            </button>
          ) : (
            <button
              id={`btn-view-${material.id}`}
              onClick={() => onOpen(material)}
              className="text-[#0a1d37] hover:text-blue-700 transition-colors text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <span>Lihat</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
