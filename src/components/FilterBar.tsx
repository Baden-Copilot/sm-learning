import React, { useState, useRef, useEffect } from 'react';
import { Filter, Check, ArrowUpDown, Layers } from 'lucide-react';
import { EducationLevel, MaterialType } from '../types';

interface FilterBarProps {
  currentLevel: EducationLevel;
  onSelectLevel: (level: EducationLevel) => void;
  currentType: MaterialType;
  onSelectType: (type: MaterialType) => void;
  sortBy: 'latest' | 'popular' | 'downloads' | 'az';
  onSelectSort: (sort: 'latest' | 'popular' | 'downloads' | 'az') => void;
  totalMaterialsCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentLevel,
  onSelectLevel,
  currentType,
  onSelectType,
  sortBy,
  onSelectSort,
  totalMaterialsCount,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const levels: { id: EducationLevel; label: string; dotColor?: string }[] = [
    { id: 'ALL', label: 'Semua' },
    { id: 'TK/PAUD', label: 'TK/PAUD', dotColor: 'bg-emerald-500' },
    { id: 'SD', label: 'SD', dotColor: 'bg-red-500' },
    { id: 'SMP', label: 'SMP', dotColor: 'bg-blue-500' },
    { id: 'SMA', label: 'SMA', dotColor: 'bg-slate-500' },
  ];

  const types: { id: MaterialType; label: string }[] = [
    { id: 'all', label: 'Semua Format' },
    { id: 'video', label: 'Video Edukasi' },
    { id: 'infografis', label: 'Infografis' },
    { id: 'modul', label: 'Modul Pembelajaran' },
    { id: 'kuis', label: 'Kuis & Evaluasi' },
    { id: 'artikel', label: 'Artikel' },
  ];

  const sortOptions = [
    { id: 'latest', label: 'Terbaru Ditambahkan' },
    { id: 'popular', label: 'Paling Banyak Dilihat' },
    { id: 'downloads', label: 'Paling Banyak Diunduh' },
    { id: 'az', label: 'Urutkan Judul (A-Z)' },
  ];

  const hasExtraFilters = currentType !== 'all' || sortBy !== 'latest';

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-6">
      {/* Title & Subtitle */}
      <div>
        <div className="flex items-center space-x-3">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-[#0a1d37] tracking-tight">
            Katalog Materi
          </h2>
          <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {totalMaterialsCount} Modul
          </span>
        </div>
        <p className="text-base text-slate-600 mt-2 font-normal max-w-2xl">
          Jelajahi berbagai materi edukasi keselamatan berdasarkan jenjang dan topik.
        </p>
      </div>

      {/* Filter Buttons & Filter Lainnya Dropdown */}
      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        {levels.map((lvl) => {
          const isSelected = currentLevel === lvl.id;
          return (
            <button
              key={lvl.id}
              id={`filter-btn-level-${lvl.id.replace('/', '-')}`}
              onClick={() => onSelectLevel(lvl.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2 transition-all cursor-pointer select-none
                ${isSelected
                  ? 'bg-[#0a1d37] text-white shadow-sm ring-1 ring-slate-800'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                }
              `}
            >
              {lvl.dotColor && (
                <span className={`w-2 h-2 rounded-full ${lvl.dotColor} flex-shrink-0`} />
              )}
              <span>{lvl.label}</span>
            </button>
          );
        })}

        {/* Filter Lainnya Dropdown Button */}
        <div className="relative ml-auto md:ml-2" ref={dropdownRef}>
          <button
            id="btn-filter-lainnya-toggle"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`
              px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2 transition-all cursor-pointer select-none
              ${hasExtraFilters
                ? 'bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Lainnya</span>
            {hasExtraFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>

          {/* Filter Modal / Popover */}
          {showFilterDropdown && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-1.5 font-bold text-sm text-slate-900">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Kategori & Urutan</span>
                </div>
                {hasExtraFilters && (
                  <button
                    onClick={() => {
                      onSelectType('all');
                      onSelectSort('latest');
                    }}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Format Type */}
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Format Materi
                </label>
                <div className="space-y-1">
                  {types.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onSelectType(t.id)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        currentType === t.id
                          ? 'bg-blue-50 text-blue-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{t.label}</span>
                      {currentType === t.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sorting */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center space-x-1">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>Urutan Tampilan</span>
                </label>
                <div className="space-y-1">
                  {sortOptions.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onSelectSort(s.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                        sortBy === s.id
                          ? 'bg-blue-50 text-blue-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{s.label}</span>
                      {sortBy === s.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
