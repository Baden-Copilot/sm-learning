import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Award,
  RotateCcw,
  Check,
  HelpCircle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { MaterialItem, QuizQuestion } from '../types';

interface QuizExperienceProps {
  material: MaterialItem;
  onExit: () => void;
  onFinishQuiz: (score: number, answers: Record<number, number>) => void;
}

export function QuizExperience({
  material,
  onExit,
  onFinishQuiz,
}: QuizExperienceProps) {
  const passingScore = material.passingScore || 70;
  const questions: QuizQuestion[] = (material.quiz && material.quiz.length > 0) ? material.quiz : [
    {
      id: 1,
      question: "Apa arti dan tindakan yang tepat saat melihat lampu lalu lintas berwarna KUNING di persimpangan jalan?",
      options: [
        "Mempercepat laju kendaraan agar tidak terkena sinyal merah",
        "Berhati-hati dan bersiap memperlambat atau berhenti jika kondisi aman",
        "Boleh langsung berbelok tanpa melihat kendaraan lain",
        "Wajib membunyikan klakson secara berulang-ulang"
      ],
      correctIndex: 1,
      explanation: "Lampu kuning merupakan sinyal peringatan agar pengendara berhati-hati dan bersiap berhenti dengan aman sebelum lampu merah menyala (UU No. 22 Tahun 2009)."
    },
    {
      id: 2,
      question: "Metode menyeberang jalan yang aman sesuai standar Polisi Sahabat Anak (Polsanak) adalah...",
      options: [
        "Berlari cepat sambil menatap layar gawai/handphone",
        "Metode 4T (Tunggu, Tengok kanan, Tengok kiri, Tengok kanan lagi)",
        "Menyeberang di area tikungan blind spot kendaraan",
        "Menyeberang saat lampu pejalan kaki (pelican cross) berwarna merah"
      ],
      correctIndex: 1,
      explanation: "Metode 4T memastikan pandangan pejalan kaki dan pengendara tidak terhalang blind spot sebelum menyeberang badan jalan raya."
    }
  ];

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showReview, setShowReview] = useState<boolean>(false);

  const currentQ = questions[currentIndex];
  const totalQ = questions.length;

  const handleSelectOption = (optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optIdx
    }));
  };

  const calculateScore = () => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount += 1;
      }
    });
    return Math.round((correctCount / totalQ) * 100);
  };

  const handleFinish = () => {
    setIsSubmitted(true);
  };

  const finalScore = calculateScore();
  const isPassed = finalScore >= passingScore;
  const correctAnswersCount = questions.filter((q, idx) => selectedAnswers[idx] === q.correctIndex).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#071120] text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* 1. QUIZ TOP HEADER */}
      <header className="h-16 border-b border-slate-800 bg-[#0a1d37]/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between shrink-0 z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Keluar Kuis</span>
        </button>

        <div className="text-center min-w-0 px-2">
          <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">
            Uji Kompetensi & Sertifikasi • Jenjang {material.level}
          </span>
          <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md block">
            {material.title}
          </span>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Pertanyaan</span>
          <span className="text-xs font-bold text-blue-400">
            {isSubmitted ? 'Selesai' : `${currentIndex + 1} / ${totalQ}`}
          </span>
        </div>
      </header>

      {/* 2. MAIN QUIZ BODY */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
        {!isSubmitted ? (
          /* STEPPER QUESTION FORM */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6">
            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                <span>Langkah {currentIndex + 1} dari {totalQ}</span>
                <span>Passing Grade: {passingScore}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-xs"
                  style={{ width: `${((currentIndex + 1) / totalQ) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider bg-blue-950/80 px-2.5 py-1 rounded-md border border-blue-800/50 inline-block">
                Soal #{currentIndex + 1}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 rounded-2xl text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-4 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-2 border-blue-400 text-white shadow-lg'
                        : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {letter}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </div>

                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-white bg-white/20' : 'border-slate-500'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Actions */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-800">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Sebelumnya
              </button>

              {currentIndex < totalQ - 1 ? (
                <button
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  disabled={selectedAnswers[currentIndex] === undefined}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5"
                >
                  <span>Pertanyaan Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={selectedAnswers[currentIndex] === undefined}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Kirim & Selesaikan Kuis</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 3. RESULT & REVIEW SCREEN */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 max-w-2xl w-full text-center space-y-6 shadow-2xl">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
              isPassed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {isPassed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <div className="space-y-1">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${
                isPassed
                  ? 'bg-emerald-950/80 border-emerald-600/40 text-emerald-300'
                  : 'bg-red-950/80 border-red-600/40 text-red-300'
              }`}>
                {isPassed ? 'Sertifikat Kelulusan Siap Diterbitkan' : 'Perlu Pendalaman Materi'}
              </span>

              <h2 className="text-2xl font-bold text-white mt-2">
                {isPassed ? 'Selamat, Anda Berhasil Lulus!' : 'Hasil Evaluasi: Perlu Remedial'}
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isPassed
                  ? `Nilai Anda memenuhi standar kelulusan (${passingScore}%). Capaian kompetensi resmi telah tercatat pada transkrip.`
                  : `Nilai Anda belum mencapai standar kelulusan (${passingScore}%). Anda dapat mengulang kuis untuk memperbarui nilai.`}
              </p>
            </div>

            {/* Score Stats Grid */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Skor Akhir</span>
                <span className={`text-2xl sm:text-3xl font-extrabold ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {finalScore}%
                </span>
              </div>
              <div className="border-x border-slate-700">
                <span className="text-[10px] text-slate-400 block">Jawaban Benar</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-400">
                  {correctAnswersCount} / {totalQ}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Batas Lulus</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-300">
                  {passingScore}%
                </span>
              </div>
            </div>

            {/* Question Review Toggle Button */}
            <div>
              <button
                onClick={() => setShowReview(prev => !prev)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 cursor-pointer inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{showReview ? 'Sembunyikan Pembahasan Soal' : 'Lihat Pembahasan & Kunci Jawaban'}</span>
              </button>
            </div>

            {/* Question by Question Review Drawer */}
            {showReview && (
              <div className="text-left space-y-4 pt-2 border-t border-slate-800 max-h-80 overflow-y-auto pr-1">
                {questions.map((q, qIdx) => {
                  const userAns = selectedAnswers[qIdx];
                  const isCorrect = userAns === q.correctIndex;

                  return (
                    <div key={q.id || qIdx} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white">
                          #{qIdx + 1}. {q.question}
                        </span>
                        {isCorrect ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Benar
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 shrink-0 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Salah
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <p>
                          <span className="text-slate-400">Jawaban Anda: </span>
                          <span className={isCorrect ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {userAns !== undefined ? q.options[userAns] : 'Tidak dijawab'}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p>
                            <span className="text-slate-400">Kunci Jawaban: </span>
                            <span className="text-emerald-400 font-bold">{q.options[q.correctIndex]}</span>
                          </p>
                        )}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-200">
                          <span className="font-bold text-blue-300">Pembahasan: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedAnswers({});
                  setCurrentIndex(0);
                  setIsSubmitted(false);
                  setShowReview(false);
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ulangi Kuis</span>
              </button>

              <button
                onClick={() => onFinishQuiz(finalScore, selectedAnswers)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Nilai & Selesaikan</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
