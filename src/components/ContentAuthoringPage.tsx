import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Video,
  FileText,
  BarChart3,
  CheckSquare,
  Sparkles,
  Layers,
  Clock,
  Award,
  Plus,
  Trash2,
  HelpCircle,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Check,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { MaterialItem, EducationLevel, MaterialType, CourseModule, QuizQuestion } from '../types';
import { QuizBuilder } from './QuizBuilder';

interface ContentAuthoringPageProps {
  initialData?: MaterialItem | null;
  onBack: () => void;
  onSave: (material: Partial<MaterialItem>, isDraft?: boolean) => void;
  isReadOnly?: boolean;
}

type AuthoringStep = 'basic' | 'content' | 'settings' | 'classification' | 'preview';

export function ContentAuthoringPage({
  initialData,
  onBack,
  onSave,
  isReadOnly = false,
}: ContentAuthoringPageProps) {
  // Current active step
  const [currentStep, setCurrentStep] = useState<AuthoringStep>('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<MaterialItem>>(() => {
    if (initialData) return { publishStatus: 'published', ...initialData };
    return {
      title: '',
      level: 'SD',
      type: 'video',
      typeLabel: 'Video Edukasi',
      badgeTag: 'SD',
      publishStatus: 'draft',
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
      imageAlt: 'Materi Edukasi POLRI',
      metadataText: '10 Menit',
      author: 'Korlantas POLRI',
      summary: '',
      downloadSize: '15.4 MB (PDF)',
      featured: false,
      size: 'standard',
      estimatedHours: 1.0,
      certificationAvailable: true,
      duration: '10:00',
      keyPoints: [
        'Memahami aturan keselamatan dan ketertiban berlalu lintas dasar',
        'Etika dan kewaspadaan pejalan kaki serta pengguna jalan',
        'Pencegahan potensi risiko kecelakaan sejak usia dini'
      ],
      modules: [
        {
          id: 'mod-1',
          title: 'Modul 1: Pengenalan Materi Dasar',
          lessons: [
            { id: 'les-1-1', title: 'Pengantar Keselamatan Lalu Lintas', duration: '03:30', type: 'video', isCompleted: false },
            { id: 'les-1-2', title: 'Panduan Etika & Kewaspadaan Lapangan', duration: '04:00', type: 'reading', isCompleted: false }
          ]
        }
      ],
      quiz: [
        {
          id: 1,
          question: 'Apa tindakan utama saat melihat lampu lalu lintas menyala kuning?',
          options: [
            'Mempercepat laju kendaraan',
            'Berhati-hati dan bersiap berhenti dengan aman',
            'Membunyikan klakson panjang',
            'Mematikan mesin kendaraan di tempat'
          ],
          correctIndex: 1,
          explanation: 'Lampu kuning adalah sinyal peringatan untuk bersiap berhenti secara aman sebelum lampu merah menyala.'
        }
      ]
    };
  });

  // Track modification
  const handleFieldChange = (field: keyof MaterialItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Type Change
  const handleTypeChange = (type: MaterialType) => {
    const labels: Record<MaterialType, string> = {
      all: 'Semua Format',
      video: 'Video Edukasi',
      infografis: 'Infografis & Visual',
      modul: 'Modul Pembelajaran (PDF)',
      kuis: 'Kuis & Evaluasi Interaktif',
      artikel: 'Artikel & Panduan Teks',
    };
    setFormData(prev => ({
      ...prev,
      type,
      typeLabel: labels[type] || 'Materi Pembelajaran',
    }));
    setHasUnsavedChanges(true);
  };

  // Level Change
  const handleLevelChange = (level: EducationLevel) => {
    if (level === 'ALL') return;
    setFormData(prev => ({
      ...prev,
      level,
      badgeTag: level,
    }));
    setHasUnsavedChanges(true);
  };

  // Key Points management
  const handleAddKeyPoint = () => {
    const current = formData.keyPoints || [];
    handleFieldChange('keyPoints', [...current, 'Poin kompetensi keselamatan baru...']);
  };

  const handleUpdateKeyPoint = (index: number, text: string) => {
    const current = [...(formData.keyPoints || [])];
    current[index] = text;
    handleFieldChange('keyPoints', current);
  };

  const handleDeleteKeyPoint = (index: number) => {
    const current = (formData.keyPoints || []).filter((_, i) => i !== index);
    handleFieldChange('keyPoints', current);
  };

  // Module & Lesson management
  const handleAddModule = () => {
    const current = formData.modules || [];
    const newMod: CourseModule = {
      id: `mod-${Date.now()}`,
      title: `Modul ${current.length + 1}: Silabus Pembelajaran`,
      lessons: [
        {
          id: `les-${Date.now()}-1`,
          title: 'Pelajaran 1',
          duration: '05:00',
          type: formData.type === 'video' ? 'video' : 'reading',
          isCompleted: false,
        }
      ]
    };
    handleFieldChange('modules', [...current, newMod]);
  };

  const handleUpdateModuleTitle = (modIdx: number, title: string) => {
    const current = [...(formData.modules || [])];
    current[modIdx] = { ...current[modIdx], title };
    handleFieldChange('modules', current);
  };

  const handleDeleteModule = (modIdx: number) => {
    if ((formData.modules || []).length <= 1) {
      alert('Materi harus memiliki minimal 1 modul.');
      return;
    }
    const current = (formData.modules || []).filter((_, i) => i !== modIdx);
    handleFieldChange('modules', current);
  };

  const handleAddLesson = (modIdx: number) => {
    const current = [...(formData.modules || [])];
    const mod = current[modIdx];
    const newLesson = {
      id: `les-${Date.now()}-${mod.lessons.length + 1}`,
      title: `Pelajaran ${mod.lessons.length + 1}`,
      duration: '05:00',
      type: 'reading' as const,
      isCompleted: false,
    };
    current[modIdx] = { ...mod, lessons: [...mod.lessons, newLesson] };
    handleFieldChange('modules', current);
  };

  const handleUpdateLesson = (modIdx: number, lesIdx: number, field: string, value: any) => {
    const current = [...(formData.modules || [])];
    const mod = current[modIdx];
    const updatedLessons = [...mod.lessons];
    updatedLessons[lesIdx] = { ...updatedLessons[lesIdx], [field]: value };
    current[modIdx] = { ...mod, lessons: updatedLessons };
    handleFieldChange('modules', current);
  };

  const handleDeleteLesson = (modIdx: number, lesIdx: number) => {
    const current = [...(formData.modules || [])];
    const mod = current[modIdx];
    if (mod.lessons.length <= 1) {
      alert('Setiap modul harus memiliki minimal 1 pelajaran.');
      return;
    }
    current[modIdx] = { ...mod, lessons: mod.lessons.filter((_, i) => i !== lesIdx) };
    handleFieldChange('modules', current);
  };

  // Validation with actionable guidance
  const validateForm = () => {
    const errors: string[] = [];
    if (!formData.title?.trim()) {
      errors.push('Judul materi wajib diisi (contoh: "Etika Tertib Berlalu Lintas").');
    }
    if (!formData.description?.trim()) {
      errors.push('Deskripsi materi wajib diisi untuk memberikan ringkasan kompetensi bagi siswa.');
    }
    if (!formData.level) {
      errors.push('Jenjang pendidikan (TK/PAUD, SD, SMP, SMA) wajib dipilih.');
    }
    if (!formData.imageUrl?.trim()) {
      errors.push('Gambar cover / thumbnail materi wajib dipilih atau menggunakan preset.');
    }
    if (formData.type === 'kuis' && (!formData.quiz || formData.quiz.length === 0)) {
      errors.push('Materi format Kuis harus memiliki minimal 1 butir soal evaluasi beserta kunci jawaban.');
    }
    return errors;
  };

  const formErrors = validateForm();

  // Save / Publish
  const handleSave = (isDraft: boolean = false) => {
    const errors = validateForm();
    if (!isDraft && errors.length > 0) {
      alert(`Mohon lengkapi formulir sebelum mempublikasikan:\n- ${errors.join('\n- ')}`);
      return;
    }
    if (isDraft && !formData.title?.trim()) {
      alert('Judul materi wajib diisi untuk menyimpan draft.');
      return;
    }
    setIsSaving(true);
    const finalData = {
      ...formData,
      publishStatus: isDraft ? ('draft' as const) : ('published' as const),
    };
    setTimeout(() => {
      onSave(finalData, isDraft);
      setHasUnsavedChanges(false);
      setIsSaving(false);
    }, 300);
  };

  // Handle Safe Navigation Back
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  // Preset Covers
  const PRESET_COVERS = [
    { label: 'Edukasi Rambu & Polisi', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80' },
    { label: 'Siber & Digital Remaja', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80' },
    { label: 'Anti Narkoba & Hukum', url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80' },
    { label: 'Polisi Sahabat Anak', url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
    { label: 'Rambu Jalan Raya', url: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80' },
    { label: 'Bike to School', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80' },
  ];

  const STEPS: { id: AuthoringStep; label: string; number: number }[] = [
    { id: 'basic', label: 'Informasi Dasar', number: 1 },
    { id: 'content', label: 'Konten & Silabus', number: 2 },
    { id: 'settings', label: 'Pengaturan Belajar', number: 3 },
    { id: 'classification', label: 'Klasifikasi', number: 4 },
    { id: 'preview', label: 'Pratinjau Kursus', number: 5 },
  ];

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* 1. TOP AUTHORING TOOLBAR */}
      <header className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                {initialData ? 'Editor Silabus' : 'Authoring Workspace'}
              </span>
              {hasUnsavedChanges && (
                <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                  • Perubahan belum disimpan
                </span>
              )}
            </div>
            <h1 className="font-headline text-lg sm:text-xl font-bold text-slate-900 truncate mt-0.5">
              {formData.title?.trim() || (initialData ? 'Edit Materi Pembelajaran' : 'Buat Materi Pembelajaran Baru')}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || isReadOnly}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            Simpan Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || isReadOnly}
            className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Publikasikan Materi'}</span>
          </button>
        </div>
      </header>

      {/* 2. STEPPER NAVIGATION */}
      <nav className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0a1d37] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {step.number}
                </span>
                <span className="text-xs font-bold truncate">{step.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. STEP CONTENT AREA */}
      <main className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        {/* STEP 1: INFORMASI DASAR */}
        {currentStep === 'basic' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-base font-bold text-slate-900">
                1. Informasi Dasar Materi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tentukan judul, deskripsi umum, format media, dan jenjang pendidikan sasaran.
              </p>
            </div>

            {/* Judul Materi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Judul Modul Pembelajaran <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                disabled={isReadOnly}
                placeholder="Contoh: Pedoman Keselamatan Berlalu Lintas untuk Anak Usia Dini"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all shadow-2xs"
              />
              {!formData.title?.trim() && (
                <p className="text-[11px] text-amber-600 font-medium">Judul materi wajib diisi.</p>
              )}
            </div>

            {/* Deskripsi Singkat */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Deskripsi Singkat (Ringkasan Pengantar) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={isReadOnly}
                placeholder="Tuliskan gambaran umum materi keselamatan yang akan dipelajari siswa..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all shadow-2xs"
              />
            </div>

            {/* Format Materi & Jenjang Pendidikan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Format Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Format Media Pembelajaran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'video' as MaterialType, label: 'Video Pembelajaran', icon: Video },
                    { id: 'modul' as MaterialType, label: 'Modul PDF / Berkas', icon: FileText },
                    { id: 'infografis' as MaterialType, label: 'Infografis & Visual', icon: BarChart3 },
                    { id: 'kuis' as MaterialType, label: 'Kuis Evaluasi', icon: CheckSquare },
                  ].map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = formData.type === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleTypeChange(fmt.id)}
                        disabled={isReadOnly}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{fmt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jenjang Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Jenjang Pendidikan Sasaran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { lvl: 'TK/PAUD' as EducationLevel, label: 'TK / PAUD', sub: 'Usia Dini' },
                    { lvl: 'SD' as EducationLevel, label: 'Sekolah Dasar', sub: 'Dasar (SD)' },
                    { lvl: 'SMP' as EducationLevel, label: 'SMP / Sederajat', sub: 'Menengah Pertama' },
                    { lvl: 'SMA' as EducationLevel, label: 'SMA / SMK', sub: 'Menengah Atas' },
                  ].map((item) => {
                    const isSelected = formData.level === item.lvl;
                    return (
                      <button
                        key={item.lvl}
                        type="button"
                        onClick={() => handleLevelChange(item.lvl)}
                        disabled={isReadOnly}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0a1d37] border-[#0a1d37] text-white font-bold shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs block">{item.label}</span>
                        <span className={`text-[10px] block ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Thumbnail / Cover Image */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-800">
                Gambar Sampul / Thumbnail Kursus <span className="text-red-500">*</span>
              </label>

              {/* Input URL */}
              <input
                type="text"
                value={formData.imageUrl || ''}
                onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                disabled={isReadOnly}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
              />

              {/* Preset Quick Selection */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 font-medium block">Atau pilih dari koleksi gambar resmi POLRI:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {PRESET_COVERS.map((cov, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleFieldChange('imageUrl', cov.url)}
                      className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all aspect-video relative group ${
                        formData.imageUrl === cov.url ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={cov.url} alt={cov.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-1.5 text-[9px] text-white font-bold">
                        {cov.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: KONTEN PEMBELAJARAN & SILABUS */}
        {currentStep === 'content' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-base font-bold text-slate-900">
                2. Konten Silabus & Struktur Pembelajaran
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola bab silabus, video instruksional, dokumen modul, dan evaluasi kuis.
              </p>
            </div>

            {/* Video or Document Specific Settings */}
            {formData.type === 'video' && (
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Video className="w-4 h-4 text-blue-600" />
                  <span>Pengaturan Sumber Video Edukasi</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Video Stream URL</label>
                    <input
                      type="text"
                      value={formData.videoUrl || ''}
                      onChange={(e) => handleFieldChange('videoUrl', e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... atau link MP4"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Durasi Video</label>
                    <input
                      type="text"
                      value={formData.duration || '10:00'}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      placeholder="10:00"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.type === 'modul' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span>Pengaturan Berkas Dokumen PDF</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Ukuran Berkas Unduhan</label>
                    <input
                      type="text"
                      value={formData.downloadSize || '5.4 MB (PDF)'}
                      onChange={(e) => handleFieldChange('downloadSize', e.target.value)}
                      placeholder="5.4 MB (PDF)"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">Jumlah Halaman</label>
                    <input
                      type="number"
                      value={formData.pageCount || 10}
                      onChange={(e) => handleFieldChange('pageCount', Number(e.target.value))}
                      placeholder="10"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Rangkuman Komprehensif */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Ulasan & Rangkuman Materi Lengkap
              </label>
              <textarea
                rows={4}
                value={formData.summary || ''}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                disabled={isReadOnly}
                placeholder="Tuliskan rangkuman materi lengkap, undang-undang terkait, dan panduan keselamatan..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all shadow-2xs"
              />
            </div>

            {/* Module & Lessons Tree */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                  Struktur Bab & Pelajaran (Syllabus Hierarchy)
                </h3>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAddModule}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Bab / Modul</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(formData.modules || []).map((mod, modIdx) => (
                  <div key={mod.id || modIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={mod.title}
                        onChange={(e) => handleUpdateModuleTitle(modIdx, e.target.value)}
                        disabled={isReadOnly}
                        className="font-bold text-xs sm:text-sm text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex-1 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(modIdx)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Hapus Bab Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Lessons inside Module */}
                    <div className="space-y-2 pl-3 border-l-2 border-slate-200">
                      {mod.lessons.map((les, lesIdx) => (
                        <div key={les.id || lesIdx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {lesIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={les.title}
                            onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'title', e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Judul Pelajaran"
                            className="flex-1 bg-transparent border-none text-xs text-slate-800 focus:outline-hidden font-medium"
                          />
                          <select
                            value={les.type}
                            onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'type', e.target.value)}
                            disabled={isReadOnly}
                            className="bg-slate-50 border border-slate-200 text-[11px] rounded-lg px-2 py-1 text-slate-700"
                          >
                            <option value="video">Video</option>
                            <option value="reading">Bacaan</option>
                            <option value="infografis">Infografis</option>
                            <option value="quiz">Kuis</option>
                          </select>
                          <input
                            type="text"
                            value={les.duration || '05:00'}
                            onChange={(e) => handleUpdateLesson(modIdx, lesIdx, 'duration', e.target.value)}
                            disabled={isReadOnly}
                            placeholder="05:00"
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-center text-slate-700 focus:outline-hidden"
                          />
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(modIdx, lesIdx)}
                              className="text-slate-300 hover:text-red-500 p-1"
                              title="Hapus Pelajaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleAddLesson(modIdx)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 pt-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tambah Pelajaran ke Bab Ini</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quiz Builder Integration */}
            <div className="pt-4 border-t border-slate-200">
              <QuizBuilder
                questions={formData.quiz || []}
                onChange={(updatedQuiz) => handleFieldChange('quiz', updatedQuiz)}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        )}

        {/* STEP 3: PENGATURAN PEMBELAJARAN */}
        {currentStep === 'settings' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-base font-bold text-slate-900">
                3. Pengaturan Kompetensi & Sertifikasi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tentukan target capaian, estimasi waktu belajar, dan hak penerbitan sertifikat.
              </p>
            </div>

            {/* Estimasi Waktu Belajar & Instansi Pengampu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Estimasi Total Waktu Belajar (Jam)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.estimatedHours || 1.0}
                    onChange={(e) => handleFieldChange('estimatedHours', Number(e.target.value))}
                    disabled={isReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-xs text-slate-500 font-medium shrink-0">Jam</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Instansi Penyusun / Pengampu Materi
                </label>
                <input
                  type="text"
                  value={formData.author || 'Korlantas POLRI'}
                  onChange={(e) => handleFieldChange('author', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Korlantas POLRI & Kemendikbudristek"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Poin Kunci Kompetensi */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Poin Kunci Edukasi (Key Learning Competencies)
                </label>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={handleAddKeyPoint}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Poin Kompetensi</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(formData.keyPoints || []).map((pt, ptIdx) => (
                  <div key={ptIdx} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => handleUpdateKeyPoint(ptIdx, e.target.value)}
                      disabled={isReadOnly}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKeyPoint(ptIdx)}
                        className="text-slate-300 hover:text-red-500 p-1.5 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle Sertifikat */}
            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-purple-950">
                    Penerbitan Sertifikat Digital Otomatis
                  </h4>
                  <p className="text-[11px] text-purple-800">
                    Siswa yang menyelesaikan materi 100% dan lulus kuis akan menerima sertifikat berlisensi Korlantas POLRI.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={formData.certificationAvailable ?? true}
                onChange={(e) => handleFieldChange('certificationAvailable', e.target.checked)}
                disabled={isReadOnly}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STEP 4: KLASIFIKASI & METADATA */}
        {currentStep === 'classification' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline text-base font-bold text-slate-900">
                4. Klasifikasi & Penataan Tampilan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi badge visual dan prioritas penempatan kartu di beranda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Badge Tag */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Label Badge Tag
                </label>
                <input
                  type="text"
                  value={formData.badgeTag || formData.level || 'SD'}
                  onChange={(e) => handleFieldChange('badgeTag', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="SD / Prioritas Nasional / Pelajar"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Status Publish */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Status Publikasi Konten
                </label>
                <select
                  value={formData.publishStatus || 'published'}
                  onChange={(e) => handleFieldChange('publishStatus', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="published">🟢 Published (Terbit & Aktif)</option>
                  <option value="draft">🟡 Draft (Konsep & Internal)</option>
                  <option value="archived">⚪ Archived (Diarsipkan & Nonaktif)</option>
                </select>
              </div>

              {/* Public Access Control */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Akses Portal Publik Masyarakat
                </label>
                <select
                  value={formData.publicAccess || 'allowed'}
                  onChange={(e) => handleFieldChange('publicAccess', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="allowed">🌐 Allowed (Boleh Diakses Terbuka oleh Masyarakat)</option>
                  <option value="restricted">🔒 Restricted (Hanya Internal / Sesi Khusus Trainer)</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  Jika "Allowed" dan status "Published", materi akan otomatis tampil di Portal Edukasi Publik.
                </p>
              </div>

              {/* Ukuran & Tipe Tampilan Card */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Ukuran Tampilan Card di Beranda
                </label>
                <select
                  value={formData.size || 'standard'}
                  onChange={(e) => handleFieldChange('size', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="standard">Standard Card (Grid Menengah)</option>
                  <option value="featured">Featured Spotlight Card (Ukuran Besar)</option>
                  <option value="compact">Compact Card (Horizontal Ringkas)</option>
                </select>
              </div>
            </div>

            {/* Featured toggle */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                    Jadikan Materi Unggulan (Featured Recommendation)
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Materi akan diprioritaskan tampil di deretan rekomendasi utama beranda portal.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={formData.featured || false}
                onChange={(e) => handleFieldChange('featured', e.target.checked)}
                disabled={isReadOnly}
                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STEP 5: PRATINJAU KURSUS (PREVIEW AS LEARNER) */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-base font-bold text-slate-900">
                  5. Pratinjau Tampilan Peserta Didik
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tampilan nyata yang akan dilihat oleh siswa dan instruktur saat mengakses kursus ini.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Siap Dipublikasikan</span>
              </span>
            </div>

            {/* Course Detail Hero Mockup */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#0a1d37] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Jenjang {formData.level}
                </span>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  {formData.typeLabel}
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-slate-600 text-xs font-medium">{formData.author}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-3">
                  <h3 className="font-headline text-xl sm:text-2xl font-bold text-slate-900">
                    {formData.title || 'Judul Materi Belum Diisi'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {formData.description || 'Deskripsi materi belum diisi...'}
                  </p>

                  {formData.keyPoints && formData.keyPoints.length > 0 && (
                    <div className="space-y-2 pt-3">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Kompetensi Utama:
                      </h4>
                      <div className="space-y-1.5">
                        {formData.keyPoints.map((pt, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-white">
                  <img
                    src={formData.imageUrl}
                    alt={formData.title}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Estimasi Belajar:</span>
                      <strong className="text-slate-800">{formData.estimatedHours || 1.0} Jam</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Total Modul:</span>
                      <strong className="text-slate-800">{(formData.modules || []).length} Bab</strong>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Evaluasi Kuis:</span>
                      <strong className="text-slate-800">{(formData.quiz || []).length} Soal</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. BOTTOM STEPPER CONTROLS */}
      <footer className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const idx = STEPS.findIndex(s => s.id === currentStep);
            if (idx > 0) setCurrentStep(STEPS[idx - 1].id);
          }}
          disabled={currentStep === 'basic'}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Langkah Sebelumnya</span>
        </button>

        <div className="flex items-center gap-2">
          {currentStep !== 'preview' ? (
            <button
              type="button"
              onClick={() => {
                const idx = STEPS.findIndex(s => s.id === currentStep);
                if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id);
              }}
              className="bg-[#0a1d37] hover:bg-[#162c4e] text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>Lanjut ke {STEPS[STEPS.findIndex(s => s.id === currentStep) + 1]?.label}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving || isReadOnly}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Publikasikan Modul Sekarang</span>
            </button>
          )}
        </div>
      </footer>

      {/* UNSAVED CHANGES MODAL */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Perubahan Belum Disimpan</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda memiliki perubahan pada modul yang belum disimpan. Apakah Anda ingin membuang perubahan atau kembali melanjutkan penyuntingan?
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Lanjut Mengedit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  onBack();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Buang Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
