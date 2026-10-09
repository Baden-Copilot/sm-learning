import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  GitCompare,
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
  File as FileGeneric,
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  Maximize2,
  Minimize2,
  Search,
  HelpCircle,
  Layers,
  CheckCircle2,
  BookmarkCheck,
  BookOpen,
  GraduationCap,
  Zap
} from 'lucide-react';
import { POLRI_LOGO_URL } from '../data/materials';

export interface AiChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  attachments?: Array<{ name: string; type: string; size: number }>;
}

export interface AiChatPageProps {
  currentUser?: any;
  currentRole?: any;
  authHeaders: Record<string, string>;
}

// Chart Colors matching Dikmas Lantas POLRI theme
const CHART_PALETTE = [
  '#2563eb', // Blue 600
  '#0d9488', // Teal 600
  '#f59e0b', // Amber 500
  '#ef4444', // Rose 500
  '#8b5cf6', // Violet 500
  '#06b6d4', // Cyan 500
  '#ec4899', // Pink 500
  '#10b981', // Emerald 500
  '#64748b', // Slate 500
  '#6366f1', // Indigo 500
];

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
  const [sessionSearch, setSessionSearch] = useState('');
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<any | null>(null);

  // Multimodal file attachments state
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; name: string; size: number; type: string; base64?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNote, setVoiceNote] = useState<{ base64: string; duration: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ekstraksi data pengguna dengan fallback berlapis (props currentUser, nested user, sessionStorage)
  const sessionUserData = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('currentUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const activeUser = currentUser?.user || currentUser || sessionUserData?.user || sessionUserData || {};
  const activeRoleObj = currentRole || currentUser?.role || sessionUserData?.role || null;

  const roleId = activeRoleObj?.id || activeUser?.roleId || 'role-learner';
  const roleName = activeRoleObj?.name || activeUser?.role?.name || 'Peserta Dikmas Lantas';
  const userName = activeUser?.fullName || activeUser?.name || 'Personel Korlantas';

  // Penentuan tingkat/level wilayah terakhir yang sedang login:
  // 1. Jika polres ada nilainya -> Level Polres dari wilayah tersebut
  // 2. Jika polres kosong & polda ada nilainya -> Level Polda dari wilayah tersebut
  // 3. Jika keduanya kosong atau Korlantas/Mabes -> Level Nasional
  const userWilayahInfo = useMemo(() => {
    const rawPolres = String(activeUser?.polres || '').trim();
    const rawPolda = String(activeUser?.polda || '').trim();

    const isVal = (val: string) => {
      const clean = val.toLowerCase();
      return clean !== '' && clean !== '-' && clean !== 'null' && clean !== 'undefined' && clean !== 'none';
    };

    const hasPolres = isVal(rawPolres);
    const hasPolda = isVal(rawPolda);

    const toCapitalized = (str: string) => {
      return str
        .toLowerCase()
        .split(' ')
        .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
        .join(' ');
    };

    // Helper untuk membersihkan prefiks dan mengubah format ke Capitalized (Title Case)
    const cleanName = (val: string) => {
      const stripped = val
        .replace(/^(POLRES\s+METRO|POLRESTABES|POLRESTA|POLRES|POLDA)\s+/i, '')
        .trim();
      return toCapitalized(stripped);
    };

    const isPusat = (p: string) => {
      const up = p.toUpperCase();
      return up.includes('KORLANTAS') || up.includes('MABES') || up.includes('PUSAT') || up.includes('NASIONAL');
    };

    // Akun level mabes/pusat/nasional atau yang tidak memiliki polda/polres dianggap akun mabes/pusat/nasional
    const execLvl = String(activeUser?.executive_level || activeUser?.executiveLevel || '').toLowerCase().trim();
    const roleId = String(activeUser?.roleId || activeUser?.role_id || '').toLowerCase().trim();
    const isPusatOrNational = execLvl === 'nasional' || execLvl === 'mabes' || execLvl === 'pusat' ||
      roleId === 'role-executive-3' || roleId === 'role-admin' ||
      isPusat(rawPolda) || isPusat(rawPolres) || (!hasPolda && !hasPolres);

    if (isPusatOrNational) {
      return {
        level: 'nasional',
        levelLabel: 'Nasional',
        displayName: 'Nasional',
        rawPolres,
        rawPolda,
      };
    }

    // 1. Level Terakhir POLRES: Ambil murni nama polresnya saja (tanpa kata 'Polres')
    if (hasPolres) {
      return {
        level: 'polres',
        levelLabel: 'Polres',
        displayName: cleanName(rawPolres),
        rawPolres,
        rawPolda,
      };
    }

    // 2. Level Terakhir POLDA: Ambil murni nama poldanya saja (tanpa kata 'Polda')
    if (hasPolda && !isPusat(rawPolda)) {
      return {
        level: 'polda',
        levelLabel: 'Polda',
        displayName: cleanName(rawPolda),
        rawPolres,
        rawPolda,
      };
    }

    // 3. Fallback: Set murni 'Nasional'
    return {
      level: 'nasional',
      levelLabel: 'Nasional',
      displayName: 'Nasional',
      rawPolres,
      rawPolda,
    };
  }, [activeUser]);

  const userWilayah = userWilayahInfo.displayName;

  // Quick Suggestion Chips khusus Menu SM-Learning
  const quickCategories = useMemo(() => [
    {
      label: '📊 Rangkuman Kegiatan Dikmas',
      prompt: 'Buat rangkuman kegiatan dikmas minggu ini.',
    },
    {
      label: '📚 Materi Hanjar Komunitas',
      prompt: 'Buat Materi Hanjar untuk Komunitas',
    },
    {
      label: '🛵 Slogan Kampanye Keselamatan OJOL',
      prompt: 'Buat Slogan Kampanye Keselamatan Untuk Pengemudi OJOL',
    },
  ], []);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const q = sessionSearch.toLowerCase();
    return sessions.filter(s => s.title.toLowerCase().includes(q));
  }, [sessions, sessionSearch]);

  // Load daftar sesi
  const loadSessions = useCallback(async () => {
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
  }, [authHeaders, activeSessionId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

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
  }, [activeSessionId, authHeaders]);

  // Sinkronisasi session_id aktif ke localStorage
  useEffect(() => {
    if (activeSessionId && typeof window !== 'undefined') {
      localStorage.setItem('sm_learning_alesha_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, rateLimitError]);

  // Stop speech when unmounting or switching session
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeSessionId]);

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

  // Handle Bersihkan Semua Sesi
  const handleClearAllSessions = async () => {
    if (!window.confirm('Bersihkan seluruh riwayat percakapan AI? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
      const res = await fetch('/api/ai-chat/sessions', {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSessions([]);
        setActiveSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      console.error('Failed to clear all chat sessions:', e);
    }
  };

  // File Selection
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

  // Voice Note Recording
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
      alert('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon telah diberikan.');
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
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
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

  // Handle Kirim Pesan
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

    // Optimistic user display
    let displayContent = userText;
    if (currentAudio) {
      displayContent = (displayContent ? displayContent + '\n\n' : '') + '🎤 [Pesan Suara / Voice Note Dikirim]';
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
          'Limit kuota sementara habis. Silakan coba kembali dalam beberapa saat.'
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
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10.5rem)] min-h-[560px] w-full max-w-7xl mx-auto min-w-0">
      {/* 1. SIDEBAR RIWAYAT SESI CHAT */}
      <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden shrink-0">
        {/* Tombol New Chat & Refresh */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
          <button
            onClick={handleCreateNewSession}
            className="flex-1 flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-[#0a1d37] hover:bg-[#132c4f] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Percakapan Baru</span>
          </button>
          <button
            onClick={loadSessions}
            className="p-2 text-slate-500 hover:text-[#0a1d37] hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
            title="Muat Ulang Riwayat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Search Session Filter */}
        <div className="p-2.5 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              placeholder="Cari riwayat percakapan..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {sessionSearch && (
              <button
                onClick={() => setSessionSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Daftar Sesi */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {isSessionsLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Memuat riwayat chat...</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">
                {sessionSearch ? 'Tidak Ditemukan' : 'Belum Ada Riwayat'}
              </p>
              <p className="mt-1">
                {sessionSearch ? 'Coba kata kunci pencarian lain.' : 'Mulai percakapan pertama Anda dengan Alesha Dikmas.'}
              </p>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setRateLimitError(null);
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${isActive
                    ? 'bg-blue-50/90 text-blue-950 border border-blue-200 shadow-2xs font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
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

        {/* Clear All Sessions Button */}
        {sessions.length > 0 && (
          <div className="p-2 border-t border-slate-100 bg-slate-50/40">
            <button
              onClick={handleClearAllSessions}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-slate-500 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Bersihkan Seluruh Riwayat</span>
            </button>
          </div>
        )}

        {/* User Role Badge Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
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
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden">
        {/* Header Chat */}
        <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-[#0a1d37] to-[#132c4f] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-600/30 ring-2 ring-blue-400/40 p-1 flex items-center justify-center shadow-inner">
                <img
                  src={POLRI_LOGO_URL}
                  alt="POLRI Emblem"
                  className="w-8 h-8 object-contain drop-shadow"
                />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0a1d37] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-white flex items-center tracking-wide">
                  Alesha Dikmas Lantas
                  <Sparkles className="w-3.5 h-3.5 ml-1.5 text-amber-300" />
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Online • Siap Melayani
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center mt-0.5">
                <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                <span className="truncate max-w-[280px] sm:max-w-md">Wilayah: <span className="capitalize font-medium text-slate-200">{userWilayah}</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Read-Only Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-200 text-[11px] font-semibold">
              <Shield className="w-3 h-3 text-blue-300" />
              <span className="hidden md:inline">Mode Read-Only Aktif</span>
            </div>
          </div>
        </div>

        {/* BANNER NOTIFIKASI RATE LIMIT */}
        {rateLimitError && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 flex items-start space-x-3 text-xs animate-in fade-in duration-200 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-950">Pemberitahuan Sistem</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">{rateLimitError}</p>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {messages.length === 0 ? (
            /* Welcome / Empty Screen */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center mb-3.5 text-blue-600 shadow-xs">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900">
                Selamat Datang, {userName}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-md">
                Alesha siap menyajikan data real-time, grafik analitik, modul hanjar, serta laporan kegiatan SM-Learning Korlantas POLRI dalam wewenang <strong>{roleName}</strong>.
              </p>

              {/* Quick Categories Bar */}
              <div className="w-full mt-6 space-y-2 text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                  Pilih Pertanyaan Cepat Berdasarkan Menu:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                  {quickCategories.map((qc, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(qc.prompt)}
                      disabled={Boolean(rateLimitError) || isLoading}
                      className="text-left p-3 rounded-xl border border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs text-slate-700 hover:text-blue-950 flex items-center justify-between group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <div className="font-medium pr-2">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700 block text-xs">
                          {qc.label}
                        </span>
                        <span className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                          {qc.prompt}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
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
                  <div className={`max-w-[90%] sm:max-w-[82%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`relative group rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-slate-50/90 text-slate-800 border border-slate-200/90 rounded-tl-xs'
                        }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap font-medium">{m.content}</div>
                      ) : (
                        <MarkdownViewer
                          content={m.content}
                          onExpandChart={(chart) => setExpandedChart(chart)}
                          onAction={(actionPrompt) => handleSendMessage(actionPrompt)}
                        />
                      )}

                      {/* Assistant Actions Bar: Copy & TTS Voice Reader */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/70 text-slate-500">
                          <button
                            onClick={() => handleCopyText(m.content, m.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Salin Teks Jawaban"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Disalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
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
                <span className="text-xs text-slate-600 font-medium ml-2">Alesha sedang membaca database & menyusun jawaban...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT BAR WITH MULTIMODAL & VOICE NOTE */}
        <div className="p-3.5 border-t border-slate-200/90 bg-slate-50/50">
          {/* Hidden File Input */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.zip,.rar,.tar,.gz,.7z,video/*"
          />

          {/* Active Voice Recording Banner */}
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

          {/* Active Voice Note Preview */}
          {voiceNote && (
            <div className="mb-2 flex items-center gap-2 p-2 px-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
              <Mic className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="font-semibold">Rekaman Suara ({voiceNote.duration} detik) siap dikirim.</span>
              <button
                onClick={() => setVoiceNote(null)}
                className="ml-auto p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Selected Files Chips */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-white border border-slate-200 shadow-2xs text-[11px] text-slate-700"
                >
                  <Paperclip className="w-3 h-3 text-blue-600" />
                  <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                  <button
                    onClick={() => removeFile(idx)}
                    className="p-0.5 text-slate-400 hover:text-red-600 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Textarea and Actions */}
          <div className="flex items-end gap-2 bg-white rounded-xl border border-slate-300/90 p-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500 transition-all shadow-2xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Lampirkan Dokumen / Gambar"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${isRecording
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                }`}
              title={isRecording ? 'Hentikan Rekaman' : 'Rekam Pesan Suara'}
            >
              <Mic className="w-4 h-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan data materi, outreach, evaluasi kuis, atau personel SM-Learning..."
              rows={1}
              className="flex-1 py-1.5 px-2 text-xs text-slate-900 placeholder:text-slate-400 resize-none max-h-32 focus:outline-none leading-relaxed bg-transparent"
              style={{ minHeight: '36px' }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || (!inputText.trim() && selectedFiles.length === 0 && !voiceNote)}
              className="p-2.5 rounded-xl bg-[#0a1d37] hover:bg-[#132c4f] disabled:opacity-40 disabled:hover:bg-[#0a1d37] text-white shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
            <span>
              Tekan <strong>Enter</strong> kirim, <strong>Shift + Enter</strong> baris baru.
            </span>
            <span className="hidden sm:flex items-center gap-1 text-slate-500">
              <Shield className="w-3 h-3 text-blue-600" />
              Mode Read-Only Aktif
            </span>
          </div>
        </div>
      </div>

      {/* MODAL EXPANDED CHART PREVIEW */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white rounded-2xl ${expandedChart.isMulti ? "max-w-6xl" : "max-w-4xl"} w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                {expandedChart.isMulti ? (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-blue-700" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-blue-700" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{expandedChart.title || 'Preview Visual Grafik'}</h3>
                  <p className="text-[11px] text-slate-500">
                    {expandedChart.subtitle || (expandedChart.isMulti ? 'Tampilan penuh seluruh grafik dan kesimpulan analisis' : 'Visualisasi data grafik statistik')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {expandedChart.isMulti ? (
                <AleshaMultiChartBoard
                  charts={expandedChart.charts}
                  title={expandedChart.title}
                  summaryText={expandedChart.summaryText}
                  isModal={true}
                />
              ) : (
                <AleshaChartViewer chartData={expandedChart} isModal={true} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MARKDOWN & RICH CONTENT PARSER
// ==========================================


// ==========================================
// RESILIENT CHART JSON PARSER & RENDERERS
// ==========================================

// Safe PNG export supporting modern oklab / oklch Tailwind colors
async function exportElementToPng(element: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2, // 2x Retina resolution for razor-sharp text & graphics
      backgroundColor: '#ffffff',
    });
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.warn('html-to-image failed, falling back to html2canvas:', err);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (fallbackErr) {
      console.error('All PNG export methods failed:', fallbackErr);
      throw fallbackErr;
    }
  }
}

function safeParseChartJson(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();

  // Strip wrapping markdown code blocks if present
  text = text.replace(/^```[a-z0-9_:-]*\s*/i, '').replace(/\s*```$/i, '').trim();

  // Fast check: must have chart data indicators
  const hasDataKey = text.includes('"data"') || text.includes('"items"') || text.includes('"charts"') ||
    text.includes("'data'") || text.includes("'items'") || text.includes("'charts'");
  if (!hasDataKey) return null;

  // 1. Direct JSON.parse
  try {
    const direct = JSON.parse(text);
    if (direct && (direct.data || direct.items || direct.charts)) return direct;
  } catch (e) { }

  // 2. Resilient normalization: fix literal newlines in strings, trailing commas
  try {
    const fixedNewlines = text.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_m, str) => {
      return '"' + str.replace(/[\r\n]+/g, ' ') + '"';
    });
    const cleanCommas = fixedNewlines.replace(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(cleanCommas);
    if (parsed && (parsed.data || parsed.items || parsed.charts)) return parsed;
  } catch (e) { }

  // 3. Fallback regex extraction of chart title & array data
  try {
    const titleMatch = text.match(/["']title["']\s*:\s*["']([^"']+)["']/i) ||
      text.match(/["']title["']\s*:\s*["']([\s\S]*?)["']\s*,/i);
    const subtitleMatch = text.match(/["']subtitle["']\s*:\s*["']([^"']+)["']/i);
    const typeMatch = text.match(/["'](?:type|chart_type)["']\s*:\s*["']([a-z0-9_-]+)["']/i);

    const dataMatch = text.match(/["'](?:data|items)["']\s*:\s*(\[[\s\S]*?\])(?:\s*[,}]|$)/i);
    if (dataMatch) {
      let arrayStr = dataMatch[1]
        .replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_m, str) => '"' + str.replace(/[\r\n]+/g, ' ') + '"')
        .replace(/,\s*\]/g, ']')
        .replace(/[\r\n]+/g, ' ');
      const parsedData = JSON.parse(arrayStr);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return {
          title: titleMatch ? titleMatch[1].replace(/[\r\n]+/g, ' ').trim() : 'Statistik SM-Learning',
          subtitle: subtitleMatch ? subtitleMatch[1].replace(/[\r\n]+/g, ' ').trim() : undefined,
          type: typeMatch ? typeMatch[1] : 'bar',
          data: parsedData
        };
      }
    }
  } catch (e) { }

  return null;
}

interface AleshaChartViewerProps {
  chartData: any;
  onExpand?: (chart: any) => void;
  isModal?: boolean;
  hideDownload?: boolean;
}

function AleshaChartViewer({ chartData, onExpand, isModal = false, hideDownload = false }: AleshaChartViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const rawList = Array.isArray(chartData.data)
    ? chartData.data
    : Array.isArray(chartData.items)
      ? chartData.items
      : [];

  const rawType = (chartData.type || chartData.chart_type || 'bar').toLowerCase();
  type ChartViewMode = 'bar' | 'line' | 'combo' | 'dual-line' | 'pie';

  const detectedType: ChartViewMode = ['pie', 'donut'].includes(rawType)
    ? 'pie'
    : ['combo', 'bar_line', 'line_bar', 'batang_line'].includes(rawType)
      ? 'combo'
      : ['dual_line', 'double_line', 'line_line', 'compare', 'comparison'].includes(rawType)
        ? 'dual-line'
        : ['line', 'area', 'tren', 'garis'].includes(rawType)
          ? 'line'
          : 'bar';

  // Interactive toggle between: Bar, Line, Combo (Bar+Line), Dual Line (Line+Line), Pie
  const [viewMode, setViewMode] = useState<ChartViewMode>(detectedType);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Labels for comparisons with intelligent detection for 5 standardized time-range patterns:
  // 1. Hari Ini vs Kemarin
  // 2. Tanggal H-0 vs Tanggal H-1
  // 3. Minggu Ini vs Minggu Lalu
  // 4. Bulan Ini vs Bulan Lalu
  // 5. Tahun Ini vs Tahun Lalu
  const titleAndSubtitle = `${chartData.title || ''} ${chartData.subtitle || ''}`.toLowerCase();

  let autoPrimaryLabel = 'Aktual / Data Sekarang';
  let autoSecondaryLabel = 'Pembanding / Data Sebelumnya';

  if (/\bh[-_]?0\b.*\bh[-_]?1\b|\bh[-_]?1\b.*\bh[-_]?0\b/i.test(titleAndSubtitle)) {
    autoPrimaryLabel = 'Tanggal H-0';
    autoSecondaryLabel = 'Tanggal H-1';
  } else if (/hari\s*ini.*kemarin|kemarin.*hari\s*ini|today.*yesterday/i.test(titleAndSubtitle)) {
    autoPrimaryLabel = 'Hari Ini';
    autoSecondaryLabel = 'Kemarin';
  } else if (/minggu\s*ini.*minggu\s*lalu|minggu\s*lalu.*minggu\s*ini|pekan\s*ini.*pekan\s*lalu|this\s*week.*last\s*week/i.test(titleAndSubtitle)) {
    autoPrimaryLabel = 'Minggu Ini';
    autoSecondaryLabel = 'Minggu Lalu';
  } else if (/bulan\s*ini.*bulan\s*lalu|bulan\s*lalu.*bulan\s*ini|this\s*month.*last\s*month/i.test(titleAndSubtitle)) {
    autoPrimaryLabel = 'Bulan Ini';
    autoSecondaryLabel = 'Bulan Lalu';
  } else if (/tahun\s*ini.*tahun\s*lalu|tahun\s*lalu.*tahun\s*ini|this\s*year.*last\s*year|yoy|year[- ]on[- ]year/i.test(titleAndSubtitle)) {
    autoPrimaryLabel = 'Tahun Ini';
    autoSecondaryLabel = 'Tahun Lalu';
  }

  const primaryLabel = chartData.primary_label || chartData.series_label || chartData.series1_label || autoPrimaryLabel;
  const secondaryLabel = chartData.secondary_label || chartData.target_label || chartData.series2_label || autoSecondaryLabel;

  // Smart mapping: strictly extract human-readable name, primary value & secondary comparison value
  const data = useMemo(() => {
    return rawList.map((item: any, idx: number) => {
      let rawName = (
        item.name ||
        item.nama ||
        item.full_name ||
        item.nama_lengkap ||
        item.title ||
        item.judul ||
        item.role_name ||
        item.label ||
        item.kategori ||
        item.category ||
        item.polres ||
        item.polda ||
        item.periode ||
        item.bulan ||
        item.waktu ||
        item.jenis ||
        item.level ||
        item.status ||
        `Data ${idx + 1}`
      );
      let cleanName = String(rawName).replace(/[*_`]/g, '').trim();

      if (/^(user-|mat-|sess-|cert-|role-|trc_|[0-9a-f]{8}-[0-9a-f]{4}|[0-9]+$)/i.test(cleanName)) {
        cleanName = (
          item.full_name ||
          item.nama ||
          item.title ||
          item.judul ||
          item.role_name ||
          item.polres ||
          item.polda ||
          item.label ||
          `Item ${idx + 1}`
        );
      }

      if (cleanName === 'role-admin') cleanName = 'Admin / Superuser';
      else if (cleanName === 'role-executive-3') cleanName = 'Eksekutif 3 (Nasional)';
      else if (cleanName === 'role-executive-2') cleanName = 'Eksekutif 2 (Polda)';
      else if (cleanName === 'role-executive-1') cleanName = 'Eksekutif 1 (Polres)';
      else if (cleanName === 'role-trainer') cleanName = 'Trainer / Instruktur';

      const value = Number(
        item.value ?? item.count ?? item.total ?? item.jumlah ?? item.views ?? item.downloads ?? item.current ?? item.aktual ?? 0
      );

      // Determine secondary comparison value (target, previous period, benchmark, or moving sequential baseline)
      let secondaryValue = item.secondary_value !== undefined
        ? Number(item.secondary_value)
        : item.target !== undefined
          ? Number(item.target)
          : item.previous !== undefined
            ? Number(item.previous)
            : item.prev_value !== undefined
              ? Number(item.prev_value)
              : item.lalu !== undefined
                ? Number(item.lalu)
                : item.benchmark !== undefined
                  ? Number(item.benchmark)
                  : item.line !== undefined
                    ? Number(item.line)
                    : item.line2 !== undefined
                      ? Number(item.line2)
                      : item.rencana !== undefined
                        ? Number(item.rencana)
                        : undefined;

      // If no explicit secondary series provided, sequential comparison uses previous index value
      if (secondaryValue === undefined) {
        if (idx > 0) {
          const prevItem = rawList[idx - 1];
          secondaryValue = Number(prevItem?.value ?? prevItem?.count ?? prevItem?.total ?? prevItem?.jumlah ?? 0);
        } else {
          secondaryValue = value; // 0% delta baseline on first point
        }
      }

      const color = item.color || CHART_PALETTE[idx % CHART_PALETTE.length];
      const secondaryColor = item.secondary_color || '#0d9488'; // Teal 600 for comparison line

      return {
        ...item,
        name: cleanName,
        value,
        secondaryValue,
        color,
        secondaryColor,
      };
    });
  }, [rawList]);

  const totalValue = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const totalSecondary = useMemo(() => data.reduce((sum, d) => sum + d.secondaryValue, 0), [data]);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const globalMax = useMemo(
    () => Math.max(...data.map(d => Math.max(d.value, d.secondaryValue || 0)), 1),
    [data]
  );

  const title = chartData.title || 'Statistik SM-Learning Korlantas POLRI';
  const subtitle = chartData.subtitle || 'Visualisasi Data Edukasi & Dikmas Lantas';

  // Delta calculation helper: computes percentage increase / decrease vs baseline
  const calculateDelta = useCallback((current: number, baseline: number) => {
    if (baseline === 0) {
      if (current === 0) {
        return { diff: 0, pct: 0, text: '0.0%', direction: 'flat' as const, badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
      }
      return { diff: current, pct: 100, text: '+100%', direction: 'up' as const, badgeClass: 'bg-emerald-500 text-white border-emerald-600' };
    }
    const diff = current - baseline;
    const pct = Math.round((diff / Math.abs(baseline)) * 1000) / 10;
    if (diff > 0) {
      return { diff, pct, text: `+${pct.toFixed(1)}%`, direction: 'up' as const, badgeClass: 'bg-emerald-500 text-white border-emerald-600' };
    }
    if (diff < 0) {
      return { diff, pct, text: `${pct.toFixed(1)}%`, direction: 'down' as const, badgeClass: 'bg-rose-500 text-white border-rose-600' };
    }
    return { diff: 0, pct: 0, text: '0.0%', direction: 'flat' as const, badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
  }, []);

  // Overall growth / comparison summary
  const overallDelta = useMemo(() => {
    return calculateDelta(totalValue, totalSecondary);
  }, [totalValue, totalSecondary, calculateDelta]);

  // Export PNG Function with oklab/oklch support
  const handleDownloadPng = async () => {
    if (!containerRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
      await exportElementToPng(containerRef.current, `${safeTitle}_${Date.now()}.png`);
    } catch (err) {
      console.error('Failed to export chart PNG:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // SVG Coordinate Mathematics for Line, Combo, and Dual-Line charts
  const svgMetrics = useMemo(() => {
    const width = 640;
    const height = 260;
    const padLeft = 52;
    const padRight = 40;
    const padTop = 56;
    const padBottom = 40;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const n = data.length;

    const pointsPrimary = data.map((d, i) => {
      const x = n > 1 ? padLeft + (i / (n - 1)) * innerW : width / 2;
      const y = padTop + innerH - (d.value / globalMax) * innerH;
      return { x, y, value: d.value, name: d.name, color: d.color };
    });

    const pointsSecondary = data.map((d, i) => {
      const x = n > 1 ? padLeft + (i / (n - 1)) * innerW : width / 2;
      const y = padTop + innerH - (d.secondaryValue / globalMax) * innerH;
      return { x, y, value: d.secondaryValue, name: d.name, color: d.secondaryColor };
    });

    // Spline curve generator
    const makeSmoothPath = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };

    const makeAreaPath = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length < 2) return '';
      const basePath = makeSmoothPath(pts);
      const bottom = padTop + innerH;
      return `${basePath} L ${pts[pts.length - 1].x} ${bottom} L ${pts[0].x} ${bottom} Z`;
    };

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerW,
      innerH,
      pointsPrimary,
      pointsSecondary,
      pathPrimary: makeSmoothPath(pointsPrimary),
      areaPrimary: makeAreaPath(pointsPrimary),
      pathSecondary: makeSmoothPath(pointsSecondary),
      areaSecondary: makeAreaPath(pointsSecondary),
      baselineY: padTop + innerH,
    };
  }, [data, globalMax]);

  return (
    <div
      ref={containerRef}
      className={`my-3.5 rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs bg-white ${isModal ? 'w-full' : 'max-w-2xl'
        }`}
    >
      {/* Chart Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a1d37] to-[#132c4f] text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
            {viewMode === 'pie' ? (
              <PieIcon className="w-4 h-4 text-blue-300" />
            ) : viewMode === 'line' ? (
              <TrendingUp className="w-4 h-4 text-blue-300" />
            ) : viewMode === 'combo' ? (
              <Layers className="w-4 h-4 text-blue-300" />
            ) : viewMode === 'dual-line' ? (
              <Activity className="w-4 h-4 text-blue-300" />
            ) : (
              <BarChart2 className="w-4 h-4 text-blue-300" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-white leading-snug truncate">{title}</h4>
            <p className="text-[10px] text-slate-300 truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented View Mode Toggle: Batang, Garis, Combo, Dual-Line, Pie */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/80 shadow-inner flex-wrap gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${viewMode === 'bar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title="Grafik Batang (Kolom Vertikal)"
            >
              <BarChart2 className="w-3 h-3" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('line')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${viewMode === 'line'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title="Grafik Garis Tren & Delta Data Sebelumnya"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Garis</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('combo')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${viewMode === 'combo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title="Multi-Grafik: Batang + Garis (Perbandingan Data)"
            >
              <Layers className="w-3 h-3" />
              <span>Batang+Line</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dual-line')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${viewMode === 'dual-line'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title="Multi-Grafik: Garis + Garis (Line + Line Perbandingan)"
            >
              <Activity className="w-3 h-3" />
              <span>Line+Line</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('pie')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${viewMode === 'pie'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              title="Grafik Pie / Donut"
            >
              <PieIcon className="w-3 h-3" />
              <span>Pie</span>
            </button>
          </div>

          {!hideDownload && (
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer border border-white/10"
              title="Unduh Gambar Grafik HD (PNG)"
            >
              <Download className="w-3 h-3" />
              <span>{isExporting ? 'Memproses...' : 'Unduh PNG'}</span>
            </button>
          )}
          {!isModal && onExpand && (
            <button
              type="button"
              onClick={() => onExpand({ ...chartData, title, subtitle, data, type: viewMode })}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Perbesar Grafik"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Body */}
      <div className="p-4 bg-slate-50/50">
        {data.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Tidak ada data untuk ditampilkan.</div>
        ) : viewMode === 'bar' ? (
          /* ========================================================
             1. GRAFIK BATANG (COLUMN) WITH CLEAR VALUES & PERCENTS
             ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Total Data: <strong className="text-slate-900 font-bold">{Number(totalValue).toLocaleString('id-ID')}</strong></span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {data.length} Kategori Analisis
              </span>
            </div>

            {/* Vertical Column Canvas */}
            <div className="relative pt-6 pb-2 px-3 sm:px-6 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 rounded-xl border border-slate-200/70 shadow-2xs">
              <div className="absolute inset-x-4 top-8 bottom-12 flex flex-col justify-between pointer-events-none opacity-30">
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-dashed border-slate-400 w-full" />
                <div className="border-b border-solid border-slate-300 w-full" />
              </div>

              <div className="h-52 flex items-end justify-around gap-2 sm:gap-4 relative z-10 px-1">
                {data.map((item, idx) => {
                  const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                  const sharePct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
                  const isHovered = hoveredIdx === idx;
                  const heightPercent = Math.max(item.value > 0 ? 10 : 3, Math.round(pct));
                  const prevVal = idx > 0 ? data[idx - 1].value : item.value;
                  const seqDelta = calculateDelta(item.value, prevVal);

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                      style={{ maxWidth: data.length <= 4 ? '96px' : data.length <= 6 ? '76px' : '56px' }}
                    >
                      {/* Floating Clear Value & Delta Pills */}
                      <div
                        className={`mb-1.5 flex flex-col items-center transition-all duration-300 ${isHovered ? '-translate-y-1 scale-110' : ''
                          }`}
                      >
                        {idx > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full mb-0.5 border shadow-2xs whitespace-nowrap ${seqDelta.badgeClass}`}>
                            {seqDelta.direction === 'up' ? '▲' : seqDelta.direction === 'down' ? '▼' : '▬'} {seqDelta.text}
                          </span>
                        )}
                        <span className="font-black text-[11px] text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-300 shadow-xs whitespace-nowrap">
                          {Number(item.value).toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                          {sharePct}%
                        </span>
                      </div>

                      {/* Bar Column */}
                      <div className="w-full flex justify-center items-end" style={{ height: '70%' }}>
                        <div
                          className="w-full max-w-[48px] rounded-t-xl transition-all duration-500 ease-out relative overflow-hidden"
                          style={{
                            height: `${heightPercent}%`,
                            background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}d9 100%)`,
                            boxShadow: isHovered
                              ? `0 8px 20px ${item.color}55`
                              : `0 4px 12px ${item.color}30`,
                            transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                            transformOrigin: 'bottom',
                          }}
                        >
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-white/40 rounded-t-xl" />
                        </div>
                      </div>

                      {/* X-axis Label */}
                      <div className="mt-2 text-center w-full">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        </div>
                        <p
                          className={`text-[11px] font-semibold leading-tight line-clamp-2 transition-colors ${isHovered ? 'text-blue-600 font-bold' : 'text-slate-700'
                            }`}
                          title={item.name}
                        >
                          {item.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown List */}
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Rincian Komposisi & Proporsi Data</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.map((item, idx) => {
                  const sharePct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
                  const isHovered = hoveredIdx === idx;
                  const prevVal = idx > 0 ? data[idx - 1].value : item.value;
                  const seqDelta = calculateDelta(item.value, prevVal);

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isHovered
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-slate-800 truncate text-[11px]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {idx > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shadow-2xs ${seqDelta.badgeClass}`}>
                              {seqDelta.direction === 'up' ? '▲' : seqDelta.direction === 'down' ? '▼' : '▬'} {seqDelta.text}
                            </span>
                          )}
                          <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {Number(item.value).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{sharePct}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sharePct}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === 'line' ? (
          /* ========================================================
             2. GRAFIK GARIS TREN (LINE + DELTA DARI DATA SEBELUMNYA)
             ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1 border-b border-slate-200/70 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Tren Data: <strong className="text-slate-900 font-bold">{Number(totalValue).toLocaleString('id-ID')} Total</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ▲ Kenaikan
                </span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  ▼ Penurunan
                </span>
              </div>
            </div>

            {/* SVG Line Canvas */}
            <div className="relative pt-2 pb-2 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <svg viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`} className="w-full h-auto">
                <defs>
                  <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, gIdx) => {
                  const y = svgMetrics.padTop + svgMetrics.innerH - ratio * svgMetrics.innerH;
                  const valTick = Math.round(ratio * globalMax);
                  return (
                    <g key={gIdx}>
                      <line
                        x1={svgMetrics.padLeft - 10}
                        y1={y}
                        x2={svgMetrics.width - svgMetrics.padRight + 10}
                        y2={y}
                        stroke="#cbd5e1"
                        strokeDasharray={ratio === 0 ? 'none' : '4 4'}
                        strokeWidth="1"
                        opacity={ratio === 0 ? 0.7 : 0.45}
                      />
                      <text x={svgMetrics.padLeft - 14} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                        {valTick}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                {svgMetrics.areaPrimary && (
                  <path d={svgMetrics.areaPrimary} fill="url(#lineAreaGrad)" />
                )}

                {/* Main Spline Curve */}
                {svgMetrics.pathPrimary && (
                  <path
                    d={svgMetrics.pathPrimary}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Points, Value Pills & Delta Badges */}
                {svgMetrics.pointsPrimary.map((pt, idx) => {
                  const prevVal = idx > 0 ? data[idx - 1].value : pt.value;
                  const delta = calculateDelta(pt.value, prevVal);
                  const isHovered = hoveredIdx === idx;
                  const valStr = Number(pt.value).toLocaleString('id-ID');
                  const badgeW = Math.max(50, valStr.length * 8 + 18);
                  const deltaW = Math.max(54, delta.text.length * 7 + 22);

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* Vertical Indicator Guide */}
                      <line
                        x1={pt.x}
                        y1={pt.y}
                        x2={pt.x}
                        y2={svgMetrics.baselineY}
                        stroke="#2563eb"
                        strokeWidth={isHovered ? '2' : '1'}
                        strokeDasharray="3 3"
                        opacity={isHovered ? 0.8 : 0.3}
                      />

                      {/* Delta Badge (Comparing to previous point) */}
                      {idx > 0 ? (
                        <g transform={`translate(${pt.x - deltaW / 2}, ${pt.y - 48})`}>
                          <rect
                            width={deltaW}
                            height="18"
                            rx="5"
                            fill={delta.direction === 'up' ? '#10b981' : delta.direction === 'down' ? '#f43f5e' : '#64748b'}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                          <text
                            x={deltaW / 2}
                            y="12"
                            textAnchor="middle"
                            fontSize="9.5"
                            fontWeight="900"
                            fill="#ffffff"
                          >
                            {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'} {delta.text}
                          </text>
                        </g>
                      ) : (
                        <g transform={`translate(${pt.x - 26}, ${pt.y - 48})`}>
                          <rect width="52" height="18" rx="5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
                          <text x="26" y="12" textAnchor="middle" fontSize="9" fontWeight="800" fill="#475569">
                            Baseline
                          </text>
                        </g>
                      )}

                      {/* Value Pill (Angka Sangat Jelas) */}
                      <g transform={`translate(${pt.x - badgeW / 2}, ${pt.y - 26})`}>
                        <rect
                          width={badgeW}
                          height="20"
                          rx="6"
                          fill="#ffffff"
                          stroke={isHovered ? '#2563eb' : '#cbd5e1'}
                          strokeWidth={isHovered ? '2' : '1.5'}
                        />
                        <text
                          x={badgeW / 2}
                          y="14"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="900"
                          fill="#0f172a"
                        >
                          {valStr}
                        </text>
                      </g>

                      {/* Outer Ring & Center Node Dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? '7' : '5'}
                        fill="#ffffff"
                        stroke="#2563eb"
                        strokeWidth="3"
                      />

                      {/* X-axis Label */}
                      <text
                        x={pt.x}
                        y={svgMetrics.baselineY + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill={isHovered ? '#1d4ed8' : '#475569'}
                      >
                        {pt.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Sequential Delta Breakdown Table */}
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Analisis Perubahan Antar Data Sebelumnya</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.map((item, idx) => {
                  const prevVal = idx > 0 ? data[idx - 1].value : item.value;
                  const delta = calculateDelta(item.value, prevVal);
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isHovered ? 'bg-blue-50/70 border-blue-300 shadow-xs' : 'bg-white border-slate-200/80 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-slate-800 truncate text-[11px]">{item.name}</span>
                        </div>
                        <span className="font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {Number(item.value).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {idx === 0 ? 'Titik Awal (Baseline)' : `vs ${data[idx - 1].name} (${Number(prevVal).toLocaleString('id-ID')})`}
                        </span>
                        {idx > 0 ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border shadow-2xs ${delta.badgeClass}`}>
                            {delta.direction === 'up' ? '▲ Peningkatan' : delta.direction === 'down' ? '▼ Penurunan' : '▬ Tetap'} ({delta.text})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">0.0%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === 'combo' ? (
          /* ========================================================
             3. MULTIPLE GRAFIK: LINE + BATANG (COMBO PERBANDINGAN)
             ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1 border-b border-slate-200/70 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                  <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                  <span>{primaryLabel} (Batang)</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-teal-800 text-xs">
                  <span className="w-3 h-1.5 rounded-full bg-teal-600 inline-block" />
                  <span>{secondaryLabel} (Line)</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border shadow-2xs ${overallDelta.badgeClass}`}>
                  Perbandingan Total: {overallDelta.direction === 'up' ? '▲' : overallDelta.direction === 'down' ? '▼' : '▬'} {overallDelta.text}
                </span>
              </div>
            </div>

            {/* SVG Combo Canvas */}
            <div className="relative pt-2 pb-2 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <svg viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`} className="w-full h-auto">
                <defs>
                  <linearGradient id="comboBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, gIdx) => {
                  const y = svgMetrics.padTop + svgMetrics.innerH - ratio * svgMetrics.innerH;
                  const valTick = Math.round(ratio * globalMax);
                  return (
                    <g key={gIdx}>
                      <line
                        x1={svgMetrics.padLeft - 10}
                        y1={y}
                        x2={svgMetrics.width - svgMetrics.padRight + 10}
                        y2={y}
                        stroke="#cbd5e1"
                        strokeDasharray={ratio === 0 ? 'none' : '4 4'}
                        strokeWidth="1"
                        opacity={ratio === 0 ? 0.7 : 0.45}
                      />
                      <text x={svgMetrics.padLeft - 14} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                        {valTick}
                      </text>
                    </g>
                  );
                })}

                {/* Render Bars (Columns for Primary Series) */}
                {svgMetrics.pointsPrimary.map((pt, idx) => {
                  const isHovered = hoveredIdx === idx;
                  const colW = Math.min(42, Math.max(22, svgMetrics.innerW / (data.length * 2.2)));
                  const barH = Math.max(4, svgMetrics.baselineY - pt.y);

                  return (
                    <g
                      key={`bar-${idx}`}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={pt.x - colW / 2}
                        y={pt.y}
                        width={colW}
                        height={barH}
                        rx="6"
                        fill="url(#comboBarGrad)"
                        opacity={isHovered ? 1 : 0.9}
                        filter={isHovered ? 'drop-shadow(0 6px 12px rgba(37,99,235,0.4))' : undefined}
                      />
                    </g>
                  );
                })}

                {/* Render Spline Line (Line for Secondary Series / Benchmark) */}
                {svgMetrics.pathSecondary && (
                  <path
                    d={svgMetrics.pathSecondary}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 4"
                  />
                )}

                {/* Overlaid Badges, Delta Indicators & Line Nodes */}
                {svgMetrics.pointsPrimary.map((pt, idx) => {
                  const ptSec = svgMetrics.pointsSecondary[idx];
                  const delta = calculateDelta(pt.value, ptSec.value);
                  const isHovered = hoveredIdx === idx;
                  const deltaW = Math.max(54, delta.text.length * 7 + 22);

                  return (
                    <g
                      key={`combo-node-${idx}`}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* Secondary Line Node Dot */}
                      <circle
                        cx={ptSec.x}
                        cy={ptSec.y}
                        r={isHovered ? '6' : '4.5'}
                        fill="#ffffff"
                        stroke="#0d9488"
                        strokeWidth="2.5"
                      />

                      {/* Delta Comparison Pill (Aktual vs Target / Pembanding) */}
                      <g transform={`translate(${pt.x - deltaW / 2}, ${Math.min(pt.y, ptSec.y) - 48})`}>
                        <rect
                          width={deltaW}
                          height="18"
                          rx="5"
                          fill={delta.direction === 'up' ? '#10b981' : delta.direction === 'down' ? '#f43f5e' : '#64748b'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text x={deltaW / 2} y="12" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff">
                          {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'} {delta.text}
                        </text>
                      </g>

                      {/* Primary Bar Value Badge */}
                      <g transform={`translate(${pt.x - 22}, ${pt.y - 25})`}>
                        <rect width="44" height="18" rx="5" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                        <text x="22" y="13" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#1e3a8a">
                          {Number(pt.value).toLocaleString('id-ID')}
                        </text>
                      </g>

                      {/* Secondary Line Value Badge */}
                      <g transform={`translate(${ptSec.x - 20}, ${ptSec.y + 8})`}>
                        <rect width="40" height="16" rx="4" fill="#f0fdfa" stroke="#0d9488" strokeWidth="1" />
                        <text x="20" y="12" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#0f766e">
                          {Number(ptSec.value).toLocaleString('id-ID')}
                        </text>
                      </g>

                      {/* X-axis Label */}
                      <text
                        x={pt.x}
                        y={svgMetrics.baselineY + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill={isHovered ? '#1d4ed8' : '#475569'}
                      >
                        {pt.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Comparison Cards */}
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Rincian Komparasi: {primaryLabel} vs {secondaryLabel}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.map((item, idx) => {
                  const delta = calculateDelta(item.value, item.secondaryValue);
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isHovered ? 'bg-blue-50/70 border-blue-300 shadow-xs' : 'bg-white border-slate-200/80 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800 truncate text-[11px]">{item.name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border shadow-2xs ${delta.badgeClass}`}>
                          {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'} {delta.text}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-xs">
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">{primaryLabel}</div>
                          <div className="font-black text-blue-700 text-[12px]">{Number(item.value).toLocaleString('id-ID')}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">{secondaryLabel}</div>
                          <div className="font-bold text-teal-700 text-[12px]">{Number(item.secondaryValue).toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : viewMode === 'dual-line' ? (
          /* ========================================================
             4. MULTIPLE GRAFIK: LINE + LINE (DUAL LINE COMPARISON)
             ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1 border-b border-slate-200/70 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-800 text-xs">
                  <span className="w-3 h-1.5 rounded-full bg-blue-600 inline-block" />
                  <span>{primaryLabel} (Seri 1)</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold text-teal-800 text-xs">
                  <span className="w-3 h-1.5 rounded-full bg-teal-600 inline-block border border-teal-700 border-dashed" />
                  <span>{secondaryLabel} (Seri 2)</span>
                </div>
              </div>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md border shadow-2xs ${overallDelta.badgeClass}`}>
                Pertumbuhan Rata-rata: {overallDelta.direction === 'up' ? '▲' : overallDelta.direction === 'down' ? '▼' : '▬'} {overallDelta.text}
              </span>
            </div>

            {/* SVG Dual-Line Canvas */}
            <div className="relative pt-2 pb-2 bg-gradient-to-b from-indigo-50/30 via-white to-slate-50/50 rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <svg viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`} className="w-full h-auto">
                <defs>
                  <linearGradient id="dualLineGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, gIdx) => {
                  const y = svgMetrics.padTop + svgMetrics.innerH - ratio * svgMetrics.innerH;
                  const valTick = Math.round(ratio * globalMax);
                  return (
                    <g key={gIdx}>
                      <line
                        x1={svgMetrics.padLeft - 10}
                        y1={y}
                        x2={svgMetrics.width - svgMetrics.padRight + 10}
                        y2={y}
                        stroke="#cbd5e1"
                        strokeDasharray={ratio === 0 ? 'none' : '4 4'}
                        strokeWidth="1"
                        opacity={ratio === 0 ? 0.7 : 0.45}
                      />
                      <text x={svgMetrics.padLeft - 14} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                        {valTick}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill Series 1 */}
                {svgMetrics.areaPrimary && (
                  <path d={svgMetrics.areaPrimary} fill="url(#dualLineGrad1)" />
                )}

                {/* Series 2 Path (Dashed Teal Line) */}
                {svgMetrics.pathSecondary && (
                  <path
                    d={svgMetrics.pathSecondary}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="5 4"
                  />
                )}

                {/* Series 1 Path (Solid Blue Line) */}
                {svgMetrics.pathPrimary && (
                  <path
                    d={svgMetrics.pathPrimary}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Point Markers & Dual Labels */}
                {svgMetrics.pointsPrimary.map((pt, idx) => {
                  const ptSec = svgMetrics.pointsSecondary[idx];
                  const delta = calculateDelta(pt.value, ptSec.value);
                  const isHovered = hoveredIdx === idx;
                  const deltaW = Math.max(54, delta.text.length * 7 + 22);

                  return (
                    <g
                      key={`dual-${idx}`}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* Secondary Node */}
                      <circle cx={ptSec.x} cy={ptSec.y} r="5" fill="#ffffff" stroke="#0d9488" strokeWidth="2.5" />

                      {/* Primary Node */}
                      <circle cx={pt.x} cy={pt.y} r={isHovered ? '7' : '5'} fill="#ffffff" stroke="#2563eb" strokeWidth="3" />

                      {/* Delta Comparison Pill */}
                      <g transform={`translate(${pt.x - deltaW / 2}, ${Math.min(pt.y, ptSec.y) - 48})`}>
                        <rect
                          width={deltaW}
                          height="18"
                          rx="5"
                          fill={delta.direction === 'up' ? '#10b981' : delta.direction === 'down' ? '#f43f5e' : '#64748b'}
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text x={deltaW / 2} y="12" textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#ffffff">
                          {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'} {delta.text}
                        </text>
                      </g>

                      {/* Series 1 Value Badge */}
                      <g transform={`translate(${pt.x - 22}, ${pt.y - 25})`}>
                        <rect width="44" height="18" rx="5" fill="#ffffff" stroke="#2563eb" strokeWidth="1.5" />
                        <text x="22" y="13" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#1e3a8a">
                          {Number(pt.value).toLocaleString('id-ID')}
                        </text>
                      </g>

                      {/* Series 2 Value Badge */}
                      <g transform={`translate(${ptSec.x - 20}, ${ptSec.y + 8})`}>
                        <rect width="40" height="16" rx="4" fill="#f0fdfa" stroke="#0d9488" strokeWidth="1" />
                        <text x="20" y="12" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#0f766e">
                          {Number(ptSec.value).toLocaleString('id-ID')}
                        </text>
                      </g>

                      {/* X-axis Label */}
                      <text
                        x={pt.x}
                        y={svgMetrics.baselineY + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="600"
                        fill={isHovered ? '#1d4ed8' : '#475569'}
                      >
                        {pt.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Comparison Cards */}
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Perbandingan Garis Antar Seri: {primaryLabel} vs {secondaryLabel}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.map((item, idx) => {
                  const delta = calculateDelta(item.value, item.secondaryValue);
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isHovered ? 'bg-blue-50/70 border-blue-300 shadow-xs' : 'bg-white border-slate-200/80 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800 truncate text-[11px]">{item.name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border shadow-2xs ${delta.badgeClass}`}>
                          {delta.direction === 'up' ? '▲' : delta.direction === 'down' ? '▼' : '▬'} {delta.text}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60 text-xs">
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">{primaryLabel}</div>
                          <div className="font-black text-blue-700 text-[12px]">{Number(item.value).toLocaleString('id-ID')}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">{secondaryLabel}</div>
                          <div className="font-bold text-teal-700 text-[12px]">{Number(item.secondaryValue).toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
             5. GRAFIK PIE / DONUT (DISTRIBUSI PROPORSI)
             ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs px-1 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Distribusi Proporsi Data: <strong className="text-slate-900 font-bold">{Number(totalValue).toLocaleString('id-ID')} Total</strong></span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                {data.length} Bagian
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-around gap-6 py-2">
              <div className="relative w-52 h-52 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="18"
                  />
                  {(() => {
                    const radius = 46;
                    const circumference = 2 * Math.PI * radius;
                    let accumulatedOffset = 0;
                    const gap = data.length > 1 ? 2.5 : 0;

                    return data.map((d, i) => {
                      const sliceRatio = totalValue > 0 ? (d.value / totalValue) : 0;
                      if (sliceRatio <= 0) return null;
                      const rawDash = sliceRatio * circumference;
                      const strokeDash = Math.max(0.5, rawDash - gap);
                      const strokeSpace = circumference - strokeDash;
                      const strokeDasharray = `${strokeDash} ${strokeSpace}`;
                      const strokeDashoffset = -accumulatedOffset;
                      accumulatedOffset += rawDash;
                      const isHovered = hoveredIdx === i;

                      return (
                        <circle
                          key={i}
                          cx="60"
                          cy="60"
                          r={radius}
                          fill="transparent"
                          stroke={d.color}
                          strokeWidth={isHovered ? 21 : 18}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          onMouseEnter={() => setHoveredIdx(i)}
                          onMouseLeave={() => setHoveredIdx(null)}
                          className="transition-all duration-300 cursor-pointer"
                          style={{
                            filter: isHovered ? `drop-shadow(0 0 6px ${d.color}88)` : undefined,
                            opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                          }}
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">TOTAL</span>
                  <span className="text-2xl font-black text-slate-900 leading-none mt-1">
                    {Number(totalValue).toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1.5 border border-blue-200/60">
                    100% Kontribusi
                  </span>
                </div>
              </div>

              <div className="flex-1 max-w-sm w-full space-y-2">
                {data.map((item, idx) => {
                  const pct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isHovered
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs scale-[1.01]'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 truncate mr-2">
                          <div className="w-3 h-3 rounded-md shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                          <span className={`font-semibold truncate text-[11px] ${isHovered ? 'text-blue-700 font-bold' : 'text-slate-800'}`}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-extrabold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px] shadow-2xs">
                            {Number(item.value).toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// Unified Multi Chart Board: Consolidates all fragmented charts into 1 unified graphic & 1 file download
interface AleshaMultiChartBoardProps {
  charts: any[];
  title?: string;
  summaryText?: string;
  onExpand?: (c: any) => void;
  isModal?: boolean;
}

function AleshaMultiChartBoard({
  charts,
  title,
  summaryText,
  onExpand,
  isModal = false
}: AleshaMultiChartBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const boardTitle = title || 'Ringkasan Visual Terpadu SM-Learning';
  const boardSubtitle = `Menampilkan ${charts.length} visualisasi data analisis dalam 1 laporan grafik terpadu`;

  // Download entire composite board in 1 single PNG file (Retina resolution, identical visual, oklab safe)
  const handleDownloadUnifiedPng = async () => {
    if (!boardRef.current || isExporting) return;
    try {
      setIsExporting(true);
      await exportElementToPng(boardRef.current, `rekap_grafik_terpadu_${Date.now()}.png`);
    } catch (err) {
      console.error('Failed to export unified chart board:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      ref={boardRef}
      className={`my-4 rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs bg-white ${isModal ? 'w-full max-w-full' : 'max-w-5xl w-full'
        }`}
    >
      {/* Unified Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a1d37] to-[#132c4f] text-white px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Layers className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white leading-snug">{boardTitle}</h4>
            <p className="text-[10px] text-slate-300">{boardSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Modal Preview Button (if not already inside modal) */}
          {!isModal && onExpand && (
            <button
              onClick={() => onExpand({ isMulti: true, charts, title: boardTitle, subtitle: boardSubtitle, summaryText })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all cursor-pointer border border-white/20 shadow-2xs"
              title="Perbesar Preview Grafik ke Modal Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview Modal</span>
            </button>
          )}

          {/* 1 Single Download Button for the entire composite chart */}
          <button
            onClick={handleDownloadUnifiedPng}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all cursor-pointer border border-blue-400/30 shadow-2xs"
            title="Unduh Seluruh Grafik dalam 1 File Gambar HD (PNG)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Memproses...' : 'Unduh Semua Grafik (1 File PNG)'}</span>
          </button>
        </div>
      </div>

      {/* AI Conclusion / Summary Banner (Included directly inside the downloaded graphic!) */}
      {summaryText && (
        <div className="mx-4 mt-3.5 p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-slate-50 border border-blue-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-1.5 text-blue-900 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Kesimpulan & Ringkasan Analisis AI Alesha:</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
            {summaryText}
          </p>
        </div>
      )}

      {/* Unified Body: Render charts in a modern 2-Column grid */}
      <div className="p-4 bg-slate-50/50">
        <div className={`grid gap-4 items-start ${charts.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
          {charts.map((c, i) => (
            <div key={i} className={`w-full ${i === charts.length - 1 && charts.length % 2 === 1 ? 'md:col-span-2 max-w-2xl mx-auto' : ''}`}>
              <AleshaChartViewer chartData={c} onExpand={onExpand} hideDownload={true} isModal={true} />
            </div>
          ))}
        </div>
      </div>

      {/* Official Footer Branding on Downloaded Image */}
      <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 text-slate-500 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-slate-700">KORLANTAS POLRI &bull; SM-Learning Dikmas Lantas</span>
        <span>Laporan Visual Terpadu &bull; Alesha AI Analytics</span>
      </div>
    </div>
  );
}


interface MarkdownViewerProps {
  content: string;
  onExpandChart?: (chart: any) => void;
  onAction?: (prompt: string) => void;
}

function MarkdownViewer({ content, onExpandChart, onAction }: MarkdownViewerProps) {
  const renderedElements = useMemo(() => {
    if (!content) return null;

    // 1. Extract action chips [action:Label|Prompt]
    const { cleanContent, actions } = parseActionChips(content);

    // 2. Pre-scan and collect ALL chart blocks in this message
    const allCharts: any[] = [];

    // Pre-scan A: Code blocks ```...```
    const chartRegex = /```(?:[a-z0-9_:-]*)?\s*([\s\S]*?)```/gi;
    let m;
    while ((m = chartRegex.exec(cleanContent)) !== null) {
      const parsed = safeParseChartJson(m[1]);
      if (parsed) {
        if (parsed.charts && Array.isArray(parsed.charts)) {
          allCharts.push(...parsed.charts);
        } else if (parsed.data || parsed.items) {
          allCharts.push(parsed);
        }
      }
    }

    // Pre-scan B: Standalone JSON objects not in code blocks
    const rawJsonRegex = /\{(?:[^{}]|"(?:\\.|[^"\\])*")*"(?:data|items)"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g;
    let rj;
    while ((rj = rawJsonRegex.exec(cleanContent)) !== null) {
      const parsed = safeParseChartJson(rj[0]);
      if (parsed && (parsed.data || parsed.items)) {
        const isDuplicate = allCharts.some(
          c => (c.title && parsed.title && c.title.trim().toLowerCase() === parsed.title.trim().toLowerCase()) ||
            (JSON.stringify(c.data) === JSON.stringify(parsed.data))
        );
        if (!isDuplicate) {
          allCharts.push(parsed);
        }
      }
    }

    const normalized = normalizeMarkdown(cleanContent);
    const lines = normalized.split('\n');

    // Pre-scan C: Robust Conclusion / Summary Extraction for the Visual Infographic
    let summaryText = '';

    // Step 1: Search for explicit conclusion / analysis / note section header
    const conclusionHeaderRegex = /^(?:#{1,4}\s+|\*\*(?:[\d.]+\s*)?)(kesimpulan|catatan|ringkasan|analisis|rekomendasi|saran|evaluasi|insight|temuan)/i;
    let conclusionStartIdx = -1;

    for (let idx = 0; idx < lines.length; idx++) {
      const l = lines[idx].trim();
      if (conclusionHeaderRegex.test(l)) {
        conclusionStartIdx = idx;
        break;
      }
    }

    if (conclusionStartIdx !== -1) {
      const collected: string[] = [];
      for (let idx = conclusionStartIdx + 1; idx < lines.length; idx++) {
        const rawL = lines[idx].trim();
        // Stop if next major section header starts
        if (/^#{1,3}\s+/.test(rawL)) break;
        // Stop if interactive prompt actions or download links
        if (rawL.includes('[action:') || rawL.includes('/static/exports/')) break;
        // Skip code fences or table markup
        if (rawL.startsWith('```') || rawL.startsWith('|') || rawL.startsWith('{') || rawL.startsWith('}')) continue;
        if (!rawL) continue;

        // Clean markdown bullets but keep readable bullet list structure
        const cleanL = rawL.replace(/^[-*•]\s+/, '• ').trim();
        collected.push(cleanL);
      }
      if (collected.length > 0) {
        summaryText = collected.join('\n');
      }
    }

    // Step 2: If no explicit heading found, extract analytical text appearing AFTER the charts / tables
    if (!summaryText) {
      let lastChartOrTableLineIdx = -1;
      let inCode = false;
      for (let idx = 0; idx < lines.length; idx++) {
        const l = lines[idx].trim();
        if (l.startsWith('```')) {
          inCode = !inCode;
          lastChartOrTableLineIdx = idx;
        } else if (inCode || l.startsWith('|') || (l.startsWith('{') && l.includes('"data"'))) {
          lastChartOrTableLineIdx = idx;
        }
      }

      if (lastChartOrTableLineIdx !== -1 && lastChartOrTableLineIdx < lines.length - 1) {
        const postChartLines = lines
          .slice(lastChartOrTableLineIdx + 1)
          .map(l => l.trim())
          .filter(l => {
            if (!l) return false;
            if (l.startsWith('```') || l.startsWith('|') || l.startsWith('{') || l.startsWith('}')) return false;
            if (l.endsWith(':')) return false; // Skip lone section titles
            if (l.includes('[action:') || l.includes('/static/exports/')) return false;
            return true;
          });

        if (postChartLines.length > 0) {
          summaryText = postChartLines.join('\n');
        }
      }
    }

    // Step 3: Fallback - find any analytical paragraphs containing evaluation keywords
    if (!summaryText) {
      const candidateLines = lines.map(l => l.trim()).filter(l => {
        if (!l) return false;
        if (l.startsWith('```') || l.startsWith('|') || l.startsWith('{') || l.startsWith('}')) return false;
        if (l.endsWith(':')) return false; // Avoid section titles like "Sebaran Materi:"
        if (l.includes('[action:') || l.includes('/static/exports/')) return false;
        const lower = l.toLowerCase();
        return (
          lower.includes('kesimpulan') ||
          lower.includes('berdasarkan data') ||
          lower.includes('secara keseluruhan') ||
          lower.includes('didominasi') ||
          lower.includes('tercatat') ||
          lower.includes('rekomendasi')
        );
      });
      if (candidateLines.length > 0) {
        summaryText = candidateLines.join('\n');
      }
    }

    // Clean formatting characters (*, _, #, `)
    summaryText = summaryText.replace(/[*_#`]/g, '').trim();
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let inCodeBlock = false;
    let codeBlockText = '';
    let codeLanguage = '';
    let currentListIndex = 0;
    let unifiedChartRendered = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Block Boundary (```)
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          const parsedChart = safeParseChartJson(codeBlockText);
          if (parsedChart) {
            // Chart detected: render consolidated chart board at the position of the first chart
            if (!unifiedChartRendered) {
              unifiedChartRendered = true;
              if (allCharts.length > 1) {
                elements.push(
                  <AleshaMultiChartBoard
                    key={`chart-unified-${i}`}
                    charts={allCharts}
                    summaryText={summaryText}
                    onExpand={onExpandChart}
                  />
                );
              } else if (allCharts.length === 1) {
                elements.push(
                  <AleshaChartViewer
                    key={`chart-single-${i}`}
                    chartData={allCharts[0]}
                    onExpand={onExpandChart}
                  />
                );
              }
            }
          } else {
            // Normal code block
            elements.push(
              <pre key={`code-${i}`} className="p-3 my-2 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed shadow-inner">
                <code>{codeBlockText.trim()}</code>
              </pre>
            );
          }
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

      // Check if line starts a raw JSON chart string (without code fences)
      if (line.trim().startsWith('{') && (line.includes('"title"') || line.includes('"data"') || line.includes('"charts"'))) {
        let rawJsonBlock = line;
        let openBraces = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        let j = i + 1;
        while (openBraces > 0 && j < lines.length) {
          rawJsonBlock += '\n' + lines[j];
          openBraces += (lines[j].match(/\{/g) || []).length - (lines[j].match(/\}/g) || []).length;
          j++;
        }
        const rawChart = safeParseChartJson(rawJsonBlock);
        if (rawChart) {
          i = j - 1; // Advance loop past the consumed JSON lines
          if (!unifiedChartRendered) {
            unifiedChartRendered = true;
            if (allCharts.length > 1) {
              elements.push(
                <AleshaMultiChartBoard
                  key={`chart-raw-unified-${i}`}
                  charts={allCharts}
                  summaryText={summaryText}
                  onExpand={onExpandChart}
                />
              );
            } else {
              elements.push(
                <AleshaChartViewer
                  key={`chart-raw-single-${i}`}
                  chartData={rawChart}
                  onExpand={onExpandChart}
                />
              );
            }
          }
          continue;
        }
      }

      // Suppress redundant individual chart heading lines (e.g. "*3. Tayangan per Materi (Top 4)*")
      // if the unified composite chart board has already been rendered
      if (unifiedChartRendered && allCharts.length > 1) {
        const isChartHeading = allCharts.some(c => {
          if (!c.title) return false;
          const cleanL = line.replace(/[*_#`\d.]/g, '').trim().toLowerCase();
          const cleanT = c.title.replace(/[*_#`\d.]/g, '').trim().toLowerCase();
          return cleanL.length > 4 && (cleanT.includes(cleanL) || cleanL.includes(cleanT.slice(0, 15)));
        });
        if (isChartHeading) {
          continue;
        }
      }

      // Markdown Table Parser
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line
          .trim()
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());

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
        elements.push(<InformativeTableViewer key={`table-${i}`} tableRows={tableRows} onExpandChart={onExpandChart} />);
        inTable = false;
        tableRows = [];
      }

      if (!line.trim() || line.startsWith('#')) {
        currentListIndex = 0;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} className="font-bold text-xs text-slate-900 mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
            {parseInlineFormatting(line.slice(4))}
          </h4>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="font-extrabold text-sm text-slate-900 mt-3.5 mb-2 border-b border-slate-200 pb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded bg-indigo-600 inline-block" />
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

      // Bullet List
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().slice(2);
        currentListIndex = 0;
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1 text-xs text-slate-700 pl-1 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
            <div className="flex-1">{parseInlineFormatting(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Numbered List (Styled Executive Row)
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const itemNumber = numMatch[1];
        const rawItemContent = numMatch[2];

        elements.push(
          <div
            key={i}
            className="flex items-start gap-2.5 my-1.5 p-2.5 rounded-xl bg-slate-50/90 hover:bg-blue-50/40 border border-slate-200/70 transition-colors shadow-2xs"
          >
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              {itemNumber}
            </span>
            <div className="flex-1 text-xs text-slate-700 leading-relaxed font-normal">
              {parseInlineFormatting(rawItemContent)}
            </div>
          </div>
        );
        continue;
      }

      // Contextual Section: Kemungkinan penyebabnya:
      if (/^kemungkinan\s+(?:penyebab|alasan)/i.test(line.trim())) {
        elements.push(
          <div key={i} className="mt-3.5 mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-900">
            <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{parseInlineFormatting(line.trim())}</span>
          </div>
        );
        continue;
      }

      // Contextual Alert: Belum ada data / 0 sesi outreach
      const lineLower = line.trim().toLowerCase();
      if (
        (lineLower.includes('belum ada data') || lineLower.includes('tidak ada data')) &&
        (lineLower.includes('0 sesi') || lineLower.includes('0 laporan') || lineLower.includes('wilayah'))
      ) {
        elements.push(
          <div key={i} className="my-2.5 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-start gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-slate-800 leading-relaxed font-normal">
              {parseInlineFormatting(line.trim())}
            </div>
          </div>
        );
        continue;
      }

      // Contextual Recommendation / Tip: Silakan cek kembali... / Hubungi admin...
      if (/^(?:silakan\s+cek|silakan\s+hubungi|mohon\s+cek|rekomendasi:)/i.test(line.trim())) {
        elements.push(
          <div key={i} className="my-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5 shadow-2xs">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-slate-700 leading-relaxed font-normal">
              {parseInlineFormatting(line.trim())}
            </div>
          </div>
        );
        continue;
      }

      // Check document download card [document:Title|URL]
      const docCard = parseDocumentDownloadCard(line, i);
      if (docCard) {
        elements.push(docCard);
        continue;
      }

      // Regular Paragraph
      currentListIndex = 0;
      elements.push(
        <p key={i} className="text-slate-800 my-1 leading-relaxed text-xs">
          {parseInlineFormatting(line)}
        </p>
      );
    }

    if (inTable && tableRows.length > 0) {
      elements.push(<InformativeTableViewer key="table-end" tableRows={tableRows} onExpandChart={onExpandChart} />);
    }

    // Fallback: If there were charts collected but not rendered yet (e.g. at the very end)
    if (allCharts.length > 0 && !unifiedChartRendered) {
      if (allCharts.length > 1) {
        elements.push(
          <AleshaMultiChartBoard
            key="chart-unified-end"
            charts={allCharts}
            summaryText={summaryText}
            onExpand={onExpandChart}
          />
        );
      } else {
        elements.push(
          <AleshaChartViewer
            key="chart-single-end"
            chartData={allCharts[0]}
            onExpand={onExpandChart}
          />
        );
      }
    }

    // Append Action Prompt Chips at the end if present
    if (actions && actions.length > 0) {
      elements.push(
        <div key="actions-chips" className="mt-3 pt-2.5 border-t border-slate-200/80">
          <p className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Langkah Selanjutnya & Saran Analisis:
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.map((act, aIdx) => (
              <button
                key={aIdx}
                onClick={() => onAction?.(act.prompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200/80 text-xs font-semibold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return elements;
  }, [content, onExpandChart, onAction]);

  return <div className="space-y-1">{renderedElements}</div>;
}

function parseActionChips(rawText: string): {
  cleanContent: string;
  actions: Array<{ label: string; prompt: string }>;
} {
  const actions: Array<{ label: string; prompt: string }> = [];
  if (!rawText) return { cleanContent: '', actions };

  const regex = /\[action:([^\]]+)\]/g;
  let match;
  let cleanContent = rawText;

  while ((match = regex.exec(rawText)) !== null) {
    const tagContent = match[1];
    const pipeIdx = tagContent.indexOf('|');
    const label = (pipeIdx === -1 ? tagContent : tagContent.slice(0, pipeIdx)).trim();
    const prompt = (pipeIdx === -1 ? label : tagContent.slice(pipeIdx + 1)).trim();

    if (label) {
      actions.push({ label, prompt });
    }
  }

  // Remove action tags from visible content
  cleanContent = cleanContent.replace(regex, '').trim();

  return { cleanContent, actions };
}

// ==========================================
// MARKDOWN NORMALIZATION & TABLE RENDERERS
// ==========================================

function normalizeMarkdown(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(/\r\n/g, '\n');

  // 1. Strip leaked tool-call thoughts in English (e.g. "I'll retrieve the ... data for this week.")
  text = text.replace(
    /^(?:I'll|I will|Let me|Allow me to)\s+(?:retrieve|check|fetch|get|look up|search|pull)[^\n.]*?\.\s*(?=[A-Z0-9\n]|\b(?:Belum|Data|Berikut|Hasil|Saat ini|Tidak|Mohon|Silakan)\b)/i,
    ''
  );

  // 2. Fix isolated repeating '1\n*Title*' or '1\nText' to clean incrementing numbers '1. **Title**'
  const rawLines = text.split('\n');
  const mergedLines: string[] = [];
  let i = 0;
  let listCounter = 1;

  while (i < rawLines.length) {
    const curr = rawLines[i].trim();
    if (/^\d+$/.test(curr) && i + 1 < rawLines.length && rawLines[i + 1].trim() && !/^\d+$/.test(rawLines[i + 1].trim())) {
      const nextLine = rawLines[i + 1].trim();
      mergedLines.push(`${listCounter}. ${nextLine}`);
      listCounter++;
      i += 2;
      continue;
    } else if (/^\d+\.\s+/.test(curr)) {
      const content = curr.replace(/^\d+\.\s+/, '');
      mergedLines.push(`${listCounter}. ${content}`);
      listCounter++;
      i++;
      continue;
    } else {
      if (!curr) {
        if (i + 1 < rawLines.length && !/^\d+(?:\.|$)/.test(rawLines[i + 1].trim())) {
          listCounter = 1;
        }
      } else {
        listCounter = 1;
      }
      mergedLines.push(rawLines[i]);
      i++;
    }
  }
  text = mergedLines.join('\n');

  // 3. Convert single asterisks wrapping phrases or sentences to proper bold
  text = text.replace(/(?<![*\n\r])\s*\*([^*\n]+?)\*(?!\*)/g, ' **$1**');
  text = text.replace(/^([^\n*]+?)\*([^*\n]+?)\*(?!\*)/gm, '$1**$2**');

  // Markdown Table boundary normalization
  text = text.replace(/([^\n])\s*(\|[^\n]+\|\n\s*\|[-:\s|]+\|)/g, '$1\n\n$2');

  const linesAfterTable = text.split('\n');
  const cleanedLines: string[] = [];
  for (const l of linesAfterTable) {
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

  text = text.replace(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi, 'https://alesha-be.djalu.co.id');
  text = text.replace(/https?:\/\/alesha\.djalu\.co\.id\/static\//gi, 'https://alesha-be.djalu.co.id/static/');

  return text;
}

function resolveAleshaLink(url: string): string {
  if (!url) return '';
  let resolved = url.trim();
  if (resolved.startsWith('/static/')) {
    return `https://alesha-be.djalu.co.id${resolved}`;
  }
  resolved = resolved.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, 'https://alesha-be.djalu.co.id');
  resolved = resolved.replace(/^https?:\/\/alesha\.djalu\.co\.id\/static\//i, 'https://alesha-be.djalu.co.id/static/');
  return resolved;
}

function InformativeTableViewer({
  tableRows,
}: {
  tableRows: string[][];
  onExpandChart?: (c: any) => void;
}) {
  if (!tableRows || tableRows.length === 0) return null;
  const header = tableRows[0];
  const body = tableRows.slice(1);

  return (
    <div className="my-3 rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white max-w-2xl w-full">
      {/* Header bar: Title & Row Count Badge */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a1d37] to-[#132c4f] text-white px-3.5 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-semibold tracking-wide text-slate-100">Ringkasan Data & Informasi</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-blue-200 border border-white/10">
            {body.length} baris
          </span>
        </div>
      </div>

      {/* Pure Table Content */}
      <div className="relative overflow-x-auto max-w-full border-t border-slate-200/70" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{ minWidth: header.length > 4 ? `${Math.max(680, header.length * 125)}px` : '100%' }}
          className="w-full text-left border-collapse text-xs"
        >
          <thead className="bg-slate-100/95 text-slate-900 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider sticky top-0 z-10">
            <tr>
              {header.map((h, hIdx) => (
                <th
                  key={hIdx}
                  className={`py-2.5 px-3 border-r last:border-r-0 border-slate-200/80 whitespace-nowrap bg-slate-100/95 ${hIdx === 0 && (h.toLowerCase() === 'no' || h === '#') ? 'w-12 text-center' : ''
                    }`}
                >
                  {parseInlineFormatting(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/50 transition-colors odd:bg-white even:bg-slate-50/50">
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-2.5 px-3 border-r last:border-r-0 border-slate-200/60 text-slate-700 whitespace-nowrap text-xs ${cIdx === 0 && (header[0]?.toLowerCase() === 'no' || header[0] === '#') ? 'w-12 text-center font-medium' : ''
                      }`}
                  >
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

function renderTableCell(cell: string): React.ReactNode {
  const trimmed = cell.trim();
  const lower = trimmed.toLowerCase();

  if (['aktif', 'selesai', 'lulus', 'sukses', 'lengkap', 'terverifikasi'].includes(lower)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        {trimmed}
      </span>
    );
  }

  if (['pending', 'proses', 'berjalan', 'menunggu', 'draft'].includes(lower)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        {trimmed}
      </span>
    );
  }

  if (['nonaktif', 'gagal', 'belum', 'tidak aktif', 'batal'].includes(lower)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
        {trimmed}
      </span>
    );
  }

  if (/^\d+(\.\d+)?%$/.test(trimmed)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
        {trimmed}
      </span>
    );
  }

  return parseInlineFormatting(trimmed);
}

function parseInlineFormatting(text: string): React.ReactNode {
  if (!text) return '';

  // Split by bold (**...**), inline code (`...`), markdown links [text](url), or italic (*...*)
  const parts = text.split(/(\b\*\*[^*]+?\*\*|\*\*[^*]+?\*\*|`[^`]+?`|\*[^*\n]+?\*|\[[^\]]+\]\s*\([^)\s]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-slate-900">
          {inner}
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
      const inner = part.slice(1, -1);
      return (
        <strong key={index} className="font-semibold text-slate-900 bg-blue-50/60 px-1 py-0.5 rounded border border-blue-100/50">
          {inner}
        </strong>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\s*\(([^)\s]+)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const href = resolveAleshaLink(linkMatch[2]);
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

function parseDocumentDownloadCard(line: string, key: string | number): React.ReactNode | null {
  const match = line.match(/\[([^\]]+)\]\s*\(([^)\s]+)\)/i);
  if (!match) return null;

  const rawLabel = match[1].trim();
  const fileUrl = resolveAleshaLink(match[2].trim());
  const lowerLabel = rawLabel.toLowerCase();
  const lowerUrl = fileUrl.toLowerCase();

  const isDocLink =
    lowerUrl.includes('/static/exports/') ||
    /\.(pdf|docx?|xlsx?|csv|pptx?|zip|rar|tar|gz|txt)(?:\?|#|$)/i.test(lowerUrl) ||
    /(?:unduh|download|dokumen|berkas|file|rekapitulasi|laporan|export)/i.test(lowerLabel);

  if (!isDocLink) return null;

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

  let docTitle = rawLabel
    .replace(/^(?:unduh|download)\s+(?:dokumen|file|berkas)?\s*(?:word|docx?|excel|xlsx?|spreadsheet|csv|pdf|pptx?|powerpoint)?\s*[:\-–—]?\s*/i, '')
    .replace(/^(?:dokumen|file|berkas)\s+(?:word|docx?|excel|xlsx?|spreadsheet|csv|pdf|pptx?|powerpoint)?\s*[:\-–—]?\s*/i, '')
    .trim();

  if (!docTitle) {
    docTitle = rawLabel;
  }

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
  const beforeText = line.slice(0, match.index).trim();
  const afterText = line.slice((match.index || 0) + match[0].length).trim();

  return (
    <div key={key} className="my-2 space-y-1.5">
      {beforeText && (
        <p className="text-slate-800 leading-relaxed text-xs">
          {parseInlineFormatting(beforeText)}
        </p>
      )}

      <div
        className={`my-2.5 p-3.5 rounded-2xl ${config.cardBg} border ${config.cardBorder} shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl ${config.badgeBg} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform tracking-wider`}
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
          className={`px-3.5 py-2 rounded-xl ${config.btnBg} text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0`}
        >
          <Download className="w-3.5 h-3.5" />
          {config.btnText}
        </a>
      </div>

      {afterText && (
        <p className="text-slate-800 leading-relaxed text-xs">
          {parseInlineFormatting(afterText)}
        </p>
      )}
    </div>
  );
}
