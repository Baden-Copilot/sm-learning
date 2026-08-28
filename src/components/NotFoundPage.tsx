import React from 'react';
import { ShieldAlert, ArrowLeft, Home, BookOpen, Compass } from 'lucide-react';

interface NotFoundPageProps {
  onBackToHome: () => void;
  onBackToPublicPortal?: () => void;
  message?: string;
  isPublicMode?: boolean;
}

export function NotFoundPage({
  onBackToHome,
  onBackToPublicPortal,
  message = 'Halaman atau tautan yang Anda tuju tidak ditemukan atau telah dipindahkan.',
  isPublicMode = false
}: NotFoundPageProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 text-center shadow-xl space-y-6">
        <div className="w-20 h-20 bg-amber-50 border-2 border-amber-200 rounded-3xl flex items-center justify-center mx-auto text-amber-600 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-widest">
            HTTP 404 • Not Found
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          {isPublicMode && onBackToPublicPortal ? (
            <button
              type="button"
              onClick={onBackToPublicPortal}
              className="w-full bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Kembali ke Portal Publik</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onBackToHome}
              className="w-full bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>Kembali ke Beranda</span>
            </button>
          )}

          {onBackToPublicPortal && !isPublicMode && (
            <button
              type="button"
              onClick={onBackToPublicPortal}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>Buka Portal Publik</span>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Sistem Informasi E-Learning Dikmas Lantas Korlantas POLRI
          </p>
        </div>
      </div>
    </div>
  );
}
