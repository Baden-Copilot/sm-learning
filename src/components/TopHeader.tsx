import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, X, CheckCircle2, AlertCircle, Shield, User, LogOut, Sparkles } from 'lucide-react';
import { ADMIN_AVATAR_URL, MOCK_NOTIFICATIONS } from '../data/materials';
import { NotificationItem } from '../types';

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileMenu: () => void;
  onSelectMaterialById?: (id: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="bg-white/95 text-[#0a1d37] fixed top-0 right-0 w-full md:w-[calc(100%-260px)] z-40 backdrop-blur-md border-b border-slate-200/90 flex justify-between items-center h-16 px-4 md:px-8 transition-all">
      {/* Left Search Section */}
      <div className="flex items-center space-x-3 w-full max-w-lg">
        {/* Mobile menu trigger */}
        <button
          id="btn-mobile-sidebar-toggle"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-hidden"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="input-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari materi, modul, atau video..."
            className="w-full bg-[#f2f4f6] border border-slate-200 rounded-full py-2 pl-10 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0a1d37] focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls & Profile */}
      <div className="flex items-center space-x-4 ml-4">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications-toggle"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full text-slate-600 hover:text-[#0a1d37] hover:bg-slate-100 transition-colors relative"
            aria-label="Pemberitahuan"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-slate-800">Pemberitahuan</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} Baru
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Tandai dibaca
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.map((item) => (
                  <div 
                    key={item.id}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors flex items-start space-x-3 ${!item.read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {item.type === 'alert' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                      {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {item.type === 'info' && <Sparkles className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Super Admin Profile */}
        <div className="relative" ref={profileRef}>
          <button
            id="btn-profile-menu-toggle"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-3 pl-3 border-l border-slate-200 hover:opacity-90 transition-opacity focus:outline-hidden"
            aria-label="Profil Pengguna"
          >
            <div className="hidden sm:block text-right">
              <p className="font-semibold text-sm text-slate-900 leading-tight">Super Admin</p>
              <p className="text-xs text-slate-500 font-medium">Admin Pusat</p>
            </div>
            <div className="relative">
              <img
                src={ADMIN_AVATAR_URL}
                alt="Super Admin Avatar"
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-3 border-b border-slate-100">
                <p className="font-bold text-sm text-slate-900">AKBP Hendra Wijaya, S.I.K.</p>
                <p className="text-xs text-slate-500 mt-0.5">NRP: 85071299</p>
                <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-800">
                  <Shield className="w-3 h-3 mr-1 text-blue-700" />
                  Divisi Humas & Edukasi POLRI
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Pengaturan Profil Instansi</span>
                </button>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Manajemen Hak Akses Materi</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2.5"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
