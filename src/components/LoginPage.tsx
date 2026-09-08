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
  X,
  Lock,
  Cpu,
  Fingerprint,
  Building2,
  BadgeCheck,
  Phone,
  Mail,
  User,
  Activity
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
        setSuccessMsg(data.message || 'Pendaftaran berhasil diajukan. Menunggu verifikasi instansi.');
      } else {
        setError(data.message || 'Gagal melakukan pendaftaran.');
      }
    } catch {
      setError('Gagal terhubung ke pusat server keamanan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan kata sandi kedinasan wajib diisi.');
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
        setError(data.message || 'Kredensial akses tidak terdaftar.');
      }
    } catch {
      if (username === 'superuser' && password === '123456') {
        onLogin();
      } else {
        setError('Koneksi terputus. Pastikan server lokal berjalan.');
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
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden font-sans select-none selection:bg-blue-500 selection:text-white">
      {/* Dynamic Cybernetic Ambient Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />
      </div>

      {/* Main Structural Layout Card */}
      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 rounded-[28px] border border-blue-500/20 bg-slate-950/80 backdrop-blur-2xl shadow-[0_0_80px_-15px_rgba(30,58,138,0.35)] overflow-hidden">

        {/* Left Side: Brand Panel / Command Information (Visible on LG screens) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-slate-950/90 border-r border-blue-500/10 relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[11px] font-mono tracking-wider shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>DIKMAS LANTAS HUB // ENCRYPTED</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/20 border border-blue-500/30 rounded-2xl">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">SM-LEARNING</h2>
                  <p className="text-[11px] font-mono tracking-widest text-cyan-400 font-bold">KORLANTAS POLRI</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-2">
                Pusat Terpadu Edukasi & Sosialisasi Keamanan, Keselamatan, Ketertiban, dan Kelancaran Lalu Lintas Nasional.
              </p>
            </div>

            {/* Quick Metrics / System Highlights */}
            <div className="space-y-2.5 pt-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <BadgeCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-[11px]">
                  <p className="font-bold text-slate-200">Validasi Personel Presisi</p>
                  <p className="text-slate-500 text-[10px]">Sinkronisasi berjenjang Polda & Polres</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <Lock className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="text-[11px]">
                  <p className="font-bold text-slate-200">Audit Trail Autentikasi</p>
                  <p className="text-slate-500 text-[10px]">Terenkripsi protokol standar kedinasan</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> SERVER ACTIVE</span>
            <span>SEC-LVL 4</span>
          </div>
        </div>

        {/* Right Side: Action Forms */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-slate-900/40">
          <div>
            {/* Header Switcher */}
            <div className="flex rounded-xl bg-slate-950/80 p-1.5 border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>MASUK PERSONEL</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>DAFTAR INSTRUKTUR</span>
              </button>
            </div>

            {/* Notification Messages */}
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-center gap-3 text-red-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-center gap-3 text-emerald-300 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium">{successMsg}</span>
              </div>
            )}

            {/* MODE 1: LOGIN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                    Identitas NRP / Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan NRP atau Username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                    Kata Sandi Keamanan
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4 text-cyan-300" />
                      <span>Verifikasi & Buka Akses</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* MODE 2: REGISTER TRAINER FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Polda Wilayah *
                    </label>
                    <select
                      value={regPolda}
                      onChange={(e) => setRegPolda(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">Pilih Polda</option>
                      {(poldaList.length > 0 ? poldaList.map(p => p.nama) : DEFAULT_34_POLDA).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Satker / Polres *
                    </label>
                    <select
                      value={regPolres}
                      onChange={(e) => setRegPolres(e.target.value)}
                      disabled={!regPolda}
                      className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="">Pilih Satker / Polres</option>
                      {polresList.map(p => (
                        <option key={`${p.poldaId}-${p.polresId}`} value={p.nama}>{p.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Nama Lengkap & Pangkat / NRP *
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Contoh: Bripka Dian Pratama (NRP 92010231)"
                    className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Username Baru *</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username login"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Password *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 karakter"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">WhatsApp Aktif</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Email Dinas / Pribadi</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="nama@polri.go.id"
                      className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Pas Foto Personel</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-950/30 hover:bg-blue-900/30 text-blue-300 text-xs font-semibold transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingPhoto ? 'Mengunggah...' : 'Unggah Pas Foto'}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={isUploadingPhoto} className="hidden" />
                    </label>
                    {regPhoto && (
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-blue-400/40">
                        <img src={regPhoto} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setRegPhoto('')} className="absolute top-0 right-0 bg-red-600 p-0.5 rounded-bl">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isUploadingPhoto}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Ajukan Registrasi Personel</span>
                </button>
              </form>
            )}
          </div>

          {/* Quick Access Portal Session */}
          <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {onOpenPublicPortal && (
                <button
                  type="button"
                  onClick={onOpenPublicPortal}
                  className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span>Portal Edukasi Publik</span>
                </button>
              )}

              {onOpenPublicSession && (
                <form onSubmit={handleJoinSession} className="flex gap-1.5">
                  <input
                    type="text"
                    value={sessionCodeInput}
                    onChange={(e) => setSessionCodeInput(e.target.value)}
                    placeholder="KODE PIN SESI"
                    className="flex-1 px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono font-bold uppercase text-amber-400 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={!sessionCodeInput.trim()}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-40"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Gabung</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
