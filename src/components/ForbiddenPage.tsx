import React from 'react';
import { ShieldX, Home, LogIn } from 'lucide-react';

interface ForbiddenPageProps {
  onBackToHome: () => void;
  onLogout?: () => void;
  requiredMenu?: string;
  roleName?: string;
}

export function ForbiddenPage({
  onBackToHome,
  onLogout,
  requiredMenu = 'Halaman Internal',
  roleName = 'Pengguna'
}: ForbiddenPageProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 p-8 sm:p-10 text-center shadow-xl space-y-6">
        <div className="w-20 h-20 bg-red-50 border-2 border-red-200 rounded-3xl flex items-center justify-center mx-auto text-red-600 shadow-inner">
          <ShieldX className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-black text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 uppercase tracking-widest">
            HTTP 403 • Access Forbidden
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Akses Ditolak
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Peran Anda (<strong className="text-slate-800 font-bold">{roleName}</strong>) tidak memiliki otorisasi untuk mengakses menu <strong className="text-slate-800 font-bold">"{requiredMenu}"</strong>.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Kembali ke Beranda</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-red-600" />
              <span>Ganti Akun</span>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Hubungi Super Administrator jika membutuhkan eskalasi hak akses menu.
          </p>
        </div>
      </div>
    </div>
  );
}
