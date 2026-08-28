import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Play,
  CheckCircle2,
  Clock,
  Bookmark,
  History,
  Compass,
  ArrowRight,
  ChevronRight,
  Award,
  Sparkles,
  Search,
  Check,
  RotateCcw,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { MaterialItem } from '../types';

interface MyLearningPageProps {
  materials: MaterialItem[];
  viewHistory: string[];
  onOpenCourseDetail: (material: MaterialItem) => void;
  onStartLearning: (material: MaterialItem) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onNavigateToLearning: () => void;
}

export function MyLearningPage({
  materials,
  viewHistory,
  onOpenCourseDetail,
  onStartLearning,
  onToggleBookmark,
  onNavigateToLearning,
}: MyLearningPageProps) {
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed' | 'favorit' | 'riwayat'>('in_progress');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Real Progress Categories
  const inProgressList = useMemo(() => {
    return materials.filter(m => (m.progressPercent || 0) > 0 && (m.progressPercent || 0) < 100);
  }, [materials]);

  const completedList = useMemo(() => {
    return materials.filter(m => (m.progressPercent || 0) === 100 || m.status === 'completed');
  }, [materials]);

  const bookmarkedList = useMemo(() => {
    return materials.filter(m => Boolean(m.bookmarked));
  }, [materials]);

  const historyList = useMemo(() => {
    // Preserve view history order, or fallback to materials with views
    if (viewHistory.length > 0) {
      const items = viewHistory
        .map(id => materials.find(m => m.id === id))
        .filter((m): m is MaterialItem => m !== undefined);
      return items.length > 0 ? items : materials.filter(m => m.views > 0);
    }
    return materials.filter(m => m.views > 0);
  }, [materials, viewHistory]);

  // Spotlight Continue Learning (First In-Progress Course)
  const spotlightCourse = inProgressList[0] || (materials.length > 0 ? materials[0] : null);

  // Overall Statistics from real data
  const totalCourses = materials.length;
  const totalCompleted = completedList.length;
  const totalInProgress = inProgressList.length;
  const completionRate = totalCourses > 0 ? Math.round((totalCompleted / totalCourses) * 100) : 0;

  // Active Tab List with Optional Search Filtering
  const activeList = useMemo(() => {
    let list: MaterialItem[] = [];
    switch (activeTab) {
      case 'in_progress': list = inProgressList; break;
      case 'completed': list = completedList; break;
      case 'favorit': list = bookmarkedList; break;
      case 'riwayat': list = historyList; break;
      default: list = inProgressList;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return list.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.level.toLowerCase().includes(query) ||
        m.typeLabel.toLowerCase().includes(query)
      );
    }
    return list;
  }, [activeTab, inProgressList, completedList, bookmarkedList, historyList, searchQuery]);

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto font-sans">
      {/* 1. PERSONAL WORKSPACE HEADER & REAL PROGRESS METRIC */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Personal Learning Space</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              My Learning
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Kelola perjalanan pembelajaran mandiri Anda, pantau kemajuan modul, ulas kembali kursus yang telah selesai, dan akses materi tersimpan.
            </p>
          </div>

          {/* Real Metrics Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/70 p-4 rounded-2xl shrink-0 text-center">
            <div className="px-2">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Total Materi</span>
              <span className="text-lg font-extrabold text-slate-900">{totalCourses}</span>
            </div>
            <div className="px-2 border-l border-slate-200">
              <span className="text-[10px] text-blue-600 font-semibold block uppercase">Sedang Belajar</span>
              <span className="text-lg font-extrabold text-blue-700">{totalInProgress}</span>
            </div>
            <div className="px-2 border-l border-slate-200">
              <span className="text-[10px] text-emerald-600 font-semibold block uppercase">Telah Selesai</span>
              <span className="text-lg font-extrabold text-emerald-700">{totalCompleted}</span>
            </div>
            <div className="px-2 border-l border-slate-200">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Kelulusan</span>
              <span className="text-lg font-extrabold text-slate-900">{completionRate}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SPOTLIGHT: LANJUTKAN BELAJAR (CONTINUE LEARNING CARD) */}
      {inProgressList.length > 0 && spotlightCourse && (
        <section className="bg-linear-to-r from-[#0a1d37] to-[#122b52] rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
              <div className="w-full sm:w-36 h-24 rounded-2xl overflow-hidden bg-slate-800 shrink-0 border border-white/10 relative">
                <img
                  src={spotlightCourse.imageUrl}
                  alt={spotlightCourse.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                  {spotlightCourse.level}
                </span>
              </div>

              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/20">
                    Lanjutkan Belajar Terakhir
                  </span>
                  <span className="text-xs text-slate-300">• {spotlightCourse.typeLabel}</span>
                </div>

                <h3 className="font-bold text-base sm:text-lg text-white truncate max-w-lg">
                  {spotlightCourse.title}
                </h3>

                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <span>Progres: <strong className="text-emerald-400">{spotlightCourse.progressPercent || 0}%</strong></span>
                  <div className="w-24 sm:w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${spotlightCourse.progressPercent || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onStartLearning(spotlightCourse)}
              className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Lanjutkan Sekarang</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'in_progress', label: 'Sedang Belajar', count: inProgressList.length, icon: Clock },
            { id: 'completed', label: 'Selesai', count: completedList.length, icon: CheckCircle2 },
            { id: 'favorit', label: 'Favorit Tersimpan', count: bookmarkedList.length, icon: Bookmark },
            { id: 'riwayat', label: 'Riwayat Belajar', count: historyList.length, icon: History },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#0a1d37] text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-300' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* In-Page Quick Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari dalam My Learning..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* 4. CONTENT LISTING OR EMPTY STATES */}
      {activeList.length === 0 ? (
        /* PROFESSIONAL EMPTY STATES PER TAB */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto my-6 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
            {activeTab === 'in_progress' ? (
              <Clock className="w-8 h-8 text-blue-500" />
            ) : activeTab === 'completed' ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            ) : activeTab === 'favorit' ? (
              <Bookmark className="w-8 h-8 text-amber-500" />
            ) : (
              <History className="w-8 h-8 text-purple-500" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="font-headline text-base sm:text-lg font-bold text-slate-900">
              {activeTab === 'in_progress'
                ? 'Belum Ada Pembelajaran yang Berjalan'
                : activeTab === 'completed'
                ? 'Belum Ada Pembelajaran yang Diselesaikan'
                : activeTab === 'favorit'
                ? 'Belum Ada Materi yang Disimpan'
                : 'Belum Ada Riwayat Pembelajaran'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {activeTab === 'in_progress'
                ? 'Pilih kursus dari katalog pembelajaran keselamatan lalu lintas dan mulai pelajari sekarang.'
                : activeTab === 'completed'
                ? 'Selesaikan seluruh silabus materi dan evaluasi kuis untuk mencatat riwayat kelulusan Anda.'
                : activeTab === 'favorit'
                ? 'Gunakan ikon bookmark pada materi pilihan agar mudah diakses kembali di sini.'
                : 'Materi yang telah Anda buka akan tercatat otomatis pada riwayat ini.'}
            </p>
          </div>

          <button
            onClick={onNavigateToLearning}
            className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Jelajahi Katalog Learning</span>
          </button>
        </div>
      ) : (
        /* PERSONAL LEARNING COURSE CARDS (FOCUSED ON PROGRESS + QUICK ACTION) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeList.map((mat) => {
            const progress = mat.progressPercent || 0;
            const isDone = progress === 100 || mat.status === 'completed';

            return (
              <div
                key={mat.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col group"
              >
                {/* Image Cover Banner */}
                <div className="h-40 relative bg-slate-100 overflow-hidden">
                  <img
                    src={mat.imageUrl}
                    alt={mat.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 bg-[#0a1d37] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded shadow-xs">
                    {mat.level}
                  </span>

                  <button
                    onClick={(e) => onToggleBookmark(mat.id, e)}
                    className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-xs transition-colors cursor-pointer ${
                      mat.bookmarked
                        ? 'bg-amber-400 text-slate-900 shadow-xs'
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                    title={mat.bookmarked ? 'Tersimpan di Favorit' : 'Simpan Favorit'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${mat.bookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Card Content & Details */}
                <div className="p-5 flex flex-col flex-1 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="text-blue-600 font-bold">{mat.typeLabel}</span>
                    <span>{mat.metadataText || 'Modul Pembelajaran'}</span>
                  </div>

                  <h3
                    onClick={() => onOpenCourseDetail(mat)}
                    className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {mat.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {mat.summary || mat.description}
                  </p>

                  {/* Progress Indicator Bar */}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Status Kemajuan</span>
                      <span className={isDone ? 'text-emerald-600 font-bold' : progress > 0 ? 'text-blue-600 font-bold' : 'text-slate-600'}>
                        {isDone ? '100% Selesai' : progress > 0 ? `${progress}% Selesai` : 'Belum Dimulai'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : progress > 0 ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Card Action */}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenCourseDetail(mat)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Detail Silabus
                    </button>

                    <button
                      onClick={() => onStartLearning(mat)}
                      className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow-md transition-all cursor-pointer"
                    >
                      {isDone ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Ulas Kembali</span>
                        </>
                      ) : progress > 0 ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Lanjutkan</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Mulai Belajar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
