import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Eye,
  Check,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { QuizQuestion } from '../types';

interface QuizBuilderProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  passingScore?: number;
  onPassingScoreChange?: (score: number) => void;
  isReadOnly?: boolean;
}

export function QuizBuilder({
  questions,
  onChange,
  passingScore = 70,
  onPassingScoreChange,
  isReadOnly = false,
}: QuizBuilderProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [previewCurrentIdx, setPreviewCurrentIdx] = useState<number>(0);
  const [previewSelectedAnswers, setPreviewSelectedAnswers] = useState<Record<number, number>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState<boolean>(false);

  // Add Question
  const handleAddQuestion = () => {
    const newId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    const newQ: QuizQuestion = {
      id: newId,
      question: '',
      options: [
        'Pilihan jawaban A',
        'Pilihan jawaban B',
        'Pilihan jawaban C',
        'Pilihan jawaban D'
      ],
      correctIndex: 0,
      explanation: ''
    };
    const updated = [...questions, newQ];
    onChange(updated);
    setExpandedIndex(updated.length - 1);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const newId = Math.max(...questions.map(q => q.id)) + 1;
    const duplicated: QuizQuestion = {
      ...target,
      id: newId,
      question: `${target.question} (Salinan)`
    };
    const updated = [...questions.slice(0, idx + 1), duplicated, ...questions.slice(idx + 1)];
    onChange(updated);
    setExpandedIndex(idx + 1);
  };

  // Delete Question
  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Kuis harus memiliki minimal 1 pertanyaan.');
      return;
    }
    if (confirm(`Hapus Pertanyaan ${idx + 1}?`)) {
      const updated = questions.filter((_, i) => i !== idx);
      onChange(updated);
      setExpandedIndex(Math.max(0, idx - 1));
    }
  };

  // Update question text
  const handleQuestionTextChange = (idx: number, text: string) => {
    const updated = questions.map((q, i) => (i === idx ? { ...q, question: text } : q));
    onChange(updated);
  };

  // Update explanation
  const handleExplanationChange = (idx: number, text: string) => {
    const updated = questions.map((q, i) => (i === idx ? { ...q, explanation: text } : q));
    onChange(updated);
  };

  // Update Option Text
  const handleOptionTextChange = (qIdx: number, optIdx: number, text: string) => {
    const updated = questions.map((q, i) => {
      if (i === qIdx) {
        const newOpts = [...q.options];
        newOpts[optIdx] = text;
        return { ...q, options: newOpts };
      }
      return q;
    });
    onChange(updated);
  };

  // Set Correct Answer
  const handleSetCorrectAnswer = (qIdx: number, optIdx: number) => {
    const updated = questions.map((q, i) => (i === qIdx ? { ...q, correctIndex: optIdx } : q));
    onChange(updated);
  };

  // Add Option to question
  const handleAddOption = (qIdx: number) => {
    const target = questions[qIdx];
    if (target.options.length >= 6) {
      alert('Maksimal 6 pilihan opsi jawaban.');
      return;
    }
    const updated = questions.map((q, i) => {
      if (i === qIdx) {
        return {
          ...q,
          options: [...q.options, `Pilihan baru ${String.fromCharCode(65 + q.options.length)}`]
        };
      }
      return q;
    });
    onChange(updated);
  };

  // Delete Option
  const handleDeleteOption = (qIdx: number, optIdx: number) => {
    const target = questions[qIdx];
    if (target.options.length <= 2) {
      alert('Setiap pertanyaan harus memiliki minimal 2 pilihan jawaban.');
      return;
    }
    const updated = questions.map((q, i) => {
      if (i === qIdx) {
        const newOpts = q.options.filter((_, oIdx) => oIdx !== optIdx);
        let newCorrect = q.correctIndex;
        if (newCorrect === optIdx) newCorrect = 0;
        else if (newCorrect > optIdx) newCorrect -= 1;
        return { ...q, options: newOpts, correctIndex: newCorrect };
      }
      return q;
    });
    onChange(updated);
  };

  // Validation Check
  const getValidationIssues = () => {
    const issues: { qIdx: number; message: string }[] = [];
    questions.forEach((q, idx) => {
      if (!q.question.trim()) {
        issues.push({ qIdx: idx, message: `Pertanyaan ${idx + 1} belum memiliki teks pertanyaan.` });
      }
      if (q.options.some(o => !o.trim())) {
        issues.push({ qIdx: idx, message: `Pertanyaan ${idx + 1} memiliki pilihan jawaban yang masih kosong.` });
      }
    });
    return issues;
  };

  const validationIssues = getValidationIssues();

  // Preview calculations
  const calculatePreviewScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      if (previewSelectedAnswers[idx] === q.correctIndex) correct += 1;
    });
    return Math.round((correct / questions.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="font-headline text-sm font-bold text-slate-900">
              Quiz & Assessment Builder
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Total {questions.length} Butir Soal Evaluasi • Pilihan Ganda Interaktif
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onPassingScoreChange && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
              <span className="text-slate-500 font-medium">Batas Kelulusan:</span>
              <select
                value={passingScore}
                onChange={(e) => onPassingScoreChange(Number(e.target.value))}
                disabled={isReadOnly}
                className="font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value={60}>60%</option>
                <option value={70}>70% (Standar)</option>
                <option value={75}>75%</option>
                <option value={80}>80%</option>
                <option value={85}>85%</option>
              </select>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Editor Soal
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('preview');
                setPreviewCurrentIdx(0);
                setPreviewSubmitted(false);
                setPreviewSelectedAnswers({});
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[#0a1d37] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Kuis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Alert Banner */}
      {validationIssues.length > 0 && activeTab === 'editor' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Perhatian: Ada {validationIssues.length} butir pertanyaan yang membutuhkan kelengkapan data:</span>
          </div>
          <ul className="text-xs text-amber-800 space-y-1 pl-6 list-disc">
            {validationIssues.slice(0, 3).map((issue, idx) => (
              <li
                key={idx}
                className="cursor-pointer hover:underline"
                onClick={() => setExpandedIndex(issue.qIdx)}
              >
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. EDITOR TAB */}
      {activeTab === 'editor' && (
        <div className="space-y-4">
          {questions.map((q, qIdx) => {
            const isExpanded = expandedIndex === qIdx;
            const hasError = !q.question.trim() || q.options.some(o => !o.trim());

            return (
              <div
                key={q.id || qIdx}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                  hasError ? 'border-amber-300' : 'border-slate-200'
                }`}
              >
                {/* Question Card Header */}
                <div
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 select-none"
                  onClick={() => setExpandedIndex(isExpanded ? null : qIdx)}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-7 h-7 rounded-lg bg-[#0a1d37] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {qIdx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {q.question.trim() || <span className="text-slate-400 italic">Pertanyaan belum diisi...</span>}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {q.options.length} Pilihan Jawaban • Kunci: {String.fromCharCode(65 + q.correctIndex)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isReadOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(qIdx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                          title="Duplikasi Soal"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                          title="Hapus Soal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isExpanded ? null : qIdx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Form Area */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/40 space-y-5">
                    {/* Question Text */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Teks Pertanyaan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={q.question}
                        onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                        disabled={isReadOnly}
                        rows={2}
                        placeholder="Tuliskan pertanyaan kuis keselamatan di sini..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
                      />
                    </div>

                    {/* Options Editor */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Pilihan Jawaban (Tandai lingkaran hijau sebagai Kunci Jawaban Benar) <span className="text-red-500">*</span>
                        </label>
                        {!isReadOnly && q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIdx)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Opsi</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctIndex === optIdx;
                          const optLabel = String.fromCharCode(65 + optIdx);

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              {/* Correct radio toggle */}
                              <button
                                type="button"
                                onClick={() => !isReadOnly && handleSetCorrectAnswer(qIdx, optIdx)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer shrink-0 ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan kunci jawaban'}
                              >
                                {optLabel}
                              </button>

                              {/* Input text */}
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                                disabled={isReadOnly}
                                placeholder={`Tulis pilihan jawaban ${optLabel}...`}
                                className="flex-1 bg-transparent border-none text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-medium"
                              />

                              {/* Correct Badge */}
                              {isCorrect && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                  Benar ✓
                                </span>
                              )}

                              {/* Delete Option */}
                              {!isReadOnly && q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOption(qIdx, optIdx)}
                                  className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
                                  title="Hapus opsi ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation / Pembahasan */}
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pembahasan / Penjelasan Jawaban (Ditampilkan setelah peserta menjawab)</span>
                      </label>
                      <textarea
                        value={q.explanation || ''}
                        onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                        disabled={isReadOnly}
                        rows={2}
                        placeholder="Jelaskan alasan mengapa jawaban tersebut benar dan referensi aturan lalu lintasnya..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Question Button */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleAddQuestion}
              className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-[#0a1d37] hover:bg-slate-50/80 rounded-2xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Tambah Butir Soal Baru</span>
            </button>
          )}
        </div>
      )}

      {/* 2. LEARNER PREVIEW MODE */}
      {activeTab === 'preview' && (
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 max-w-2xl mx-auto shadow-2xl">
          {!previewSubmitted ? (
            <>
              {/* Stepper Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-semibold">
                  <span>Pertanyaan {previewCurrentIdx + 1} dari {questions.length}</span>
                  <span className="text-blue-400">Pratinjau Peserta Didik</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${((previewCurrentIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Question */}
              <div className="space-y-3 py-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Pertanyaan #{previewCurrentIdx + 1}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  {questions[previewCurrentIdx]?.question || 'Pertanyaan belum diisi'}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {questions[previewCurrentIdx]?.options.map((opt, optIdx) => {
                  const isSelected = previewSelectedAnswers[previewCurrentIdx] === optIdx;
                  const optLabel = String.fromCharCode(65 + optIdx);

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => setPreviewSelectedAnswers(prev => ({ ...prev, [previewCurrentIdx]: optIdx }))}
                      className={`w-full p-4 rounded-2xl text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 border-2 border-blue-400 text-white shadow-md'
                          : 'bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                          {optLabel}
                        </span>
                        <span>{opt}</span>
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

              {/* Stepper Navigation */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={previewCurrentIdx === 0}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-400 hover:text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Sebelumnya
                </button>

                {previewCurrentIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setPreviewCurrentIdx(prev => prev + 1)}
                    disabled={previewSelectedAnswers[previewCurrentIdx] === undefined}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Lanjut Soal Berikutnya
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreviewSubmitted(true)}
                    disabled={previewSelectedAnswers[previewCurrentIdx] === undefined}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    Simulasi Selesaikan Kuis
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Result Screen in Preview */
            <div className="text-center space-y-5 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">Hasil Simulasi Kuis</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Skor Anda: <strong className="text-emerald-400 text-sm">{calculatePreviewScore()}%</strong> (Passing Grade: {passingScore}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewSubmitted(false);
                  setPreviewCurrentIdx(0);
                  setPreviewSelectedAnswers({});
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Ulangi Simulasi Kuis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
