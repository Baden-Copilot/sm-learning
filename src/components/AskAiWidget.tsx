import { useState, useRef, useEffect } from 'react';
import polwanAvatar from '../data/polwan-avatar.png';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AskAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply ?? 'Maaf, tidak ada jawaban.' }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Maaf, terjadi kesalahan koneksi. Coba lagi ya.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#0a1d37] pl-2 pr-5 py-2 text-white shadow-lg shadow-[#0a1d37]/30 transition-transform hover:scale-105 cursor-pointer"
        >
          <img
            src={polwanAvatar}
            alt="Alesha AI"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/20"
          />
          <span className="font-semibold text-sm">Alesha AI</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#0a1d37] px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <img
                src={polwanAvatar}
                alt="Alesha AI"
                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20"
              />
              <div>
                <p className="font-semibold text-sm">Alesha AI</p>
                <p className="text-xs text-blue-100/80">Asisten Panduan E-Learning DIKMAS LANTAS</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-white/10 cursor-pointer"
              aria-label="Tutup"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="text-center mt-6 space-y-3">
                <img
                  src={polwanAvatar}
                  alt="Alesha AI"
                  className="h-20 w-20 rounded-full object-cover mx-auto ring-4 ring-slate-50 shadow-sm"
                />
                <p className="text-sm text-slate-400">
                  Halo, saya Alesha. Tanya apa saja soal materi keselamatan lalu lintas 👋
                </p>
                <div className="flex flex-wrap justify-center gap-2 px-2">
                  {['Apa arti rambu segitiga merah?', 'Apa itu cyberbullying?', 'Syarat bikin SIM C'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <img src={polwanAvatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#0a1d37] text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <img src={polwanAvatar} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 text-sm text-slate-400">
                  Mengetik...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ketik pertanyaan..."
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-[#0a1d37]"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-full bg-[#0a1d37] p-2.5 text-white disabled:opacity-40 cursor-pointer"
              aria-label="Kirim"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}