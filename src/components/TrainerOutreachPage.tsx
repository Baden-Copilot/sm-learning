import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Play,
  CheckCircle2,
  FileCheck2,
  Plus,
  ArrowRight,
  TrendingUp,
  Award,
  Eye,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building,
  Radio,
  X,
  FileSpreadsheet,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { MaterialItem, OutreachSession, Role } from '../types';
import { ActivityResultModal } from './Modals/ActivityResultModal';
import { DEFAULT_34_POLDA, fetchPoldaList, fetchPolresByPolda, WilayahPoldaItem, WilayahPolresItem } from '../utils/wilayah';

interface TrainerOutreachPageProps {
  currentUser: any;
  currentRole: Role;
  materials: MaterialItem[];
  onOpenPresentationRoom: (session: OutreachSession) => void;
  onOpenReportModal: (session: OutreachSession) => void;
}

export const POLDA_LIST = DEFAULT_34_POLDA;

export const POLRES_MAP: Record<string, string[]> = {
  'Polda Metro Jaya': ['Polres Metro Jakarta Pusat', 'Polres Metro Jakarta Selatan', 'Polres Metro Jakarta Barat', 'Polres Metro Jakarta Timur', 'Polres Metro Jakarta Utara', 'Polres Metro Bekasi'],
  'Polda Jawa Barat': ['Polrestabes Bandung', 'Polres Bogor', 'Polres Sukabumi', 'Polres Cirebon', 'Polres Karawang'],
  'Polda Jawa Tengah': ['Polrestabes Semarang', 'Polresta Surakarta', 'Polres Banyumas', 'Polres Magelang'],
  'Polda Jawa Timur': ['Polrestabes Surabaya', 'Polresta Malang Kota', 'Polres Sidoarjo', 'Polres Gresik'],
  'Polda Banten': ['Polresta Serang Kota', 'Polresta Tangerang', 'Polres Cilegon'],
  'Polda Bali': ['Polresta Denpasar', 'Polres Badung', 'Polres Gianyar'],
  'Polda Sumatera Utara': ['Polrestabes Medan', 'Polres Deli Serdang'],
  'Polda Sumatera Selatan': ['Polrestabes Palembang', 'Polres Ogan Ilir'],
  'Polda Sulawesi Selatan': ['Polrestabes Makassar', 'Polres Gowa'],
  'Polda Kalimantan Timur': ['Polresta Balikpapan', 'Polresta Samarinda']
};

