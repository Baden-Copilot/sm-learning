import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  BookOpen,
  CheckSquare,
  FileText,
  BarChart3,
  Download,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Award,
  Clock,
  Menu,
  X,
  RotateCcw,
  Check,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Type,
  Bookmark,
  Share2,
  Layers,
  AlertCircle,
  PanelRightClose,
  PanelRightOpen,
  Eye,
  Sliders
} from 'lucide-react';
import { MaterialItem, CourseLesson, CourseModule, QuizQuestion } from '../types';

interface LearningFocusModeProps {
  material: MaterialItem;
  onExit: () => void;
  onCompleteCourse: () => void;
  onOpenQuiz?: () => void;
  onProgressUpdate?: (lessonId: string, progressPercent: number) => void;
  onToggleBookmark?: (id: string, e: React.MouseEvent) => void;
  onDownload?: (id: string, e?: React.MouseEvent) => void;
  /** Lessons already read in a previous visit (public portal resumes from localStorage). */
  resumeCompletedLessonIds?: string[];
  /** Emitted with the full id list on every completion so the caller can persist it. */
  onLessonsCompletedChange?: (completedLessonIds: string[], totalLessons: number) => void;
  /**
   * A supervisor reads the syllabus to inspect it, not to complete it. Hides the
   * completion mechanics (mark-as-done, finish-course) that would otherwise write
   * learner progress for someone who is not taking the course.
   */
  reviewMode?: boolean;
}

