import React, { useMemo } from 'react';
import {
  Play, BookOpen, Clock, Award, TrendingUp, CheckCircle2,
  ArrowRight, ShieldCheck, Bookmark, Sparkles, ChevronRight,
  Pencil, Trash2, Plus, Users, Calendar, AlertCircle, FileText
} from 'lucide-react';
import { MaterialItem, Role, EducationLevel } from '../types';

interface BerandaPageProps {
  currentUser: any;
  currentRole: Role;
  materials: MaterialItem[];
  viewHistory: string[];
  onOpenMaterial: (material: MaterialItem) => void;
  onSelectTab: (tab: string) => void;
  onSelectLevel: (level: EducationLevel) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAddNewMaterial: () => void;
  onEditMaterial: (material: MaterialItem) => void;
  onDeleteMaterial: (id: string) => void;
}

export function BerandaPage({
  currentUser,
  currentRole,
  materials,
  viewHistory,
  onOpenMaterial,
  onSelectTab,
  onSelectLevel,
  onToggleBookmark,
  canAdd,
  canEdit,
  canDelete,
  onAddNewMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: BerandaPageProps) {
  // Sapaan waktu
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const userName = currentUser?.user?.fullName || currentUser?.fullName || 'AKBP Hendra Wijaya, S.I.K.';
  const userRoleName = currentRole?.name || currentUser?.role?.name || 'Admin / Superuser';

  // 1. Real Calculations for Metrics
  const totalCourses = materials.length;
  const completedCourses = useMemo(() => {
    return materials.filter(m => (m.progressPercent || 0) === 100 || m.status === 'completed');
  }, [materials]);

  const inProgressCourses = useMemo(() => {
    return materials.filter(m => (m.progressPercent || 0) > 0 && (m.progressPercent || 0) < 100);
  }, [materials]);

  const completionRate = totalCourses > 0 ? Math.round((completedCourses.length / totalCourses) * 100) : 0;

  // Real learning duration (sum of completed or in-progress estimated hours)
  const totalLearningHours = useMemo(() => {
    const sum = materials.reduce((acc, m) => {
      const hours = m.estimatedHours || 1.0;
      const progressFraction = (m.progressPercent || 0) / 100;
      return acc + (hours * progressFraction);
    }, 0);
    return Math.round(sum * 10) / 10;
  }, [materials]);

  // 2. Strict Real Continue Learning Logic:
  // Must be inProgress (0 < progress < 100), prioritising user viewHistory
  const activeContinueLearningMaterial = useMemo(() => {
    // Check viewHistory first for actively in-progress items
    if (viewHistory && viewHistory.length > 0) {
      for (const histId of viewHistory) {
        const found = inProgressCourses.find(m => m.id === histId);
        if (found) return found;
      }
    }
    // Fallback to first available in-progress course
    return inProgressCourses[0] || null;
  }, [viewHistory, inProgressCourses]);

  // Materi unggulan / rekomendasi (published first)
  const recommendedMaterials = useMemo(() => {
    return materials.slice(0, 4);
  }, [materials]);

  // Hitung jumlah modul per jenjang
  const countByLevel = (level: string) => materials.filter(m => m.level === level).length;

  return (
    <div className="space-y-8 pb-12">
      {/* 1. HEADER / GREETING SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Portal Dikmas Lantas POLRI</span>
              <span className="text-blue-300">•</span>
              <span className="font-medium text-blue-700">{userRoleName}</span>
            </div>

            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {getGreeting()}, <span className="text-[#0a1d37]">{userName}</span>
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              {currentRole?.id?.startsWith('role-executive')
                ? 'Pantau indikator keselamatan lalu lintas, partisipasi sosialisasi, dan evaluasi kurikulum terpadu.'
                : currentRole?.id === 'role-trainer'
                ? 'Kelola materi pembelajaran, kuis evaluasi, dan pantau perkembangan pemahaman peserta didik.'
                : 'Selamat datang di pusat kendali edukasi keselamatan. Kelola kurikulum, pengguna, dan materi pembelajaran.'}
            </p>
          </div>

          {/* Quick Action Button for Admin/Trainer */}
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
            <button
              onClick={() => onSelectTab('katalog')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>Buka Katalog</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. LEARNING OVERVIEW / REAL STATS CARDS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Modul</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalCourses} <span className="text-xs font-normal text-slate-500">Materi</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Tingkat Penyelesaian</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{completionRate}% <span className="text-xs font-normal text-emerald-600">({completedCourses.length} Selesai)</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Waktu Belajar</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{totalLearningHours} <span className="text-xs font-normal text-slate-500">Jam Aktif</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Sertifikat Kelulusan</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{completedCourses.length} <span className="text-xs font-normal text-slate-500">Terbit</span></p>
          </div>
        </div>
      </section>

      {/* 3. CONTINUE LEARNING (DYNAMIC & REAL PROGRESS) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Lanjutkan Pembelajaran
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Materi terakhir yang sedang aktif dipelajari</p>
          </div>
          {activeContinueLearningMaterial && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Progres {activeContinueLearningMaterial.progressPercent || 0}%
            </span>
          )}
        </div>

        {activeContinueLearningMaterial ? (
          <div className="bg-slate-50 rounded-xl p-4 sm:p-5 border border-slate-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-200 overflow-hidden shrink-0 relative">
                <img
                  src={activeContinueLearningMaterial.imageUrl}
                  alt={activeContinueLearningMaterial.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1 left-1 bg-[#0a1d37] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {activeContinueLearningMaterial.level}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                  {activeContinueLearningMaterial.typeLabel} • {activeContinueLearningMaterial.metadataText}
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-1">
                  {activeContinueLearningMaterial.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 max-w-xl">
                  {activeContinueLearningMaterial.description}
                </p>

                {/* Progress bar */}
                <div className="pt-2 w-full max-w-md">
                  <div className="flex justify-between text-[10px] font-medium text-slate-500 mb-1">
                    <span>Progres Kurikulum</span>
                    <span className="font-semibold text-slate-700">{activeContinueLearningMaterial.progressPercent || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${activeContinueLearningMaterial.progressPercent || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenMaterial(activeContinueLearningMaterial)}
              className="w-full md:w-auto bg-[#0a1d37] hover:bg-[#162c4e] text-white px-6 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Lanjutkan Belajar</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 border border-slate-200/70 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              {completedCourses.length > 0
                ? 'Semua Pembelajaran yang Dimulai Telah Selesai!'
                : 'Belum Ada Pembelajaran yang Sedang Berjalan'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {completedCourses.length > 0
                ? 'Luar biasa! Anda telah menuntaskan seluruh silabus aktif. Silakan jelajahi katalog untuk memulai materi edukasi keselamatan baru.'
                : 'Pilih silabus dari katalog pembelajaran untuk memulai perjalanan edukasi keselamatan berlalu lintas.'}
            </p>
            <button
              onClick={() => onSelectTab('katalog')}
              className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Jelajahi Katalog Pembelajaran</span>
            </button>
          </div>
        )}
      </section>

      {/* 4. KURIKULUM BERDASARKAN JENJANG (QUICK SELECTION) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900">
              Kurikulum Berdasarkan Jenjang
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Pilih tingkat pendidikan untuk menyaring materi keselamatan spesifik</p>
          </div>
          <button
            onClick={() => onSelectTab('jenjang')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua Jenjang</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { level: 'TK/PAUD' as EducationLevel, label: 'TK / PAUD', sub: 'Pengenalan Usia Dini', color: 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-950', badge: 'bg-emerald-600' },
            { level: 'SD' as EducationLevel, label: 'Sekolah Dasar', sub: 'Rambu & Tertib Jalan', color: 'border-red-200 bg-red-50/50 hover:bg-red-100/60 text-red-950', badge: 'bg-red-600' },
            { level: 'SMP' as EducationLevel, label: 'Sekolah Menengah (SMP)', sub: 'Etika Siber & Bullying', color: 'border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-950', badge: 'bg-blue-600' },
            { level: 'SMA' as EducationLevel, label: 'SMA / SMK', sub: 'Anti Narkoba & Tawuran', color: 'border-slate-300 bg-slate-100/70 hover:bg-slate-200/70 text-slate-950', badge: 'bg-slate-700' },
          ].map((item) => (
            <div
              key={item.level}
              onClick={() => {
                onSelectLevel(item.level);
                onSelectTab('katalog');
              }}
              className={`p-4 rounded-2xl border ${item.color} transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-sm flex flex-col justify-between h-32 group`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded text-white ${item.badge}`}>
                  {item.level}
                </span>
                <span className="text-xs font-medium opacity-70">
                  {countByLevel(item.level)} Modul
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight group-hover:underline">
                  {item.label}
                </h3>
                <p className="text-[11px] opacity-75 mt-0.5">
                  {item.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. MATERI UNGGULAN & REKOMENDASI */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Materi Edukasi Pilihan & Rekomendasi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Kurikulum prioritas nasional keselamatan lalu lintas dan ketertiban</p>
          </div>
          <button
            onClick={() => onSelectTab('katalog')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Katalog Penuh ({materials.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recommendedMaterials.map((mat) => (
            <div
              key={mat.id}
              onClick={() => onOpenMaterial(mat)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col group cursor-pointer relative"
            >
              {/* Thumbnail */}
              <div className="h-40 relative bg-slate-100 overflow-hidden">
                <img
                  src={mat.imageUrl}
                  alt={mat.title}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
                <span className="absolute top-3 left-3 bg-[#0a1d37] text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow-sm">
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

              {/* Content */}
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
                  <span className="text-slate-400 text-[11px]">
                    {mat.author || 'Korlantas POLRI'}
                  </span>
                  <span className="font-semibold text-blue-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Mulai <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
