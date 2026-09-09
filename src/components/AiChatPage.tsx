function round(val: number, dec: number = 0): number { return Math.round(val * Math.pow(10, dec)) / Math.pow(10, dec); }
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
  MessageSquare,
  Paperclip,
  Mic,
  MicOff,
  Square,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  Download,
  X,
  File as FileGeneric
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

  // ── MULTIMODAL ATTACHMENTS STATE ──
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; name: string; size: number; type: string; base64?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── VOICE NOTE RECORDING STATE ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNote, setVoiceNote] = useState<{ base64: string; duration: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

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
          const savedSessionId = typeof window !== 'undefined' ? localStorage.getItem('sm_learning_alesha_session_id') : null;
          const matched = savedSessionId ? data.data.find((s: any) => s.id === savedSessionId) : null;
          setActiveSessionId(matched ? matched.id : data.data[0].id);
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

  // Sinkronisasi session_id aktif ke localStorage untuk memori terpadu dengan Avatar Voice Kiosk
  useEffect(() => {
    if (activeSessionId && typeof window !== 'undefined') {
      localStorage.setItem('sm_learning_alesha_session_id', activeSessionId);
    }
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
  // ── File Selection & Helper Functions ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`Berkas ${file.name} melebihi batas ukuran maksimal (50MB).`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFiles(prev => [
          ...prev,
          {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            base64: reader.result as string
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileCategoryIcon = (fileName: string, mimeType: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext) || mimeType.startsWith('image/')) {
      return <ImageIcon className="w-3.5 h-3.5 text-blue-600" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mimeType.startsWith('video/')) {
      return <Film className="w-3.5 h-3.5 text-purple-600" />;
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
      return <Archive className="w-3.5 h-3.5 text-amber-600" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-600" />;
  };

  // ── Voice Note Recording Functions ──
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Browser Anda belum mendukung perekaman mikrofon.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceNote({
            base64: reader.result as string,
            duration: recordingSeconds
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Gagal mengakses mikrofon:', err);
      alert('Tidak dapat mengakses mikrofon. Pastikan izin akses mikrofon telah diizinkan.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setVoiceNote(null);
      setRecordingSeconds(0);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt !== undefined ? customPrompt : inputText;
    const hasFilesToSend = selectedFiles.length > 0;
    const hasAudioToSend = Boolean(voiceNote);

    if ((!textToSend.trim() && !hasFilesToSend && !hasAudioToSend) || isLoading) return;

    const userText = textToSend.trim();
    const currentFiles = [...selectedFiles];
    const currentAudio = voiceNote ? { ...voiceNote } : null;

    // Reset inputs immediately
    setInputText('');
    setSelectedFiles([]);
    setVoiceNote(null);
    setRateLimitError(null);

    // Build optimistic user message display
    let displayContent = userText;
    if (currentAudio) {
      displayContent = (displayContent ? displayContent + '\n\n' : '') + '🎙️ [Pesan Suara / Voice Note]';
    }
    if (currentFiles.length > 0) {
      const fileNames = currentFiles.map(f => f.name).join(', ');
      displayContent = (displayContent ? displayContent + '\n\n' : '') + `📎 [${currentFiles.length} Lampiran: ${fileNames}]`;
    }
    if (!displayContent) {
      displayContent = 'Tolong analisis berkas lampiran ini.';
    }

    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: activeSessionId || 'temp-session',
      userId: currentUser?.id || 'me',
      role: 'user',
      content: displayContent,
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
          files: currentFiles.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            base64: f.base64
          })),
          audio: currentAudio ? {
            name: 'voicenote.webm',
            base64: currentAudio.base64
          } : null
        }),
      });

      const data = await res.json();

      if (res.status === 429 || data.status === 'rate_limited') {
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
      const msg = String(err.message || err || '');
      setRateLimitError(`Kendala Sistem: ${msg}`);
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
              <p className="mt-1">Mulai percakapan pertama Anda dengan AI Dikmas.</p>
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
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
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
                  Ai Dikmas
                  <Sparkles className="w-3.5 h-3.5 ml-1.5 text-amber-300" />
                </h2>
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
                AI Dikmas siap mendampingi Anda menjalankan tugas kepolisian dan edukasi masyarakat sesuai wewenang <strong>{roleName}</strong>.
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${isUser
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
                      className={`relative group rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${isUser
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
                <span className="text-xs text-slate-500 font-medium ml-2">AI Dikmas sedang menyusun jawaban...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR WITH MULTIMODAL & VOICE NOTE */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
          {/* Hidden File Input (multiple files & multi-extensions) */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.zip,.rar,.tar,.gz,.7z,video/*"
          />

          {/* Active Recording Banner */}
          {isRecording && (
            <div className="mb-2 p-2.5 px-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span className="text-xs font-bold text-red-700">Merekam Pesan Suara...</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-mono font-bold">
                  {formatSeconds(recordingSeconds)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelVoiceRecording}
                  className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-100 text-xs font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={stopVoiceRecording}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" /> Selesai
                </button>
              </div>
            </div>
          )}

          {/* Attachments Preview Chips */}
          {(selectedFiles.length > 0 || voiceNote) && !isRecording && (
            <div className="mb-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
              {/* Voice Note Chip */}
              {voiceNote && (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-medium shadow-2xs">
                  <Mic className="w-3.5 h-3.5 text-purple-600" />
                  <span>Pesan Suara ({formatSeconds(voiceNote.duration)})</span>
                  <button
                    onClick={() => setVoiceNote(null)}
                    className="p-0.5 hover:bg-purple-200 rounded-full cursor-pointer text-purple-600"
                    title="Hapus Rekaman Suara"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Selected Files Chips */}
              {selectedFiles.map((fileItem, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs shadow-2xs hover:bg-slate-200/70 transition-colors"
                >
                  {getFileCategoryIcon(fileItem.name, fileItem.type)}
                  <span className="max-w-[140px] sm:max-w-[200px] truncate font-medium">
                    {fileItem.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({round(fileItem.size / 1024, 0)}KB)
                  </span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-0.5 hover:bg-slate-300 rounded-full cursor-pointer text-slate-500 hover:text-slate-800"
                    title="Hapus Berkas"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end space-x-2 bg-white rounded-2xl border border-slate-300/80 p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-2xs">
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || Boolean(rateLimitError)}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50/60 rounded-xl transition-colors cursor-pointer relative shrink-0"
              title="Unggah Gambar, Dokumen (PDF/Word), Arsip (ZIP), atau Video"
            >
              <Paperclip className="w-4 h-4" />
              {selectedFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {selectedFiles.length}
                </span>
              )}
            </button>

            {/* Voice Note Button */}
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isLoading || Boolean(rateLimitError)}
              className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : voiceNote
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50/60'
                }`}
              title={isRecording ? 'Hentikan Perekaman' : 'Kirim Pesan Suara (Voice Note)'}
            >
              <Mic className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={Boolean(rateLimitError) || isLoading}
              placeholder={
                rateLimitError
                  ? 'Kendala sistem atau limit tercapai. Silakan coba kembali sesaat lagi...'
                  : selectedFiles.length > 0
                    ? `Ketik pertanyaan atau instruksi untuk ${selectedFiles.length} berkas yang dilampirkan...`
                    : voiceNote
                      ? 'Pesan suara siap dikirim (dapat menambahkan teks keterangan jika diinginkan)...'
                      : 'Ketik pertanyaan, rekam suara, atau lampirkan berkas (gambar/pdf/zip/video)...'
              }
              rows={1}
              className="flex-1 max-h-32 min-h-[40px] p-2 text-xs text-slate-800 bg-transparent resize-none focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={(!inputText.trim() && selectedFiles.length === 0 && !voiceNote) || isLoading || Boolean(rateLimitError)}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95 cursor-pointer shrink-0 flex items-center space-x-1"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>
              Tekan <strong>Enter</strong> untuk mengirim, <strong>Shift + Enter</strong> untuk baris baru.
            </span>
            <span className="hidden sm:inline">Didukung OCR, Voice Note & PDF Generator</span>
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

    // Pre-process and normalize markdown strings
    const normalized = normalizeMarkdown(content);
    const lines = normalized.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let inCodeBlock = false;
    let codeBlockText = '';
    let codeLanguage = '';
    let currentListIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Boundary
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${i}`} className="p-3.5 my-2.5 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed shadow-inner">
              <code>{codeBlockText.trim()}</code>
            </pre>
          );
          inCodeBlock = false;
          codeBlockText = '';
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        currentListIndex = 0;
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
        currentListIndex = 0;
        continue;
      } else if (inTable) {
        // Table finished, render table
        elements.push(renderInformativeTable(tableRows, `table-${i}`));
        inTable = false;
        tableRows = [];
      }

      // Reset list numbering if empty line or header
      if (!line.trim() || line.startsWith('#')) {
        currentListIndex = 0;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="font-bold text-xs text-slate-900 mt-3.5 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
            {parseInlineFormatting(line.slice(4))}
          </h4>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="font-extrabold text-sm text-slate-900 mt-4 mb-2 border-b border-slate-200/80 pb-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded bg-indigo-600 inline-block" />
            {parseInlineFormatting(line.slice(3))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} className="font-extrabold text-sm text-slate-950 mt-4 mb-2.5">
            {parseInlineFormatting(line.slice(2))}
          </h2>
        );
        continue;
      }

      // Bullet List (- or *)
      if (/^\s*[-*]\s+/.test(line)) {
        currentListIndex = 0;
        const itemText = line.replace(/^\s*[-*]\s+/, '');
        elements.push(
          <div key={i} className="flex items-start gap-2.5 my-1.5 pl-1.5 text-slate-700 text-[12.5px] leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0 shadow-xs" />
            <div className="flex-1">
              {parseInlineFormatting(itemText)}
            </div>
          </div>
        );
        continue;
      }

      // Numbered List Item (rendered as high-visibility dedicated card row)
      const numberMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
      if (numberMatch) {
        currentListIndex += 1;
        const rawNum = parseInt(numberMatch[1], 10);
        // Use sequential count if numbers repeated like 1. and 1., otherwise use specified number
        const displayNum = (rawNum === 1 && currentListIndex > 1) ? currentListIndex : rawNum;
        const itemText = numberMatch[2];

        elements.push(
          <div
            key={i}
            className="flex items-start gap-3 my-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:bg-blue-50/40 hover:border-blue-200 transition-all duration-200 shadow-2xs group"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs mt-0.5 group-hover:scale-105 transition-transform">
              {displayNum}
            </div>
            <div className="flex-1 text-slate-800 text-[12.5px] leading-relaxed">
              {parseInlineFormatting(itemText)}
            </div>
          </div>
        );
        continue;
      }

      // Empty Line
      if (!line.trim()) {
        elements.push(<div key={i} className="h-1.5" />);
        continue;
      }

      // Detect Document Download Card Link (PDF, Word, Excel, CSV, PPTX, etc.)
      const docCard = parseDocumentDownloadCard(line, i);
      if (docCard) {
        elements.push(docCard);
        continue;
      }

      // Regular Paragraph
      currentListIndex = 0;
      elements.push(
        <p key={i} className="text-slate-800 my-1 leading-relaxed text-[12.5px]">
          {parseInlineFormatting(line)}
        </p>
      );
    }

    // Flush any remaining table at end
    if (inTable && tableRows.length > 0) {
      elements.push(renderInformativeTable(tableRows, 'table-end'));
    }

    return elements;
  }, [content]);

  return <div className="space-y-1">{renderedElements}</div>;
}

/**
 * Normalizes raw LLM response to ensure lists, punctuation and tables
 * break cleanly into dedicated rows instead of collapsing onto a single line.
 */
function normalizeMarkdown(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\r\n/g, '\n');

  // 1. Ensure table start on fresh line if glued to text: 'teks: | No |' -> 'teks:\n\n| No |'
  text = text.replace(/([^\n])\s*(\|[^\n]+\|\n\s*\|[-:\s|]+\|)/g, '$1\n\n$2');

  // 2. Separate trailing text after table row's last pipe:
  // e.g. '| 1 | Tersedia | **Ringkasan:**' -> '| 1 | Tersedia |\n\n**Ringkasan:**'
  const rawLines = text.split('\n');
  const cleanedLines: string[] = [];
  for (const l of rawLines) {
    if (l.trim().startsWith('|')) {
      const lastPipe = l.lastIndexOf('|');
      if (lastPipe > 0) {
        const tail = l.slice(lastPipe + 1).trim();
        if (tail) {
          cleanedLines.push(l.slice(0, lastPipe + 1));
          cleanedLines.push('');
          cleanedLines.push(tail);
          continue;
        }
      }
    }
    cleanedLines.push(l);
  }
  text = cleanedLines.join('\n');

  // 3. Separate numbered list starting right after punctuation or colon (e.g. "membahas: 1. Poin" -> "membahas:\n\n1. Poin")
  text = text.replace(/([:;!?])\s*(\d+\.\s+)/g, '$1\n\n$2');

  // 4. Separate consecutive numbered items even if glued to preceding sentence (e.g. "selesai. 2. **Judul**" -> "selesai.\n\n2. **Judul**")
  text = text.replace(/([^\n|])\s+(\d+\.\s+(?:\*\*|[A-Z]))/g, '$1\n\n$2');

  // 5. Separate bullet lists after punctuation or sentence (e.g. "poin: - satu" -> "poin:\n\n- satu")
  text = text.replace(/([:;!?])\s*([\-*]\s+)/g, '$1\n\n$2');
  text = text.replace(/([^\n|])\s+([\-*]\s+(?:\*\*|[A-Z]))/g, '$1\n\n$2');

  // 6. Separate download links onto their own lines if glued to surrounding text
  text = text.replace(/([^\n])\s*(\[[^\]]+\]\s*\((?:https?:\/\/[^\s)]+|\/static\/[^\s)]+|\.[a-z0-9]+[^\s)]*)\))/gi, '$1\n\n$2');
  text = text.replace(/(\[[^\]]+\]\s*\((?:https?:\/\/[^\s)]+|\/static\/[^\s)]+|\.[a-z0-9]+[^\s)]*)\))\s*([^\n])/gi, '$1\n\n$2');

  return text;
}

function renderInformativeTable(tableRows: string[][], key: string | number) {
  if (!tableRows || tableRows.length === 0) return null;
  const header = tableRows[0];
  const body = tableRows.slice(1);

  return (
    <div key={key} className="my-3.5 rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
      {/* Table Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white px-3.5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold tracking-wide text-slate-100">Ringkasan Data & Informasi</span>
        </div>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-blue-200 border border-white/10">
          {body.length} baris
        </span>
      </div>

      {/* Table Body Container */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/95 text-slate-900 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
            <tr>
              {header.map((h, hIdx) => (
                <th key={hIdx} className="py-2.5 px-3 border-r last:border-r-0 border-slate-200/80 whitespace-nowrap">
                  {parseInlineFormatting(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors odd:bg-white even:bg-slate-50/50">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2.5 px-3 border-r last:border-r-0 border-slate-200/60 text-slate-700">
                    {renderTableCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Intelligent cell formatter that renders badges for status / metrics
 */
function renderTableCell(cell: string): React.ReactNode {
  const trimmed = cell.trim();
  const lower = trimmed.toLowerCase();

  // Status Success / Completed
  if (['aktif', 'selesai', 'lulus', 'sukses', 'lengkap', 'terverifikasi'].includes(lower)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        {trimmed}
      </span>
    );
  }

  // Status Pending / Warning
  if (['pending', 'proses', 'berjalan', 'menunggu', 'draft'].includes(lower)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        {trimmed}
      </span>
    );
  }

  // Status Danger / Inactive
  if (['nonaktif', 'gagal', 'belum', 'tidak aktif', 'batal'].includes(lower)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        {trimmed}
      </span>
    );
  }

  // Percentage Values (e.g. 100%, 85%)
  if (/^\d+(\.\d+)?%$/.test(trimmed)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
        {trimmed}
      </span>
    );
  }

  return parseInlineFormatting(trimmed);
}

/**
 * Parser format inline: **bold**, *italic*, `code`, [link](url)
 */
function parseInlineFormatting(text: string): React.ReactNode {
  if (!text) return '';

  // Match bold (**...**), inline code (`...`), italic (*...*), or standard markdown links [text](url)
  const parts = text.split(/(\*\*[^*]+?\*\*|`[^`]+?`|\*[^*]+?\*|\[[^\]]+\]\s*\([^)\s]+\))/g);

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
        <code key={index} className="px-1.5 py-0.5 bg-slate-200/90 text-slate-800 rounded font-mono text-[11px]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\s*\(([^)\s]+)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      let href = linkMatch[2];
      if (href.startsWith('/static/')) {
        const apiBase = typeof window !== 'undefined' && window.location.hostname == 'https://alesha.djalu.co.id';
        href = `${apiBase}${href}`;
      }
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-1"
        >
          {linkText}
        </a>
      );
    }

    return part;
  });
}

