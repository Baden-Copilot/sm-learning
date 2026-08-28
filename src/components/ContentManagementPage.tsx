import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Eye,
  Download,
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
  Video,
  FileText,
  BarChart3,
  CheckSquare,
  Sparkles,
  Award,
  Clock,
  RotateCcw,
  Users,
  TrendingUp,
  AlertTriangle,
  Play
} from 'lucide-react';
import { MaterialItem, EducationLevel, MaterialType } from '../types';

interface ContentManagementPageProps {
  materials: MaterialItem[];
  onAddNewMaterial: () => void;
  onEditMaterial: (material: MaterialItem) => void;
  onDeleteMaterial: (id: string) => void;
  onOpenCourseDetail: (material: MaterialItem) => void;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export function ContentManagementPage({
  materials,
  onAddNewMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onOpenCourseDetail,
  canAdd,
  canEdit,
  canDelete,
}: ContentManagementPageProps) {
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 1. Real Data Calculations for Trainer Metrics
  const totalContent = materials.length;
  const publishedCount = materials.filter(m => (m.publishStatus || 'published') === 'published').length;
  const draftCount = materials.filter(m => m.publishStatus === 'draft').length;
  const archivedCount = materials.filter(m => m.publishStatus === 'archived').length;

  const videoCount = materials.filter(m => m.type === 'video').length;
  const docCount = materials.filter(m => m.type === 'modul' || m.type === 'artikel').length;
  const infographicCount = materials.filter(m => m.type === 'infografis').length;
  const quizCount = materials.filter(m => (m.quiz && m.quiz.length > 0) || m.type === 'kuis').length;

  const totalViews = materials.reduce((acc, m) => acc + (m.views || 0), 0);
  const totalDownloads = materials.reduce((acc, m) => acc + (m.downloads || 0), 0);

  // 2. Filtered Dataset
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      // Status filter
      const status = m.publishStatus || 'published';
      const matchStatus = activeStatusFilter === 'all' || status === activeStatusFilter;

      // Type / Tab filter
      const matchType =
        activeTypeFilter === 'all' ||
        (activeTypeFilter === 'video' && m.type === 'video') ||
        (activeTypeFilter === 'modul' && (m.type === 'modul' || m.type === 'artikel')) ||
        (activeTypeFilter === 'infografis' && m.type === 'infografis') ||
        (activeTypeFilter === 'kuis' && ((m.quiz && m.quiz.length > 0) || m.type === 'kuis'));

      // Level filter
      const matchLevel = selectedLevel === 'ALL' || m.level === selectedLevel;

      // Search Query
      const matchSearch =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.level.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.author && m.author.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchStatus && matchType && matchLevel && matchSearch;
    });
  }, [materials, activeStatusFilter, activeTypeFilter, selectedLevel, searchQuery]);

  const targetToDelete = materials.find(m => m.id === deleteTargetId);

  return (
    <div className="space-y-8 pb-24 max-w-6xl mx-auto font-sans">
      {/* 1. TRAINER WORKSPACE HERO & QUICK ACTIONS */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Trainer & Content Authoring Workspace</span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Kelola Konten & Modul Pembelajaran
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ruang kerja instruktur dan trainer Dikmas Lantas POLRI untuk menyusun silabus kurikulum, memperbarui materi video/dokumen, mengelola butir kuis, dan memantau interaksi pembelajaran peserta didik.
            </p>
          </div>

          {canAdd && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onAddNewMaterial}
                className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Materi Baru</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 2. REAL CONTENT METRICS & ENGAGEMENT OVERVIEW */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Modul</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalContent}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Kuis Terdaftar</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{quizCount} Modul</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Views</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalViews.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Unduhan</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalDownloads.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* 3. TABS, SEARCH & JENJANG FILTER */}
      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
          {[
            { id: 'all', label: 'Semua Konten', count: totalContent, icon: Layers },
            { id: 'video', label: 'Video Pembelajaran', count: videoCount, icon: Video },
            { id: 'modul', label: 'Modul PDF & Dokumen', count: docCount, icon: FileText },
            { id: 'infografis', label: 'Infografis', count: infographicCount, icon: BookOpen },
            { id: 'kuis', label: 'Evaluasi & Kuis', count: quizCount, icon: CheckSquare },
          ].map((tab) => {
            const isActive = activeTypeFilter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTypeFilter(tab.id)}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0a1d37] text-white shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-300' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul, topik, atau penyusun..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Status:</span>
              <select
                value={activeStatusFilter}
                onChange={(e) => setActiveStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="all">Semua Status ({totalContent})</option>
                <option value="published">🟢 Terbit / Published ({publishedCount})</option>
                <option value="draft">🟡 Draft ({draftCount})</option>
                <option value="archived">⚪ Diarsipkan / Archived ({archivedCount})</option>
              </select>
            </div>

            {/* Jenjang Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Jenjang:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="ALL">Semua Jenjang</option>
                <option value="TK/PAUD">TK/PAUD</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CONTENT TABLE & MOBILE CARDS (MANAGEMENT VIEW) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Tidak Ada Materi yang Sesuai</h3>
            <p className="text-xs text-slate-500">
              Ubah kata kunci pencarian atau reset filter kategori jenjang pembelajaran.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLevel('ALL');
                setActiveTypeFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card List View (Visible on screens < md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredMaterials.map((mat) => {
                const hasQuiz = mat.quiz && mat.quiz.length > 0;
                const pubStatus = mat.publishStatus || 'published';
                return (
                  <div key={`mob-${mat.id}`} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60">
                        <img
                          src={mat.imageUrl}
                          alt={mat.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#0a1d37] text-white">
                            {mat.level}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {mat.typeLabel}
                          </span>
                          {pubStatus === 'published' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Published
                            </span>
                          )}
                          {pubStatus === 'draft' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Draft
                            </span>
                          )}
                          {pubStatus === 'archived' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Archived
                            </span>
                          )}
                        </div>
                        <h4
                          onClick={() => onOpenCourseDetail(mat)}
                          className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-blue-600 cursor-pointer"
                        >
                          {mat.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <span>{mat.views.toLocaleString()} views</span>
                        <span>•</span>
                        <span>{mat.downloads || 0} unduhan</span>
                      </div>
                      <div>
                        {hasQuiz ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {mat.quiz!.length} Soal
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Tanpa Kuis</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => onOpenCourseDetail(mat)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </button>

                      {canEdit && (
                        <button
                          onClick={() => onEditMaterial(mat)}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => setDeleteTargetId(mat.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="px-6 py-4">Materi & Silabus</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Jenjang</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Interaksi (Views / Unduhan)</th>
                    <th className="px-6 py-4">Evaluasi Kuis</th>
                    <th className="px-6 py-4">Penyusun</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.map((mat) => {
                    const hasQuiz = mat.quiz && mat.quiz.length > 0;
                    const pubStatus = mat.publishStatus || 'published';
                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Title & Cover */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60">
                              <img
                                src={mat.imageUrl}
                                alt={mat.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p
                                onClick={() => onOpenCourseDetail(mat)}
                                className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-xs sm:max-w-sm"
                              >
                                {mat.title}
                              </p>
                              <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                                {mat.summary || mat.description}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            {pubStatus === 'published' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Published
                              </span>
                            )}
                            {pubStatus === 'draft' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Draft
                              </span>
                            )}
                            {pubStatus === 'archived' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Archived
                              </span>
                            )}

                            {mat.publicAccess === 'restricted' ? (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                🔒 Hanya Sesi Trainer
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                🌐 Terbuka Publik
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Jenjang */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#0a1d37] text-white">
                            {mat.level}
                          </span>
                        </td>

                        {/* Format */}
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {mat.typeLabel}
                        </td>

                        {/* Views & Downloads */}
                        <td className="px-6 py-4 text-slate-600">
                          <div className="font-bold text-slate-800">{mat.views.toLocaleString()} views</div>
                          <div className="text-[11px] text-slate-400">{mat.downloads || 0} unduhan</div>
                        </td>

                        {/* Quiz info */}
                        <td className="px-6 py-4">
                          {hasQuiz ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {mat.quiz!.length} Soal Aktif
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Tanpa Kuis</span>
                          )}
                        </td>

                        {/* Author */}
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {mat.author || 'Korlantas POLRI'}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenCourseDetail(mat)}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Pratinjau Kursus"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {canEdit && (
                              <button
                                onClick={() => onEditMaterial(mat)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                                title="Edit Modul & Silabus"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => setDeleteTargetId(mat.id)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                                title="Hapus Modul"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* DELETE CONFIRMATION DIALOG (RBAC) */}
      {deleteTargetId && targetToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Hapus Modul Pembelajaran?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Materi <strong>"{targetToDelete.title}"</strong> akan dihapus permanen dari kurikulum dan katalog.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteMaterial(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
