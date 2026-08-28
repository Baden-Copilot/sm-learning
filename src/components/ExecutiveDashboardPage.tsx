import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  ShieldCheck,
  BookOpen,
  Printer,
  Building,
  Radio,
  RefreshCw,
  AlertCircle,
  Award,
  Target,
  Activity,
  MapPin,
  CalendarDays,
  Minus,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Trophy,
  Eye
} from 'lucide-react';
import { MaterialItem, EducationLevel, ExecutiveAnalyticsData, KpiRow } from '../types';
import { ActivityResultModal } from './Modals/ActivityResultModal';
import { fetchPoldaList, fetchPolresByPolda, WilayahPoldaItem, WilayahPolresItem, DEFAULT_34_POLDA } from '../utils/wilayah';

interface ExecutiveDashboardPageProps {
  materials: MaterialItem[];
  authHeaders?: Record<string, string>;
}

/** Inline bar row — avoids pulling in a charting dependency for simple magnitudes. */
function BarRow({
  label,
  value,
  max,
  colorClass,
  suffix
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">
          {value.toLocaleString()}{suffix || ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const GRADE_STYLE: Record<string, { chip: string; bar: string; ring: string }> = {
  A: { chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500', ring: 'text-emerald-600' },
  B: { chip: 'bg-blue-100 text-blue-800 border-blue-300', bar: 'bg-blue-500', ring: 'text-blue-600' },
  C: { chip: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500', ring: 'text-amber-600' },
  D: { chip: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-500', ring: 'text-orange-600' },
  E: { chip: 'bg-slate-100 text-slate-600 border-slate-300', bar: 'bg-slate-300', ring: 'text-slate-400' },
};

/** Compact 0-100 dial. Pure SVG — no chart library is installed in this project. */
function ScoreDial({ score, grade }: { score: number; grade: string }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const style = GRADE_STYLE[grade] || GRADE_STYLE.E;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg viewBox="0 0 48 48" className="w-14 h-14 -rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="5" className="stroke-slate-100" />
        <circle
          cx="24" cy="24" r={r} fill="none" strokeWidth="5" strokeLinecap="round"
          className={`${style.ring} transition-all duration-700`}
          stroke="currentColor"
          strokeDasharray={`${filled} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-slate-900 leading-none">{score}</span>
        <span className="text-[9px] font-bold text-slate-400 leading-none mt-0.5">{grade}</span>
      </div>
    </div>
  );
}

export function ExecutiveDashboardPage({
  materials,
  authHeaders
}: ExecutiveDashboardPageProps) {
  const [selectedPolda, setSelectedPolda] = useState<string>('ALL');
  const [selectedPolres, setSelectedPolres] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<EducationLevel>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [poldaList, setPoldaList] = useState<WilayahPoldaItem[]>([]);
  const [polresList, setPolresList] = useState<WilayahPolresItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPolda, setExpandedPolda] = useState<string | null>(null);
  // Drill-down: pimpinan opens one activity to see what actually happened in it
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);
  const [kpiScope, setKpiScope] = useState<'polda' | 'polres' | 'trainer'>('polda');
  const [expandedKpiKey, setExpandedKpiKey] = useState<string | null>(null);

  // Load master 34 polda saat komponen mount
  useEffect(() => {
    fetchPoldaList().then(list => {
      const filtered = list.filter(p => p.isWilayah);
      setPoldaList(filtered);
    });
  }, []);

  // Load polres dari DB saat selectedPolda berubah
  useEffect(() => {
    if (selectedPolda === 'ALL') {
      setPolresList([]);
      return;
    }
    fetchPolresByPolda(selectedPolda).then(list => {
      setPolresList(list);
    });
  }, [selectedPolda]);

  const fetchAnalytics = () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (selectedPolda !== 'ALL') params.append('polda', selectedPolda);
    if (selectedPolres !== 'ALL') params.append('polres', selectedPolres);
    if (selectedLevelFilter !== 'ALL') params.append('level', selectedLevelFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    fetch(`/api/executive/analytics?${params.toString()}`, { headers: authHeaders || {} })
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok || !body.success) {
          throw new Error(body.message || 'Gagal memuat analitik eksekutif dari server.');
        }
        setAnalyticsData(body.data);

        // Jika server mengunci scope (Kapolda / Kapolres), sinkronkan state dropdown
        const scope = body.data?.executiveScope;
        if (scope?.isLockedToPolda && scope?.polda && selectedPolda === 'ALL') {
          setSelectedPolda(scope.polda);
        } else if (scope?.isLockedToPolres && scope?.polda && selectedPolda === 'ALL') {
          setSelectedPolda(scope.polda);
          if (scope?.polres) setSelectedPolres(scope.polres);
        }
      })
      .catch(err => {
        setError(err.message || 'Terjadi kesalahan sistem.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPolda, selectedPolres, selectedLevelFilter, startDate, endDate]);

  const handlePoldaChange = (polda: string) => {
    setSelectedPolda(polda);
    setSelectedPolres('ALL');
  };

  const resetFilters = () => {
    setSelectedPolda('ALL');
    setSelectedPolres('ALL');
    setSelectedLevelFilter('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilter =
    selectedPolda !== 'ALL' || selectedPolres !== 'ALL' || selectedLevelFilter !== 'ALL' || Boolean(startDate) || Boolean(endDate);

  const polresOptions = selectedPolda !== 'ALL' && POLRES_MAP[selectedPolda] ? POLRES_MAP[selectedPolda] : [];

  const kpi = analyticsData;

  // Month-over-month movement from the real trend series
  const trendDelta = useMemo(() => {
    const t = kpi?.activityTrend || [];
    if (t.length < 2) return null;
    const current = t[t.length - 1];
    const prev = t[t.length - 2];
    const diff = current.sessionCount - prev.sessionCount;
    const pct = prev.sessionCount > 0 ? Math.round((diff / prev.sessionCount) * 100) : (current.sessionCount > 0 ? 100 : 0);
    return { diff, pct, currentLabel: current.label, prevLabel: prev.label };
  }, [kpi]);

  const trendMax = useMemo(
    () => Math.max(1, ...(kpi?.activityTrend || []).map(t => Math.max(t.sessionCount, t.participantCount))),
    [kpi]
  );

  const totalScored = useMemo(
    () => (kpi?.scoreDistribution || []).reduce((s, b) => s + b.count, 0),
    [kpi]
  );

  // Which of the three graded rankings the KPI panel is currently showing.
  const activeKpiRows: KpiRow[] = useMemo(() => {
    if (!kpi) return [];
    if (kpiScope === 'trainer') return kpi.trainerKpi || [];
    if (kpiScope === 'polres') return kpi.polresKpi || [];
    return kpi.poldaKpi || [];
  }, [kpi, kpiScope]);

  const handlePrint = () => {
    window.print();
  };

  // Full-page states: never render a grid of zeros that looks like real data
  if (isLoading && !analyticsData) {
    return (
      <div className="max-w-7xl mx-auto py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Menghitung analitik nasional dari data lapangan...</p>
      </div>
    );
  }

  if (error && !analyticsData) {
    return (
      <div className="max-w-3xl mx-auto py-20">
        <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h2 className="text-sm font-bold text-red-900">Analitik tidak dapat dimuat</h2>
          <p className="text-xs text-red-700">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!kpi) return null;

  const hasFieldData = kpi.totalSessions > 0;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto font-sans">
      {/* 1. HEADER & FILTERS */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a1d37] text-amber-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Eksekutif Strategic Dashboard • Korlantas POLRI</span>
              </div>
              {kpi?.executiveScope && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  kpi.executiveScope.level === 'nasional'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : kpi.executiveScope.level === 'polda'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-purple-50 text-purple-800 border-purple-200'
                }`}>
                  <Building className="w-3.5 h-3.5" />
                  <span>
                    Lingkup: {
                      kpi.executiveScope.level === 'nasional'
                        ? 'Tingkat Nasional (Seluruh Indonesia)'
                        : kpi.executiveScope.level === 'polda'
                        ? `Polda — ${kpi.executiveScope.polda || 'Wilayah'}`
                        : `Polres — ${kpi.executiveScope.polres || 'Wilayah'}`
                    }
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Laporan Kinerja & Analitik Edukasi {kpi?.executiveScope?.level === 'polda' && kpi?.executiveScope?.polda ? kpi.executiveScope.polda : 'Nasional'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Seluruh angka dihitung langsung dari kegiatan lapangan yang tercatat — tidak ada nilai contoh.
              {kpi.generatedAt && (
                <span className="text-slate-400">
                  {' '}Data per {new Date(kpi.generatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={fetchAnalytics}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-[#0a1d37] hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* FILTER ROW */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Wilayah Polda {kpi?.executiveScope?.isLockedToPolda && '(Terkunci)'}
            </label>
            <select
              value={selectedPolda}
              onChange={(e) => handlePoldaChange(e.target.value)}
              disabled={Boolean(kpi?.executiveScope?.isLockedToPolda || kpi?.executiveScope?.isLockedToPolres)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {!kpi?.executiveScope?.isLockedToPolda && (
                <option value="ALL">Semua Polda (Nasional)</option>
              )}
              {poldaList.length > 0
                ? poldaList.map(p => (
                    <option key={p.poldaId} value={p.nama}>{p.nama}</option>
                  ))
                : DEFAULT_34_POLDA.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Polres / Satlantas {kpi?.executiveScope?.isLockedToPolres && '(Terkunci)'}
            </label>
            <select
              value={selectedPolres}
              onChange={(e) => setSelectedPolres(e.target.value)}
              disabled={selectedPolda === 'ALL' || Boolean(kpi?.executiveScope?.isLockedToPolres)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Semua Polres</option>
              {polresList.map(p => (
                <option key={`${p.poldaId}-${p.polresId}`} value={p.nama}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Jenjang
            </label>
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value as EducationLevel)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Semua Jenjang</option>
              <option value="TK/PAUD">TK / PAUD</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA / Umum</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        </div>

        {hasActiveFilter && (
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
            <span className="text-slate-500 font-medium">
              Menampilkan data terfilter — {kpi.totalSessions} kegiatan cocok dengan kriteria ini.
            </span>
            <button
              onClick={resetFilters}
              className="font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4 cursor-pointer shrink-0"
            >
              Reset Filter
            </button>
          </div>
        )}
      </section>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error} Menampilkan data terakhir yang berhasil dimuat.</span>
          </div>
          <button onClick={fetchAnalytics} className="underline font-bold cursor-pointer shrink-0">Coba Lagi</button>
        </div>
      )}

      {/* 2. HEADLINE KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0a1d37] text-white p-5 rounded-2xl shadow-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 uppercase">Masyarakat Teredukasi</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black">{kpi.totalParticipants.toLocaleString()}</p>
          <p className="text-[11px] text-slate-300">
            dari {kpi.totalSessions} kegiatan pemaparan ({kpi.totalCompletedSessions} selesai)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Aktivitas Bulan Ini</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {kpi.activityTrend.length > 0 ? kpi.activityTrend[kpi.activityTrend.length - 1].sessionCount : 0}
            <span className="text-sm font-bold text-slate-400"> kegiatan</span>
          </p>
          {trendDelta ? (
            <p className={`text-[11px] font-bold flex items-center gap-1 ${
              trendDelta.diff > 0 ? 'text-emerald-600' : trendDelta.diff < 0 ? 'text-red-600' : 'text-slate-400'
            }`}>
              {trendDelta.diff > 0 ? <TrendingUp className="w-3.5 h-3.5" />
                : trendDelta.diff < 0 ? <TrendingDown className="w-3.5 h-3.5" />
                : <Minus className="w-3.5 h-3.5" />}
              <span>
                {trendDelta.diff > 0 ? '+' : ''}{trendDelta.diff} vs {trendDelta.prevLabel}
                {trendDelta.pct !== 0 && ` (${trendDelta.pct > 0 ? '+' : ''}${trendDelta.pct}%)`}
              </span>
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">Belum ada pembanding bulan sebelumnya</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tingkat Kelulusan Kuis</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{kpi.completionRate}%</p>
          <p className="text-[11px] text-slate-500">
            {kpi.totalQuizCompleted} lulus dari {kpi.totalQuizAttempts} percobaan • rata-rata {kpi.averageQuizScore}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Instruktur Aktif</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {kpi.activeTrainers}<span className="text-sm font-bold text-slate-400"> / {kpi.totalTrainers}</span>
          </p>
          <p className={`text-[11px] font-semibold ${kpi.idleTrainers > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {kpi.idleTrainers > 0
              ? `${kpi.idleTrainers} instruktur belum menjalankan kegiatan`
              : 'Seluruh instruktur telah bertugas'}
          </p>
        </div>
      </section>

      {/* 3. SECONDARY KPI STRIP */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Modul', value: kpi.totalMaterials, sub: `${kpi.totalPublicMaterials} terbuka publik`, color: 'text-slate-900' },
          { label: 'Akses Portal Publik', value: kpi.totalPublicViews, sub: 'penayangan mandiri', color: 'text-blue-800' },
          { label: 'Akses via Sesi QR', value: kpi.totalSessionViews, sub: 'penayangan saat pemaparan', color: 'text-purple-700' },
          { label: 'Percobaan Kuis', value: kpi.totalQuizAttempts, sub: `${kpi.totalQuizCompleted} lulus`, color: 'text-amber-700' },
          { label: 'Wilayah Terlibat', value: kpi.regionalHierarchy.length, sub: 'Polda dengan kegiatan', color: 'text-emerald-700' },
        ].map(c => (
          <div key={c.label} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">{c.label}</span>
            <p className={`text-xl font-black ${c.color}`}>{c.value.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 truncate">{c.sub}</p>
          </div>
        ))}
      </section>

      {!hasFieldData && (
        <div className="p-6 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-900">Belum ada kegiatan pemaparan pada kriteria ini</p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Panel tren, wilayah, dan evaluasi akan terisi otomatis setelah instruktur menutup kegiatan lapangan dan mengirim laporan.
              {hasActiveFilter && ' Coba longgarkan filter di atas untuk melihat cakupan yang lebih luas.'}
            </p>
          </div>
        </div>
      )}

      {/* 3b. PENILAIAN KPI — per Polda / Polres / Instruktur */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Penilaian Kinerja (KPI)</span>
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nilai gabungan 0–100 dari empat komponen, agar wilayah besar tidak otomatis unggul hanya karena ukurannya.
              Klik satu baris untuk melihat rincian penilaiannya.
            </p>
          </div>

          <div className="flex bg-slate-100 rounded-xl p-1 shrink-0 self-start">
            {[
              { key: 'polda' as const, label: 'Per Polda' },
              { key: 'polres' as const, label: 'Per Polres' },
              { key: 'trainer' as const, label: 'Per Instruktur' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setKpiScope(t.key); setExpandedKpiKey(null); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  kpiScope === t.key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Weight legend — leadership must be able to see how a score was formed */}
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
          {[
            { label: 'Aktivitas', weight: kpi.kpiWeights.activity, cls: 'bg-blue-50 text-blue-800 border-blue-200' },
            { label: 'Jangkauan', weight: kpi.kpiWeights.reach, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
            { label: 'Kualitas Nilai', weight: kpi.kpiWeights.quality, cls: 'bg-purple-50 text-purple-800 border-purple-200' },
            { label: 'Ketuntasan Lapor', weight: kpi.kpiWeights.discipline, cls: 'bg-amber-50 text-amber-800 border-amber-200' },
          ].map(w => (
            <span key={w.label} className={`px-2.5 py-1 rounded-lg border ${w.cls}`}>
              {w.label} {w.weight}%
            </span>
          ))}
        </div>

        {activeKpiRows.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            {kpiScope === 'trainer'
              ? 'Belum ada instruktur terdaftar.'
              : 'Belum ada wilayah yang menjalankan kegiatan pada filter ini.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeKpiRows.map(row => {
              const style = GRADE_STYLE[row.grade] || GRADE_STYLE.E;
              const isOpen = expandedKpiKey === row.key;
              const isIdle = row.sessionCount === 0;

              return (
                <div
                  key={row.key}
                  className={`rounded-2xl border overflow-hidden transition ${
                    isIdle ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => setExpandedKpiKey(isOpen ? null : row.key)}
                    className="w-full p-4 flex items-center gap-4 text-left cursor-pointer hover:bg-slate-50 transition"
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      row.rank === 1 && !isIdle ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {row.rank}
                    </span>

                    <ScoreDial score={row.kpiScore} grade={row.grade} />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">{row.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${style.chip}`}>
                          {row.grade} • {row.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {kpiScope === 'trainer' && `${row.polres} — ${row.polda}`}
                        {kpiScope === 'polres' && row.polda}
                        {kpiScope === 'polda' && `${row.polresCount} polres • ${row.trainerCount} instruktur`}
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {row.sessionCount} kegiatan • {row.participantCount} peserta • rata-rata nilai{' '}
                        <span className={row.averageScore >= 70 ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
                          {row.averageScore || '-'}
                        </span>
                      </p>
                    </div>

                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 min-w-[92px]">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Kegiatan Terakhir</span>
                      <span className="text-[11px] font-bold text-slate-700">
                        {row.lastActivityDate || 'Belum ada'}
                      </span>
                    </div>

                    {isOpen
                      ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {[
                          { label: `Aktivitas (${kpi.kpiWeights.activity}%)`, value: row.components.activity, hint: 'dibanding unit paling aktif', cls: 'bg-blue-500' },
                          { label: `Jangkauan (${kpi.kpiWeights.reach}%)`, value: row.components.reach, hint: 'dibanding jangkauan terbesar', cls: 'bg-emerald-500' },
                          { label: `Kualitas Nilai (${kpi.kpiWeights.quality}%)`, value: row.components.quality, hint: 'rata-rata nilai kuis peserta', cls: 'bg-purple-500' },
                          { label: `Ketuntasan Lapor (${kpi.kpiWeights.discipline}%)`, value: row.components.discipline, hint: 'kegiatan ditutup & dilaporkan', cls: 'bg-amber-500' },
                        ].map(c => (
                          <div key={c.label} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">{c.label}</span>
                              <span className="font-black text-slate-900">{c.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${c.cls}`} style={{ width: `${c.value}%` }} />
                            </div>
                            <p className="text-[10px] text-slate-400">{c.hint}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {[
                          { label: 'Kegiatan Ditutup', value: `${row.closedCount}/${row.sessionCount}` },
                          { label: 'Modul Dipakai', value: row.materialCount },
                          { label: 'Kuis Dikerjakan', value: row.quizAttemptCount },
                          { label: 'Tingkat Kelulusan', value: `${row.passingRate}%` },
                        ].map(s => (
                          <div key={s.label} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">{s.label}</span>
                            <span className="text-sm font-black text-slate-900">{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {kpiScope === 'polres' && row.trainers && row.trainers.length > 0 && (
                        <p className="text-[11px] text-slate-500">
                          <span className="font-bold text-slate-700">Instruktur bertugas:</span> {row.trainers.join(', ')}
                        </p>
                      )}

                      {isIdle && (
                        <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Belum menjalankan kegiatan sama sekali pada periode ini — perlu atensi pimpinan.</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Blank spots on the map: regions that ran nothing at all */}
        {kpiScope === 'polda' && kpi.inactivePolda.length > 0 && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-2">
            <p className="text-xs font-bold text-red-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>{kpi.inactivePolda.length} Polda belum menjalankan kegiatan pada periode ini</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {kpi.inactivePolda.map(p => (
                <span key={p} className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-[11px] font-semibold text-red-800">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. TREND + DISTRIBUSI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* MONTHLY TREND */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span>Tren Kegiatan 6 Bulan Terakhir</span>
            </h2>
            <p className="text-xs text-slate-500">Jumlah kegiatan pemaparan dan peserta yang terjangkau tiap bulan.</p>
          </div>

          <div className="flex items-end justify-between gap-2 h-48 pt-2">
            {kpi.activityTrend.map(t => {
              const sessionH = Math.round((t.sessionCount / trendMax) * 100);
              const partH = Math.round((t.participantCount / trendMax) * 100);
              return (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div
                      className="w-1/3 bg-blue-600 rounded-t-md min-h-[2px] transition-all group-hover:bg-blue-500"
                      style={{ height: `${sessionH}%` }}
                      title={`${t.sessionCount} kegiatan`}
                    />
                    <div
                      className="w-1/3 bg-emerald-500 rounded-t-md min-h-[2px] transition-all group-hover:bg-emerald-400"
                      style={{ height: `${partH}%` }}
                      title={`${t.participantCount} peserta`}
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-600 block">{t.label}</span>
                    <span className="text-[9px] text-slate-400 block">{t.sessionCount}/{t.participantCount}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />Kegiatan Pemaparan</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Peserta Terjangkau</span>
          </div>
        </section>

        {/* SCORE DISTRIBUTION */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Sebaran Nilai Kuis</span>
            </h2>
            <p className="text-xs text-slate-500">Bukti pemahaman peserta, bukan sekadar kehadiran.</p>
          </div>

          {totalScored === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Belum ada peserta yang mengerjakan kuis pada filter ini.
            </div>
          ) : (
            <div className="space-y-3.5">
              {kpi.scoreDistribution.map(b => {
                const color =
                  b.band === '85-100' ? 'bg-emerald-500'
                  : b.band === '70-84' ? 'bg-blue-500'
                  : b.band === '50-69' ? 'bg-amber-500'
                  : 'bg-red-500';
                const pct = Math.round((b.count / totalScored) * 100);
                return (
                  <BarRow
                    key={b.band}
                    label={`Nilai ${b.band}${b.band === '0-49' || b.band === '50-69' ? ' (belum lulus)' : ''}`}
                    value={b.count}
                    max={totalScored}
                    colorClass={color}
                    suffix={` (${pct}%)`}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 5. JENJANG + STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Cakupan per Jenjang Pendidikan</span>
            </h2>
            <p className="text-xs text-slate-500">Jenjang mana yang sudah terlayani dan mana yang masih tertinggal.</p>
          </div>

          {kpi.levelBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Belum ada modul terdaftar.</div>
          ) : (
            <div className="space-y-4">
              {kpi.levelBreakdown.map(l => {
                const maxPart = Math.max(1, ...kpi.levelBreakdown.map(x => x.participantCount));
                return (
                  <div key={l.level} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{l.level}</span>
                      <span className="text-[11px] text-slate-500">
                        {l.materialCount} modul • {l.sessionCount} kegiatan • <span className="font-bold text-slate-800">{l.participantCount} peserta</span>
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${l.participantCount > 0 ? 'bg-purple-600' : 'bg-slate-200'}`}
                        style={{ width: `${Math.round((l.participantCount / maxPart) * 100)}%` }}
                      />
                    </div>
                    {l.sessionCount === 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold">Belum pernah dipaparkan di lapangan</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>Status Kegiatan</span>
          </h2>

          {kpi.statusBreakdown.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">Belum ada kegiatan tercatat.</div>
          ) : (
            <div className="space-y-2.5">
              {kpi.statusBreakdown.map(s => {
                const meta: Record<string, { label: string; cls: string }> = {
                  scheduled: { label: 'Terjadwal', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
                  active: { label: 'Sedang Berlangsung', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  completed: { label: 'Selesai', cls: 'bg-blue-50 text-blue-800 border-blue-200' },
                  closed: { label: 'Ditutup & Dilaporkan', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
                  cancelled: { label: 'Dibatalkan', cls: 'bg-red-50 text-red-800 border-red-200' },
                };
                const m = meta[s.status] || { label: s.status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
                return (
                  <div key={s.status} className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between ${m.cls}`}>
                    <span className="text-xs font-bold">{m.label}</span>
                    <span className="text-sm font-black">{s.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 6. MATERI POPULER */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Peringkat Materi Berdasarkan Interaksi Nyata</span>
          </h2>
          <p className="text-xs text-slate-500">
            Metrik terpisah antara penayangan portal publik, penayangan sesi pemaparan, dan partisipasi kuis.
          </p>
        </div>

        {kpi.popularMaterials.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada data interaksi materi untuk filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Judul Modul</th>
                  <th className="px-4 py-3">Jenjang</th>
                  <th className="px-4 py-3 text-right">Public Views</th>
                  <th className="px-4 py-3 text-right">Session Views</th>
                  <th className="px-4 py-3 text-right">Sesi</th>
                  <th className="px-4 py-3 text-right">Peserta</th>
                  <th className="px-4 py-3 text-right">Kuis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpi.popularMaterials.map((item, idx) => (
                  <tr key={item.materialId} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 max-w-xs truncate">{item.title}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">{item.publicViews.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-purple-700">{item.sessionViews.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{item.sessionCount}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">{item.participantCount.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-amber-700">{item.quizAttemptCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 7. TRAINER + WILAYAH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Kinerja Instruktur Lapangan</span>
          </h2>

          {kpi.trainerPerformance.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Belum ada instruktur terdaftar.</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {kpi.trainerPerformance.map((t, idx) => (
                <div key={t.trainerId} className="py-3.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${
                      t.sessionCount > 0 ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{t.trainerName}</p>
                      <p className="text-[11px] text-slate-500">
                        {t.sessionCount > 0
                          ? `${t.sessionCount} kegiatan • ${t.materialCount} modul • ${t.participantCount} peserta`
                          : 'Belum menjalankan kegiatan lapangan'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {t.sessionCount > 0 ? (
                      <>
                        <span className="font-bold text-emerald-700 block">{t.completionCount} laporan selesai</span>
                        <span className="text-[10px] text-slate-400">{t.sessionViews} interaksi peserta</span>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        Perlu Atensi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-600" />
            <span>Keaktifan Wilayah (Polda & Polres)</span>
          </h2>

          {kpi.regionalHierarchy.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Belum ada data wilayah kegiatan tercatat.</div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {kpi.regionalHierarchy.map(p => {
                const isOpen = expandedPolda === p.polda;
                return (
                  <div key={p.polda} className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedPolda(isOpen ? null : p.polda)}
                      className="w-full p-4 flex items-center justify-between gap-3 hover:bg-slate-100 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">{p.polda}</span>
                          <span className="text-[10px] text-slate-500">
                            {p.polresList.length} polres • {p.totalParticipants} peserta • {p.totalViews} interaksi
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded shrink-0">
                        {p.totalSessions} Kegiatan
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-2">
                        {p.polresList.map(pol => (
                          <div key={pol.polres} className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{pol.polres}</span>
                              </span>
                              <span className="font-semibold text-slate-600 shrink-0">
                                {pol.sessionCount} sesi • {pol.participantCount} peserta
                              </span>
                            </div>
                            {pol.trainers.length > 0 && (
                              <p className="text-[10px] text-slate-500 pl-4.5">
                                Instruktur: {pol.trainers.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 8. RECENT FIELD ACTIVITY */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Laporan Kegiatan Terakhir</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kegiatan lapangan yang telah ditutup dan dilaporkan instruktur. Klik satu baris untuk melihat hasil lengkapnya.
          </p>
        </div>

        {kpi.recentActivity.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Belum ada laporan kegiatan yang masuk pada filter ini.
          </div>
        ) : (
          <div className="space-y-2.5">
            {kpi.recentActivity.map(r => (
              <button
                key={r.reportId}
                onClick={() => setPreviewSessionId(r.sessionId)}
                className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{r.activityName}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {r.materialTitle} • {r.trainerName}
                  </p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{r.location}, {r.polres} — {r.polda}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Peserta</span>
                    <span className="text-sm font-black text-slate-900">{r.totalParticipants}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Rata-rata</span>
                    <span className={`text-sm font-black ${r.averageScore >= 70 ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {r.averageScore}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Lulus</span>
                    <span className={`text-sm font-black ${r.passingRate >= 70 ? 'text-emerald-700' : 'text-amber-600'}`}>
                      {r.passingRate}%
                    </span>
                  </div>
                  <div className="text-right min-w-[72px]">
                    <span className="text-[10px] text-slate-400 block">Tanggal</span>
                    <span className="text-[11px] font-bold text-slate-700">{r.date}</span>
                  </div>
                  <Eye className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* DRILL-DOWN: full result of one activity */}
      {previewSessionId && (
        <ActivityResultModal
          sessionId={previewSessionId}
          authHeaders={authHeaders}
          onClose={() => setPreviewSessionId(null)}
        />
      )}
    </div>
  );
}
