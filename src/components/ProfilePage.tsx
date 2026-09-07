import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  LogOut,
  Calendar,
  Building,
  Mail,
  ShieldCheck,
  AlertCircle,
  MapPin,
  Briefcase,
  Save,
  Phone,
  Upload,
  Camera,
  Layers,
  Award
} from 'lucide-react';
import { UserAccount, Role } from '../types';
import {
  DEFAULT_34_POLDA,
  fetchPoldaList,
  fetchPolresByPolda,
  WilayahPoldaItem,
  WilayahPolresItem,
  MASTER_INSTANSI,
  MASTER_ORGANISASI,
  MASTER_SUB_ORG,
  MASTER_SATKER
} from '../utils/wilayah';

interface ProfilePageProps {
  currentUser: any;
  currentRole: Role;
  onLogout: () => void;
  onUpdateCurrentUserFullName?: (newName: string) => void;
}

export function ProfilePage({
  currentUser,
  currentRole,
  onLogout,
  onUpdateCurrentUserFullName,
}: ProfilePageProps) {
  const user = currentUser?.user || currentUser;
  const fullName = user?.fullName || 'AKBP Hendra Wijaya, S.I.K.';
  const username = user?.username || 'superuser';
  const nip = user?.nip || '';
  const isTrainer = currentRole?.id === 'role-trainer';

  const [activeTab, setActiveTab] = useState<'profile' | 'kedinasan' | 'security'>('profile');

  // Edit Name & Contact State
  const [displayName, setDisplayName] = useState(fullName);
  const [userPhone, setUserPhone] = useState(user?.phone || '');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userPhoto, setUserPhoto] = useState(user?.photoUrl || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Kedinasan State (Lengkap 6 Poin)
  const [poldaList, setPoldaList] = useState<WilayahPoldaItem[]>([]);
  const [polresList, setPolresList] = useState<WilayahPolresItem[]>([]);
  const [kedInstansi, setKedInstansi] = useState(user?.instansi || MASTER_INSTANSI[0]);
  const [kedOrganisasi, setKedOrganisasi] = useState(user?.organisasi || MASTER_ORGANISASI[0]);
  const [kedSubOrg, setKedSubOrg] = useState(user?.subOrg || MASTER_SUB_ORG[0]);
  const [kedSatker, setKedSatker] = useState(user?.satker || MASTER_SATKER[0]);
  const [kedPosition, setKedPosition] = useState(user?.position || '');
  const [kedNip, setKedNip] = useState(user?.nip || '');
  const [kedPolda, setKedPolda] = useState(user?.polda || 'POLDA METRO JAYA');
  const [kedPolres, setKedPolres] = useState(user?.polres || '');
  const [kedSaving, setKedSaving] = useState(false);
  const [kedMsg, setKedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userId = user?.id || 'user-1';
  const roleId = currentRole?.id || 'role-admin';

  // Load daftar polda dari DB
  useEffect(() => {
    fetchPoldaList().then(list => {
      const active = list.filter(p => p.isWilayah);
      setPoldaList(active);
      if (active.length > 0 && !kedPolda) {
        setKedPolda(active[0].nama);
      }
    });
  }, []);

  // Load polres saat kedPolda berubah
  useEffect(() => {
    if (!kedPolda) return;
    fetchPolresByPolda(kedPolda).then(list => {
      setPolresList(list);
      if (list.length > 0) {
        setKedPolres(prev => {
          const exists = list.some(item => item.nama === prev);
          return exists ? prev : list[0].nama;
        });
      } else {
        setKedPolres('');
      }
    });
  }, [kedPolda]);

  // Load latest profile data on mount
  useEffect(() => {
    fetch('/api/profile', {
      headers: { 'x-user-id': userId, 'x-role-id': roleId }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.user) {
          const u = data.data.user;
          if (u.fullName) setDisplayName(u.fullName);
          if (u.phone) setUserPhone(u.phone);
          if (u.email) setUserEmail(u.email);
          if (u.photoUrl) setUserPhoto(u.photoUrl);
          if (u.instansi) setKedInstansi(u.instansi);
          if (u.organisasi) setKedOrganisasi(u.organisasi);
          if (u.subOrg) setKedSubOrg(u.subOrg);
          if (u.satker) setKedSatker(u.satker);
          if (u.position) setKedPosition(u.position);
          if (u.nip) setKedNip(u.nip);
          if (u.polda) setKedPolda(u.polda);
          if (u.polres) setKedPolres(u.polres);
        }
      })
      .catch(() => {});
  }, [userId, roleId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto maksimal 5 MB.');
      return;
    }
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      fetch('/api/outreach/evidence/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename: file.name })
      })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.url) {
            setUserPhoto(d.url);
          } else {
            setUserPhoto(base64);
          }
        })
        .catch(() => {
          setUserPhoto(base64);
        })
        .finally(() => setIsUploadingPhoto(false));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-role-id': roleId
        },
        body: JSON.stringify({
          fullName: displayName.trim(),
          phone: userPhone.trim(),
          email: userEmail.trim(),
          photoUrl: userPhoto
        })
      });
      if (res.ok) {
        if (onUpdateCurrentUserFullName) {
          onUpdateCurrentUserFullName(displayName);
        }
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch {
      alert('Gagal menyimpan profil ke server.');
    }
  };

  const handleSaveKedinasan = (e: React.FormEvent) => {
    e.preventDefault();
    setKedSaving(true);
    setKedMsg(null);

    fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-role-id': roleId
      },
      body: JSON.stringify({
        instansi: kedInstansi,
        organisasi: kedOrganisasi,
        subOrg: kedSubOrg,
        satker: kedSatker,
        position: kedPosition,
        nip: kedNip,
        polda: kedPolda,
        polres: kedPolres
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setKedMsg({ type: 'success', text: 'Informasi kedinasan berhasil disimpan dan terintegrasi.' });
        } else {
          setKedMsg({ type: 'error', text: data.message || 'Gagal menyimpan data kedinasan.' });
        }
      })
      .catch(() => {
        setKedMsg({ type: 'error', text: 'Gagal terhubung ke server.' });
      })
      .finally(() => {
        setKedSaving(false);
        setTimeout(() => setKedMsg(null), 4000);
      });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Semua kolom kata sandi wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Kata sandi baru minimal harus 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
          'x-role-id': roleId
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordMsg({ type: 'success', text: 'Kata sandi akun Anda berhasil diperbarui.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.message || 'Gagal mengubah password.' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Gagal terhubung ke server.' });
    }
    setTimeout(() => setPasswordMsg(null), 4000);
  };

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto font-sans">
      {/* 1. PROFILE HEADER CARD */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative group">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-slate-100 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#0a1d37] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl border-4 border-slate-100 shadow-md">
                {displayName[0]}
              </div>
            )}
            <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-2xl border-2 border-white shadow-md cursor-pointer transition">
              <Camera className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={isUploadingPhoto}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200 inline-block">
                {currentRole?.name || 'Trainer / Instruktur'}
              </span>
              <span className="text-xs text-slate-400 font-mono">@{username}</span>
            </div>

            <h1 className="font-headline text-2xl font-bold text-slate-900 tracking-tight">
              {displayName}
            </h1>

            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
              {kedNip && (
                <span>NRP/NIP: <strong className="text-slate-700">{kedNip}</strong></span>
              )}
              {kedPosition && (
                <>
                  <span>•</span>
                  <span>Jabatan: <strong className="text-slate-700">{kedPosition}</strong></span>
                </>
              )}
              {kedPolda && (
                <>
                  <span>•</span>
                  <span><strong className="text-slate-700">{kedPolda}</strong></span>
                </>
              )}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-100 pt-4 flex-wrap">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#0a1d37] text-white shadow-xs'
                : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Informasi Akun</span>
          </button>
          <button
            onClick={() => setActiveTab('kedinasan')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'kedinasan'
                ? 'bg-[#0a1d37] text-white shadow-xs'
                : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Informasi Kedinasan (Lengkap)</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#0a1d37] text-white shadow-xs'
                : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Keamanan & Password</span>
          </button>
        </div>
      </section>

      {/* === TAB 1: INFORMASI AKUN === */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-headline text-base font-bold text-slate-900">
              Pengaturan Profil Personel
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informasi identitas dasar, kontak aktif, dan kepemilikan akun.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs max-w-xl">
            {isSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Perubahan profil akun berhasil disimpan.</span>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  placeholder="nama@polri.go.id"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Username Login (Read-Only)</label>
              <input
                type="text"
                value={username}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Username bersifat unik dan diatur saat pendaftaran akun.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Peran & Hak Akses (RBAC)</label>
              <input
                type="text"
                value={currentRole?.name || 'Trainer / Instruktur'}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold cursor-not-allowed"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Simpan Profil
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === TAB 2: INFORMASI KEDINASAN LENGKAP === */}
      {activeTab === 'kedinasan' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Kelengkapan Data Kedinasan Personel
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Data instansi, organisasi, satker, pangkat/jabatan, dan NRP/NIP untuk rekaman resmi penugasan dan laporan kegiatan lapangan.
            </p>
          </div>

          <form onSubmit={handleSaveKedinasan} className="space-y-4 text-xs max-w-xl">
            {kedMsg && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 font-semibold ${
                kedMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {kedMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{kedMsg.text}</span>
              </div>
            )}

            {/* 1. Instansi (Pulldown Master Data) */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                1. Instansi (Master Data) *
              </label>
              <select
                value={kedInstansi}
                onChange={e => setKedInstansi(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                {MASTER_INSTANSI.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 2. Organisasi (Pulldown Master Data) */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                2. Organisasi (Master Data) *
              </label>
              <select
                value={kedOrganisasi}
                onChange={e => setKedOrganisasi(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                {MASTER_ORGANISASI.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 3. Sub Org (Pulldown Master Data) */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                3. Sub Organisasi (Master Data) *
              </label>
              <select
                value={kedSubOrg}
                onChange={e => setKedSubOrg(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                {MASTER_SUB_ORG.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 4. Satker (Pulldown Master Data) */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                4. Satker (Satuan Kerja) *
              </label>
              <select
                value={kedSatker}
                onChange={e => setKedSatker(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
              >
                {MASTER_SATKER.map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {/* 5. Pangkat / Jabatan & 6. NRP / NIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  5. Pangkat / Jabatan *
                </label>
                <input
                  type="text"
                  value={kedPosition}
                  onChange={e => setKedPosition(e.target.value)}
                  placeholder="e.g. Kanit Dikyasa / Bripka"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  6. NRP / NIP *
                </label>
                <input
                  type="text"
                  value={kedNip}
                  onChange={e => setKedNip(e.target.value)}
                  placeholder="e.g. 84021208 / 1984..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Wilayah Penugasan: Provinsi & Kota / Kabupaten */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Wilayah Penugasan Kedinasan
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Provinsi</label>
                  <select
                    value={kedPolda}
                    onChange={e => setKedPolda(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    {(poldaList.length > 0 ? poldaList.map(p => p.nama) : DEFAULT_34_POLDA).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kota / Kabupaten</label>
                  <select
                    value={kedPolres}
                    onChange={e => setKedPolres(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                  >
                    {polresList.length > 0 ? (
                      polresList.map(p => (
                        <option key={`${p.poldaId}-${p.polresId}`} value={p.nama}>{p.nama}</option>
                      ))
                    ) : (
                      <option value="">Pilih Provinsi terlebih dahulu</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={kedSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{kedSaving ? 'Menyimpan...' : 'Simpan Kelengkapan Kedinasan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* === TAB 3: KEAMANAN & PASSWORD === */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-headline text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Keamanan Kata Sandi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kombinasi kata sandi yang kuat untuk menjaga keamanan akun operasional Anda.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs max-w-xl">
            {passwordMsg && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 font-semibold ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Kata Sandi Saat Ini</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama Anda"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Perbarui Kata Sandi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
