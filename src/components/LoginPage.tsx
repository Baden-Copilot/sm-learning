import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  GraduationCap,
  QrCode,
  ArrowRight,
  UserPlus,
  Upload,
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import { DEFAULT_34_POLDA, fetchPoldaList, fetchPolresByPolda, WilayahPoldaItem, WilayahPolresItem } from '../utils/wilayah';

interface LoginPageProps {
  onLogin: (userData?: { user: any; role: any }) => void;
  onOpenPublicPortal?: () => void;
  onOpenPublicSession?: (code?: string) => void;
}

export function LoginPage({ onLogin, onOpenPublicPortal, onOpenPublicSession }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState('');

  // Register Form Fields
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPolda, setRegPolda] = useState('');
  const [regPolres, setRegPolres] = useState('');
  const [regPhoto, setRegPhoto] = useState('');
  const [poldaList, setPoldaList] = useState<WilayahPoldaItem[]>([]);
  const [polresList, setPolresList] = useState<WilayahPolresItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchPoldaList().then(list => {
      const active = list.filter(p => p.isWilayah);
      setPoldaList(active);
    });
  }, []);

  useEffect(() => {
    if (!regPolda) {
      setPolresList([]);
      setRegPolres('');
      return;
    }
    fetchPolresByPolda(regPolda).then(list => {
      setPolresList(list);
    });
  }, [regPolda]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setError('');

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
        .then(res => res.json())
        .then(data => {
          if (data.success && data.url) {
            setRegPhoto(data.url);
          } else {
            setRegPhoto(base64);
          }
        })
        .catch(() => {
          setRegPhoto(base64);
        })
        .finally(() => {
          setIsUploadingPhoto(false);
        });
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username.trim() || !password.trim() || !regFullName.trim()) {
      setError('Username, password, dan nama lengkap wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          fullName: regFullName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim(),
          photoUrl: regPhoto || null,
          polda: regPolda || null,
          polres: regPolres || null,
          roleId: 'role-trainer'
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Pendaftaran berhasil! Akun Anda menunggu aktivasi dari Admin.');
      } else {
        setError(data.message || 'Gagal mendaftar.');
      }
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.data);
      } else {
        setError(data.message || 'Username atau password salah.');
      }
    } catch {
      // Fallback offline / static dummy
      if (username === 'superuser' && password === '123456') {
        onLogin();
      } else {
        setError('Gagal terhubung ke server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionCodeInput.trim() && onOpenPublicSession) {
      onOpenPublicSession(sessionCodeInput.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1d37] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg p-2">
            <img
              src="/korlantas-logo-new.png"
              alt="Logo Korlantas POLRI"
              className="w-12 h-12 object-contain drop-shadow"
            />
          </div>
          <h1 className="font-headline text-2xl font-black text-white tracking-tight">
            E-Learning Dikmas Lantas
          </h1>
          <p className="text-xs text-blue-200/80 font-medium mt-1">
            Korps Lalu Lintas Kepolisian Negara Republik Indonesia
          </p>
        </div>

        {/* Card Header Switcher */}
        <div className="bg-white rounded-3xl shadow-2xl p-7 sm:p-8 space-y-5 border border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-headline text-lg font-bold text-slate-900">
                {mode === 'login' ? 'Masuk Personel' : 'Registrasi Instruktur / Trainer'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'login'
                  ? 'Gunakan akun personel POLRI untuk mengelola materi, sesi pemaparan, dan laporan.'
                  : 'Daftar mandiri sebagai instruktur/trainer Dikmas Lantas POLRI.'}
              </p>
            </div>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk Sesi
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Registrasi Akun
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-xs text-red-700 font-semibold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-800 font-semibold">{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username (contoh: superuser, trainer1)"
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0a1d37] transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0a1d37] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0a1d37] hover:bg-[#162c4e] text-white py-3 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>Masuk ke Dashboard</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* Daerah / Polda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Daerah (Polda) *
                  </label>
                  <select
                    value={regPolda}
                    onChange={(e) => setRegPolda(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                    required
                  >
                    <option value="">Pilih Polda</option>
                    {(poldaList.length > 0 ? poldaList.map(p => p.nama) : DEFAULT_34_POLDA).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wilayah (Polres) *
                  </label>
                  <select
                    value={regPolres}
                    onChange={(e) => setRegPolres(e.target.value)}
                    disabled={!regPolda}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                    required
                  >
                    <option value="">Pilih Polres</option>
                    {polresList.map(p => (
                      <option key={`${p.poldaId}-${p.polresId}`} value={p.nama}>{p.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap & Pangkat *
                </label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="contoh: Bripka Dian Pratama, S.H."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                  required
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. dian.pratama"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 karakter"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                    required
                  />
                </div>
              </div>

              {/* No Telp & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@polri.go.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a1d37]"
                  />
                </div>
              </div>

              {/* Foto Profil */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Foto Profil / Kedinasan (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Mengunggah...' : 'Pilih Foto'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhoto}
                      className="hidden"
                    />
                  </label>
                  {regPhoto && (
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
                      <img src={regPhoto} alt="Foto Profil" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setRegPhoto('')}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded p-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400">JPG, PNG maks 5MB</span>
                </div>
              </div>

              {/* Role Indicator */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Peran / Role:</span>
                <span className="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                  Trainer / Instruktur (Default)
                </span>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                disabled={isLoading || isUploadingPhoto}
                className="w-full bg-[#0a1d37] hover:bg-[#162c4e] text-white py-3 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Daftar Sekarang & Masuk</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* PUBLIC LEARNER & SESSION JOIN ACCESS BUTTONS */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Akses Terbuka Masyarakat & Peserta
              </span>
            </div>

            {onOpenPublicPortal && (
              <button
                type="button"
                onClick={onOpenPublicPortal}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>Buka Portal Edukasi Publik</span>
              </button>
            )}

            {onOpenPublicSession && (
              <form onSubmit={handleJoinSession} className="flex gap-2">
                <input
                  type="text"
                  value={sessionCodeInput}
                  onChange={(e) => setSessionCodeInput(e.target.value)}
                  placeholder="Kode Sesi (POL-XXXX)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={!sessionCodeInput.trim()}
                  className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer transition shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Gabung</span>
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          © 2026 Korlantas POLRI — Sistem Edukasi Keselamatan Nasional
        </p>
      </div>
    </div>
  );
}
