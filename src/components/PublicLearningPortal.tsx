import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  BookOpen,
  Play,
  FileText,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck,
  Eye,
  Download,
  CheckCircle2,
  Lock,
  QrCode,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { MaterialItem, EducationLevel, MaterialType } from '../types';
import { INITIAL_MATERIALS } from '../data/materials';
import {
  readGuestProgress,
  clearAllGuestProgress,
  GUEST_PROGRESS_EVENT,
  GuestMaterialProgress
} from '../utils/guestProgress';

interface PublicLearningPortalProps {
  onOpenSessionJoin: (code?: string) => void;
  onOpenCourseDetail: (material: MaterialItem) => void;
}

export function PublicLearningPortal({
  onOpenSessionJoin,
  onOpenCourseDetail,
}: PublicLearningPortalProps) {
  const [publicMaterials, setPublicMaterials] = useState<MaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('ALL');
  const [selectedType, setSelectedType] = useState<MaterialType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');

  const fetchPublicMaterials = () => {
    setIsLoading(true);
    setError(null);
    fetch('/api/public/materials')
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data katalog publik.');
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Respon server bukan format JSON.');
        }
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setPublicMaterials(data.data);
        } else {
          // Fallback to initial materials
          const fallback = INITIAL_MATERIALS.filter(
            m => (m.publishStatus || 'published') === 'published' && m.publicAccess !== 'restricted'
          );
          setPublicMaterials(fallback);
        }
      })
      .catch(err => {
        // Graceful fallback to initial materials on network/route issue
        const fallback = INITIAL_MATERIALS.filter(
          m => (m.publishStatus || 'published') === 'published' && m.publicAccess !== 'restricted'
        );
        if (fallback.length > 0) {
          setPublicMaterials(fallback);
          setError(null);
        } else {
          setError(err.message || 'Koneksi ke backend gagal.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPublicMaterials();
  }, []);

  // Reading progress of this anonymous visitor, kept in their own browser.
  // Re-read when the reader writes (same tab) and when another tab writes.
  const [guestProgress, setGuestProgress] = useState<Record<string, GuestMaterialProgress>>(
    () => readGuestProgress()
  );

  useEffect(() => {
    const sync = () => setGuestProgress(readGuestProgress());
    sync();
    window.addEventListener(GUEST_PROGRESS_EVENT, sync);
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener(GUEST_PROGRESS_EVENT, sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const guestStats = useMemo(() => {
    const entries = Object.values(guestProgress);
    return {
      completedCount: entries.filter(p => p.isCompleted).length,
      inProgressCount: entries.filter(p => !p.isCompleted && p.progressPercent > 0).length
    };
  }, [guestProgress]);

  const filteredList = useMemo(() => {
    let result = [...publicMaterials];

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
        m.level.toLowerCase().includes(q)
      );
    }

    return result;
  }, [publicMaterials, selectedLevel, selectedType, searchQuery]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCodeInput.trim()) {
      onOpenSessionJoin(joinCodeInput.trim().toUpperCase());
    }
  };

  const levels: { id: EducationLevel; label: string }[] = [
    { id: 'ALL', label: 'Semua Jenjang' },
    { id: 'TK/PAUD', label: 'TK / PAUD' },
    { id: 'SD', label: 'Sekolah Dasar (SD)' },
    { id: 'SMP', label: 'SMP / MTs' },
    { id: 'SMA', label: 'SMA / SMK / Umum' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* 1. HERO PUBLIC PORTAL WITH JOIN CODE BAR */}
      <section className="bg-gradient-to-br from-[#0a1d37] via-[#0f2d59] to-[#0a1d37] text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            <span>Portal Edukasi Terbuka Masyarakat — Korlantas DIKMAS POLRI</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
            Belajar Keselamatan Lalu Lintas & Kesadaran Hukum Bersama DIKMAS POLRI
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Akses bebas untuk pelajar dan masyarakat umum terhadap materi keselamatan jalan raya, video interaktif, buku pedoman, dan infografis resmi Korlantas DIKMAS POLRI.
          </p>

          {/* JOIN SESSION QUICK BAR */}
          <div className="pt-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl max-w-xl space-y-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                Sedang Mengikuti Kegiatan Pemaparan / Sosialisasi?
              </span>
              <form onSubmit={handleJoinSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="Masukkan Kode Sesi (contoh: POL-A7K9)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-xs font-mono font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Gabung Sesi</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi keselamatan, rambu, tata tertib..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* JENJANG CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {levels.map(lvl => (
              <button
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                  selectedLevel === lvl.id
                    ? 'bg-[#0a1d37] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2b. READING PROGRESS STRIP (this browser only) */}
      {(guestStats.completedCount > 0 || guestStats.inProgressCount > 0) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-emerald-900">
                Riwayat Belajar Anda: {guestStats.completedCount} modul selesai
                {guestStats.inProgressCount > 0 && ` • ${guestStats.inProgressCount} sedang dibaca`}
              </p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Progres ini tersimpan di perangkat Anda sendiri (tanpa perlu login) dan akan tetap ada saat Anda membuka portal ini lagi.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Hapus seluruh riwayat belajar di perangkat ini? Tindakan ini tidak bisa dibatalkan.')) {
                clearAllGuestProgress();
                setGuestProgress({});
              }
            }}
            className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 cursor-pointer shrink-0 self-start sm:self-center"
          >
            Reset Riwayat
          </button>
        </div>
      )}

      {/* 3. MATERIAL CARDS GRID */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Memuat materi portal edukasi...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
          <p className="text-xs font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchPublicMaterials}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Belum ada materi publik yang sesuai</h3>
          <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter jenjang di atas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map(item => {
            const read = guestProgress[item.id];
            const isRead = Boolean(read?.isCompleted);
            const isPartial = Boolean(read && !read.isCompleted && read.progressPercent > 0);

            return (
            <div
              key={item.id}
              onClick={() => onOpenCourseDetail(item)}
              className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-lg transition duration-200 flex flex-col justify-between cursor-pointer group ${
                isRead ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'
              }`}
            >
              <div>
                {/* IMAGE COVER */}
                <div className="relative aspect-video overflow-hidden bg-slate-100">
                  <img
                    src={item.imageUrl}
                    alt={item.imageAlt || item.title}
                    className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
                      isRead ? 'opacity-90' : ''
                    }`}
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#0a1d37]/90 backdrop-blur-xs text-white text-[10px] font-bold">
                      {item.level}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-600/90 backdrop-blur-xs text-white text-[10px] font-bold">
                      {item.typeLabel}
                    </span>
                  </div>

                  {/* READ STATUS MARKER */}
                  {isRead && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesai Dibaca</span>
                    </span>
                  )}
                  {isPartial && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-extrabold shadow-md">
                      Dibaca {read.progressPercent}%
                    </span>
                  )}

                  {/* PROGRESS BAR ON COVER */}
                  {(isRead || isPartial) && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/25">
                      <div
                        className={`h-full transition-all ${isRead ? 'bg-emerald-500' : 'bg-amber-400'}`}
                        style={{ width: `${read.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* CONTENT INFO */}
                <div className="p-5 space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* FOOTER METRICS & NOTICE */}
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{item.views || 0} views</span>
                  </div>
                  <span className="font-medium text-slate-400">{item.author || 'Korlantas POLRI'}</span>
                </div>

                {/* NOTICE QUIZ POLICY */}
                <div className="flex items-center justify-between pt-1">
                  {isRead ? (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Seluruh materi telah Anda baca</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Kuis aktif di sesi instruktur</span>
                    </span>
                  )}
                  <span className={`text-xs font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition ${
                    isRead ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    <span>{isRead ? 'Baca Ulang' : isPartial ? 'Lanjutkan' : 'Buka Modul'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
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