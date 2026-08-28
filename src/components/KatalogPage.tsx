import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Plus, BookOpen, Layers, Grid, List,
  Eye, Download, Bookmark, Pencil, Trash2, ChevronRight,
  Clock, CheckCircle2, AlertCircle, ArrowUpDown, X, Sparkles
} from 'lucide-react';
import { MaterialItem, EducationLevel, MaterialType, Role } from '../types';

interface KatalogPageProps {
  materials: MaterialItem[];
  selectedLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  selectedType: MaterialType;
  onSelectType: (type: MaterialType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: 'latest' | 'popular' | 'downloads' | 'az';
  onSelectSort: (sort: 'latest' | 'popular' | 'downloads' | 'az') => void;
  onOpenMaterial: (material: MaterialItem) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onDownload: (id: string, e?: React.MouseEvent) => void;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAddNewMaterial: () => void;
  onEditMaterial: (material: MaterialItem) => void;
  onDeleteMaterial: (id: string) => void;
}

export function KatalogPage({
  materials,
  selectedLevel,
  onSelectLevel,
  selectedType,
  onSelectType,
  searchQuery,
  onSearchChange,
  sortBy,
  onSelectSort,
  onOpenMaterial,
  onToggleBookmark,
  onDownload,
  canAdd,
  canEdit,
  canDelete,
  onAddNewMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: KatalogPageProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

  // Level Tabs
  const levels: { id: EducationLevel; label: string; count: number }[] = [
    { id: 'ALL', label: 'Semua Jenjang', count: materials.length },
    { id: 'TK/PAUD', label: 'TK / PAUD', count: materials.filter(m => m.level === 'TK/PAUD').length },
    { id: 'SD', label: 'SD', count: materials.filter(m => m.level === 'SD').length },
    { id: 'SMP', label: 'SMP', count: materials.filter(m => m.level === 'SMP').length },
    { id: 'SMA', label: 'SMA / SMK', count: materials.filter(m => m.level === 'SMA').length },
  ];

  // Types list
  const types: { id: MaterialType; label: string }[] = [
    { id: 'all', label: 'Semua Format' },
    { id: 'video', label: 'Video Pembelajaran' },
    { id: 'infografis', label: 'Infografis & Poster' },
    { id: 'modul', label: 'Modul / Dokumen PDF' },
    { id: 'kuis', label: 'Kuis & Evaluasi' },
    { id: 'artikel', label: 'Artikel & Panduan' },
  ];

  const sortOptions = [
    { id: 'latest', label: 'Terbaru Ditambahkan' },
    { id: 'popular', label: 'Paling Populer (Views)' },
    { id: 'downloads', label: 'Paling Banyak Diunduh' },
    { id: 'az', label: 'Judul (A-Z)' },
  ];

  // Filtered materials
  const filteredList = useMemo(() => {
    let result = [...materials];

    if (selectedLevel !== 'ALL') {
      result = result.filter(m => m.level.toUpperCase() === selectedLevel.toUpperCase());
    }

    if (selectedType !== 'all') {
      result = result.filter(m => m.type === selectedType);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.level.toLowerCase().includes(q) ||
        m.typeLabel.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'popular') {
      result.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'downloads') {
      result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sortBy === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [materials, selectedLevel, selectedType, searchQuery, sortBy]);

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'TK/PAUD': return 'bg-emerald-600';
      case 'SD': return 'bg-red-600';
      case 'SMP': return 'bg-blue-600';
      case 'SMA': default: return 'bg-slate-700';
    }
  };

  const hasActiveExtraFilters = selectedType !== 'all' || sortBy !== 'latest';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER KATALOG & ACTION BAR */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Pusat Kurikulum Terpadu
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {filteredList.length} Modul Ditemukan
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Katalog Materi Edukasi POLRI
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Akses silabus resmi pendidikan lalu lintas, etika berlalu lintas, kesadaran hukum, dan pencegahan kriminalitas untuk seluruh tingkatan sekolah.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {canAdd && (
              <button
                onClick={onAddNewMaterial}
                className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Materi Baru</span>
              </button>
            )}

            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Grid"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan List"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TAB LEVEL FILTER & SEARCH CONTROLS */}
      <div className="space-y-4">
        {/* Jenjang Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {levels.map((lvl) => {
            const isSelected = selectedLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => onSelectLevel(lvl.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0a1d37] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span>{lvl.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {lvl.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub Filter: Format & Sort */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          {/* Format pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {types.map((t) => {
              const active = selectedType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectType(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Sort dropdown trigger */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => onSelectSort(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-blue-600 focus:outline-hidden cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveExtraFilters && (
              <button
                onClick={() => {
                  onSelectType('all');
                  onSelectSort('latest');
                }}
                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 cursor-pointer"
                title="Reset Filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. EMPTY STATE */}
      {filteredList.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-headline text-lg font-bold text-slate-800 mb-1">
            Modul Tidak Ditemukan
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Tidak ada materi keselamatan yang sesuai dengan kriteria filter jenjang atau format yang Anda pilih.
          </p>
          <button
            onClick={() => {
              onSelectLevel('ALL');
              onSelectType('all');
              onSearchChange('');
            }}
            className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Reset Seluruh Filter
          </button>
        </div>
      )}

      {/* 4. CONTENT DISPLAY (GRID / LIST) */}
      {filteredList.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredList.map((mat) => (
            <div
              key={mat.id}
              onClick={() => onOpenMaterial(mat)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col group cursor-pointer relative"
            >
              {/* Thumbnail Cover */}
              <div className="h-44 relative bg-slate-100 overflow-hidden">
                <img
                  src={mat.imageUrl}
                  alt={mat.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
                <span className={`absolute top-3 left-3 ${getBadgeColor(mat.level)} text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm`}>
                  {mat.level}
                </span>

                {/* Card action buttons (Edit, Delete, Bookmark) */}
                <div className="absolute top-3 right-3 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {canEdit && (
                    <button
                      onClick={() => onEditMaterial(mat)}
                      className="p-1.5 rounded-full bg-white/90 text-slate-700 hover:bg-white hover:text-blue-600 shadow-sm transition-all cursor-pointer"
                      title="Edit Materi"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => onDeleteMaterial(mat.id)}
                      className="p-1.5 rounded-full bg-white/90 text-slate-700 hover:bg-white hover:text-red-600 shadow-sm transition-all cursor-pointer"
                      title="Hapus Materi"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onToggleBookmark(mat.id, e)}
                    className={`p-1.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer ${
                      mat.bookmarked
                        ? 'bg-amber-400 text-slate-900 shadow-sm'
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                    title="Simpan Favorit"
                  >
                    <Bookmark className={`w-3 h-3 ${mat.bookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
                  <span className="text-blue-600 font-semibold">{mat.typeLabel}</span>
                  <span>{mat.metadataText}</span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {mat.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                  {mat.description}
                </p>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {mat.views}
                    </span>
                    {mat.type === 'modul' && (
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {mat.downloads || 0}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Buka <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. LIST VIEW MODE */}
      {filteredList.length > 0 && viewMode === 'list' && (
        <div className="space-y-3">
          {filteredList.map((mat) => (
            <div
              key={mat.id}
              onClick={() => onOpenMaterial(mat)}
              className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group cursor-pointer"
            >
              <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  <img
                    src={mat.imageUrl}
                    alt={mat.title}
                    className="w-full h-full object-cover"
                  />
                  <span className={`absolute top-1 left-1 ${getBadgeColor(mat.level)} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                    {mat.level}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-blue-700 uppercase tracking-wider">{mat.typeLabel}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-medium">{mat.metadataText}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{mat.author || 'Korlantas POLRI'}</span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {mat.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">
                    {mat.description}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                {canEdit && (
                  <button
                    onClick={() => onEditMaterial(mat)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                    title="Edit Materi"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDeleteMaterial(mat.id)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 transition-colors cursor-pointer"
                    title="Hapus Materi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => onToggleBookmark(mat.id, e)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    mat.bookmarked
                      ? 'bg-amber-100 text-amber-900 font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Simpan Favorit"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${mat.bookmarked ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => onOpenMaterial(mat)}
                  className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <span>Buka Modul</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
