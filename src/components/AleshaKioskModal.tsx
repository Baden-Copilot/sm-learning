import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  RotateCw,
  Maximize2,
  Minimize2,
  Bot
} from 'lucide-react';
import { MaterialItem } from '../types';

interface AleshaKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  kioskUrl?: string;
  activeMenu?: string;
  selectedMaterial?: MaterialItem | null;
  currentUser?: any;
}

export const AleshaKioskModal: React.FC<AleshaKioskModalProps> = ({
  isOpen,
  onClose,
  kioskUrl = 'https://alesha.djalu.co.id/kiosk-public',
  activeMenu = 'beranda',
  selectedMaterial,
  currentUser,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Dynamic user profile resolution
  const effectiveUser = useMemo(() => {
    const u = currentUser?.user || currentUser;
    if (u && (u.fullName || u.username || u.name)) {
      return u;
    }
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || localStorage.getItem('korlantas_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed?.user || parsed;
        }
      } catch (e) {
        console.warn('[AleshaKioskModal] Failed to read user profile from storage', e);
      }
    }
    return null;
  }, [currentUser]);

  // Map view/tab IDs to readable Indonesian menu names
  const readableMenuName = useMemo(() => {
    const map: Record<string, string> = {
      beranda: 'Beranda & Ringkasan Edukasi Dikmas',
      katalog: 'Katalog Materi & Kurikulum Keselamatan',
      my_learning: 'Capaian & Progres Belajar Saya',
      'my-learning': 'Capaian & Progres Belajar Saya',
      course_detail: 'Detail Materi & Silabus Modul',
      'course-detail': 'Detail Materi & Silabus Modul',
      focus_mode: 'Ruang Belajar Interaktif (Focus Mode)',
      'focus-mode': 'Ruang Belajar Interaktif (Focus Mode)',
      quiz: 'Evaluasi & Ujian Kompetensi Kuis',
      'trainer-outreach': 'Sesi Penyuluhan & Outreach Lapangan',
      'presentation-room': 'Ruang Presentasi Edukasi Lapangan',
      'public-session': 'Sesi Publik & Room Akses Peserta',
      'user-akses': 'Manajemen Pengguna & Hak Akses',
      'content-management': 'Kelola Katalog & Bank Soal',
      reports: 'Laporan Kegiatan & Analitik Dikmas',
      executive: 'Dashboard Eksekutif Pimpinan',
      profile: 'Profil Pengguna & Satker',
    };
    return map[activeMenu] || activeMenu;
  }, [activeMenu]);

  // Construct target URL with rich query parameters for context injection
  const finalKioskUrl = useMemo(() => {
    try {
      const url = new URL(kioskUrl, window.location.origin);
      url.searchParams.set('context_app', 'SM-LEARNING');
      url.searchParams.set('category', 'sm-learning');
      url.searchParams.set('menu', readableMenuName);
      if (effectiveUser) {
        const name = effectiveUser.fullName || effectiveUser.full_name || effectiveUser.username || effectiveUser.name || '';
        const role = effectiveUser.roleName || effectiveUser.role_id || effectiveUser.roleId || effectiveUser.role || 'Peserta';
        url.searchParams.set('role', role);
        url.searchParams.set('user_role', role);
        url.searchParams.set('user_name', name);
        url.searchParams.set('user_fullname', name);
        url.searchParams.set('fullName', name);
        url.searchParams.set('full_name', name);
        if (effectiveUser.unit) {
          url.searchParams.set('unit', effectiveUser.unit);
          url.searchParams.set('user_unit', effectiveUser.unit);
        }
        if (effectiveUser.position) {
          url.searchParams.set('position', effectiveUser.position);
          url.searchParams.set('user_position', effectiveUser.position);
        }
        if (effectiveUser.polda) url.searchParams.set('polda', effectiveUser.polda);
        if (effectiveUser.polres) url.searchParams.set('polres', effectiveUser.polres);
      }
      if (selectedMaterial) {
        url.searchParams.set('material', `${selectedMaterial.id} - ${selectedMaterial.title} (${selectedMaterial.level})`);
      }
      return url.toString();
    } catch {
      return kioskUrl;
    }
  }, [kioskUrl, readableMenuName, effectiveUser, selectedMaterial]);

  // Send postMessage to sync live context with the iframe whenever modal is open or context changes
  const sendContextUpdate = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const name = effectiveUser?.fullName || effectiveUser?.full_name || effectiveUser?.username || effectiveUser?.name || 'Peserta Dikmas';
      const role = effectiveUser?.roleName || effectiveUser?.role_id || effectiveUser?.roleId || effectiveUser?.role || 'Peserta';
      
      const payload = {
        context_app: 'SM-LEARNING',
        category: 'sm-learning',
        current_menu: readableMenuName,
        selected_material: selectedMaterial
          ? `${selectedMaterial.id} - ${selectedMaterial.title} (Jenjang: ${selectedMaterial.level}, Tipe: ${selectedMaterial.type})`
          : '',
        user_role: role,
        user_unit: effectiveUser?.unit || 'Korlantas Polri',
        user_position: effectiveUser?.position || '',
        user_name: name,
        user_fullname: name,
        fullName: name,
        polda: effectiveUser?.polda || '',
        polres: effectiveUser?.polres || '',
      };

      iframeRef.current.contentWindow.postMessage(
        { type: 'ALESHA_CONTEXT_UPDATE', payload },
        '*'
      );
      console.log('[SM-Learning -> Alesha Bridge] Context synchronized:', payload);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        sendContextUpdate();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, readableMenuName, selectedMaterial, effectiveUser]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(finalKioskUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div
        className={`bg-slate-950 border border-indigo-500/30 rounded-3xl flex flex-col shadow-2xl overflow-hidden text-white transition-all duration-300 ${
          isFullscreen
            ? 'w-[98vw] h-[96vh]'
            : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Clean Minimalist Header */}
        <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-4 shrink-0">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-white">
              Alesha AI
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Refresh"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Open in External Tab */}
            <button
              onClick={handleOpenExternal}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Buka Tab Baru"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title={isFullscreen ? 'Kecilkan Tampilan' : 'Perbesar Tampilan'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-amber-400" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-all cursor-pointer ml-1"
              title="Tutup (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Edge-to-Edge Iframe Area */}
        <div className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden flex flex-col">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-white gap-3 animate-in fade-in duration-150">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse">
                  <Sparkles className="w-6 h-6 text-indigo-300" />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Menghubungkan ke Alesha...
              </p>
            </div>
          )}

          {/* Iframe with full permissions for mic, audio, camera */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={finalKioskUrl}
            title="Alesha AI Kiosk"
            className="w-full flex-1 border-0 bg-slate-950"
            allow="microphone; camera; autoplay; display-capture; clipboard-write; encrypted-media; fullscreen"
            allowFullScreen
            onLoad={() => {
              setIsLoading(false);
              sendContextUpdate();
            }}
          />
        </div>
      </div>
    </div>
  );
};
