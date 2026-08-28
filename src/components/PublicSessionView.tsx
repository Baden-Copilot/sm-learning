import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  CheckSquare,
  Award,
  ChevronLeft,
  ChevronRight,
  User,
  Building,
  Radio,
  ExternalLink
} from 'lucide-react';
import { MaterialItem, OutreachSession, SessionParticipant } from '../types';

interface PublicSessionViewProps {
  initialCode?: string;
  onBackToPortal: () => void;
}

export function PublicSessionView({
  initialCode = '',
  onBackToPortal
}: PublicSessionViewProps) {
  // Join Flow State: 'code_input' | 'join_form' | 'learning_room' | 'quiz_mode' | 'quiz_completed' | 'session_closed'
  const [step, setStep] = useState<'code_input' | 'join_form' | 'learning_room' | 'quiz_mode' | 'quiz_completed' | 'session_closed'>(
    initialCode ? 'join_form' : 'code_input'
  );

  const [accessCode, setAccessCode] = useState<string>(initialCode);
  const [participantName, setParticipantName] = useState<string>('');
  const [participantPlace, setParticipantPlace] = useState<string>('');

  const [session, setSession] = useState<OutreachSession | null>(null);
  const [participant, setParticipant] = useState<SessionParticipant | null>(null);
  const [material, setMaterial] = useState<MaterialItem | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Learning Progress within session
  const [activeLessonIndex, setActiveLessonIndex] = useState<number>(0);

  const [viewedLessonIds, setViewedLessonIds] = useState<string[]>([]);
  const [isFinishingMaterial, setIsFinishingMaterial] = useState<boolean>(false);

  // Quiz State
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isPassed, setIsPassed] = useState<boolean>(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);

  // Certificate earned in this session (quiz pass or full-material completion)
  const [certificate, setCertificate] = useState<any | null>(null);

  // Helper track learning event
  const trackEvent = (eventType: string, details: Record<string, any> = {}) => {
    if (!material) return;
    fetch('/api/learning-events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session?.id,
        participantId: participant?.id,
        materialId: material.id,
        eventType,
        details
      })
    }).catch(() => {});
  };

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !participantName.trim() || !participantPlace.trim()) {
      setErrorMessage('Harap lengkapi kode sesi, nama lengkap, dan instansi Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    fetch('/api/public/session/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: accessCode.trim().toUpperCase(),
        name: participantName.trim(),
        place: participantPlace.trim()
      })
    })
      .then(res => {
        if (res.status === 410) {
          setStep('session_closed');
          throw new Error('Sesi kegiatan pemaparan ini telah selesai dan ditutup.');
        }
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.message || 'Kode sesi tidak valid.'); });
        }
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setSession(data.data.session);
          setParticipant(data.data.participant);
          setMaterial(data.data.material);
          setStep('learning_room');
          // Track material view immediately
          fetch('/api/learning-events/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: data.data.session.id,
              participantId: data.data.participant.id,
              materialId: data.data.material.id,
              eventType: 'material_view',
              details: { initial: true }
            })
          }).catch(() => {});

          // A participant rejoining with the same name keeps the certificate they
          // already earned, so the download button survives a refresh.
          fetch(`/api/outreach/session/certificates?sessionId=${encodeURIComponent(data.data.session.id)}&participantId=${encodeURIComponent(data.data.participant.id)}`)
            .then(r => (r.ok ? r.json() : null))
            .then(certRes => {
              if (certRes?.success && certRes.data?.length > 0) {
                setCertificate(certRes.data[certRes.data.length - 1]);
              }
            })
            .catch(() => {});
        } else {
          throw new Error(data.message || 'Gagal masuk ke sesi.');
        }
      })
      .catch(err => {
        setErrorMessage(err.message || 'Terjadi gangguan jaringan.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Submit Quiz Action
  const handleSubmitQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !participant || !material) return;

    setIsSubmittingQuiz(true);
    setErrorMessage(null);

    fetch('/api/outreach/session/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        participantId: participant.id,
        materialId: material.id,
        answers,
        passingGrade: 70
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengirim jawaban evaluasi.');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setQuizScore(data.score);
          setIsPassed(data.passed);
          if (data.certificate) setCertificate(data.certificate);
          setStep('quiz_completed');
        } else {
          throw new Error(data.message || 'Evaluasi gagal diproses.');
        }
      })
      .catch(err => {
        setErrorMessage(err.message || 'Koneksi terputus saat submit kuis.');
      })
      .finally(() => {
        setIsSubmittingQuiz(false);
      });
  };

  // Render Lessons list
  const allLessons = material?.modules?.flatMap(m => m.lessons) || [];
  const currentLesson = allLessons[activeLessonIndex] || {
    id: 'les-default',
    title: material?.title || 'Pengenalan Materi',
    duration: '05:00',
    type: 'reading'
  };

  const totalLessons = allLessons.length || 1;
  const isLastLesson = activeLessonIndex >= totalLessons - 1;
  const hasQuiz = Boolean(material?.quiz && material.quiz.length > 0);
  const allLessonsViewed = totalLessons > 0 && viewedLessonIds.length >= totalLessons;

  // Mark the lesson on screen as viewed, so "seen every lesson" is a real signal
  // rather than an assumption based on the index alone.
  useEffect(() => {
    if (step !== 'learning_room' || !material || !currentLesson?.id) return;
    setViewedLessonIds(prev => (prev.includes(currentLesson.id) ? prev : [...prev, currentLesson.id]));
    trackEvent('lesson_view', { lessonId: currentLesson.id, lessonTitle: currentLesson.title });
  }, [step, material?.id, currentLesson?.id]);

  const goToLesson = (index: number) => {
    if (index < 0 || index > totalLessons - 1) return;
    setActiveLessonIndex(index);
  };

  // Finish the material without a quiz: every lesson viewed earns the certificate.
  const handleCompleteMaterial = () => {
    if (!session || !participant || !material) return;

    setIsFinishingMaterial(true);
    setErrorMessage(null);

    fetch('/api/outreach/session/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        participantId: participant.id,
        materialId: material.id
      })
    })
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Respon server bukan format JSON.');
        }
        return res.json().then(body => {
          if (!res.ok || !body.success) {
            throw new Error(body.message || 'Gagal menerbitkan sertifikat.');
          }
          return body;
        });
      })
      .then(data => {
        setCertificate(data.certificate);
        setIsPassed(true);
        setQuizScore(null);
        setStep('quiz_completed');
      })
      .catch(err => {
        setErrorMessage(err.message || 'Koneksi terputus saat menyelesaikan materi.');
      })
      .finally(() => {
        setIsFinishingMaterial(false);
      });
  };

  const certificateUrl = certificate
    ? `/api/certificates/${encodeURIComponent(certificate.certificateNumber)}/download`
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* 1. CODE INPUT OR JOIN FORM */}
      {(step === 'code_input' || step === 'join_form') && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xl max-w-lg mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Gabung Sesi Pemaparan
            </h2>
            <p className="text-xs text-slate-500">
              Ikuti materi langsung dari instruktur kepolisian dan ikuti kuis evaluasi interaktif.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleJoinSession} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Kode Akses Sesi *
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="contoh: POL-A7K9"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest text-blue-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-center"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Nama Lengkap Peserta *
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Nama lengkap Anda..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Asal Sekolah / Instansi / Komunitas *
              </label>
              <input
                type="text"
                value={participantPlace}
                onChange={(e) => setParticipantPlace(e.target.value)}
                placeholder="contoh: SMPN 1 Jakarta / Warga RW 02"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0a1d37] hover:bg-slate-800 disabled:opacity-50 text-white py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menghubungkan ke Sesi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Mulai Belajar di Sesi Ini</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onBackToPortal}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 py-2 cursor-pointer"
              >
                Kembali ke Portal Publik
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SESSION CLOSED SCREEN */}
      {step === 'session_closed' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl max-w-lg mx-auto text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">
              Kegiatan Pemaparan Telah Selesai
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sesi edukasi lapangan ini telah selesai dan ditutup secara resmi oleh instruktur. Materi tetap dapat Anda akses secara bebas melalui Portal Edukasi Publik kami.
            </p>
          </div>
          <button
            onClick={onBackToPortal}
            className="inline-flex items-center gap-2 bg-[#0a1d37] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
          >
            <span>Buka Portal Edukasi Publik</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. LEARNING ROOM IN SESSION */}
      {step === 'learning_room' && material && (
        <div className="space-y-6">
          {/* SESSION BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                {participantName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{participantName} ({participantPlace})</p>
                <p className="text-[11px] text-slate-500">Sesi: <strong>{session?.activityName}</strong> • Instruktur: {session?.trainerName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Sesi Live Interaktif
              </span>
            </div>
          </div>

          {/* MATERIAL CONTENT & LESSON VIEWER */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs space-y-6 p-6 sm:p-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                  {material.level}
                </span>
                <span className="text-xs font-semibold text-slate-500">{material.typeLabel}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{material.title}</h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{material.description}</p>
            </div>

            {/* VIDEO / READING PRESENTATION VIEWER */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center relative shadow-md">
              {currentLesson.type === 'video' && (currentLesson.videoUrl || material.videoUrl) ? (
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
                    />
                  );
                })()
              ) : (
                <>
                  <img
                    src={material.imageUrl}
                    alt={material.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white space-y-2">
                    <span className="text-[10px] font-bold text-amber-300 uppercase">Modul Pembelajaran Aktif</span>
                    <h3 className="text-base sm:text-lg font-bold">{currentLesson.title}</h3>
                    <p className="text-xs text-slate-300">Durasi: {currentLesson.duration || '05:00'}</p>
                  </div>
                </>
              )}
            </div>

            {/* KEY POINTS SUMMARY */}
            {material.keyPoints && material.keyPoints.length > 0 && (
              <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Poin Penting Keselamatan:
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {material.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SYLLABUS PROGRESS */}
            {allLessons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Silabus Materi
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    {viewedLessonIds.length}/{allLessons.length} materi dipelajari
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.round((viewedLessonIds.length / allLessons.length) * 100)}%` }}
                  />
                </div>

                <div className="space-y-1.5">
                  {allLessons.map((lesson, idx) => {
                    const isActive = idx === activeLessonIndex;
                    const isViewed = viewedLessonIds.includes(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => goToLesson(idx)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isViewed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isViewed
                            ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                            {lesson.title}
                          </p>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {lesson.duration || '05:00'}
                          </p>
                        </div>
                        {isActive && <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* LESSON NAVIGATION */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => goToLesson(activeLessonIndex - 1)}
                    disabled={activeLessonIndex <= 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="text-[11px] font-bold text-slate-400">
                    {activeLessonIndex + 1} / {allLessons.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => goToLesson(activeLessonIndex + 1)}
                    disabled={isLastLesson}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0a1d37] text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Materi Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CERTIFICATE ALREADY EARNED IN THIS SESSION */}
            {certificate && certificateUrl && (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Sertifikat Kelulusan Tersedia</p>
                    <p className="text-[11px] text-amber-800 font-mono">{certificate.certificateNumber}</p>
                  </div>
                </div>
                <a
                  href={`${certificateUrl}?download=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Unduh Sertifikat</span>
                </a>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ACTION: FINISH MATERIAL / START QUIZ EVALUATION (SESSION ACTIVE) */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                {hasQuiz
                  ? 'Setelah mempelajari materi di atas, ikuti evaluasi pemahaman untuk memperoleh sertifikat.'
                  : allLessonsViewed
                    ? 'Seluruh materi telah Anda pelajari. Terbitkan sertifikat kelulusan Anda.'
                    : 'Pelajari seluruh materi pada silabus untuk memperoleh sertifikat kelulusan.'}
              </div>

              {hasQuiz ? (
                <button
                  onClick={() => {
                    trackEvent('quiz_start', { materialId: material.id });
                    setStep('quiz_mode');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Mulai Kuis Evaluasi Sesi</span>
                </button>
              ) : (
                <button
                  onClick={handleCompleteMaterial}
                  disabled={!allLessonsViewed || isFinishingMaterial || Boolean(certificate)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isFinishingMaterial ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menerbitkan Sertifikat...</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>Selesaikan Materi &amp; Terbitkan Sertifikat</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. QUIZ MODE */}
      {step === 'quiz_mode' && material && material.quiz && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Evaluasi Interaktif Pemaparan
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Kuis: {material.title}
            </h2>
            <p className="text-xs text-slate-500">
              Jawab pertanyaan di bawah dengan cermat. Nilai kelulusan minimal adalah 70%.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmitQuiz} className="space-y-6">
            {material.quiz.map((q, qIndex) => (
              <div key={q.id || qIndex} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => (
                    <label
                      key={optIndex}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition ${
                        answers[qIndex] === optIndex
                          ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        checked={answers[qIndex] === optIndex}
                        onChange={() => setAnswers(prev => ({ ...prev, [qIndex]: optIndex }))}
                        className="w-4 h-4 text-blue-600"
                        required
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('learning_room')}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Kembali ke Materi
              </button>

              <button
                type="submit"
                disabled={isSubmittingQuiz}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-7 py-3 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
              >
                {isSubmittingQuiz ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memproses Nilai...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim Jawaban Kuis</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. QUIZ COMPLETED SCREEN */}
      {step === 'quiz_completed' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl max-w-lg mx-auto text-center space-y-6">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto ${
            isPassed ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-amber-50 border border-amber-200 text-amber-600'
          }`}>
            {isPassed ? <Award className="w-9 h-9" /> : <AlertCircle className="w-9 h-9" />}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {quizScore === null ? 'Penyelesaian Materi' : 'Hasil Evaluasi Anda'}
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              {quizScore === null ? 'Materi Selesai' : `Skor: ${quizScore}%`}
            </h2>
            <p className={`text-xs font-bold ${isPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
              {quizScore === null
                ? 'Seluruh rangkaian materi telah Anda selesaikan'
                : isPassed
                  ? 'Selamat! Anda Memenuhi Syarat Kelulusan Sesi'
                  : 'Belum Memenuhi Batas Kelulusan (70%)'}
            </p>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Data partisipasi Anda telah dicatat dalam laporan resmi kegiatan pemaparan Korlantas POLRI.
          </p>

          {/* CERTIFICATE DOWNLOAD */}
          {certificate && certificateUrl && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-left">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-900">Sertifikat Kelulusan Diterbitkan</p>
                  <p className="text-[11px] text-amber-800 font-mono break-all">{certificate.certificateNumber}</p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    a.n. <strong>{certificate.recipientName}</strong> • {certificate.issuedAt}
                  </p>
                </div>
              </div>
              <a
                href={`${certificateUrl}?download=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Unduh Sertifikat Kelulusan</span>
              </a>
              <p className="text-[10px] text-amber-700 text-center">
                Berkas terbuka pada tab baru. Gunakan tombol <strong>Cetak / Simpan PDF</strong> untuk menyimpan sebagai PDF.
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setStep('learning_room')}
              className="w-full bg-[#0a1d37] hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              Kembali ke Materi Sesi
            </button>
            <button
              onClick={onBackToPortal}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Selesai & Ke Portal Publik
            </button>
          </div>
        </div>
      )}
    </div>
  );
}