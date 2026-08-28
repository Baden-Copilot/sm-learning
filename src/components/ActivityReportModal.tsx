import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  MapPin,
  Calendar,
  Users,
  Eye,
  CheckSquare,
  Award,
  Trash2
} from 'lucide-react';
import { OutreachSession } from '../types';

interface ActivityReportModalProps {
  session: OutreachSession;
  onClose: () => void;
  onSuccess: () => void;
  authHeaders?: Record<string, string>;
}

export function ActivityReportModal({
  session,
  onClose,
  onSuccess,
  authHeaders,
}: ActivityReportModalProps) {
  const [liveData, setLiveData] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);

  const [notes, setNotes] = useState<string>('');
  const [customParticipantCount, setCustomParticipantCount] = useState<number>(0);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/outreach/sessions/${session.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLiveData(data.data);
          setCustomParticipantCount(data.data.metrics?.participantCount || 0);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingSummary(false);
      });
  }, [session.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;

      fetch('/api/outreach/evidence/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          filename: file.name
        })
      })
        .then(res => {
          if (!res.ok) throw new Error('Gagal mengunggah foto ke server.');
          return res.json();
        })
        .then(data => {
          if (data.success && data.url) {
            setEvidenceImages(prev => [...prev, data.url]);
          } else {
            throw new Error(data.message || 'Gagal menyimpan foto.');
          }
        })
        .catch(err => {
          setErrorMessage(err.message || 'Gagal upload file.');
        })
        .finally(() => {
          setIsUploading(false);
        });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    fetch(`/api/outreach/sessions/${session.id}/report`, {
      method: 'POST',
      // The signed-in trainer's own headers are the only identity accepted here.
      // Falling back to the session's trainerId would let whoever has the modal
      // open file a report as that trainer.
      headers: authHeaders || { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes,
        evidenceImages,
        customParticipantCount: Number(customParticipantCount) || 0
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengirimkan laporan kegiatan pemaparan.');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          onSuccess();
        } else {
          throw new Error(data.message || 'Gagal membuat laporan.');
        }
      })
      .catch(err => {
        setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const metrics = liveData?.metrics || {
    participantCount: 0,
    viewsCount: 0,
    quizAttemptCount: 0,
    quizCompletedCount: 0,
    averageQuizScore: 0
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Selesaikan Kegiatan & Submit Laporan
              </h3>
              <p className="text-xs text-slate-500">
                Tutup sesi pemaparan lapangan dan terbitkan berita acara kegiatan resmi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* REAL METRICS SUMMARY CARD */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Ringkasan Hasil Interaksi Kegiatan Nyata:
          </h4>

          {isLoadingSummary ? (
            <div className="py-4 text-center text-xs text-slate-500">Memuat data real...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">Peserta Online</span>
                <span className="text-lg font-black text-slate-900">{metrics.participantCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">Views Materi</span>
                <span className="text-lg font-black text-slate-900">{metrics.viewsCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">Kuis Selesai</span>
                <span className="text-lg font-black text-slate-900">{metrics.quizCompletedCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 font-bold block">Rata-rata Skor</span>
                <span className="text-lg font-black text-emerald-600">{metrics.averageQuizScore}%</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-1">
            <span>Kegiatan: <strong>{session.activityName}</strong></span>
            <span>Lokasi: <strong>{session.location} ({session.polres})</strong></span>
          </div>
        </div>

        {/* REPORT FORM */}
        <form onSubmit={handleSubmitReport} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Konfirmasi Total Jumlah Peserta Fisik di Lokasi *
            </label>
            <input
              type="number"
              min="1"
              value={customParticipantCount}
              onChange={(e) => setCustomParticipantCount(parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Dapat disesuaikan jika terdapat peserta yang hadir secara tatap muka namun tidak membawa perangkat smartphone.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Catatan / Berita Acara Pelaksanaan Kegiatan
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tuliskan jalannya kegiatan, antusiasme peserta, kendala teknis, atau rekomendasi pembinaan lanjutan..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* UPLOAD EVIDENCE / BUKTI KEGIATAN */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Upload Foto Dokumentasi / Bukti Kegiatan
            </label>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition">
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Mengunggah...' : 'Pilih Foto Kegiatan'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              <span className="text-[10px] text-slate-400">JPG, PNG maks 5MB</span>
            </div>

            {/* PREVIEW UPLOADED EVIDENCE */}
            {evidenceImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                {evidenceImages.map((imgUrl, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                    <img src={imgUrl} alt={`Bukti ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
            ⚠️ <strong>Perhatian:</strong> Setelah laporan disubmit, status sesi ini akan diubah menjadi <strong>CLOSED</strong> dan kode QR/URL akses publik tidak dapat lagi digunakan oleh peserta baru.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengirim Laporan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Laporan & Tutup Sesi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}