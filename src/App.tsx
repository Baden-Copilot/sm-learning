import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, BookOpen, SearchX, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { FilterBar } from './components/FilterBar';
import { MaterialCardFeatured } from './components/MaterialCardFeatured';
import { MaterialCardStandard } from './components/MaterialCardStandard';
import { MaterialCardCompact } from './components/MaterialCardCompact';
import { LearnModal } from './components/Modals/LearnModal';
import { Toast, ToastMessage } from './components/Toast';
import { INITIAL_MATERIALS } from './data/materials';
import { EducationLevel, MaterialItem, MaterialType } from './types';

export default function App() {
  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>('ALL');
  const [selectedType, setSelectedType] = useState<MaterialType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'downloads' | 'az'>('latest');
  const [currentTab, setCurrentTab] = useState<string>('katalog');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [activeMaterial, setActiveMaterial] = useState<MaterialItem | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewHistory, setViewHistory] = useState<string[]>([]);

  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);

  // Fetch from express backend if available
  useEffect(() => {
    fetch('/api/materials')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setMaterials(data.data);
        }
      })
      .catch(() => {
        // Fallback to local state seamlessly
      });
  }, []);

  const addToast = (type: 'success' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Handle Tab changes from Sidebar
  const handleSelectTab = (tab: string, typeFilter: MaterialType = 'all') => {
    if (tab === 'bantuan') {
      setShowHelpModal(true);
      return;
    }
    if (tab === 'tentang') {
      setShowAboutModal(true);
      return;
    }

    setCurrentTab(tab);
    if (typeFilter !== 'all') {
      setSelectedType(typeFilter);
    } else if (tab === 'katalog' || tab === 'beranda') {
      setSelectedType('all');
      setSelectedLevel('ALL');
    }
  };

  // Bookmark toggle
  const handleToggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMaterials(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const nextState = !item.bookmarked;
          addToast(
            nextState ? 'success' : 'info',
            nextState ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit',
            `Modul "${item.title}" ${nextState ? 'berhasil disimpan ke daftar favorit Anda.' : 'telah dihapus dari daftar favorit.'}`
          );
          return { ...item, bookmarked: nextState };
        }
        return item;
      });
    });

    // Notify backend
    fetch(`/api/materials/${id}/bookmark`, { method: 'POST' }).catch(() => {});
  };

  // Handle open modal
  const handleOpenMaterial = (material: MaterialItem) => {
    setActiveMaterial(material);
    setViewHistory(prev => Array.from(new Set([material.id, ...prev])));

    // Update view count
    setMaterials(prev => prev.map(m => m.id === material.id ? { ...m, views: m.views + 1 } : m));
    fetch(`/api/materials/${material.id}/view`, { method: 'POST' }).catch(() => {});
  };

  // Handle download simulation
  const handleDownload = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = materials.find(m => m.id === id);
    if (item) {
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, downloads: (m.downloads || 0) + 1 } : m));
      addToast(
        'success',
        'Unduhan Dimulai',
        `Mengunduh berkas materi resmi POLRI: ${item.title}`
      );
      fetch(`/api/materials/${id}/download`, { method: 'POST' }).catch(() => {});
    }
  };

  // Filter and sort items
  const filteredMaterials = useMemo(() => {
    let result = [...materials];

    // Filter by Sidebar tabs like Favorit or Riwayat
    if (currentTab === 'favorit') {
      result = result.filter(item => item.bookmarked);
    } else if (currentTab === 'riwayat') {
      result = result.filter(item => viewHistory.includes(item.id));
    }

    // Filter by Level
    if (selectedLevel !== 'ALL') {
      result = result.filter(item => item.level.toUpperCase() === selectedLevel.toUpperCase());
    }

    // Filter by Type
    if (selectedType !== 'all') {
      result = result.filter(item => item.type === selectedType);
    }

    // Search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.level.toLowerCase().includes(q) ||
        item.typeLabel.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'popular') {
      result.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'downloads') {
      result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sortBy === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [materials, selectedLevel, selectedType, searchQuery, sortBy, currentTab, viewHistory]);

  const displayedMaterials = useMemo(() => {
    return filteredMaterials.slice(0, visibleCount);
  }, [filteredMaterials, visibleCount]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(prev => prev + 3);
      setIsLoadingMore(false);
      addToast('info', 'Materi Diperbarui', 'Menampilkan lebih banyak modul edukasi keselamatan POLRI.');
    }, 400);
  };

  // Group displayed items into featured, standard, and compact to maintain layout harmony
  const featuredItem = displayedMaterials.find(m => m.size === 'featured') || (displayedMaterials.length > 0 ? displayedMaterials[0] : null);
  const remainingItems = displayedMaterials.filter(m => m.id !== featuredItem?.id);
  
  // Standard cards (e.g. Cyberbullying & Narkoba)
  const standardItems = remainingItems.filter(m => m.size === 'standard' || m.type === 'infografis' || m.type === 'modul');
  
  // Compact cards (bottom horizontal cards)
  const compactItems = remainingItems.filter(m => !standardItems.some(s => s.id === m.id));

  return (
    <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen flex antialiased">
      {/* Side Navigation Bar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-[260px] min-h-screen flex flex-col">
        {/* Sticky Top Header */}
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onSelectMaterialById={(id) => {
            const found = materials.find(m => m.id === id);
            if (found) handleOpenMaterial(found);
          }}
        />

        {/* Main Content Body */}
        <main className="flex-1 mt-16 p-4 md:p-12 space-y-8 max-w-[1440px] mx-auto w-full">
          {/* Header Banner info if in special tab */}
          {currentTab === 'jenjang' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center space-x-2.5 mb-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-headline font-bold text-lg text-slate-900">Pilih Jenjang Pendidikan</h3>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Pilih jenjang sekolah untuk menyaring kurikulum edukasi keselamatan yang sesuai dengan tahapan usia peserta didik.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { lvl: 'TK/PAUD' as EducationLevel, label: 'TK / PAUD', desc: 'Usia Dini & Pengenalan', color: 'border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:bg-emerald-100/70' },
                  { lvl: 'SD' as EducationLevel, label: 'Sekolah Dasar (SD)', desc: 'Etika & Rambu Lalu Lintas', color: 'border-red-200 bg-red-50/60 text-red-950 hover:bg-red-100/70' },
                  { lvl: 'SMP' as EducationLevel, label: 'Sekolah Menengah Pertama', desc: 'Etika Siber & Bullying', color: 'border-blue-200 bg-blue-50/60 text-blue-950 hover:bg-blue-100/70' },
                  { lvl: 'SMA' as EducationLevel, label: 'SMA / SMK / Sederajat', desc: 'Anti Narkoba & SIM C', color: 'border-slate-300 bg-slate-100 text-slate-950 hover:bg-slate-200/70' },
                ].map((item) => (
                  <button
                    key={item.lvl}
                    onClick={() => setSelectedLevel(item.lvl)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${item.color} ${selectedLevel === item.lvl ? 'ring-2 ring-[#0a1d37]' : ''}`}
                  >
                    <span className="font-bold text-xs block">{item.label}</span>
                    <span className="text-[11px] opacity-75 mt-0.5 block">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'favorit' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-bold text-sm text-amber-950">Materi Favorit Tersimpan</h3>
                  <p className="text-xs text-amber-800">Daftar panduan keselamatan yang telah Anda tandai untuk akses cepat.</p>
                </div>
              </div>
              <button
                onClick={() => handleSelectTab('katalog')}
                className="text-xs text-blue-700 font-semibold hover:underline"
              >
                Lihat Semua Katalog
              </button>
            </div>
          )}

          {currentTab === 'riwayat' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-blue-950">Riwayat Pembelajaran Terakhir</h3>
                <p className="text-xs text-blue-800">Lanjutkan materi edukasi yang baru saja Anda buka.</p>
              </div>
              <button
                onClick={() => handleSelectTab('katalog')}
                className="text-xs text-blue-700 font-semibold hover:underline"
              >
                Katalog Lengkap
              </button>
            </div>
          )}

          {/* Page Header & Filter Controls */}
          <FilterBar
            currentLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            currentType={selectedType}
            onSelectType={setSelectedType}
            sortBy={sortBy}
            onSelectSort={setSortBy}
            totalMaterialsCount={filteredMaterials.length}
          />

          {/* Empty State */}
          {filteredMaterials.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <SearchX className="w-8 h-8" />
              </div>
              <h3 className="font-headline text-lg font-bold text-slate-800 mb-1">
                Materi Tidak Ditemukan
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Tidak ada materi keselamatan yang sesuai dengan kata kunci atau filter yang Anda pilih.
              </p>
              <button
                onClick={() => {
                  setSelectedLevel('ALL');
                  setSelectedType('all');
                  setSearchQuery('');
                }}
                className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          )}

          {/* Bento Grid Content */}
          {filteredMaterials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Featured 8-Column Card (Pedoman Keselamatan Berlalu Lintas untuk Anak Usia Dini) */}
              {featuredItem && (
                <MaterialCardFeatured
                  material={featuredItem}
                  onOpen={handleOpenMaterial}
                  onToggleBookmark={handleToggleBookmark}
                />
              )}

              {/* Standard 4-Column Cards (Cyberbullying & Narkoba) */}
              {standardItems.map((item) => (
                <MaterialCardStandard
                  key={item.id}
                  material={item}
                  onOpen={handleOpenMaterial}
                  onToggleBookmark={handleToggleBookmark}
                  onDownloadAction={(id, e) => handleDownload(id, e)}
                />
              ))}

              {/* Compact 4-Column Horizontal Cards (Polisi Sahabat Anak, Kuis, Bersepeda) */}
              {compactItems.map((item) => (
                <MaterialCardCompact
                  key={item.id}
                  material={item}
                  onOpen={handleOpenMaterial}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredMaterials.length && (
            <div className="flex justify-center pt-8 pb-4">
              <button
                id="btn-load-more"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-3 border-2 border-[#0a1d37] text-[#0a1d37] hover:bg-[#0a1d37] hover:text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2.5 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingMore ? 'animate-spin' : ''}`} />
                <span>{isLoadingMore ? 'Memuat Konten...' : 'Muat Lebih Banyak'}</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Interactive Learn & Quiz Modal */}
      {activeMaterial && (
        <LearnModal
          material={activeMaterial}
          onClose={() => setActiveMaterial(null)}
          onToggleBookmark={handleToggleBookmark}
          onDownload={handleDownload}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-headline text-lg font-bold text-slate-900">Pusat Bantuan & Layanan POLRI</h3>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900 text-sm mb-1">Layanan Kontak Darurat 110</h4>
                <p className="text-blue-800">Hubungi layanan kepolisian bebas pulsa 24 jam untuk laporan kedaruratan atau konsultasi kamtibmas.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Cara Mengakses & Mengunduh Materi</h4>
                <p>Klik tombol "Mulai Belajar" atau "Lihat" pada modul untuk membuka video interaktif, rangkuman, kuis, dan mengunduh berkas PDF resmi.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Sertifikasi & Evaluasi Siswa</h4>
                <p>Kerjakan kuis 15 butir soal di setiap modul untuk menguji pemahaman dan mendapatkan status kelulusan materi keselamatan.</p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="bg-[#0a1d37] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-headline text-lg font-bold text-slate-900">Tentang E-Learning Safety Education</h3>
              <button 
                onClick={() => setShowAboutModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Platform <strong>E-Learning Safety Education POLRI</strong> merupakan inisiatif digital nasional dari <strong>Korlantas POLRI</strong> dan <strong>Ditbinmas POLRI</strong> untuk menanamkan budaya tertib berlalu lintas, kesadaran keamanan digital, serta pencegahan kenakalan remaja sejak dini.
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <p><strong>Penyelenggara:</strong> Kepolisian Negara Republik Indonesia</p>
                <p><strong>Sasaran:</strong> Peserta Didik TK/PAUD, SD, SMP, SMA & Pengajar</p>
                <p><strong>Versi Sistem:</strong> v2.4.0-Production (2026)</p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAboutModal(false)}
                className="bg-[#0a1d37] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
