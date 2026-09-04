import React from 'react';
import {
  Home,
  Compass,
  BookOpen,
  Award,
  User,
  Layers,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
import { Role } from '../types';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentRole: Role;
  canAccessContentManagement?: boolean;
  canAccessReports?: boolean;
  isExecutive?: boolean;
  isTrainer?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  canAccessContentManagement = false,
  canAccessReports = false,
  isExecutive = false,
  isTrainer = false,
}) => {
  // Determine the 4th contextual tab for mobile depending on user role
  const getContextTab = () => {
    if (isExecutive) {
      return { id: 'executive', label: 'Eksekutif', icon: BarChart3 };
    }
    if (isTrainer) {
      return { id: 'trainer-outreach', label: 'Lap Giat', icon: Layers };
    }
    if (canAccessContentManagement) {
      return { id: 'content-management', label: 'Kelola', icon: Layers };
    }
    if (canAccessReports) {
      return { id: 'reports', label: 'Laporan', icon: FileSpreadsheet };
    }
    return { id: 'progress', label: 'Capaian', icon: Award };
  };

  const contextTab = getContextTab();

  // Mirrors the sidebar: a pimpinan takes no courses, so Beranda and My Learning
  // are replaced by the dashboard they actually work from.
  const navItems = isExecutive
    ? [
        { id: 'executive', label: 'Eksekutif', icon: BarChart3 },
        { id: 'learning', label: 'Katalog', icon: Compass },
        { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
        { id: 'profile', label: 'Profil', icon: User },
      ]
    : [
        { id: 'beranda', label: 'Beranda', icon: Home },
        { id: 'learning', label: 'Katalog', icon: Compass },
        { id: 'my-learning', label: 'Belajar', icon: BookOpen },
        contextTab,
        { id: 'profile', label: 'Profil', icon: User },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id ||
            (item.id === 'learning' && currentTab === 'katalog');

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[48px] cursor-pointer ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
