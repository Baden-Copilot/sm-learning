import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Download,
  Bookmark,
  Check,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Edit,
  Trash2,
  RotateCcw,
  FileText,
  Video,
  Layers,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { MaterialItem, CourseLesson } from '../types';

interface CourseDetailPageProps {
  material: MaterialItem;
  allMaterials?: MaterialItem[];
  onBack: () => void;
  onStartLearning: (material: MaterialItem) => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onDownload?: (id: string, e?: React.MouseEvent) => void;
  onOpenRelatedCourse?: (material: MaterialItem) => void;
  onEdit?: (material: MaterialItem) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  /**
   * A supervisor opens a module to inspect what is being taught, not to enrol in
   * it. Same content, wording that matches the intent.
   */
  reviewMode?: boolean;
  /**
   * Override progress when accessed via public/guest portal from localStorage.
   */
  guestProgressOverride?: {
    progressPercent: number;
    isCompleted: boolean;
    completedLessonIds: string[];
  } | null;
}

export function CourseDetailPage({
  material,
  allMaterials = [],
  onBack,
  onStartLearning,
  onToggleBookmark,
  onDownload,
  onOpenRelatedCourse,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  reviewMode = false,
  guestProgressOverride,
}: CourseDetailPageProps) {
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  // Status & Progress calculation (Support guest override when in public/guest mode)
  const isGuestMode = guestProgressOverride !== undefined;
  const progress = isGuestMode
    ? (guestProgressOverride?.progressPercent || 0)
    : (material.progressPercent || 0);
  const isCompleted = isGuestMode
    ? Boolean(guestProgressOverride?.isCompleted)
    : (progress === 100 || material.status === 'completed');
  const isInProgress = progress > 0 && progress < 100;

  // Curriculum Lessons Resolution
  const hasCustomModules = Boolean(material.modules && material.modules.length > 0);
  const modules = hasCustomModules ? material.modules! : [];
  const allLessons: CourseLesson[] = hasCustomModules
    ? modules.flatMap(m => m.lessons)
    : [];

  const guestCompletedIds = guestProgressOverride?.completedLessonIds || [];
  const totalLessons = allLessons.length;
  const completedLessonsCount = isGuestMode
    ? allLessons.filter(l => guestCompletedIds.includes(l.id)).length
    : allLessons.filter(l => l.isCompleted).length;

  // Active / Current Lesson
  const currentLesson = isGuestMode
    ? (allLessons.find(l => !guestCompletedIds.includes(l.id)) || allLessons[0] || null)
    : (allLessons.find(l => !l.isCompleted) || allLessons[0] || null);
  const currentLessonIndex = allLessons.findIndex(l => !l.isCompleted);

  // Fallback metadata tags
  const durationText = material.duration || material.readTime || (material.estimatedHours ? `${material.estimatedHours} Jam` : null);

  // Related Learning based on real data
  const relatedCourses = allMaterials
    .filter(m => m.id !== material.id && (m.level === material.level || m.type === material.type))
    .slice(0, 3);

  return (
    <div className="space-y-10 pb-24 max-w-5xl mx-auto font-sans">
      {/* 1. BREADCRUMB & MANAGEMENT ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isGuestMode ? 'Portal Edukasi' : 'Learning'}</span>
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-600">{material.level}</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-900 font-bold truncate max-w-xs">{material.title}</span>
        </nav>

        {/* Action Controls: Bookmark, Download & Management (RBAC) */}
        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(material)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Materi</span>
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Hapus</span>
            </button>
          )}

          <button
            onClick={(e) => onToggleBookmark(material.id, e)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              material.bookmarked
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${material.bookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            <span>{material.bookmarked ? 'Tersimpan' : 'Simpan'}</span>
          </button>

          {material.downloadSize && onDownload && (
            <button
              onClick={(e) => onDownload(material.id, e)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh ({material.downloadSize})</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. COURSE HERO & SUMMARY */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left: Professional Thumbnail Cover */}
          <div className="md:col-span-5 w-full">
            <div className="w-full h-52 sm:h-64 rounded-2xl overflow-hidden relative shadow-inner bg-slate-100 border border-slate-200/60 group">
              <img
                src={material.imageUrl}
                alt={material.imageAlt || material.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div
                onClick={() => onStartLearning(material)}
                className="absolute inset-0 bg-black/25 flex items-center justify-center cursor-pointer hover:bg-black/35 transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-white/95 text-[#0a1d37] flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-[#0a1d37] ml-1" />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Course Title, Metadata & Action */}
          <div className="md:col-span-7 space-y-4">
            {/* Format & Classification Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-[#0a1d37] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {material.level}
              </span>
              <span className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {material.typeLabel}
              </span>
              {material.author && (
                <span className="text-slate-500 text-xs">
                  • Oleh {material.author}
                </span>
              )}
            </div>

            {/* Course Title & Short Description */}
            <div className="space-y-2">
              <h1 className="font-headline text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">
                {material.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {material.summary || material.description}
              </p>
            </div>

            {/* Clean Real Metadata Row */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              {durationText && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{durationText}</span>
                </div>
              )}
              {hasCustomModules && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span>{totalLessons} Materi & Evaluasi</span>
                </div>
              )}
              {material.certificationAvailable && (
                <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Sertifikat Resmi</span>
                </div>
              )}
            </div>

            {/* Progress Bar (Only show if started or completed, and not in review mode) */}
            {!reviewMode && (isInProgress || isCompleted) && (
              <div className="pt-2 space-y-1.5 border-t border-slate-100">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">Progres Belajar Anda:</span>
                  <span className={isCompleted ? 'text-emerald-600' : 'text-blue-600 font-bold'}>
                    {isCompleted ? '100% (Telah Selesai)' : `${progress}% Selesai`}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Spotlight Last Activity (If In Progress, and not in review mode) */}
            {!reviewMode && isInProgress && currentLesson && (
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">
                  Lanjutkan dari:
                </span>
                <p className="font-bold text-slate-900 truncate">
                  {currentLesson.title}
                </p>
                <span className="text-[11px] text-slate-500 block">
                  {completedLessonsCount} dari {totalLessons} materi terselesaikan
                </span>
              </div>
            )}

            {/* PRIMARY CTA (Responsive & Contextual) */}
            <div className="pt-2">
              <button
                onClick={() => onStartLearning(material)}
                className="w-full sm:w-auto min-w-[220px] bg-[#0a1d37] hover:bg-[#162c4e] text-white py-3 px-6 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                {reviewMode ? (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Tinjau Isi Materi</span>
                  </>
                ) : isCompleted ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Lihat Kembali</span>
                  </>
                ) : isInProgress ? (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Lanjutkan Belajar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Mulai Belajar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OVERVIEW / TENTANG PEMBELAJARAN */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900">
          Tentang Pembelajaran
        </h2>
        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3">
          <p>{material.description}</p>
          {material.summary && material.summary !== material.description && (
            <p>{material.summary}</p>
          )}
          <p className="text-slate-500 text-xs">
            Materi disusun oleh Korps Lalu Lintas Kepolisian Negara Republik Indonesia (Korlantas POLRI) guna memberikan panduan terstandar mengenai keselamatan dan etika berlalu lintas di jalan raya.
          </p>
        </div>
      </section>

      {/* 4. LEARNING OBJECTIVES / YANG AKAN DIPELAJARI (Only if exists) */}
      {material.keyPoints && material.keyPoints.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Yang Akan Dipelajari
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {material.keyPoints.map((point, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">{point}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CURRICULUM / MATERI PEMBELAJARAN */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900">
              Materi Pembelajaran
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasCustomModules
                ? `${modules.length} Modul • ${totalLessons} Pelajaran & Evaluasi`
                : 'Materi ini dapat langsung dipelajari secara mandiri.'}
            </p>
          </div>
          {hasCustomModules && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {completedLessonsCount} / {totalLessons} Selesai
            </span>
          )}
        </div>

        {hasCustomModules ? (
          <div className="space-y-4">
            {modules.map((mod, modIdx) => (
              <div key={mod.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 font-bold text-xs text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0a1d37] text-white flex items-center justify-center text-[10px] font-bold">
                      {modIdx + 1}
                    </span>
                    <span>{mod.title}</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">{mod.lessons.length} Pelajaran</span>
                </div>

                <div className="divide-y divide-slate-100 bg-white">
                  {mod.lessons.map((lesson) => {
                    const isLessonDone = isGuestMode
                      ? guestCompletedIds.includes(lesson.id)
                      : (lesson.isCompleted || isCompleted);
                    const isLessonCurrent = isInProgress && currentLesson?.id === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => onStartLearning(material)}
                        className={`px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isLessonCurrent ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isLessonDone ? (
                            <span title="Completed"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /></span>
                          ) : isLessonCurrent ? (
                            <span title="Current Lesson"><Play className="w-4 h-4 text-blue-600 fill-blue-600 shrink-0" /></span>
                          ) : (
                            <span title="Not Started"><div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" /></span>
                          )}
                          <span className={`text-xs truncate ${isLessonCurrent ? 'font-bold text-blue-900' : 'text-slate-800 font-medium'}`}>
                            {lesson.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-slate-400 shrink-0 ml-3">
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {lesson.type}
                          </span>
                          {lesson.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span className="text-[11px]">{lesson.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-slate-500" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">{material.title}</h4>
                <p className="text-[11px] text-slate-500">Materi ini disajikan dalam format {material.typeLabel}.</p>
              </div>
            </div>
            <button
              onClick={() => onStartLearning(material)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {reviewMode ? 'Tinjau Materi →' : 'Mulai Belajar →'}
            </button>
          </div>
        )}
      </section>

      {/* 6. RELATED LEARNING / MATERI TERKAIT (Only if available) */}
      {relatedCourses.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="font-headline text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Materi Terkait
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedCourses.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onOpenRelatedCourse ? onOpenRelatedCourse(rel) : onBack()}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
              >
                <div className="h-28 rounded-xl overflow-hidden bg-slate-100 relative">
                  <img src={rel.imageUrl} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute top-2 left-2 bg-[#0a1d37] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    {rel.level}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block">{rel.typeLabel}</span>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors mt-0.5">
                    {rel.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{rel.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* DELETE CONFIRMATION DIALOG (RBAC) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Hapus Materi Pembelajaran?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Materi <strong>"{material.title}"</strong> akan dihapus secara permanen dari katalog dan silabus.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  if (onDelete) onDelete(material.id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