/**
 * Detects Document download links (Word, Excel, CSV, PDF, PowerPoint, etc.)
 * and renders high-visibility, attractive, dedicated Card UIs tailored to each file type.
 */
function parseDocumentDownloadCard(line: string, key: string | number): React.ReactNode | null {
  // Matches markdown link with optional whitespace between ] and (: [Title] (url) or [Title](url)
  const match = line.match(/\[([^\]]+)\]\s*\(([^)\s]+)\)/i);
  if (!match) return null;

  const rawLabel = match[1].trim();
  let fileUrl = match[2].trim();
  const lowerLabel = rawLabel.toLowerCase();
  const lowerUrl = fileUrl.toLowerCase();

  // Check if this link is a file or document download link
  const isDocLink =
    lowerUrl.includes('/static/exports/') ||
    /\.(pdf|docx?|xlsx?|csv|pptx?|zip|rar|tar|gz|txt)(?:\?|#|$)/i.test(lowerUrl) ||
    /(?:unduh|download|dokumen|berkas|file|rekapitulasi|laporan|export)/i.test(lowerLabel);

  if (!isDocLink) return null;

  // Resolve backend server URL for static exports
  if (fileUrl.startsWith('/static/')) {
    const apiBase = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://${window.location.hostname}:8000`
      : 'http://localhost:8000';
    fileUrl = `${apiBase}${fileUrl}`;
  }

  // Determine file type category
  type FileCategory = 'word' | 'excel' | 'csv' | 'pdf' | 'pptx' | 'file';
  let category: FileCategory = 'file';

  if (/\.docx?(?:\?|#|$)/i.test(lowerUrl) || /(?:word|docx?)/i.test(lowerLabel)) {
    category = 'word';
  } else if (/\.xlsx?(?:\?|#|$)/i.test(lowerUrl) || /(?:excel|xlsx?|spreadsheet|lembar\s*kerja)/i.test(lowerLabel)) {
    category = 'excel';
  } else if (/\.csv(?:\?|#|$)/i.test(lowerUrl) || /csv/i.test(lowerLabel)) {
    category = 'csv';
  } else if (/\.pdf(?:\?|#|$)/i.test(lowerUrl) || /pdf/i.test(lowerLabel)) {
    category = 'pdf';
  } else if (/\.pptx?(?:\?|#|$)/i.test(lowerUrl) || /(?:powerpoint|pptx?|presentasi|paparan)/i.test(lowerLabel)) {
    category = 'pptx';
  }

  // Clean document title for display
  let docTitle = rawLabel
    .replace(/^(?:unduh|download)\s+(?:dokumen|file|berkas)?\s*(?:word|docx?|excel|xlsx?|spreadsheet|csv|pdf|pptx?|powerpoint)?\s*[:\-–—]?\s*/i, '')
    .replace(/^(?:dokumen|file|berkas)\s+(?:word|docx?|excel|xlsx?|spreadsheet|csv|pdf|pptx?|powerpoint)?\s*[:\-–—]?\s*/i, '')
    .trim();

  if (!docTitle) {
    docTitle = rawLabel;
  }

  // Styling and configuration per file format
  const configs: Record<FileCategory, {
    badgeText: string;
    badgeBg: string;
    cardBg: string;
    cardBorder: string;
    btnBg: string;
    btnText: string;
    subtitle: string;
  }> = {
    word: {
      badgeText: 'DOCX',
      badgeBg: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      cardBg: 'bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50',
      cardBorder: 'border-blue-200/90',
      btnBg: 'bg-blue-600 hover:bg-blue-700 active:scale-95',
      btnText: 'Unduh Word',
      subtitle: 'Dokumen Word Korlantas POLRI Siap Diunduh',
    },
    excel: {
      badgeText: 'XLSX',
      badgeBg: 'bg-gradient-to-br from-emerald-600 to-teal-700',
      cardBg: 'bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50',
      cardBorder: 'border-emerald-200/90',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 active:scale-95',
      btnText: 'Unduh Excel',
      subtitle: 'Spreadsheet Excel Korlantas POLRI Siap Diunduh',
    },
    csv: {
      badgeText: 'CSV',
      badgeBg: 'bg-gradient-to-br from-teal-600 to-cyan-700',
      cardBg: 'bg-gradient-to-r from-teal-50/90 via-cyan-50/70 to-slate-50',
      cardBorder: 'border-teal-200/90',
      btnBg: 'bg-teal-600 hover:bg-teal-700 active:scale-95',
      btnText: 'Unduh CSV',
      subtitle: 'Format Data CSV Korlantas POLRI Siap Diunduh',
    },
    pdf: {
      badgeText: 'PDF',
      badgeBg: 'bg-gradient-to-br from-red-600 to-rose-700',
      cardBg: 'bg-gradient-to-r from-red-50/90 via-rose-50/70 to-slate-50',
      cardBorder: 'border-red-200/90',
      btnBg: 'bg-red-600 hover:bg-red-700 active:scale-95',
      btnText: 'Unduh PDF',
      subtitle: 'Dokumen Resmi Korlantas POLRI Siap Diunduh',
    },
    pptx: {
      badgeText: 'PPTX',
      badgeBg: 'bg-gradient-to-br from-orange-600 to-amber-700',
      cardBg: 'bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-slate-50',
      cardBorder: 'border-orange-200/90',
      btnBg: 'bg-orange-600 hover:bg-orange-700 active:scale-95',
      btnText: 'Unduh PPT',
      subtitle: 'Paparan Presentasi Korlantas POLRI Siap Diunduh',
    },
    file: {
      badgeText: 'FILE',
      badgeBg: 'bg-gradient-to-br from-slate-700 to-indigo-800',
      cardBg: 'bg-gradient-to-r from-slate-50/90 via-indigo-50/40 to-slate-50',
      cardBorder: 'border-slate-200/90',
      btnBg: 'bg-slate-800 hover:bg-slate-900 active:scale-95',
      btnText: 'Unduh Berkas',
      subtitle: 'Berkas Dokumen Korlantas POLRI Siap Diunduh',
    },
  };

  const config = configs[category];

  // Check if line has text before or after the markdown link
  const beforeText = line.slice(0, match.index).trim();
  const afterText = line.slice((match.index || 0) + match[0].length).trim();

  return (
    <div key={key} className="my-2 space-y-1.5">
      {beforeText && (
        <p className="text-slate-800 leading-relaxed text-[12.5px]">
          {parseInlineFormatting(beforeText)}
        </p>
      )}

      <div
        className={`my-3 p-4 rounded-2xl ${config.cardBg} border ${config.cardBorder} shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${config.badgeBg} text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform tracking-wider`}
          >
            {config.badgeText}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug">
              {docTitle}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {config.subtitle}
            </div>
          </div>
        </div>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className={`px-4 py-2 rounded-xl ${config.btnBg} text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer flex-shrink-0`}
        >
          <Download className="w-3.5 h-3.5" />
          {config.btnText}
        </a>
      </div>

      {afterText && (
        <p className="text-slate-800 leading-relaxed text-[12.5px]">
          {parseInlineFormatting(afterText)}
        </p>
      )}
    </div>
  );
}
