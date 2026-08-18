import React from 'react';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  Video, 
  FileText, 
  BarChart3, 
  CheckSquare, 
  Star, 
  History, 
  HelpCircle, 
  Info,
  X
} from 'lucide-react';
import { POLRI_LOGO_URL } from '../data/materials';
import { MaterialType } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string, typeFilter?: MaterialType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'beranda', label: 'Beranda', icon: Home, type: 'all' as MaterialType },
    { id: 'katalog', label: 'Katalog Materi', icon: BookOpen, type: 'all' as MaterialType },
    { id: 'jenjang', label: 'Jenjang Pendidikan', icon: GraduationCap, type: 'all' as MaterialType },
    { id: 'video', label: 'Video', icon: Video, type: 'video' as MaterialType },
    { id: 'dokumen', label: 'Dokumen', icon: FileText, type: 'modul' as MaterialType },
    { id: 'infografis', label: 'Infografis', icon: BarChart3, type: 'infografis' as MaterialType },
    { id: 'kuis', label: 'Kuis & Evaluasi', icon: CheckSquare, type: 'kuis' as MaterialType },
    { id: 'favorit', label: 'Favorit', icon: Star, type: 'all' as MaterialType },
    { id: 'riwayat', label: 'Riwayat', icon: History, type: 'all' as MaterialType },
  ];

  const handleNavClick = (id: string, typeFilter: MaterialType) => {
    onSelectTab(id, typeFilter);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 h-full w-[260px] bg-[#0a1d37] text-slate-300 z-50 flex flex-col py-6 shadow-2xl transition-transform duration-300 ease-in-out border-r border-slate-800/80
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* POLRI Header / Logo */}
        <div className="px-6 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-white/10 p-1 flex items-center justify-center ring-1 ring-white/20 shadow-inner">
              <img 
                src={POLRI_LOGO_URL} 
                alt="POLRI Emblem" 
                className="w-9 h-9 object-contain drop-shadow"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-headline text-lg font-extrabold text-white tracking-wide leading-none">
                E-LEARNING
              </h1>
              <p className="text-[11px] font-semibold tracking-wider text-slate-300/90 mt-1 uppercase">
                SAFETY EDUCATION POLRI
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile} 
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id, item.type)}
                className={`
                  w-full flex items-center space-x-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left
                  ${isActive 
                    ? 'bg-[#2563eb] text-white shadow-md font-semibold ring-1 ring-blue-400/40' 
                    : 'text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.98]'
                  }
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Support Links */}
        <div className="mt-auto px-3 pt-4 border-t border-white/10 space-y-1">
          <button
            id="sidebar-nav-bantuan"
            onClick={() => handleNavClick('bantuan', 'all')}
            className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
              currentTab === 'bantuan' ? 'bg-white/15 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Bantuan</span>
          </button>
          <button
            id="sidebar-nav-tentang"
            onClick={() => handleNavClick('tentang', 'all')}
            className={`w-full flex items-center space-x-3.5 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
              currentTab === 'tentang' ? 'bg-white/15 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>Tentang</span>
          </button>
          
          <div className="pt-2 px-3 text-[11px] text-slate-400 text-center">
            Korlantas & Ditbinmas POLRI © 2026
          </div>
        </div>
      </aside>
    </>
  );
};
