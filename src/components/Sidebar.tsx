import React from 'react';
import {
  Home,
  BookOpen,
  GraduationCap,
  Award,
  Layers,
  BarChart3,
  Users,
  HelpCircle,
  Info,
  X,
  Compass,
  FileCheck2,
  User,
  FileSpreadsheet
} from 'lucide-react';
import { POLRI_LOGO_URL } from '../data/materials';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  canAccessUserManagement?: boolean;
  canAccessContentManagement?: boolean;
  canAccessReports?: boolean;
  isExecutive?: boolean;
  /** Admins may open the dashboard too, but it is not their home screen. */
  canAccessExecutive?: boolean;
  isTrainer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  canAccessUserManagement = true,
  canAccessContentManagement = true,
  canAccessReports = true,
  isExecutive = false,
  canAccessExecutive = false,
  isTrainer = false,
}) => {
  // Core navigation. A pimpinan supervises the program rather than taking the
  // courses, so their list drops the personal-progress entries (My Learning,
  // Capaian & Sertifikat) that would otherwise sit empty for them, and their
  // home IS the dashboard — the learner Beranda has nothing a pimpinan acts on.
  // The public portal is also dropped: it is the citizen-facing entry point, and
  // what a pimpinan needs to know about it already shows up as numbers on the
  // dashboard.
  const learnerNavItems = isExecutive
    ? [
        { id: 'executive', label: 'Eksekutif Dashboard', icon: BarChart3 },
        { id: 'learning', label: 'Katalog Materi', icon: Compass },
      ]
    : [
        { id: 'beranda', label: 'Beranda', icon: Home },
        { id: 'learning', label: 'Learning Library', icon: Compass },
        { id: 'my-learning', label: 'My Learning', icon: BookOpen },
        { id: 'progress', label: 'Capaian & Sertifikat', icon: Award },
        { id: 'public-portal', label: 'Portal Edukasi Publik', icon: GraduationCap },
      ];

  const sectionLabel = isExecutive ? 'Pemantauan Program' : 'Pembelajaran';

  const handleNavClick = (id: string) => {
    onSelectTab(id);
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
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleNavClick(isExecutive ? 'executive' : 'beranda')}
          >
            <div className="w-10 h-10 rounded-full bg-white/10 p-1 flex items-center justify-center ring-1 ring-white/20 shadow-inner">
              <img
                src={POLRI_LOGO_URL}
                alt="POLRI Emblem"
                className="w-8 h-8 object-contain drop-shadow"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="font-headline text-base font-extrabold text-white tracking-wide leading-none">
                SM-LEARNING
              </h1>
              <p className="text-[10px] font-semibold tracking-wider text-slate-300/90 mt-1 uppercase">
                Dikmas Lantas POLRI
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

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-thin">
          {/* SECTION: LEARNER */}
          <div>
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              {sectionLabel}
            </span>
            <div className="space-y-1">
              {learnerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id || (item.id === 'learning' && currentTab === 'katalog');

                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 active:scale-[0.99]'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION: MANAGEMENT & EXECUTIVE (ROLE GUARDED) */}
          {(canAccessExecutive || canAccessContentManagement || canAccessUserManagement || canAccessReports || isTrainer) && (
            <div>
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Manajemen & Operasional
              </span>
              <div className="space-y-1">
                {isTrainer && (
                  <button
                    id="sidebar-nav-trainer-outreach"
                    onClick={() => handleNavClick('trainer-outreach')}
                    className={`
                      w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer
                      ${currentTab === 'trainer-outreach' || currentTab === 'presentation-room'
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 active:scale-[0.99]'
                      }
                    `}
                  >
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Lap Giat</span>
                  </button>
                )}

                {/* Admins reach the dashboard from here; executives already have it
                    as their first nav item, so it is not repeated for them. */}
                {canAccessExecutive && !isExecutive && (
                  <button
                    id="sidebar-nav-executive"
                    onClick={() => handleNavClick('executive')}
                    className={`
                      w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer
                      ${currentTab === 'executive'
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 active:scale-[0.99]'
                      }
                    `}
                  >
                    <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Eksekutif Dashboard</span>
                  </button>
                )}

                {canAccessContentManagement && (
                  <button
                    id="sidebar-nav-content-management"
                    onClick={() => handleNavClick('content-management')}
                    className={`
                      w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer
                      ${currentTab === 'content-management'
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 active:scale-[0.99]'
                      }
                    `}
                  >
                    <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Kelola Konten & Modul</span>
                  </button>
                )}

                {canAccessReports && (
                  <button
                    id="sidebar-nav-reports"
                    onClick={() => handleNavClick('reports')}
                    className={`
                      w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer
                      ${currentTab === 'reports'
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 active:scale-[0.99]'
                      }
                    `}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>Laporan & Ekspor</span>
                  </button>
                )}

                {canAccessUserManagement && (
                  <button
                    id="sidebar-nav-user-akses"
                    onClick={() => handleNavClick('user-akses')}
                    className={`
                      w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer
                      ${currentTab === 'user-akses'
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/8 active:scale-[0.99]'
                      }
                    `}
                  >
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>User Akses & RBAC</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Support Links */}
        <div className="mt-auto px-3 pt-4 border-t border-white/10 space-y-1">
          <button
            id="sidebar-nav-bantuan"
            onClick={() => handleNavClick('bantuan')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs transition-all duration-150 text-left cursor-pointer ${
              currentTab === 'bantuan' ? 'bg-white/15 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Pusat Bantuan (110)</span>
          </button>
          <button
            id="sidebar-nav-tentang"
            onClick={() => handleNavClick('tentang')}
            className={`w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-xs transition-all duration-150 text-left cursor-pointer ${
              currentTab === 'tentang' ? 'bg-white/15 text-white font-semibold' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Info className="w-4 h-4 text-slate-400" />
            <span>Tentang Aplikasi</span>
          </button>

          <div className="pt-2 px-3 text-[10px] text-slate-400 text-center">
            Korlantas & Ditbinmas POLRI © 2026
          </div>
        </div>
      </aside>
    </>
  );
};
