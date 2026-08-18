import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Download, 
  CheckCircle2, 
  Share2, 
  Bookmark, 
  Award, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { MaterialItem } from '../../types';

interface LearnModalProps {
  material: MaterialItem | null;
  onClose: () => void;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onDownload: (id: string) => void;
}

export const LearnModal: React.FC<LearnModalProps> = ({
  material,
  onClose,
  onToggleBookmark,
  onDownload,
}) => {
  const [activeTab, setActiveTab] = useState<'study' | 'quiz' | 'infographic'>('study');
  const [isPlaying, setIsPlaying] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!material) return null;

  const quizList = material.quiz || [
    {
      id: 1,
      question: 'Apa langkah pertama yang harus dilakukan sebelum menyeberang jalan raya?',
      options: ['Langsung lari cepat', 'Tunggu di trotoar dan tengok kanan serta kiri', 'Memanggil teman', 'Memakai kacamata hitam'],
      correctIndex: 1,
      explanation: 'Berhenti di trotoar lalu memeriksa arus kendaraan dari kanan dan kiri untuk memastikan kondisi jalan aman.'
    },
    {
      id: 2,
      question: 'Standar helm yang wajib digunakan pengendara dan penumpang sepeda motor di Indonesia adalah...',
      options: ['Helm Sepeda', 'Helm SNI (Standar Nasional Indonesia)', 'Topi kain', 'Helm Proyek'],
      correctIndex: 1,
      explanation: 'Helm berstandar SNI telah teruji ketahanan impak untuk memproteksi kepala secara maksimal.'
    }
  ];

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    if (showQuizResult) return;
    setQuizAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleCalculateScore = () => {
    setShowQuizResult(true);
  };

  const handleResetQuiz = () => {
    setQuizAnswers({});
    setShowQuizResult(false);
  };

  const correctCount = quizList.reduce((acc, q, idx) => {
    return quizAnswers[idx] === q.correctIndex ? acc + 1 : acc;
  }, 0);

  const scorePercentage = Math.round((correctCount / quizList.length) * 100);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0a1d37] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-sm uppercase tracking-wider">
              {material.badgeTag || material.level}
            </span>
            <div>
              <span className="text-xs text-slate-300 font-medium">{material.typeLabel}</span>
              <h2 className="font-headline text-lg font-bold text-white line-clamp-1">
                {material.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup jendela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('study')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'study'
                ? 'border-[#0a1d37] text-[#0a1d37] bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Modul & Video Edukasi
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'quiz'
                ? 'border-[#0a1d37] text-[#0a1d37] bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Kuis Interaktif</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {quizList.length} Soal
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'study' && (
            <div className="space-y-6">
              {/* Media Player Simulation */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video max-h-80 shadow-md group">
                <img
                  src={material.imageUrl}
                  alt={material.imageAlt}
                  className="w-full h-full object-cover opacity-85"
                  referrerPolicy="no-referrer"
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1 fill-white" />}
                  </button>
                </div>

                {/* Bottom Video Controls Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-emerald-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-ping" />
                      {isPlaying ? 'Memutar Materi Edukasi...' : 'Siap Ditonton'}
                    </span>
                    <span className="text-slate-300">Durasi: {material.duration || material.metadataText}</span>
                  </div>
                  <span className="text-slate-300 text-[11px]">Res: HD 1080p</span>
                </div>
              </div>

              {/* Summary Description */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-headline text-base font-bold text-[#0a1d37] mb-2 flex items-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mr-2" />
                  Ringkasan Panduan Keselamatan
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {material.summary || material.description}
                </p>
              </div>

              {/* Key Takeaways */}
              {material.keyPoints && material.keyPoints.length > 0 && (
                <div>
                  <h4 className="font-headline text-sm font-bold text-slate-900 mb-3 flex items-center">
                    <Sparkles className="w-4 h-4 text-amber-500 mr-2" />
                    Poin Utama Edukasi POLRI:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {material.keyPoints.map((point, idx) => (
                      <div 
                        key={idx}
                        className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-start space-x-3"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-700">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Author and Metadata details */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-200 text-xs text-slate-500 gap-2">
                <div>
                  <span className="font-semibold text-slate-700">Penyusun: </span>
                  <span>{material.author || 'Divisi Humas & Korlantas POLRI'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Tanggal Rilis: </span>
                  <span>{material.publishDate || 'Agustus 2026'}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-blue-950">Uji Pemahaman Materi Keselamatan</h4>
                  <p className="text-xs text-blue-800 mt-0.5">Jawab pertanyaan di bawah ini untuk menguji tingkat kesadaran keselamatan.</p>
                </div>
                {showQuizResult && (
                  <button
                    onClick={handleResetQuiz}
                    className="text-xs bg-white text-blue-700 font-semibold px-3 py-1.5 rounded-lg border border-blue-300 hover:bg-blue-50 flex items-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ulangi Kuis</span>
                  </button>
                )}
              </div>

              {/* Quiz Questions */}
              <div className="space-y-6">
                {quizList.map((q, qIndex) => {
                  const selectedOpt = quizAnswers[qIndex];
                  const isAnswered = selectedOpt !== undefined;

                  return (
                    <div 
                      key={q.id}
                      className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="w-6 h-6 rounded-full bg-[#0a1d37] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {qIndex + 1}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 leading-snug">
                          {q.question}
                        </p>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 gap-2 pl-9">
                        {q.options.map((opt, optIndex) => {
                          const isSelected = selectedOpt === optIndex;
                          const isCorrect = optIndex === q.correctIndex;

                          let optionClass = 'border-slate-200 hover:bg-slate-50 text-slate-700';

                          if (showQuizResult) {
                            if (isCorrect) {
                              optionClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                            } else if (isSelected && !isCorrect) {
                              optionClass = 'border-red-400 bg-red-50 text-red-900';
                            }
                          } else if (isSelected) {
                            optionClass = 'border-blue-600 bg-blue-50/70 text-blue-950 font-medium ring-1 ring-blue-600';
                          }

                          return (
                            <button
                              key={optIndex}
                              onClick={() => handleSelectAnswer(qIndex, optIndex)}
                              disabled={showQuizResult}
                              className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${optionClass}`}
                            >
                              <span>{opt}</span>
                              {showQuizResult && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {showQuizResult && (
                        <div className="pl-9 pt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-800">Penjelasan POLRI: </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit / Score card */}
              {!showQuizResult ? (
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleCalculateScore}
                    disabled={Object.keys(quizAnswers).length === 0}
                    className="bg-[#0a1d37] hover:bg-[#162c4e] disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-all shadow-md cursor-pointer"
                  >
                    Periksa Jawaban
                  </button>
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-r from-blue-900 to-[#0a1d37] rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-full bg-amber-400/20 ring-2 ring-amber-400 flex items-center justify-center flex-shrink-0">
                      <Award className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wider text-amber-300 font-bold">Hasil Evaluasi</span>
                      <h4 className="text-xl font-bold">Skor Anda: {scorePercentage}%</h4>
                      <p className="text-xs text-slate-300">
                        {scorePercentage >= 80 
                          ? 'Luar biasa! Pemahaman keselamatan Anda sangat matang.'
                          : 'Bagus! Silakan pelajari kembali materi untuk hasil maksimal.'}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center bg-white/10 px-4 py-2 rounded-lg text-xs font-semibold border border-white/20">
                    <FileCheck className="w-4 h-4 mr-1.5 text-emerald-400" />
                    {correctCount} dari {quizList.length} Benar
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => onToggleBookmark(material.id, e)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                material.bookmarked
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${material.bookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{material.bookmarked ? 'Tersimpan di Favorit' : 'Simpan'}</span>
            </button>

            <button
              onClick={handleShare}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Tautan Disalin!' : 'Bagikan'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onDownload(material.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Materi Lengkap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
