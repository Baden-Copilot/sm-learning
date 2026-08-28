import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Eye,
  Award,
  Target,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  Printer,
  ImageIcon,
  FileText,
  TrendingDown,
  Activity,
  FileCheck2,
  Sparkles,
  Download,
  ExternalLink
} from 'lucide-react';

interface ActivityResultModalProps {
  sessionId: string;
  authHeaders?: Record<string, string>;
  onClose: () => void;
}

type TabKey = 'ringkasan' | 'peserta' | 'evaluasi' | 'dokumentasi';

/**
 * Generate official POLRI Berita Acara Serah Terima / Pelaksanaan (BAST)
 * formatted for A4 print with police header, metrics table, participant roster, and signature block.
 */
function handlePrintOfficialBast(data: any) {
  const session = data?.session;
  const metrics = data?.metrics;
  const report = data?.report;
  const participants = data?.participants || [];

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const targetParticipants = session?.targetParticipants || 50;
  const actualParticipants = metrics?.participantCount || 0;
  const targetPct = Math.round((actualParticipants / targetParticipants) * 100);

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>BAST Kegiatan - ${session?.publicAccessCode || ''}</title>
      <style>
        @page { size: A4; margin: 12mm 15mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #111; font-size: 11pt; line-height: 1.35; margin: 0; padding: 10px; }
        .kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 12px; }
        .kop h3 { margin: 0; font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .kop h4 { margin: 2px 0; font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .kop p { margin: 2px 0; font-size: 8.5pt; color: #333; font-style: italic; }
        .title { text-align: center; margin: 12px 0 10px 0; }
        .title h2 { margin: 0; font-size: 11.5pt; text-decoration: underline; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }
        .title p { margin: 2px 0; font-size: 9.5pt; font-weight: bold; }
        table.meta { width: 100%; margin-bottom: 10px; font-size: 10pt; border-collapse: collapse; }
        table.meta td { padding: 3px 4px; vertical-align: top; }
        table.meta td.label { width: 160px; font-weight: bold; }
        table.grid { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
        table.grid th, table.grid td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
        table.grid th { background-color: #eee; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; }
        .metrics-box { border: 1px solid #333; border-radius: 4px; padding: 8px 12px; margin: 10px 0; background: #fbfbfb; font-size: 9.5pt; }
        .sig-block { margin-top: 25px; width: 100%; page-break-inside: avoid; }
        .sig-col { width: 45%; display: inline-block; text-align: center; vertical-align: top; font-size: 9.5pt; }
        .sig-space { height: 55px; }
      </style>
    </head>
    <body>
      <div class="kop">
        <h3>KEPOLISIAN NEGARA REPUBLIK INDONESIA</h3>
        <h4>${(session?.polda || 'POLDA METRO JAYA').toUpperCase()}</h4>
        <h4>${(session?.polres || 'POLRES METRO JAKARTA SELATAN').toUpperCase()}</h4>
        <p>Satuan Lalu Lintas (Satlantas) & Unit Keamanan dan Keselamatan (Kamsel / Dikyasa) • Call Center 110</p>
      </div>

      <div class="title">
        <h2>BERITA ACARA PELAKSANAAN KEGIATAN SOSIALISASI (BAST)</h2>
        <p>Nomor: BAST/DIKMAS/${session?.publicAccessCode || 'SES'}/${new Date(session?.date || Date.now()).getFullYear()}</p>
      </div>

      <p style="text-indent: 25px; font-size: 10pt; margin: 6px 0;">
        Pada hari ini <strong>${new Date(session?.date || Date.now()).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah diselenggarakan Kegiatan Edukasi dan Sosialisasi Keselamatan Berlalu Lintas Digital (SM-Learning Dikmas Lantas POLRI) dengan rincian operasional sebagai berikut:
      </p>

      <table class="meta">
        <tr><td class="label">Nama Kegiatan</td><td>: ${session?.activityName || '-'}</td></tr>
        <tr><td class="label">Modul / Silabus</td><td>: ${data?.material?.title || session?.materialTitle || '-'}</td></tr>
        <tr><td class="label">Instruktur Pelaksana</td><td>: <strong>${session?.trainerName || '-'}</strong> (${session?.trainerPosition || 'Kanit Dikyasa'})</td></tr>
        <tr><td class="label">Lokasi / Sasaran</td><td>: ${session?.location || '-'}, ${session?.polres || '-'}</td></tr>
        <tr><td class="label">Waktu Pelaksanaan</td><td>: ${session?.date || '-'} pukul ${session?.startTime || '-'} WIB</td></tr>
        <tr><td class="label">Kode Akses Sesi</td><td>: <strong style="font-family: monospace; font-size: 11pt;">${session?.publicAccessCode || '-'}</strong></td></tr>
      </table>

      <div class="metrics-box">
        <strong>REKAPITULASI HASIL CAPAIAN KEGIATAN:</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 18px; line-height: 1.45;">
          <li>Realisasi Kehadiran Peserta: <strong>${actualParticipants} Orang</strong> (Target: ${targetParticipants} Orang — Capaian: <strong>${targetPct}%</strong>)</li>
          <li>Keterlibatan Evaluasi Kuis: <strong>${metrics?.quizAttemptCount || 0} Peserta</strong> (${metrics?.engagementRate || 0}% dari total hadir)</li>
          <li>Tingkat Kelulusan Evaluasi: <strong>${metrics?.passingRate || 0}%</strong> dengan Rata-rata Nilai: <strong>${metrics?.averageScore || 0}/100</strong></li>
          <li>Sertifikat Resmi Diterbitkan: <strong>${metrics?.certificateCount || 0} Lembar</strong></li>
        </ul>
      </div>

      ${report?.notes ? `<p style="font-size: 9.5pt; margin: 6px 0;"><strong>Catatan Instruktur / Berita Acara:</strong> ${report.notes}</p>` : ''}

      <div style="margin-top: 10px;">
        <strong style="font-size: 9.5pt;">Daftar Peserta Terdata (${participants.length} Orang):</strong>
        <table class="grid">
          <thead>
            <tr>
              <th style="width: 25px;">No</th>
              <th>Nama Lengkap Peserta</th>
              <th>Asal Instansi / Sekolah</th>
              <th style="width: 70px;">Nilai Kuis</th>
              <th style="width: 80px;">Status</th>
              <th style="width: 120px;">Nomor Sertifikat</th>
            </tr>
          </thead>
          <tbody>
            ${participants.length === 0 ? '<tr><td colspan="6" style="text-align:center;">Belum ada peserta terdata</td></tr>' : participants.slice(0, 20).map((p: any, i: number) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.place || '-'}</td>
                <td style="text-align: center; font-weight: bold;">${p.quizScore !== null ? p.quizScore : '-'}</td>
                <td style="text-align: center;">${p.quizPassed ? 'LULUS' : (p.quizScore !== null ? 'BELUM LULUS' : 'BELUM KUIS')}</td>
                <td style="font-family: monospace; font-size: 8pt; text-align: center;">${p.certificateNumber || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${participants.length > 20 ? `<p style="font-size: 8pt; color: #555; font-style: italic; margin: 3px 0;">* Menampilkan 20 dari total ${participants.length} peserta tercatat.</p>` : ''}
      </div>

      <div class="sig-block">
        <table style="width: 100%;">
          <tr>
            <td class="sig-col">
              Mengetahui,<br>
              <strong>KASATLANTAS ${session?.polres ? session.polres.toUpperCase() : 'POLRES'}</strong>
              <div class="sig-space"></div>
              <strong>( ................................................. )</strong><br>
              <span style="font-size: 8.5pt;">PANGKAT / NRP</span>
            </td>
            <td class="sig-col">
              ${session?.polres?.replace('Polres Metro ', '').replace('Polrestabes ', '') || 'Jakarta'}, ${new Date(session?.date || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
              Instruktur Pelaksana Kegiatan,
              <div class="sig-space"></div>
              <strong>${session?.trainerName || 'Instruktur Lapangan'}</strong><br>
              <span style="font-size: 8.5pt;">${session?.trainerPosition || 'Kanit Dikyasa / Satlantas'}</span>
            </td>
          </tr>
        </table>
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Read-only recap of one field activity. Used by both the trainer (their own
 * session) and the executive (drill-down from the dashboard) — one component and
 * one endpoint, so the two roles can never see contradicting numbers.
 */
export function ActivityResultModal({ sessionId, authHeaders, onClose }: ActivityResultModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('ringkasan');

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch(`/api/outreach/activity-detail/${sessionId}`, { headers: authHeaders || {} })
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok || !body.success) throw new Error(body.message || 'Gagal memuat hasil kegiatan.');
        setData(body.data);
      })
      .catch(err => setError(err.message || 'Terjadi kesalahan sistem.'))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  const session = data?.session;
  const metrics = data?.metrics;
  const report = data?.report;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'ringkasan', label: 'Ringkasan' },
    { key: 'peserta', label: `Peserta${metrics ? ` (${metrics.participantCount})` : ''}` },
    { key: 'evaluasi', label: 'Evaluasi Kuis' },
    { key: 'dokumentasi', label: 'Dokumentasi' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">

        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {session?.activityName || 'Hasil Kegiatan Lapangan'}
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {session
                    ? `${session.polda} — ${session.polres}`
                    : 'Memuat rekapitulasi kegiatan...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <button
                onClick={() => handlePrintOfficialBast(data)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                title="Cetak Berita Acara Serah Terima / Pelaksanaan Resmi POLRI"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak BAST</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Memuat hasil kegiatan...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-bold text-red-900">Tidak dapat menampilkan hasil</p>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        ) : (
          <>
            {/* TABS */}
            <div className="px-5 sm:px-6 pt-3 border-b border-slate-100 flex gap-1 overflow-x-auto shrink-0">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-t-lg border-b-2 transition whitespace-nowrap cursor-pointer ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">

              {/* === RINGKASAN === */}
              {tab === 'ringkasan' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Peserta Hadir', value: metrics.participantCount, icon: Users, cls: 'text-slate-900' },
                      { label: 'Tayangan Materi', value: metrics.materialViews + metrics.lessonViews, icon: Eye, cls: 'text-blue-800' },
                      { label: 'Rata-rata Nilai', value: metrics.averageScore, icon: Target, cls: metrics.averageScore >= 70 ? 'text-emerald-700' : 'text-amber-600' },
                      { label: 'Sertifikat Terbit', value: metrics.certificateCount, icon: Award, cls: 'text-purple-700' },
                    ].map(c => {
                      const Icon = c.icon;
                      return (
                        <div key={c.label} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{c.label}</span>
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <p className={`text-2xl font-black ${c.cls}`}>{c.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Target vs Realisasi Kehadiran */}
                  {(() => {
                    const target = session.targetParticipants || 50;
                    const real = metrics.participantCount;
                    const pct = Math.min(100, Math.round((real / target) * 100));
                    return (
                      <div className="p-4 rounded-2xl border border-blue-200 bg-linear-to-r from-blue-50/80 to-indigo-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                              Realisasi Kehadiran Peserta
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {real} / {target} Orang ({pct}%)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            {real >= target
                              ? 'Target kuota sosialisasi lapangan berhasil tercapai penuh.'
                              : `Kurang ${target - real} orang untuk memenuhi target kapasitas tempat.`}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePrintOfficialBast(data)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Berita Acara (BAST)</span>
                        </button>
                      </div>
                    );
                  })()}

                  {/* Funnel: how many of those who joined actually finished */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Alur Keterlibatan Peserta
                    </h4>
                    {[
                      { label: 'Bergabung ke sesi', value: metrics.participantCount, color: 'bg-blue-600' },
                      { label: 'Membuka materi', value: metrics.materialViews, color: 'bg-indigo-500' },
                      { label: 'Memulai kuis', value: metrics.quizStarted, color: 'bg-amber-500' },
                      { label: 'Menyelesaikan kuis', value: metrics.quizAttemptCount, color: 'bg-purple-500' },
                      { label: 'Lulus (≥ nilai minimum)', value: metrics.quizPassedCount, color: 'bg-emerald-500' },
                    ].map(step => {
                      const base = Math.max(1, metrics.participantCount);
                      const pct = Math.min(100, Math.round((step.value / base) * 100));
                      return (
                        <div key={step.label} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700">{step.label}</span>
                            <span className="font-bold text-slate-900">{step.value} <span className="text-slate-400 font-medium">({pct}%)</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${step.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    {metrics.engagementRate < 50 && metrics.participantCount > 0 && (
                      <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                        <span>Hanya {metrics.engagementRate}% peserta yang menuntaskan kuis — perlu pendampingan lebih saat pemaparan.</span>
                      </p>
                    )}
                  </div>

                  {/* Session identity */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { icon: BookOpen, label: 'Materi', value: data.material?.title || session.materialTitle || '-' },
                      { icon: Users, label: 'Instruktur', value: session.trainerName || '-' },
                      { icon: MapPin, label: 'Lokasi', value: `${session.location}, ${session.polres}` },
                      { icon: Calendar, label: 'Tanggal', value: `${session.date} • ${session.startTime}` },
                    ].map(row => {
                      const Icon = row.icon;
                      return (
                        <div key={row.label} className="flex items-start gap-2 min-w-0">
                          <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">{row.label}</span>
                            <span className="font-semibold text-slate-800 break-words">{row.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {report ? (
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 space-y-1.5">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Kegiatan telah ditutup & dilaporkan</span>
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Berita acara dikirim {new Date(report.closedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.
                        Peserta tercatat resmi: <strong>{report.totalParticipants}</strong> orang.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-[11px] text-amber-800 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Kegiatan belum ditutup — angka di atas masih berjalan dan dapat bertambah.</span>
                    </div>
                  )}
                </>
              )}

              {/* === PESERTA === */}
              {tab === 'peserta' && (
                data.participants.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Belum ada peserta yang bergabung ke sesi ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Header summary & Batch Certificate Print */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-purple-50/70 border border-purple-200 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-purple-700 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-purple-900">
                            {data.certificates?.length || 0} dari {data.participants.length} Peserta Memperoleh Sertifikat Kelulusan
                          </p>
                          <p className="text-[10px] text-purple-700">
                            Peserta yang telah lulus kuis evaluasi atau menuntaskan 100% materi resmi terbit sertifikat.
                          </p>
                        </div>
                      </div>
                      {data.certificates?.length > 0 && (
                        <a
                          href={`/api/outreach/sessions/${session.id}/certificates/batch-print`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Semua ({data.certificates.length} Lembar)</span>
                        </a>
                      )}
                    </div>

                    <div className="overflow-x-auto -mx-1 border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs min-w-[640px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-3 py-2.5">#</th>
                            <th className="px-3 py-2.5">Nama</th>
                            <th className="px-3 py-2.5">Asal / Instansi</th>
                            <th className="px-3 py-2.5 text-center">Materi Dibaca</th>
                            <th className="px-3 py-2.5 text-center">Nilai</th>
                            <th className="px-3 py-2.5 text-center">Status</th>
                            <th className="px-3 py-2.5 text-right">Aksi Sertifikat</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.participants.map((p: any, i: number) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-3 py-3 font-mono text-slate-400">{i + 1}</td>
                              <td className="px-3 py-3 font-bold text-slate-900">{p.name}</td>
                              <td className="px-3 py-3 text-slate-600">{p.place || '-'}</td>
                              <td className="px-3 py-3 text-center text-slate-700 font-semibold">{p.lessonViews}</td>
                              <td className="px-3 py-3 text-center">
                                {p.quizScore === null ? (
                                  <span className="text-slate-300">—</span>
                                ) : (
                                  <span className={`font-black ${p.quizPassed ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {p.quizScore}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {p.quizScore === null ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    Belum Kuis
                                  </span>
                                ) : p.quizPassed ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />Lulus
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />Belum Lulus
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {p.certificateNumber ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="font-mono text-[9.5px] text-purple-700 font-bold hidden md:inline">
                                      {p.certificateNumber}
                                    </span>
                                    <a
                                      href={`/api/certificates/${encodeURIComponent(p.certificateNumber)}/download`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-bold inline-flex items-center gap-1 transition"
                                      title="Cetak / Unduh Sertifikat Resmi"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Cetak</span>
                                    </a>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}

              {/* === EVALUASI === */}
              {tab === 'evaluasi' && (
                metrics.quizAttemptCount === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Belum ada peserta yang mengerjakan kuis pada kegiatan ini.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Mengerjakan', value: metrics.quizAttemptCount, cls: 'text-slate-900' },
                        { label: 'Lulus', value: metrics.quizPassedCount, cls: 'text-emerald-700' },
                        { label: 'Tingkat Kelulusan', value: `${metrics.passingRate}%`, cls: metrics.passingRate >= 70 ? 'text-emerald-700' : 'text-amber-600' },
                      ].map(c => (
                        <div key={c.label} className="p-4 rounded-2xl border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">{c.label}</span>
                          <p className={`text-2xl font-black ${c.cls}`}>{c.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Sebaran Nilai</h4>
                      {data.scoreDistribution.map((b: any) => {
                        const total = Math.max(1, metrics.quizAttemptCount);
                        const pct = Math.round((b.count / total) * 100);
                        const color =
                          b.band === '85-100' ? 'bg-emerald-500'
                          : b.band === '70-84' ? 'bg-blue-500'
                          : b.band === '50-69' ? 'bg-amber-500'
                          : 'bg-red-500';
                        return (
                          <div key={b.band} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">
                                Nilai {b.band}{(b.band === '0-49' || b.band === '50-69') && ' (belum lulus)'}
                              </span>
                              <span className="font-bold text-slate-900">{b.count} peserta ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {data.questionBreakdown.length > 0 && (
                      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Analisis Per Soal</h4>
                          <p className="text-[11px] text-slate-500">
                            Soal dengan tingkat benar rendah menandakan materi yang perlu dipertegas pada pemaparan berikutnya.
                          </p>
                        </div>
                        {data.questionBreakdown.map((q: any) => {
                          const weak = q.answeredCount > 0 && q.correctPercent < 60;
                          return (
                            <div
                              key={q.index}
                              className={`p-3.5 rounded-xl border space-y-2 ${weak ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-xs font-semibold text-slate-800 min-w-0">
                                  <span className="text-slate-400 font-mono mr-1.5">{q.index + 1}.</span>
                                  {q.question}
                                </p>
                                <span className={`text-xs font-black shrink-0 ${weak ? 'text-amber-700' : 'text-emerald-700'}`}>
                                  {q.correctPercent}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${weak ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${q.correctPercent}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-500">
                                {q.correctCount} benar dari {q.answeredCount} yang menjawab
                                {weak && ' — perlu penekanan ulang'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* === DOKUMENTASI === */}
              {tab === 'dokumentasi' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Catatan / Berita Acara</span>
                    </h4>
                    {data.notes ? (
                      <p className="text-xs text-slate-700 leading-relaxed p-4 rounded-2xl bg-slate-50 border border-slate-200 whitespace-pre-wrap">
                        {data.notes}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 p-4 rounded-2xl border border-dashed border-slate-200">
                        Instruktur tidak menuliskan catatan pelaksanaan untuk kegiatan ini.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Foto Dokumentasi ({data.evidenceImages.length})</span>
                    </h4>
                    {data.evidenceImages.length === 0 ? (
                      <p className="text-xs text-slate-400 p-4 rounded-2xl border border-dashed border-slate-200">
                        Tidak ada foto bukti kegiatan yang diunggah.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {data.evidenceImages.map((url: string, i: number) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 hover:ring-2 hover:ring-blue-400 transition"
                          >
                            <img src={url} alt={`Dokumentasi ${i + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {data.certificates.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        <span>Sertifikat Terbit ({data.certificates.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {data.certificates.map((c: any) => (
                          <div key={c.certificateId} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs bg-slate-50/50">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{c.recipientName}</p>
                              <p className="font-mono text-[10px] text-slate-500">{c.certificateNumber}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                                {c.score !== null ? `Nilai ${c.score}` : '100% Selesai'}
                              </span>
                              <a
                                href={`/api/certificates/${encodeURIComponent(c.certificateNumber)}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Cetak</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {data && (
              <>
                <button
                  onClick={() => handlePrintOfficialBast(data)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Berita Acara (BAST)</span>
                </button>

                {data.certificates?.length > 0 && (
                  <a
                    href={`/api/outreach/sessions/${session.id}/certificates/batch-print`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Cetak Semua Sertifikat ({data.certificates.length})</span>
                  </a>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
