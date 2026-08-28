import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  QrCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Users,
  Eye,
  CheckSquare,
  Award,
  Radio,
  FileCheck2,
  MapPin,
  Building,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  BookOpen,
  X,
  Play,
  FileText,
  HelpCircle,
  Download,
  Printer
} from 'lucide-react';
import { OutreachSession } from '../types';

interface PresentationRoomProps {
  session: OutreachSession;
  onBack: () => void;
  onOpenReportModal: (session: OutreachSession) => void;
  onOpenCourseMaterial?: (materialId: string) => void;
}

export function PresentationRoom({
  session,
  onBack,
  onOpenReportModal,
  onOpenCourseMaterial
}: PresentationRoomProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [liveData, setLiveData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showMaterialModal, setShowMaterialModal] = useState<boolean>(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);

  const fullPublicUrl = `${window.location.origin}/public/session/${session.publicAccessCode}`;

  const handleDownloadQr = async () => {
    try {
      setIsDownloadingQr(true);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(fullPublicUrl)}&margin=20`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `QR-Kegiatan-${session.publicAccessCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(fullPublicUrl)}&margin=20`, '_blank');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const fetchLiveMetrics = () => {
    setIsRefreshing(true);
    fetch(`/api/outreach/sessions/${session.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLiveData(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchLiveMetrics();
    // Real polling every 5 seconds for live field interaction
    const interval = setInterval(fetchLiveMetrics, 5000);
    return () => clearInterval(interval);
  }, [session.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPublicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const metrics = liveData?.metrics || {
    participantCount: 0,
    viewsCount: 0,
    quizAttemptCount: 0,
    quizCompletedCount: 0,
    certifiedCount: 0,
    averageQuizScore: 0
  };

  const participants = liveData?.participants || [];
  const recentEvents = liveData?.recentEvents || [];
  const material = liveData?.material;

  return (
    <div className={`space-y-6 pb-12 ${isFullscreen ? 'bg-slate-900 text-white min-h-screen p-6' : ''}`}>
      {/* TOP NAVIGATION & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Kembali ke Ruang Trainer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                Live Presentation Room
              </span>
              <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {session.publicAccessCode}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1 line-clamp-1">
              {session.activityName}
            </h1>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* LIHAT MATERI BUTTON */}
          <button
            onClick={() => setShowMaterialModal(true)}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Lihat Materi Sesi</span>
          </button>

          <button
            onClick={fetchLiveMetrics}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Muat ulang analitik"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={() => onOpenReportModal(session)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Selesaikan &amp; Lapor</span>
          </button>
        </div>
      </div>

      {/* DUAL COLUMN: PRESENTATION QR DISPLAY & REAL LIVE METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / HERO: QR CODE & PUBLIC ACCESS PORTAL CARD */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          <div className="bg-[#0a1d37] text-white rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden border border-slate-800">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-radial from-blue-600/20 via-transparent to-transparent opacity-60 pointer-events-none" />

            <div className="space-y-1 relative z-10">
              <span className="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
                Akses Peserta Masyarakat
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Scan QR Code Untuk Bergabung
              </h2>
              <p className="text-xs text-slate-300">
                Arahkan kamera smartphone ke QR code atau masukkan kode akses di bawah.
              </p>
            </div>

            {/* BIG HIGH CONTRAST QR CODE */}
            <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl ring-8 ring-white/10 relative z-10">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(fullPublicUrl)}&margin=10`}
                alt="QR Code Akses Kegiatan"
                className="w-52 h-52 sm:w-60 sm:h-60 mx-auto object-contain"
              />
            </div>

            {/* BIG ACCESS CODE CHIP */}
            <div className="space-y-3 relative z-10">
              <div className="inline-block bg-white/10 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/20">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Kode Akses Sesi:</span>
                <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-amber-400">
                  {session.publicAccessCode}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  readOnly
                  value={fullPublicUrl}
                  className="bg-black/30 text-slate-300 text-xs px-3.5 py-2 rounded-xl border border-white/10 w-full truncate font-mono text-center"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin' : 'Copy'}</span>
                </button>
              </div>

              {/* Unduh QR Code PNG resolusi tinggi untuk dicetak di spanduk / banner */}
              <button
                onClick={handleDownloadQr}
                disabled={isDownloadingQr}
                className="w-full max-w-sm mx-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>{isDownloadingQr ? 'Mengunduh QR Code...' : 'Unduh QR Code HD (PNG)'}</span>
              </button>
            </div>

            {/* SESSION METADATA FOOTER + BUTTON LIHAT MATERI */}
            <div className="pt-4 border-t border-white/10 space-y-3 text-left relative z-10">
              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Lokasi Pemaparan:</span>
                  <span className="font-semibold text-white truncate block">{session.location}</span>
                  <span className="text-slate-400 text-[10px]">{session.polres}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Modul Materi:</span>
                  <span className="font-semibold text-white truncate block">{session.materialTitle}</span>
                  <span className="text-slate-400 text-[10px]">{session.date} • {session.startTime}</span>
                </div>
              </div>

              <button
                onClick={() => setShowMaterialModal(true)}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Buka Materi Pembelajaran</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: LIVE METRICS & PARTICIPANT FEED */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-6">
          {/* REAL LIVE KPI COUNTERS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-blue-600">
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Peserta</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{metrics.participantCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Orang Bergabung</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-purple-600">
                <Eye className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Views</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{metrics.viewsCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Akses Materi</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-amber-600">
                <CheckSquare className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Kuis Selesai</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{metrics.quizCompletedCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">dari {metrics.quizAttemptCount} Attempt</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <Award className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Tersertifikasi</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{metrics.certifiedCount || 0}</p>
              <p className="text-[10px] text-slate-500 font-medium">Rata-rata: {metrics.averageQuizScore}%</p>
            </div>
          </div>

          {/* PARTICIPANT LIVE TABLE WITH CERTIFICATE STATUS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Peserta Bergabung ({participants.length})
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Real-time Polling (5s)</span>
            </div>

            {participants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada peserta yang bergabung. Minta peserta memindai QR code di samping.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {participants.map((p: any, idx: number) => {
                  const hasCert = Boolean(p.certificate);
                  const certUrl = hasCert
                    ? `/api/certificates/${encodeURIComponent(p.certificate.certificateNumber)}/download?download=1`
                    : null;

                  return (
                    <div key={p.id || idx} className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.place}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {p.quizScore !== null && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.quizPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            Skor: {p.quizScore}%
                          </span>
                        )}

                        {hasCert ? (
                          <a
                            href={certUrl!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs transition cursor-pointer"
                            title={`Cetak / Unduh Sertifikat: ${p.certificate.certificateNumber}`}
                          >
                            <Printer className="w-3 h-3" />
                            <span>Cetak Sertifikat</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">
                            Belum Selesai
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                          {new Date(p.joinedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LIVE ACTIVITY LOG FEED */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Aktivitas Terkini Peserta ({recentEvents.length})
                </h3>
              </div>
            </div>

            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada aktivitas interaksi tercatat.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {recentEvents.map((evt: any, i: number) => (
                  <div key={evt.id || i} className="p-3 sm:px-5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {evt.eventType === 'join_session' && `Peserta "${evt.details?.name || 'Seseorang'}" bergabung ke sesi`}
                        {evt.eventType === 'material_view' && 'Peserta membuka modul materi pembelajaran'}
                        {evt.eventType === 'lesson_view' && `Membuka materi: ${evt.details?.lessonTitle || 'Lesson'}`}
                        {evt.eventType === 'material_completed' && 'Peserta menyelesaikan seluruh silabus materi'}
                        {evt.eventType === 'quiz_start' && 'Peserta memulai pengerjaan kuis evaluasi'}
                        {evt.eventType === 'quiz_completed' && `Peserta menyelesaikan kuis (Skor: ${evt.details?.score || 0}%)`}
                        {!['join_session', 'material_view', 'lesson_view', 'material_completed', 'quiz_start', 'quiz_completed'].includes(evt.eventType) && evt.eventType}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MATERIAL PREVIEW / PRESENTATION STAGE MODAL */}
      {showMaterialModal && material && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-700 max-w-6xl w-full h-[94vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-blue-600 text-white">
                      Jenjang {material.level}
                    </span>
                    <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
                      {material.typeLabel}
                    </span>
                    <span className="text-xs text-slate-400 hidden md:inline">
                      • Sesi: {session.activityName}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black text-white mt-1 truncate">
                    {material.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenCourseMaterial && (
                  <button
                    onClick={() => {
                      setShowMaterialModal(false);
                      onOpenCourseMaterial(material.id);
                    }}
                    className="hidden sm:flex bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold items-center gap-1.5 cursor-pointer shadow-md transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mode Belajar Penuh</span>
                  </button>
                )}
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1 text-slate-200">
              {/* IMAGE / VIDEO BANNER */}
              {material.imageUrl && (
                <div className="rounded-3xl overflow-hidden bg-black aspect-21/9 sm:aspect-video max-h-[380px] w-full relative border border-slate-800 shadow-2xl">
                  {material.type === 'video' && material.videoUrl ? (
                    (() => {
                      const vUrl = material.videoUrl;
                      let embedUrl = vUrl;
                      if (vUrl.includes('youtube.com/watch?v=')) {
                        const videoId = vUrl.split('v=')[1]?.split('&')[0];
                        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
                      } else if (vUrl.includes('youtu.be/')) {
                        const videoId = vUrl.split('youtu.be/')[1]?.split('?')[0];
                        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
                      }
                      return (
                        <iframe
                          src={embedUrl}
                          title={material.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    })()
                  ) : (
                    <>
                      <img
                        src={material.imageUrl}
                        alt={material.title}
                        className="w-full h-full object-cover opacity-75"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                          Materi Edukasi Ditampilkan
                        </span>
                        <h3 className="text-xl sm:text-3xl font-black mt-1 leading-tight text-white drop-shadow-md">
                          {material.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1">
                          Penyusun: <strong>{material.author || 'Korlantas POLRI'}</strong> • Jenjang: {material.level}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* DESCRIPTION & SUMMARY */}
              <div className="bg-slate-950/60 rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
                <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Deskripsi &amp; Ringkasan Pembelajaran</span>
                </h4>
                <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                  {material.description}
                </p>
                {material.summary && (
                  <p className="text-sm sm:text-base text-slate-300 bg-slate-900/90 p-5 rounded-2xl border border-slate-800/80 leading-relaxed font-sans">
                    {material.summary}
                  </p>
                )}
              </div>

              {/* KEY POINTS */}
              {material.keyPoints && material.keyPoints.length > 0 && (
                <div className="p-6 sm:p-8 rounded-3xl bg-blue-950/40 border border-blue-800/40 space-y-4">
                  <h4 className="text-xs sm:text-sm font-extrabold text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Pokok Pedoman &amp; Keselamatan Berlalu Lintas</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {material.keyPoints.map((pt: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 font-black" />
                        <span className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SYLLABUS / MODULES */}
              {material.modules && material.modules.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <span>Silabus Modul &amp; Pelajaran ({material.modules.reduce((c: number, m: any) => c + (m.lessons?.length || 0), 0)} Pelajaran)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {material.modules.map((mod: any, mIdx: number) => (
                      <div key={mod.id || mIdx} className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800 space-y-3">
                        <p className="text-sm sm:text-base font-black text-amber-300">{mod.title}</p>
                        <div className="space-y-2">
                          {(mod.lessons || []).map((les: any, lIdx: number) => (
                            <div key={les.id || lIdx} className="flex items-center justify-between text-xs sm:text-sm py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="font-semibold text-slate-200">{les.title}</span>
                              <span className="text-xs text-slate-400 font-mono shrink-0 ml-2">{les.duration || '05:00'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUIZ PREVIEW */}
              {material.quiz && material.quiz.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-emerald-400" />
                    <span>Daftar Soal Evaluasi Kuis ({material.quiz.length} Soal Lengkap)</span>
                  </h4>
                  <div className="space-y-4">
                    {material.quiz.map((q: any, qIdx: number) => (
                      <div key={q.id || qIdx} className="p-5 sm:p-6 rounded-3xl bg-slate-950/70 border border-emerald-900/40 space-y-3">
                        <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                          {qIdx + 1}. {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                                optIdx === q.correctIndex
                                  ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-600/60'
                                  : 'bg-slate-900/80 text-slate-300 border border-slate-800'
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                              {optIdx === q.correctIndex && (
                                <span className="ml-2 text-xs text-emerald-400 font-bold">
                                  &starf; Kunci Jawaban
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="text-xs sm:text-sm text-slate-300 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 mt-2">
                            <strong className="text-amber-300">Pembahasan:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 sm:p-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 shrink-0">
              <span className="text-xs text-slate-400">
                Kegiatan Pemaparan: <strong className="text-white">{session.activityName}</strong> • {session.location} ({session.polres})
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {onOpenCourseMaterial && (
                  <button
                    onClick={() => {
                      setShowMaterialModal(false);
                      onOpenCourseMaterial(material.id);
                    }}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Mulai Mode Belajar Penuh</span>
                  </button>
                )}
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}