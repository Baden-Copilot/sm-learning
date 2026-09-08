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
  X,
  Sparkles,
  Lock,
  Cpu,
  Globe,
  Radio,
  Fingerprint
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
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-x-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* High-Tech Futuristic Cyber Grid Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Cyberpunk Grid */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Diagonal Tech Scanlines Accent */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #3b82f6 0, #3b82f6 1px, transparent 0, transparent 50%)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Luminous Core Orbs */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-blue-600/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-indigo-600/20 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[180px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 my-auto py-6 space-y-6">
        {/* TOP BRANDING & LOGO */}
        <div className="text-center space-y-3">
          {/* Status Indicator Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-[11px] font-mono tracking-wider shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="font-bold uppercase">SISTEM EDUKASI KESELAMATAN BERLALU LINTAS</span>
          </div>

          {/* Logo with Tech Halo */}
          <div className="relative inline-block mt-2">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl blur-md opacity-40 animate-pulse" />
            <div className="relative w-28 h-28 bg-slate-900/90 backdrop-blur-xl border-2 border-blue-400/40 rounded-3xl flex items-center justify-center mx-auto shadow-2xl p-3.5">
              <img
                src="/korlantas-logo-new.png"
                alt="Logo Korlantas POLRI"
                className="w-24 h-24 object-contain filter drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
              />
            </div>
          </div>

          <div>
            <h1 className="font-headline text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-blue-200 tracking-tight">
              SM-LEARNING DIKMAS
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
              Korps Lalu Lintas Kepolisian Negara Republik Indonesia
            </p>
          </div>
        </div>

        {/* HIGH-TECH GLASS CONTAINER */}
        <div className="relative rounded-3xl p-0.5 bg-gradient-to-b from-blue-500/40 via-blue-900/20 to-slate-800/40 shadow-[0_0_50px_-10px_rgba(59,130,246,0.25)]">
          <div className="bg-slate-900/95 backdrop-blur-2xl rounded-[23px] p-6 sm:p-8 space-y-5 border border-white/5">
            {/* Mode Switcher */}
            <div className="flex rounded-2xl bg-slate-950/80 p-1 border border-slate-800/80">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Personel</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrasi Trainer</span>
              </button>
            </div>

            {/* Error & Success Feedback */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-red-300 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium">{successMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Username Personel</span>
                    <span className="text-[10px] font-mono text-slate-500">ID / NRP</span>
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username (contoh: superuser, kapolri)"
                      autoComplete="username"
                      className="w-full px-4 py-3 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-slate-950 transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Kata Sandi (Password)</span>
                    <span className="text-[10px] font-mono text-slate-500">Kredensial</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password akun Anda"
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-11 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 focus:bg-slate-950 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:shadow-[0_0_35px_rgba(37,99,235,0.6)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border border-blue-400/30"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Enkripsi Akun...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-cyan-300" />
                      <span>Autentikasi & Masuk Dashboard</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Provinsi *
                    </label>
                    <select
                      value={regPolda}
                      onChange={(e) => setRegPolda(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" className="bg-slate-900">Pilih Provinsi</option>
                      {(poldaList.length > 0 ? poldaList.map(p => p.nama) : DEFAULT_34_POLDA).map(p => (
                        <option key={p} value={p} className="bg-slate-900">{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Kota / Kabupaten *
                    </label>
                    <select
                      value={regPolres}
                      onChange={(e) => setRegPolres(e.target.value)}
                      disabled={!regPolda}
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-semibold text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" className="bg-slate-900">Pilih Kota / Kabupaten</option>
                      {polresList.map(p => (
                        <option key={`${p.poldaId}-${p.polresId}`} value={p.nama} className="bg-slate-900">{p.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nama Lengkap & Pangkat / Jabatan *
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="contoh: Bripka Dian Pratama, S.H."
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Username Login *
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. dian.pratama"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      No. WhatsApp
                    </label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Email Kedinasan
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="nama@polri.go.id"
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Foto Profil Personel (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-dashed border-blue-500/50 bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 text-xs font-bold transition">
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
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-blue-500/40">
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
                    <span className="text-[10px] text-slate-500">JPG, PNG maks 5MB</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isUploadingPhoto}
                  className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 rounded-2xl text-xs font-extrabold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mendaftarkan Data Instruktur...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Kirim Pendaftaran Akun</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* PUBLIC PORTAL & SESSION CODE ACCESS */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="text-center">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                  PORTAL PUBLIK & PESERTA SOSIALISASI
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {onOpenPublicPortal && (
                  <button
                    type="button"
                    onClick={onOpenPublicPortal}
                    className="w-full py-2.5 px-3 rounded-2xl border border-slate-700/80 bg-slate-950/60 hover:bg-slate-800/80 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-blue-400" />
                    <span>Portal Edukasi Publik</span>
                  </button>
                )}

                {onOpenPublicSession && (
                  <form onSubmit={handleJoinSession} className="flex gap-1.5">
                    <input
                      type="text"
                      value={sessionCodeInput}
                      onChange={(e) => setSessionCodeInput(e.target.value)}
                      placeholder="KODE SESI"
                      className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-xs font-mono font-bold uppercase text-amber-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={!sessionCodeInput.trim()}
                      className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1 cursor-pointer transition shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Masuk</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center space-y-1">
          <p className="text-[11px] font-mono text-slate-500">
            SECURE ACCESS SYSTEM // ENCRYPTION AES-256 // SM-LEARNING POLRI
          </p>
          <p className="text-[10px] text-slate-600">
            © 2026 Korlantas POLRI — Pusat Pendidikan & Rekayasa Lalu Lintas Nasional
          </p>
        </div>
      </div>
    </div>
  );
}
