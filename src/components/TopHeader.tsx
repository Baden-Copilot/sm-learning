import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Bell,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Shield,
  User,
  LogOut,
  Sparkles,
  BookOpen,
  Video,
  FileText,
  CheckSquare,
  ArrowRight,
  Compass
} from 'lucide-react';
import { ADMIN_AVATAR_URL } from '../data/materials';
import { NotificationItem, MaterialItem } from '../types';

interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenMobileMenu: () => void;
  onSelectMaterial?: (material: MaterialItem) => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  currentUser?: any;
  currentRole?: any;
  materials?: MaterialItem[];
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenMobileMenu,
  onSelectMaterial,
  onLogout,
  onOpenProfile,
  currentUser,
  currentRole,
  materials = [],
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setNotifications(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Real data instant global search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return materials
      .filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.level.toLowerCase().includes(query) ||
        m.typeLabel.toLowerCase().includes(query) ||
        (m.description && m.description.toLowerCase().includes(query)) ||
        (m.author && m.author.toLowerCase().includes(query))
      )
      .slice(0, 5);
  }, [searchQuery, materials]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleSelectSearchResult = (material: MaterialItem) => {
    setIsSearchFocused(false);
    onSearchChange('');
    if (onSelectMaterial) {
      onSelectMaterial(material);
    }
  };

  return (
    <header className="bg-white/95 text-[#0a1d37] fixed top-0 right-0 w-full md:w-[calc(100%-260px)] z-40 backdrop-blur-md border-b border-slate-200/90 flex justify-between items-center h-16 px-4 md:px-8 transition-all">
      {/* Left Global Search Section */}
      <div className="flex items-center space-x-3 w-full max-w-lg relative" ref={searchContainerRef}>
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
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Cari materi, topik, atau modul pembelajaran..."
            className="w-full bg-[#f2f4f6] border border-slate-200 rounded-full py-2 pl-10 pr-9 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0a1d37] focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Instant Search Discovery Popover Dropdown */}
          {isSearchFocused && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Hasil Pencarian Materi</span>
                <span>{searchResults.length} Ditemukan</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Tidak ada materi yang sesuai dengan "<strong>{searchQuery}</strong>"
                </div>
              ) : (
                <div className="space-y-1 divide-y divide-slate-50">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-2 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 group-hover:text-blue-600 truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-blue-900">{item.level}</span>
                            <span>•</span>
                            <span>{item.typeLabel}</span>
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            className="p-2 rounded-full text-slate-600 hover:text-[#0a1d37] hover:bg-slate-100 transition-colors relative cursor-pointer"
            aria-label="Pemberitahuan"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
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

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button
            id="btn-profile-menu-toggle"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-3 pl-3 border-l border-slate-200 hover:opacity-90 transition-opacity focus:outline-hidden cursor-pointer"
            aria-label="Profil Pengguna"
          >
            <div className="hidden sm:block text-right">
              <p className="font-semibold text-sm text-slate-900 leading-tight">
                {currentUser?.user?.fullName || currentUser?.fullName || 'Super Admin'}
              </p>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                {currentRole?.name || currentUser?.role?.name || 'Admin / Superuser'}
              </p>
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#0a1d37] text-white flex items-center justify-center font-bold text-sm border-2 border-slate-200 shadow-2xs">
                {(currentUser?.user?.fullName || currentUser?.fullName || 'SA')[0]}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-3 border-b border-slate-100">
                <p className="font-bold text-sm text-slate-900">
                  {currentUser?.user?.fullName || currentUser?.fullName || 'AKBP Hendra Wijaya, S.I.K.'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  @{currentUser?.user?.username || currentUser?.username || 'superuser'}
                </p>
                <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
                  {currentRole?.name || currentUser?.role?.name || 'Admin / Superuser'}
                </div>
              </div>

              <div className="py-1">
                <div className="px-4 py-2 text-xs text-slate-500">
                  <span className="block font-medium text-slate-700 mb-1">Status Hak Akses:</span>
                  <span className="inline-block bg-slate-100 px-2 py-1 rounded text-[11px] text-slate-600">
                    {currentRole?.description || 'Akses penuh ke seluruh sistem.'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                {onOpenProfile && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenProfile();
                    }}
                    className="w-full flex items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 mr-2 text-slate-500" />
                    Pengaturan Profil
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full flex items-center px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar Akun (Logout)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