export function LearningFocusMode({
  material,
  onExit,
  onCompleteCourse,
  onOpenQuiz,
  onProgressUpdate,
  onToggleBookmark,
  onDownload,
  resumeCompletedLessonIds,
  onLessonsCompletedChange,
  reviewMode = false,
}: LearningFocusModeProps) {
  // Normalize curriculum modules & lessons.
  // Memoized on the material identity so a progress-sync round trip (which replaces the
  // material object in App state) does not rebuild the syllabus and desynchronize indices.
  const rawModules: CourseModule[] = useMemo(() => (
    material.modules && material.modules.length > 0
    ? material.modules
    : [
        {
          id: 'mod-1',
          title: 'Modul 1: Materi Pokok & Regulasi',
          lessons: [
            {
              id: 'les-1',
              title: material.title,
              duration: material.duration || material.readTime || '10:00',
              type: material.type === 'video' ? 'video' : material.type === 'infografis' ? 'infografis' : 'reading',
              isCompleted: material.progressPercent === 100
            },
            {
              id: 'les-2',
              title: 'Pedoman Disiplin & Etika Keselamatan Lalu Lintas',
              duration: '05:00',
              type: 'reading',
              isCompleted: material.progressPercent === 100
            }
          ]
        },
        {
          id: 'mod-2',
          title: 'Modul 2: Evaluasi Kompetensi',
          lessons: [
            {
              id: 'les-3',
              title: 'Kuis Evaluasi Pemahaman Materi',
              duration: '10:00',
              type: 'quiz',
              isCompleted: material.progressPercent === 100
            }
          ]
        }
      ]
  ), [material.id, material.modules]);

  const allLessons: CourseLesson[] = useMemo(
    () => rawModules.flatMap(m => m.lessons),
    [rawModules]
  );

  // States
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    const fromSyllabus = allLessons.filter(l => l.isCompleted).map(l => l.id);
    // Public visitors have no server record; their prior reading comes in as resume ids.
    const resumed = (resumeCompletedLessonIds || []).filter(id => allLessons.some(l => l.id === id));
    return Array.from(new Set([...fromSyllabus, ...resumed]));
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [infographicZoom, setInfographicZoom] = useState<'contain' | 'cover' | 'expanded'>('contain');
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [isCourseFinished, setIsCourseFinished] = useState<boolean>(false);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [contentWidth, setContentWidth] = useState<'standard' | 'wide' | 'full'>('wide');

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // In-flow Quiz State inside Learning Mode
  const quizQuestions: QuizQuestion[] = material.quiz || [
    {
      id: 1,
      question: "Apa tindakan yang benar saat melihat lampu lalu lintas berwarna KUNING di persimpangan jalan?",
      options: [
        "Menambah kecepatan agar segera melewati persimpangan",
        "Berhati-hati dan bersiap memperlambat laju kendaraan untuk berhenti dengan aman",
        "Langsung berbelok tanpa memperhatikan kendaraan lain",
        "Membunyikan klakson secara terus-menerus"
      ],
      correctIndex: 1,
      explanation: "Lampu kuning merupakan sinyal peringatan agar pengendara berhati-hati dan bersiap berhenti dengan aman (UU No. 22 Tahun 2009)."
    },
    {
      id: 2,
      question: "Metode menyeberang jalan yang aman menurut standar Polisi Sahabat Anak (Polsanak) adalah...",
      options: [
        "Berlari kencang sambil menatap gawai",
        "Metode 4T (Tunggu, Tengok kanan, Tengok kiri, Tengok kanan lagi)",
        "Menyeberang di tikungan blind spot kendaraan",
        "Menyeberang saat lampu penyeberang menyala merah"
      ],
      correctIndex: 1,
      explanation: "Metode 4T memastikan lintasan pandang penyeberang dan pengendara bebas hambatan blind spot sebelum melangkah ke badan jalan."
    }
  ];

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [showQuizReview, setShowQuizReview] = useState<boolean>(false);

  // If the syllabus is replaced by a server sync while the learner is mid-course, keep the
  // learner on the same lesson id instead of snapping the index back to 0.
  const lastLessonIdRef = useRef<string | null>(null);
  useEffect(() => {
    const anchor = lastLessonIdRef.current;
    if (!anchor) return;
    const idx = allLessons.findIndex(l => l.id === anchor);
    if (idx >= 0) {
      if (idx !== currentLessonIndex) setCurrentLessonIndex(idx);
    } else if (currentLessonIndex > allLessons.length - 1) {
      setCurrentLessonIndex(Math.max(0, allLessons.length - 1));
    }
  }, [allLessons]);

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  lastLessonIdRef.current = currentLesson ? currentLesson.id : null;
  const progressPercent = Math.round((completedLessonIds.length / allLessons.length) * 100);
  const currentModule = rawModules.find(m => m.lessons.some(l => l.id === currentLesson.id)) || rawModules[0];

  const markLessonComplete = (lessonId: string) => {
    if (!completedLessonIds.includes(lessonId)) {
      const updated = [...completedLessonIds, lessonId];
      setCompletedLessonIds(updated);
      const newPercent = Math.round((updated.length / allLessons.length) * 100);
      if (onProgressUpdate) {
        onProgressUpdate(lessonId, newPercent);
      }
      if (onLessonsCompletedChange) {
        onLessonsCompletedChange(updated, allLessons.length);
      }
    }
  };

  const handleNext = () => {
    markLessonComplete(currentLesson.id);

    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonIndex(prev => prev + 1);
      setIsPlayingVideo(false);
      setInfographicZoom('contain');
    } else {
      if (onProgressUpdate) {
        onProgressUpdate(currentLesson.id, 100);
      }
      // Persist the whole syllabus as read: the last lesson may already have been
      // marked, in which case markLessonComplete above emitted nothing.
      if (onLessonsCompletedChange) {
        onLessonsCompletedChange(allLessons.map(l => l.id), allLessons.length);
      }
      if (onCompleteCourse) {
        onCompleteCourse();
      } else {
        setIsCourseFinished(true);
      }
    }
  };

  const handlePrev = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(prev => prev - 1);
      setIsPlayingVideo(false);
      setInfographicZoom('contain');
    }
  };

  const selectLesson = (idx: number) => {
    setCurrentLessonIndex(idx);
    setIsPlayingVideo(false);
    setIsMobileDrawerOpen(false);
    setInfographicZoom('contain');
  };

  const handleQuizAnswer = (questionIdx: number, optionIdx: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({
      ...prev,
      [questionIdx]: optionIdx
    }));
  };

  const handleQuizSubmit = () => {
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    const calculated = Math.round((correct / quizQuestions.length) * 100);
    setQuizScore(calculated);
    setQuizSubmitted(true);
    markLessonComplete(currentLesson.id);

    if (onProgressUpdate) {
      onProgressUpdate(currentLesson.id, calculated >= 70 ? 100 : progressPercent);
    }
  };

  const handleQuizRetry = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setShowQuizReview(false);
    setQuizScore(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#071120] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* 1. MINIMAL TOP BAR */}
      <header className="h-16 border-b border-slate-800 bg-[#0a1d37]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title={reviewMode ? 'Keluar dari Peninjauan Materi' : 'Keluar dari Ruang Belajar'}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{reviewMode ? 'Keluar Tinjauan' : 'Keluar Belajar'}</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block shrink-0" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 shrink-0">
                Jenjang {material.level}
              </span>
              <span className="text-xs text-slate-400 truncate hidden md:inline">
                {currentModule.title}
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md lg:max-w-lg mt-0.5">
              {currentLesson.title}
            </h1>
          </div>
        </div>

        {/* Progress Metric & Sidebar / Drawer Toggle */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-medium text-slate-400 block">
              Pelajaran {currentLessonIndex + 1} dari {allLessons.length}
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {progressPercent}% Selesai
            </span>
          </div>

          <div className="w-16 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Content Width Toggle */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setContentWidth('standard')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                contentWidth === 'standard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lebar Standar (Fokus Baca)"
            >
              Standar
            </button>
            <button
              onClick={() => setContentWidth('wide')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                contentWidth === 'wide'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lebar Luas (Optimal Belajar)"
            >
              Lebar
            </button>
            <button
              onClick={() => setContentWidth('full')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                contentWidth === 'full'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Penuh Layar (100% Kanvas)"
            >
              Penuh
            </button>
          </div>

          {/* Fullscreen Native Toggle */}
          <button
            onClick={toggleBrowserFullscreen}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isFullscreen
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title={isFullscreen ? 'Keluar Layar Penuh (F11/Esc)' : 'Mode Layar Penuh (Full Screen)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">{isFullscreen ? 'Kecilkan' : 'Layar Penuh'}</span>
          </button>

          {/* Desktop Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isSidebarOpen
                ? 'bg-blue-600/25 border-blue-500/50 text-blue-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title={isSidebarOpen ? 'Sembunyikan Silabus' : 'Tampilkan Silabus'}
          >
            {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden xl:inline">{isSidebarOpen ? 'Tutup Silabus' : 'Buka Silabus'}</span>
          </button>

          {/* Mobile Drawer Button */}
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer"
            title="Daftar Materi"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN LEARNING CANVAS & DESKTOP CURRICULUM SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Sidebar Re-open Pill when Sidebar is Closed */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:flex fixed right-4 bottom-20 z-30 bg-[#0a1d37]/95 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white px-3.5 py-2 rounded-2xl shadow-2xl items-center gap-2 text-xs font-bold transition-all cursor-pointer backdrop-blur-md hover:scale-105"
            title="Buka Panel Silabus"
          >
            <PanelRightOpen className="w-4 h-4" />
            <span>Silabus ({completedLessonIds.length}/{allLessons.length})</span>
          </button>
        )}

        {/* Main Content Stage */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start mx-auto w-full transition-all duration-300 ${
          contentWidth === 'full'
            ? 'max-w-none px-4 sm:px-8 lg:px-12'
            : contentWidth === 'wide'
            ? 'max-w-6xl'
            : 'max-w-4xl'
        }`}>
          {/* COMPLETION CELEBRATION / REVIEW FINISHED SCREEN */}
          {isCourseFinished ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 my-auto max-w-xl shadow-2xl">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl ${
                reviewMode
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {reviewMode ? <Check className="w-10 h-10" /> : <Award className="w-10 h-10" />}
              </div>

              <div className="space-y-2">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border inline-block ${
                  reviewMode
                    ? 'text-blue-400 bg-blue-950/80 border-blue-700/40'
                    : 'text-emerald-400 bg-emerald-950/80 border-emerald-700/40'
                }`}>
                  {reviewMode ? 'Peninjauan Selesai' : 'Pembelajaran Selesai 🎉'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {reviewMode
                    ? 'Seluruh Isi Modul Telah Ditinjau'
                    : 'Selamat! Anda Telah Menyelesaikan Modul'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  {reviewMode
                    ? `Seluruh silabus pada materi "${material.title}" telah Anda tinjau. Tidak ada perubahan data capaian.`
                    : `Seluruh rangkaian silabus pada modul "${material.title}" telah terselesaikan dengan baik.`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 space-y-1 text-left">
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Total Silabus:</span>
                  <span className="font-bold text-white">{allLessons.length} Pelajaran</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-400">Status:</span>
                  <span className={`font-bold ${reviewMode ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {reviewMode ? 'Tuntas Ditinjau' : '100% Selesai'}
                  </span>
                </div>
                {!reviewMode && material.certificationAvailable && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Sertifikat Resmi:</span>
                    <span className="font-bold text-blue-400">Tersedia di Capaian</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsCourseFinished(false);
                    setCurrentLessonIndex(0);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{reviewMode ? 'Tinjau Dari Awal' : 'Ulas Dari Awal'}</span>
                </button>

                <button
                  onClick={onExit}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Kembali ke Detail Kursus</span>
                </button>
              </div>
            </div>
          ) : currentLesson.type === 'video' ? (
            /* A. VIDEO LEARNING VIEWER */
            <div className="w-full space-y-5">
              {/* Responsive Video Player */}
              <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden relative shadow-2xl border border-slate-800 group">
                {currentLesson.videoUrl || material.videoUrl ? (
                  (() => {
                    const vUrl = currentLesson.videoUrl || material.videoUrl || '';
                    let embedUrl = vUrl;
                    const ytMatch = vUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                    if (ytMatch && ytMatch[1]) {
                      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&playsinline=1`;
                    }

                    return (
                      <iframe
                        src={embedUrl}
                        title={currentLesson.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={() => markLessonComplete(currentLesson.id)}
                      />
                    );
                  })()
                ) : (
                  <>
                    <img
                      src={material.imageUrl}
                      alt={material.title}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isPlayingVideo ? 'opacity-25' : 'opacity-80'}`}
                    />

                    {/* Central Play/Pause Action */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {!isPlayingVideo ? (
                        <div
                          onClick={() => {
                            setIsPlayingVideo(true);
                            markLessonComplete(currentLesson.id);
                          }}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-blue-500 transition-all cursor-pointer ring-8 ring-blue-500/20"
                        >
                          <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1.5" />
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsPlayingVideo(false)}
                          className="text-center p-6 bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 max-w-md cursor-pointer hover:border-slate-700 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-white">Video Edukasi Sedang Berjalan</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Klik di sini untuk menjeda pemutaran video.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Video Controller Bar */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white bg-black/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsPlayingVideo(prev => !prev)}
                          className="p-1 text-white hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {isPlayingVideo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                        </button>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>03:15 / {currentLesson.duration || material.duration || '10:00'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsMuted(prev => !prev)}
                          className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title={isMuted ? 'Nyalakan Suara' : 'Bisukan'}
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Video Context & Lesson Notes */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Catatan Materi Pelajaran
                  </span>
                  <span className="text-xs text-slate-400">Penyusun: {material.author || 'Korlantas POLRI'}</span>
                </div>

                <h2 className="text-lg font-bold text-white">{currentLesson.title}</h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {material.summary || material.description}
                </p>

                {material.keyPoints && material.keyPoints.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Pokok Regulasi & Keselamatan:
                    </h3>
                    <ul className="space-y-2">
                      {material.keyPoints.map((kp, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2.5 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{kp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : currentLesson.type === 'infografis' ? (
            /* B. INFOGRAPHIC VIEWER */
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                    Infografis Edukasi Visual
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {currentLesson.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInfographicZoom(z => z === 'contain' ? 'cover' : 'contain')}
                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Sesuaikan Tampilan"
                  >
                    {infographicZoom === 'contain' ? <ZoomIn className="w-4 h-4" /> : <ZoomOut className="w-4 h-4" />}
                    <span className="hidden sm:inline">{infographicZoom === 'contain' ? 'Perbesar' : 'Pas Layar'}</span>
                  </button>
                </div>
              </div>

              {/* Infographic Visual Canvas */}
              <div className={`w-full rounded-2xl overflow-hidden border border-slate-800 bg-black relative transition-all duration-300 ${
                infographicZoom === 'cover' ? 'h-[600px]' : 'h-80 sm:h-96'
              }`}>
                <img
                  src={material.imageUrl}
                  alt={material.title}
                  className={`w-full h-full ${infographicZoom === 'cover' ? 'object-cover' : 'object-contain'}`}
                />
              </div>

              {/* Caption & Explanations */}
              <div className="text-xs text-slate-300 leading-relaxed space-y-2 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/40">
                <p className="font-semibold text-white">Panduan Visual Keselamatan Lalu Lintas</p>
                <p>{material.summary || material.description}</p>
              </div>
            </div>
          ) : currentLesson.type === 'quiz' ? (
            /* C. INTEGRATED IN-FLOW QUIZ ASSESSMENT */
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              {!quizSubmitted ? (
                <div className="space-y-6">
                  {/* Quiz Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                        Evaluasi Akhir Silabus
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                        Kuis Uji Pemahaman Materi
                      </h2>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/50">
                      {quizQuestions.length} Pertanyaan
                    </span>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-6">
                    {quizQuestions.map((q, qIdx) => {
                      const selectedOpt = quizAnswers[qIdx];
                      return (
                        <div key={q.id || qIdx} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="w-6 h-6 rounded-lg bg-blue-600/30 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {qIdx + 1}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                              {q.question}
                            </h3>
                          </div>

                          <div className="space-y-2 pl-8">
                            {q.options.map((opt, optIdx) => {
                              const isChecked = selectedOpt === optIdx;
                              const letter = String.fromCharCode(65 + optIdx);

                              return (
                                <button
                                  key={optIdx}
                                  onClick={() => handleQuizAnswer(qIdx, optIdx)}
                                  className={`w-full p-3 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                    isChecked
                                      ? 'bg-blue-600 border-2 border-blue-400 text-white shadow-md'
                                      : 'bg-slate-800/90 border border-slate-700 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                      isChecked ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                                    }`}>
                                      {letter}
                                    </span>
                                    <span className="leading-snug">{opt}</span>
                                  </div>

                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isChecked ? 'border-white bg-white/20' : 'border-slate-500'
                                  }`}>
                                    {isChecked && <div className="w-2 h-2 rounded-full bg-white" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quiz Submit Action */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleQuizSubmit}
                      disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2 shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      <span>Kirim Jawaban & Lihat Hasil</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Quiz Result Screen */
                <div className="text-center space-y-6 py-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
                    quizScore >= 70
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {quizScore >= 70 ? <Award className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                  </div>

                  <div className="space-y-1">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                      quizScore >= 70
                        ? 'bg-emerald-950/80 border-emerald-600/40 text-emerald-300'
                        : 'bg-red-950/80 border-red-600/40 text-red-300'
                    }`}>
                      {quizScore >= 70 ? 'Lulus Evaluasi' : 'Perlu Remedial'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
                      {quizScore >= 70 ? 'Selamat, Anda Berhasil Lulus!' : 'Hasil Evaluasi Belum Memenuhi Standar'}
                    </h2>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {quizScore >= 70
                        ? 'Anda telah menguasai pokok-pokok materi keselamatan berlalu lintas.'
                        : 'Batas minimum kelulusan adalah 70%. Ulas kembali materi dan ulangi kuis.'}
                    </p>
                  </div>

                  {/* Score Summary Box */}
                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 max-w-sm mx-auto flex items-center justify-around">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Skor Evaluasi</span>
                      <span className={`text-3xl font-extrabold ${quizScore >= 70 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {quizScore}%
                      </span>
                    </div>
                    <div className="h-8 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Passing Grade</span>
                      <span className="text-xs font-bold text-slate-200">70%</span>
                    </div>
                  </div>

                  {/* Toggle Review Button */}
                  <div>
                    <button
                      onClick={() => setShowQuizReview(prev => !prev)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{showQuizReview ? 'Tutup Pembahasan Soal' : 'Lihat Kunci Jawaban & Pembahasan'}</span>
                    </button>
                  </div>

                  {/* Review Detail */}
                  {showQuizReview && (
                    <div className="text-left space-y-3 pt-2 border-t border-slate-800 max-h-72 overflow-y-auto pr-1">
                      {quizQuestions.map((q, qIdx) => {
                        const userAns = quizAnswers[qIdx];
                        const isCorrect = userAns === q.correctIndex;

                        return (
                          <div key={q.id || qIdx} className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-white">#{qIdx + 1}. {q.question}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {isCorrect ? 'Benar' : 'Salah'}
                              </span>
                            </div>
                            <p className="text-slate-300">
                              <span className="text-slate-400">Kunci Jawaban: </span>
                              <span className="font-bold text-emerald-400">{q.options[q.correctIndex]}</span>
                            </p>
                            {q.explanation && (
                              <p className="text-[11px] text-blue-200 bg-blue-950/40 p-2 rounded-lg border border-blue-900/40">
                                <strong>Catatan:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Retry & Next Action */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 max-w-md mx-auto">
                    <button
                      onClick={handleQuizRetry}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Ulangi Kuis</span>
                    </button>

                    <button
                      onClick={handleNext}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Lanjut Silabus</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* D. DOCUMENT / READING VIEWER */
            <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                    Modul Panduan & Regulasi
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                    {currentLesson.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setFontSize(f => f === 'normal' ? 'large' : 'normal')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Ubah Ukuran Teks"
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>{fontSize === 'normal' ? 'Teks Sedang' : 'Teks Besar'}</span>
                  </button>
                </div>
              </div>

              {/* Cover or Header Illustration */}
              <div className="w-full h-52 sm:h-64 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                <img
                  src={material.imageUrl}
                  alt={material.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#071120] via-transparent to-transparent" />
              </div>

              {/* Key Regulation Points Box */}
              {material.keyPoints && material.keyPoints.length > 0 && (
                <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-800/40 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Poin Utama Pedoman & Keselamatan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {material.keyPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editorial Reading Prose */}
              <div className={`prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4 ${
                fontSize === 'large' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
              }`}>
                <p className="font-medium text-slate-200">
                  {material.summary || material.description}
                </p>
                <p>
                  Edukasi Masyarakat Lalu Lintas (Dikmas Lantas) merupakan instrumen pencegahan terpenting guna mewujudkan keamanan, keselamatan, ketertiban, dan kelancaran lalu lintas (Kamseltibcarlantas) yang berkelanjutan di seluruh wilayah Indonesia.
                </p>
                <p>
                  Setiap pengendara dan pengguna jalan wajib menaati rambu-rambu, marka jalan, batas kecepatan, serta menggunakan perlengkapan keselamatan standar seperti helm SNI dan sabuk pengaman.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* 3. DESKTOP CURRICULUM SIDEBAR */}
        <aside
          className={`bg-[#0a1d37]/98 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shrink-0 transition-all duration-300 z-10 ${
            isSidebarOpen
              ? 'w-full md:w-80 p-4 sm:p-5'
              : 'w-0 p-0 overflow-hidden border-none'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Silabus Pelajaran
            </h3>
            <span className="text-[11px] font-semibold text-emerald-400">
              {completedLessonIds.length}/{allLessons.length} Selesai
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {rawModules.map((mod, modIdx) => (
              <div key={mod.id} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block px-2">
                  {mod.title}
                </span>

                <div className="space-y-1">
                  {mod.lessons.map((les) => {
                    const globalIdx = allLessons.findIndex(l => l.id === les.id);
                    const isSelected = globalIdx === currentLessonIndex;
                    const isDone = completedLessonIds.includes(les.id);

                    return (
                      <button
                        key={les.id}
                        onClick={() => selectLesson(globalIdx)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-md ring-1 ring-blue-400'
                            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0" />
                          )}
                          <span className="truncate">{les.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 uppercase font-mono">
                          {les.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* 4. MOBILE CURRICULUM DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end md:hidden">
          <div className="bg-[#0a1d37] border-t border-slate-800 rounded-t-3xl p-5 max-h-[80vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Silabus Modul
              </h3>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {allLessons.map((les, idx) => {
                const isSelected = idx === currentLessonIndex;
                const isDone = completedLessonIds.includes(les.id);
                return (
                  <button
                    key={les.id}
                    onClick={() => selectLesson(idx)}
                    className={`w-full p-3 rounded-xl text-left text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-500 shrink-0" />
                      )}
                      <span className="truncate">{les.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase">{les.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. BOTTOM NAVIGATION BAR */}
      <footer className="h-16 border-t border-slate-800/90 bg-[#0a1d37]/95 px-4 sm:px-8 flex items-center justify-between shrink-0 z-20">
        <button
          onClick={handlePrev}
          disabled={currentLessonIndex === 0}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Pelajaran Sebelumnya</span>
          <span className="sm:hidden">Sebelumnya</span>
        </button>

        <div className="flex items-center gap-2.5">
          {!reviewMode && (
            <button
              onClick={() => markLessonComplete(currentLesson.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                completedLessonIds.includes(currentLesson.id)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {completedLessonIds.includes(currentLesson.id) ? 'Selesai' : 'Tandai Selesai'}
              </span>
            </button>
          )}

          <button
            onClick={reviewMode && currentLessonIndex === allLessons.length - 1 ? onExit : handleNext}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <span>
              {currentLessonIndex === allLessons.length - 1
                ? (reviewMode ? 'Selesai Meninjau' : 'Selesaikan Kursus')
                : 'Lanjut Silabus'}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-white">
              {reviewMode ? 'Keluar dari Peninjauan Materi?' : 'Keluar dari Ruang Belajar?'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {reviewMode
                ? 'Peninjauan tidak mengubah data pembelajaran. Anda dapat membuka materi ini lagi kapan saja.'
                : 'Kemajuan pelajaran Anda tetap tersimpan otomatis. Anda dapat melanjutkan pembelajaran kapan saja.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {reviewMode ? 'Lanjut Meninjau' : 'Tetap Belajar'}
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExit();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
