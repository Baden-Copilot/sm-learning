import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Shield,
  MapPin,
  Clock,
  ChevronRight,
  Info,
  MessageSquare
} from 'lucide-react';
import { POLRI_LOGO_URL } from '../data/materials';

interface AiChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface AiChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface AiChatPageProps {
  currentUser?: any;
  currentRole?: any;
  authHeaders: Record<string, string>;
}

export const AiChatPage: React.FC<AiChatPageProps> = ({
  currentUser,
  currentRole,
  authHeaders,
}) => {
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const roleId = currentRole?.id || currentUser?.roleId || 'role-learner';
  const roleName = currentRole?.name || currentUser?.role?.name || 'Peserta Belajar';
  const userName = currentUser?.user?.fullName || currentUser?.fullName || 'Pengguna SM-Learning';
  const userWilayah = currentUser?.polda ? `${currentUser.polda}${currentUser.polres ? ` - ${currentUser.polres}` : ''}` : 'Nasional';

  // Quick Prompt Chips berdasarkan Role Pengguna
  const quickPrompts = useMemo(() => {
    switch (roleId) {
      case 'role-admin':
        return [
          { label: '📊 Rekap Nasional Dikmas', prompt: 'Berikan ringkasan data operasional nasional: jumlah materi, sesi sosialisasi, dan status keaktifan sistem.' },
          { label: '🛡️ Panduan Hak Akses Role', prompt: 'Jelaskan matriks wewenang hak akses antara Admin, Trainer, dan Eksekutif di sistem SM-Learning.' },
          { label: '📚 Audit Katalog Modul', prompt: 'Tampilkan pembagian kategori materi per jenjang pendidikan (TK, SD, SMP, SMA) dan rekomendasinya.' },
        ];
      case 'role-trainer':
        return [
          { label: '🎯 Ide Kuis Siswa SD/SMP', prompt: 'Buatkan 5 soal kuis pilihan ganda interaktif beserta kunci jawaban tentang rambu lalu lintas untuk siswa SD.' },
          { label: '📝 Rencana Materi Lapangan', prompt: 'Susun rencana materi penyuluhan tatap muka 45 menit untuk pelajar SMA tentang etika berkendara dan bahaya balap liar.' },
          { label: '📈 Rekap Sesi Sosialisasi', prompt: 'Bagaimana ringkasan capaian peserta dan rata-rata nilai kuis dari sesi sosialisasi yang saya bimbing?' },
        ];
      case 'role-executive-1':
        return [
          { label: '📍 Rekap Kinerja Polres', prompt: 'Tampilkan ringkasan data kegiatan penyuluhan dan rata-rata skor pemahaman masyarakat di wilayah Polres saya.' },
          { label: '🚦 Evaluasi Edukasi Wilayah', prompt: 'Berikan rekomendasi langkah strategis peningkatan kepatuhan lalu lintas untuk jajaran Satlantas Polres.' },
        ];
      case 'role-executive-2':
        return [
          { label: '🗺️ Rekap Sebaran Se-Polda', prompt: 'Tampilkan evaluasi sebaran kegiatan Dikmas Lantas di seluruh Polres jajaran Polda saya.' },
          { label: '📊 Indeks Capaian Polda', prompt: 'Bagaimana tren capaian peserta dan efektivitas modul edukasi di wilayah Polda ini?' },
        ];
      case 'role-executive-3':
        return [
          { label: '🇮🇩 Ringkasan Strategis Nasional', prompt: 'Sajikan ringkasan eksekutif capaian sosialisasi keselamatan lalu lintas nasional dari 34 Polda.' },
          { label: '📈 Rekomendasi Kebijakan Korlantas', prompt: 'Berdasarkan data dikmas nasional, apa poin evaluasi utama untuk penguatan kurikulum keselamatan jalan?' },
        ];
      default:
        return [
          { label: '🚦 Arti Rambu Peringatan', prompt: 'Jelaskan perbedaan rambu peringatan, rambu larangan, dan rambu perintah beserta contohnya.' },
          { label: '🪖 Tips Aman Naik Motor', prompt: 'Apa saja perlengkapan keselamatan wajib dan etika berkendara aman bagi pemula?' },
          { label: '🏆 Modul Rekomendasi', prompt: 'Rekomendasikan materi belajar yang cocok untuk saya tingkatkan pemahaman lalu lintas.' },
        ];
    }
  }, [roleId]);

  // Load daftar sesi
  const loadSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const res = await fetch('/api/ai-chat/sessions', { headers: authHeaders });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSessions(data.data);
        if (data.data.length > 0 && !activeSessionId) {
          setActiveSessionId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Load pesan dalam sesi aktif
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/ai-chat/sessions/${encodeURIComponent(activeSessionId)}/messages`, {
          headers: authHeaders,
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setMessages(data.data);
        }
      } catch (e) {
        console.error('Failed to load session messages:', e);
      }
    };

    loadMessages();
  }, [activeSessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, rateLimitError]);

  // Handle Buat Sesi Baru
  const handleCreateNewSession = async () => {
    try {
      setRateLimitError(null);
      const res = await fetch('/api/ai-chat/sessions', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Percakapan Baru' }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSessions(prev => [data.data, ...prev]);
        setActiveSessionId(data.data.id);
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to create new session:', e);
    }
  };

  // Handle Hapus Sesi
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Hapus sesi percakapan ini? Riwayat pesan di dalamnya akan terhapus.')) return;

    try {
      const res = await fetch(`/api/ai-chat/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter(s => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
          } else {
            setActiveSessionId(null);
            setMessages([]);
          }
        }
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  // Handle Kirim Pesan
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt !== undefined ? customPrompt : inputText;
    if (!textToSend.trim() || isLoading) return;

    const userText = textToSend.trim();
    setInputText('');
    setRateLimitError(null);

    // Optimistic UI for user message
    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: activeSessionId || 'temp-session',
      userId: currentUser?.id || 'me',
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat/send', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: userText,
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.status === 'rate_limited') {
        // TANGKAP RATE LIMIT GEMINI
        setRateLimitError(
          data.message ||
          '⚠️ Limit free Gemini sudah habis. Silakan update token API di pengaturan atau tunggu beberapa menit sampai limit tersedia kembali.'
        );
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menerima respon dari asisten AI.');
      }

      if (data.sessionId && data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId);
        loadSessions();
      }

      if (data.assistantMessage) {
        setMessages(prev => {
          // Replace temp with persistent user message and append assistant message
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, data.userMessage || tempUserMsg, data.assistantMessage];
        });
      }
    } catch (err: any) {
      console.error('Send message error:', err);
      // Jika error bukan rate limit spesifik, jangan kunci total input, cukup tampilkan pesan error
      const msg = String(err.message || err || '');
      if (msg.includes('429') || msg.includes('limit') || msg.includes('Quota')) {
        setRateLimitError(`⚠️ Limit Gemini tercapai: ${msg}`);
      } else {
        setRateLimitError(`Kendala Sistem: ${msg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[580px] max-w-7xl mx-auto">
      {/* 1. SIDEBAR RIWAYAT SESI CHAT */}
      <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
        {/* Tombol New Chat */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={handleCreateNewSession}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#0a1d37] hover:bg-[#132c4f] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Percakapan Baru</span>
          </button>
          <button
            onClick={loadSessions}
            className="p-2.5 text-slate-500 hover:text-[#0a1d37] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Muat Ulang Riwayat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Daftar Sesi */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-transparent">
          {isSessionsLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Memuat riwayat chat...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">Belum Ada Riwayat</p>
              <p className="mt-1">Mulai percakapan pertama Anda dengan Alesha AI.</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setRateLimitError(null);
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 border border-blue-200/80 shadow-2xs font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <Bot className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate pr-1">{s.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                    title="Hapus Sesi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Role Badge Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate font-semibold text-slate-700">{roleName}</span>
          </div>
          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
            {currentUser?.executiveLevel || roleId.replace('role-', '')}
          </span>
        </div>
      </div>

      {/* 2. CHAT MAIN CONTAINER */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        {/* Header Chat */}
        <div className="px-5 py-4 border-b border-slate-100 bg-linear-to-r from-slate-900 to-[#0a1d37] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-600/30 ring-2 ring-blue-400/40 p-1 flex items-center justify-center shadow-inner">
                <img
                  src={POLRI_LOGO_URL}
                  alt="POLRI Emblem"
                  className="w-8 h-8 object-contain drop-shadow"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0a1d37] rounded-full" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-white flex items-center tracking-wide">
                  Alesha AI Dikmas
                  <Sparkles className="w-3.5 h-3.5 ml-1.5 text-amber-300" />
                </h2>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono font-medium">
                  gemini-flash
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center mt-0.5">
                <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                <span className="truncate max-w-[280px] sm:max-w-md">Wilayah: {userWilayah}</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Asisten Aktif</span>
          </div>
        </div>

        {/* BANNER NOTIFIKASI RATE LIMIT (FREE TIER EXHAUSTED) */}
        {rateLimitError && (
          <div className="mx-4 mt-4 p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 flex items-start space-x-3 text-xs animate-in fade-in duration-200 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-950 flex items-center">
                Pemberitahuan Kuota Gemini API
              </p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">{rateLimitError}</p>
              <p className="text-[11px] text-amber-700/80 mt-1">
                Tombol kirim sementara dinonaktifkan untuk mencegah spamming. Silakan coba kembali sesaat lagi.
              </p>
            </div>
            <button
              onClick={() => setRateLimitError(null)}
              className="text-amber-600 hover:text-amber-800 text-xs font-bold px-2 py-1 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* MESSAGE FEED */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            /* Welcome / Empty Screen */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mb-4 text-blue-600 shadow-xs">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Selamat Datang, {userName}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Alesha AI siap mendampingi Anda menjalankan tugas kepolisian dan edukasi masyarakat sesuai wewenang <strong>{roleName}</strong>.
              </p>

              {/* Quick Prompt Chips */}
              <div className="w-full mt-6 space-y-2 text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
                  Saran Pertanyaan Cepat:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qp.prompt)}
                      disabled={Boolean(rateLimitError) || isLoading}
                      className="w-full text-left p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs text-slate-700 hover:text-blue-900 flex items-center justify-between group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <div className="font-medium">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700 block">{qp.label}</span>
                        <span className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{qp.prompt}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Message List */
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                      isUser
                        ? 'bg-[#0a1d37] text-white'
                        : 'bg-white border border-slate-200 text-blue-700 ring-2 ring-blue-50'
                    }`}
                  >
                    {isUser ? (
                      (userName || 'U')[0]
                    ) : (
                      <img src={POLRI_LOGO_URL} alt="POLRI" className="w-5 h-5 object-contain" />
                    )}
                  </div>

                  {/* Bubble Content */}
                  <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative group rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-slate-50 text-slate-800 border border-slate-200/90 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-medium">{m.content}</div>
                      ) : (
                        <MarkdownViewer content={m.content} />
                      )}

                      {/* Copy Button */}
                      {!isUser && (
                        <button
                          onClick={() => handleCopyText(m.content, m.id)}
                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                          title="Salin Pesan"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(m.createdAt || Date.now()).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center p-1 text-blue-700 ring-2 ring-blue-50">
                <img src={POLRI_LOGO_URL} alt="POLRI" className="w-5 h-5 object-contain" />
              </div>
              <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-xs shadow-2xs flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-500 font-medium ml-2">Alesha AI sedang menyusun jawaban...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
          <div className="flex items-end space-x-2 bg-white rounded-2xl border border-slate-300/80 p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={Boolean(rateLimitError) || isLoading}
              placeholder={
                rateLimitError
                  ? 'Limit kuota Gemini tercapai. Silakan tunggu...'
                  : 'Ketik pertanyaan seputar materi, tugas operasional, atau analisis data...'
              }
              rows={1}
              className="flex-1 max-h-32 min-h-[40px] p-2 text-xs text-slate-800 bg-transparent resize-none focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading || Boolean(rateLimitError)}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 cursor-pointer shrink-0"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>Tekan <strong>Enter</strong> untuk mengirim, <strong>Shift + Enter</strong> untuk baris baru.</span>
            <span>Didukung Google Gemini 1.5 Flash (Read-Only Context)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lightweight Markdown Parser & Renderer Component (No External Lib Dependencies)
 */
function MarkdownViewer({ content }: { content: string }) {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let inCodeBlock = false;
    let codeBlockText = '';
    let codeLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Boundary
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Close Code Block
          elements.push(
            <pre key={`code-${i}`} className="p-3 my-2 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
              <code>{codeBlockText.trim()}</code>
            </pre>
          );
          inCodeBlock = false;
          codeBlockText = '';
          codeLanguage = '';
        } else {
          // Open Code Block
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockText += (codeBlockText ? '\n' : '') + line;
        continue;
      }

      // Markdown Table Parser
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line
          .trim()
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());

        // Skip divider row |---|---|
        if (cells.every(c => /^[-:\s]+$/.test(c))) {
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableRows = [cells];
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        // Table finished, render table
        const header = tableRows[0];
        const body = tableRows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200">
                <tr>
                  {header.map((h, hIdx) => (
                    <th key={hIdx} className="p-2.5 border-r last:border-r-0 border-slate-200">
                      {parseInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {body.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 border-r last:border-r-0 border-slate-200 text-slate-700">
                        {parseInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableRows = [];
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="font-bold text-xs text-slate-900 mt-3 mb-1.5 flex items-center">
            {parseInlineFormatting(line.slice(4))}
          </h4>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="font-extrabold text-sm text-slate-900 mt-3.5 mb-2 border-b border-slate-200 pb-1">
            {parseInlineFormatting(line.slice(3))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} className="font-extrabold text-sm text-slate-950 mt-4 mb-2">
            {parseInlineFormatting(line.slice(2))}
          </h2>
        );
        continue;
      }

      // Bullet List (- or *)
      if (/^\s*[-*]\s+/.test(line)) {
        const itemText = line.replace(/^\s*[-*]\s+/, '');
        elements.push(
          <li key={i} className="ml-4 list-disc text-slate-700 my-0.5">
            {parseInlineFormatting(itemText)}
          </li>
        );
        continue;
      }

      // Numbered List
      if (/^\s*\d+\.\s+/.test(line)) {
        const itemText = line.replace(/^\s*\d+\.\s+/, '');
        elements.push(
          <li key={i} className="ml-4 list-decimal text-slate-700 my-0.5">
            {parseInlineFormatting(itemText)}
          </li>
        );
        continue;
      }

      // Empty Line
      if (!line.trim()) {
        elements.push(<div key={i} className="h-2" />);
        continue;
      }

      // Regular Paragraph
      elements.push(
        <p key={i} className="text-slate-800 my-1">
          {parseInlineFormatting(line)}
        </p>
      );
    }

    // Flush any remaining table at end
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1);
      elements.push(
        <div key="table-end" className="my-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200">
              <tr>
                {header.map((h, hIdx) => (
                  <th key={hIdx} className="p-2.5 border-r last:border-r-0 border-slate-200">
                    {parseInlineFormatting(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 border-r last:border-r-0 border-slate-200 text-slate-700">
                      {parseInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return elements;
  }, [content]);

  return <div className="space-y-0.5">{renderedElements}</div>;
}

/**
 * Parser format inline: **bold**, *italic*, `code`
 */
function parseInlineFormatting(text: string): React.ReactNode {
  if (!text) return '';

  // Split by bold (**...**) and inline code (`...`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
