import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Calendar,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Clock,
  RotateCcw,
  Search,
  Check,
  X,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { MaterialItem } from '../types';

interface ProgressPageProps {
  currentUser: any;
  materials: MaterialItem[];
  onOpenCourseDetail: (material: MaterialItem) => void;
}

interface VerificationResult {
  certificateNumber: string;
  recipientName: string;
  materialTitle: string;
  institution: string;
  score?: number | null;
  completionType?: 'quiz' | 'material';
  completedAt: string;
  issuedAt: string;
  isValid: boolean;
}

interface ServerCertificate {
  certificateId: string;
  certificateNumber: string;
  userId: string;
  recipientName: string;
  institution: string;
  materialId: string;
  materialTitle: string;
  score?: number | null;
  completionType?: 'quiz' | 'material';
  completedAt: string;
  issuedAt: string;
  isValid: boolean;
}

export function ProgressPage({
  currentUser,
  materials,
  onOpenCourseDetail,
}: ProgressPageProps) {
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [verifyQuery, setVerifyQuery] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [serverCertificates, setServerCertificates] = useState<ServerCertificate[]>([]);

  const userId = currentUser?.user?.id || currentUser?.id || 'user-1';
  const roleId = currentUser?.user?.roleId || currentUser?.roleId || 'role-admin';

  // Fetch verified user certificates
  useEffect(() => {
    fetch('/api/learning-records', {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-role-id': roleId,
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && Array.isArray(data.data.certificates)) {
          setServerCertificates(data.data.certificates);
        }
      })
      .catch(() => {});
  }, [userId, roleId]);

  // Real calculations
  const totalCourses = materials.length;
  const completedCourses = materials.filter(m => (m.progressPercent || 0) === 100 || m.status === 'completed');
  const inProgressCourses = materials.filter(m => (m.progressPercent || 0) > 0 && (m.progressPercent || 0) < 100);
  const completionRate = totalCourses > 0 ? Math.round((completedCourses.length / totalCourses) * 100) : 0;

  const userName = currentUser?.user?.fullName || currentUser?.fullName || 'AKBP Hendra Wijaya, S.I.K.';
  const userNip = currentUser?.user?.nip || currentUser?.nip || '19840212 200801 1 002';
  const userRole = currentUser?.user?.roleName || currentUser?.roleName || 'Personel Dikmas Lantas POLRI';

  const handleDownloadCertificate = (courseId: string, courseTitle: string, certNum?: string) => {
    if (certNum) {
      window.open(`/api/certificates/${encodeURIComponent(certNum)}/download`, '_blank');
      return;
    }
    setDownloadingCertId(courseId);
    setTimeout(() => {
      setDownloadingCertId(null);
      alert(`Sertifikat Resmi POLRI untuk modul "${courseTitle}" sedang diproses.`);
    }, 500);
  };

  const handleVerifyCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyQuery.trim()) return;

    setIsVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    fetch(`/api/certificates/verify/${encodeURIComponent(verifyQuery.trim())}`)
      .then(res => res.json())
      .then(data => {
        setIsVerifying(false);
        if (data.success && data.data) {
          setVerifyResult(data.data);
        } else {
          setVerifyError(data.message || 'Sertifikat tidak ditemukan.');
        }
      })
      .catch(() => {
        setIsVerifying(false);
        setVerifyError('Terjadi gangguan jaringan saat memverifikasi sertifikat.');
      });
  };

  return (
    <div className="space-y-8 pb-20 max-w-6xl mx-auto font-sans">
      {/* 1. HEADER & USER PROFILE OVERVIEW */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-800 text-xs font-bold">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Transkrip Capaian & Sertifikasi</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Capaian & Sertifikat Resmi
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Catatan rekam jejak kelulusan silabus dan sertifikat kelulusan digital terverifikasi Korps Lalu Lintas Kepolisian Negara Republik Indonesia (Korlantas POLRI).
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>Peserta: <strong className="text-slate-900">{userName}</strong></span>
              <span>•</span>
              <span>NIP/NRP: <strong className="text-slate-900">{userNip}</strong></span>
            </div>
          </div>

          {/* Action & Badge Counter */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verifikasi Keaslian</span>
            </button>

            <div className="bg-purple-50/80 border border-purple-100 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-xs">
                {serverCertificates.length > 0 ? serverCertificates.length : completedCourses.length}
              </div>
              <div>
                <span className="text-xs text-purple-800 font-semibold block">Sertifikat Kelulusan</span>
                <span className="text-sm font-bold text-purple-950">Terdaftar & Valid</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATISTIK PERKEMBANGAN BELAJAR (REAL METRICS) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Modul Terselesaikan</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {completedCourses.length} <span className="text-xs font-medium text-slate-400">/ {totalCourses} Modul</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Sedang Berjalan</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {inProgressCourses.length} <span className="text-xs font-medium text-slate-400">Kursus Aktif</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Tingkat Penyelesaian</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {completionRate}% <span className="text-xs font-semibold text-emerald-600">Total Progres</span>
            </p>
          </div>
        </div>
      </section>

      {/* 3. DAFTAR SERTIFIKAT KELULUSAN TERVERIFIKASI */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-headline text-lg font-bold text-slate-900">
              Sertifikat Kelulusan Terbit
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sertifikat digital resmi berlisensi Dikmas Lantas POLRI atas evaluasi kompetensi kurikulum.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
            {serverCertificates.length > 0 ? serverCertificates.length : completedCourses.length} Dokumen Siap Unduh
          </span>
        </div>

        {completedCourses.length === 0 && serverCertificates.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center max-w-md mx-auto shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Belum Ada Sertifikat yang Diterbitkan</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Selesaikan modul pembelajaran hingga 100% dan lulus kuis evaluasi untuk menerbitkan sertifikat resmi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {completedCourses.map((course, idx) => {
              const matchedServerCert = serverCertificates.find(c => c.materialId === course.id);
              const certNum = matchedServerCert?.certificateNumber || `POLRI/DIKMAS/2026/${String(idx + 1).padStart(6, '0')}`;
              const recipient = matchedServerCert?.recipientName || userName;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                          Lulus Evaluasi • Jenjang {course.level}
                        </span>
                        <h3
                          onClick={() => onOpenCourseDetail(course)}
                          className="font-bold text-sm sm:text-base text-slate-900 leading-snug hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {course.title}
                        </h3>
                      </div>

                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
                        <Award className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5 border border-slate-100 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Penerima:</span>
                        <span className="font-semibold text-slate-800">{recipient}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nomor Sertifikat:</span>
                        <span className="font-mono font-semibold text-slate-700">{certNum}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setVerifyQuery(certNum);
                        setShowVerifyModal(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Cek Verifikasi</span>
                    </button>

                    <button
                      onClick={() => handleDownloadCertificate(course.id, course.title, certNum)}
                      disabled={downloadingCertId === course.id}
                      className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadingCertId === course.id ? 'Mengunduh...' : 'Unduh Sertifikat PDF'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. OFFICIAL VERIFICATION MODAL */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline text-base font-bold text-slate-900">Verifikasi Sertifikat POLRI</h3>
                  <p className="text-[11px] text-slate-500">Validasi keaslian dokumen sertifikat digital Korlantas</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerifyResult(null);
                  setVerifyError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyCertificate} className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Masukkan Nomor Sertifikat:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyQuery}
                  onChange={(e) => setVerifyQuery(e.target.value)}
                  placeholder="contoh: POLRI/DIKMAS/2026/000001"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={isVerifying || !verifyQuery.trim()}
                  className="bg-[#0a1d37] hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  {isVerifying ? 'Memeriksa...' : 'Verifikasi'}
                </button>
              </div>
            </form>

            {/* Error Result */}
            {verifyError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 space-y-1">
                <span className="font-bold block">Status: Tidak Ditemukan / Tidak Sah</span>
                <p>{verifyError}</p>
              </div>
            )}

            {/* Success Result */}
            {verifyResult && (
              <div className="p-5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sertifikat Sah & Terdaftar Resmi</span>
                </div>

                <div className="space-y-2 text-xs text-slate-700 font-sans border-t border-emerald-200/60 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nomor:</span>
                    <span className="font-mono font-bold text-slate-900">{verifyResult.certificateNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Penerima:</span>
                    <span className="font-bold text-slate-900">{verifyResult.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modul Edukasi:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-xs">{verifyResult.materialTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Instansi Penerbit:</span>
                    <span className="font-semibold text-slate-900">{verifyResult.institution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Kelulusan:</span>
                    <span className="font-bold text-emerald-700">
                      {typeof verifyResult.score === 'number'
                        ? `${verifyResult.score}% (Lulus Kuis)`
                        : '100% (Tuntas Silabus)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Terbit:</span>
                    <span className="font-medium text-slate-900">{verifyResult.issuedAt}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