export function TrainerOutreachPage({
  currentUser,
  currentRole,
  materials,
  onOpenPresentationRoom,
  onOpenReportModal
}: TrainerOutreachPageProps) {
  const [sessions, setSessions] = useState<OutreachSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Create Session State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Result preview: trainer reviews what actually happened in one of their sessions
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null);

  // Trainer competency gate: only materials the trainer personally passed
  const [eligibleMaterials, setEligibleMaterials] = useState<any[]>([]);
  const [lockedMaterials, setLockedMaterials] = useState<any[]>([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState<boolean>(true);

  // Form Fields
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [activityName, setActivityName] = useState<string>('');
  const [poldaList, setPoldaList] = useState<WilayahPoldaItem[]>([]);
  const [polresList, setPolresList] = useState<WilayahPolresItem[]>([]);
  const [selectedPolda, setSelectedPolda] = useState<string>('POLDA METRO JAYA');
  const [selectedPolres, setSelectedPolres] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('09:00 WIB');
  const [audienceType, setAudienceType] = useState<string>('SD');
  const [targetParticipants, setTargetParticipants] = useState<number>(50);
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState<string>('');

  const trainerId = currentUser?.user?.id || currentUser?.id || 'user-2';
  const currentRoleId = currentRole?.id || 'role-trainer';

  // Load daftar polda dari DB
  useEffect(() => {
    fetchPoldaList().then(list => {
      const active = list.filter(p => p.isWilayah);
      setPoldaList(active);
      if (active.length > 0 && !selectedPolda) {
        setSelectedPolda(active[0].nama);
      }
    });
  }, []);

  // Load polres saat selectedPolda berubah
  useEffect(() => {
    if (!selectedPolda) return;
    fetchPolresByPolda(selectedPolda).then(list => {
      setPolresList(list);
      if (list.length > 0) {
        setSelectedPolres(prev => {
          const exists = list.some(item => item.nama === prev);
          return exists ? prev : list[0].nama;
        });
      } else {
        setSelectedPolres('');
      }
    });
  }, [selectedPolda]);

  // Load trainer kedinasan profile for auto-populate
  useEffect(() => {
    fetch('/api/profile', {
      headers: { 'x-user-id': trainerId, 'x-role-id': currentRoleId }
    })
      .then(r => {
        if (!r.ok) return null;
        const ct = r.headers.get('content-type');
        if (ct && ct.includes('application/json')) return r.json();
        return null;
      })
      .then(data => {
        if (data && data.success && data.data?.user) {
          const u = data.data.user;
          if (u.polda) {
            setSelectedPolda(u.polda);
            if (u.polres) {
              setSelectedPolres(u.polres);
            }
          }
        }
      })
      .catch(() => {});
  }, [trainerId, currentRoleId]);

  const fetchSessions = () => {
    // Only show full-page spinner on first load; stale data stays visible during refetch
    if (sessions.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    fetch(`/api/outreach/sessions?trainerId=${trainerId}`, {
      headers: {
        'x-user-id': trainerId,
        'x-role-id': currentRoleId
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil data kegiatan.');
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
          throw new Error('Respon server bukan format JSON.');
        }
        return res.json();
      })
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setSessions(data.data);
        } else {
          setSessions([]);
        }
      })
      .catch(err => {
        setError(err.message || 'Terjadi kesalahan koneksi server.');
      })
      .finally(() => {
        setIsLoading(false);
        setIsFirstLoad(false);
      });
  };

  useEffect(() => {
    fetchSessions();
    // Use stable string values, not object references, to prevent infinite re-renders
  }, [trainerId, currentRoleId]);

  // Load materials the trainer has already passed (competency gate)
  const fetchEligibleMaterials = () => {
    setIsLoadingEligible(true);
    fetch(`/api/outreach/eligible-materials?trainerId=${encodeURIComponent(trainerId)}`, {
      headers: { 'x-user-id': trainerId, 'x-role-id': currentRoleId }
    })
      .then(res => {
        if (!res.ok) throw new Error('Gagal memuat daftar modul kelulusan trainer.');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : [];
          setEligibleMaterials(list);
          setLockedMaterials(Array.isArray(data.locked) ? data.locked : []);
          setSelectedMaterialId(prev =>
            prev && list.some((m: any) => m.id === prev) ? prev : (list[0]?.id || '')
          );
        }
      })
      .catch(() => {
        setEligibleMaterials([]);
        setLockedMaterials([]);
      })
      .finally(() => setIsLoadingEligible(false));
  };

  useEffect(() => {
    fetchEligibleMaterials();
  }, [trainerId, currentRoleId]);

  // Handle Polda Change to update Polres dropdown
  const handlePoldaChange = (polda: string) => {
    setSelectedPolda(polda);
    const polresList = POLRES_MAP[polda] || [];
    setSelectedPolres(polresList[0] || '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setIsUploadingFile(true);
    setUploadError(null);

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
          setUploadError(err.message || 'Gagal upload file.');
        })
        .finally(() => {
          setIsUploadingFile(false);
        });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (eligibleMaterials.length === 0) {
      setFormError('Anda belum lulus modul apa pun. Selesaikan pembelajaran dan kuis evaluasi terlebih dahulu.');
      return;
    }

    if (!selectedMaterialId || !activityName.trim() || !location.trim()) {
      setFormError('Harap pilih materi, isi nama kegiatan, dan lokasi pelaksanaan.');
      return;
    }

    if (!eligibleMaterials.some(m => m.id === selectedMaterialId)) {
      setFormError('Materi yang dipilih belum Anda tuntaskan. Pilih modul yang sudah lulus.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    fetch('/api/outreach/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': trainerId,
        'x-role-id': currentRole?.id || 'role-trainer'
      },
      body: JSON.stringify({
        materialId: selectedMaterialId,
        activityName,
        polda: selectedPolda,
        polres: selectedPolres,
        location,
        date,
        startTime,
        targetParticipants,
        audienceType,
        evidenceImages,
        description
      })
    })
      .then(res => {
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) {
          throw new Error('Respon server bukan format JSON.');
        }
        if (!res.ok) {
          // Surface server-side reason (e.g. 403 competency gate), not a generic message
          return res.json().then(d => {
            if (res.status === 403) fetchEligibleMaterials();
            throw new Error(d.message || 'Gagal membuat kegiatan pemaparan.');
          });
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setShowCreateModal(false);
          // Reset Form
          setActivityName('');
          setLocation('');
          setEvidenceImages([]);
          setUploadError(null);
          setDescription('');
          fetchSessions();
          // Directly open presentation room
          onOpenPresentationRoom(data.data);
        } else {
          throw new Error(data.message || 'Terjadi kegagalan pembuatan sesi.');
        }
      })
      .catch(err => {
        setFormError(err.message || 'Gagal terhubung ke backend server.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const closedSessions = sessions.filter(s => s.status === 'closed' || s.status === 'completed');

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Operasional Edukasi Lapangan & Pemaparan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Ruang Kegiatan Instruktur (Trainer)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Kelola sesi pemaparan tatap muka langsung di sekolah, universitas, atau komunitas warga. Terbitkan kode akses QR interaktif, pantau live aktivitas peserta, dan buat laporan kegiatan resmi berbukti otentik.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (eligibleMaterials.length > 0 && !selectedMaterialId) {
                  setSelectedMaterialId(eligibleMaterials[0].id);
                }
                setFormError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Mulai Kegiatan Pemaparan</span>
            </button>
          </div>
        </div>
      </section>

      {/* ERROR STATE */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-700 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchSessions}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* SESSIONS CONTENT */}
      {isLoading && isFirstLoad ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memuat riwayat kegiatan pemaparan...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">Belum ada kegiatan pemaparan</h3>
            <p className="text-xs text-slate-500">
              Anda belum membuat sesi kegiatan edukasi lapangan. Klik tombol di bawah untuk memulai sesi pemaparan baru dengan QR interaktif.
            </p>
          </div>
          <button
            onClick={() => {
              if (eligibleMaterials.length > 0 && !selectedMaterialId) {
                setSelectedMaterialId(eligibleMaterials[0].id);
              }
              setFormError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Kegiatan Pertama</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ACTIVE SESSIONS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Kegiatan Aktif & Berlangsung ({activeSessions.length})
                </h2>
              </div>
            </div>

            {activeSessions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Tidak ada sesi aktif saat ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeSessions.map(session => (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl border-2 border-emerald-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                          Sesi Aktif
                        </span>
                        <span className="font-mono text-xs font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {session.publicAccessCode}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                          {session.activityName}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                          Modul: {session.materialTitle}
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{session.polres}, {session.polda}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{session.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{session.date} • {session.startTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onOpenPresentationRoom(session)}
                          className="flex-1 bg-[#0a1d37] hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Masuk Presentation Room</span>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPreviewSessionId(session.id)}
                          className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lihat Hasil</span>
                        </button>
                        <button
                          onClick={() => onOpenReportModal(session)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Selesaikan & Lapor</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            {/* CLOSED SESSIONS */}
          {closedSessions.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Kegiatan Selesai & Terlaporkan ({closedSessions.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {closedSessions.map(session => (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 opacity-90 hover:opacity-100 transition space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                        Selesai / Ditutup
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        {session.publicAccessCode}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{session.activityName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{session.materialTitle}</p>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1">
                      <p>Lokasi: {session.location} ({session.polres})</p>
                      <p>Waktu: {session.date}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Laporan Terkirim Resmi</span>
                      </div>
                      <button
                        onClick={() => setPreviewSessionId(session.id)}
                        className="w-full bg-[#0a1d37] hover:bg-slate-800 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lihat Hasil Kegiatan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREATE SESSION */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mulai Kegiatan Pemaparan Baru</h3>
                <p className="text-xs text-slate-500">Isi data pelaksanaan untuk menghasilkan kode akses QR sesi.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pilih Modul Pembelajaran / Materi *
                </label>

                {isLoadingEligible ? (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Memeriksa riwayat kelulusan modul Anda...</span>
                  </div>
                ) : eligibleMaterials.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-start gap-2 text-amber-800">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold">Anda belum lulus modul apa pun</p>
                        <p className="text-[11px] leading-relaxed">
                          Instruktur wajib menuntaskan pembelajaran dan lulus kuis evaluasi sebuah modul terlebih dahulu sebelum boleh memaparkannya kepada peserta publik.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {eligibleMaterials.map(m => (
                        <option key={m.id} value={m.id}>
                          [{m.level}] {m.title}
                          {m.quizScore !== null && m.quizScore !== undefined
                            ? ` — Lulus Kuis ${m.quizScore}`
                            : ' — Silabus Tuntas 100%'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {eligibleMaterials.length} modul tersertifikasi siap dipaparkan
                        {lockedMaterials.length > 0 ? ` • ${lockedMaterials.length} modul terkunci (belum lulus)` : ''}
                      </span>
                    </p>
                  </>
                )}
              </div>

              {/* NAMA / PROFIL TRAINER (OTOMATIS) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Identitas Trainer / Instruktur (Otomatis dari Profil)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Nama Lengkap</span>
                    <span className="font-bold text-slate-900">
                      {currentUser?.user?.fullName || currentUser?.fullName || 'Instruktur Dikmas POLRI'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Polda</span>
                    <span className="font-bold text-slate-900">{selectedPolda || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Polres / Wilayah</span>
                    <span className="font-bold text-slate-900">{selectedPolres || '-'}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nama Kegiatan Edukasi *
                </label>
                <input
                  type="text"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  placeholder="contoh: Penyuluhan Keselamatan Lalu Lintas SMPN 1 Jakarta"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Polda (Daerah) *
                  </label>
                  <select
                    value={selectedPolda}
                    onChange={(e) => setSelectedPolda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {(poldaList.length > 0 ? poldaList.map(p => p.nama) : POLDA_LIST).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Polres (Wilayah) *
                  </label>
                  <select
                    value={selectedPolres}
                    onChange={(e) => setSelectedPolres(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {polresList.length > 0 ? (
                      polresList.map(p => (
                        <option key={`${p.poldaId}-${p.polresId}`} value={p.nama}>{p.nama}</option>
                      ))
                    ) : (
                      <option value="">Tidak ada polres</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Lokasi Belajar (Fisik) *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="contoh: Aula Utama SMPN 1 Jakarta / Balai Warga RW 05"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Tanggal Pelaksanaan *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Waktu Mulai *
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="contoh: 09:00 WIB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Audiens *
                  </label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMA">SMA</option>
                    <option value="Kampus">Kampus</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Jumlah Audiens (Target Peserta) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetParticipants}
                    onChange={(e) => setTargetParticipants(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* DOKUMENTASI / FILE */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Dokumentasi / File Kegiatan (Opsional)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition">
                      <Upload className="w-4 h-4" />
                      <span>{isUploadingFile ? 'Mengunggah...' : 'Pilih Foto / Dokumen'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={isUploadingFile}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[10px] text-slate-400">JPG, PNG maks 5MB</span>
                  </div>

                  {uploadError && (
                    <p className="text-[11px] text-red-600 font-semibold">{uploadError}</p>
                  )}

                  {evidenceImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {evidenceImages.map((imgUrl, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img src={imgUrl} alt={`Dokumentasi ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveEvidence(i)}
                            className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Hapus file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Keterangan / Catatan Singkat
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="contoh: Sosialisasi tata tertib rambu dan helm SNI untuk kelas 7 dan 8."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingEligible || eligibleMaterials.length === 0}
                  title={eligibleMaterials.length === 0 ? 'Lulus minimal satu modul untuk membuat sesi pemaparan.' : undefined}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Membuat Sesi...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terbitkan & Masuk Room</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESULT PREVIEW */}
      {previewSessionId && (
        <ActivityResultModal
          sessionId={previewSessionId}
          authHeaders={{ 'x-user-id': trainerId, 'x-role-id': currentRoleId }}
          onClose={() => setPreviewSessionId(null)}
        />
      )}
    </div>
  );
}