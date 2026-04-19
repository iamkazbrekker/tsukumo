"use client";

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: any;
  suggestions?: string[];
}

interface ChatBotProps {
  onAction?: (action: any) => void;
}

export default function ChatBot({ onAction }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Namaste. I am Michi, your Tsukumo assistant. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages })
      });

      const data = await res.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response,
        action: data.action,
        suggestions: data.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.action && onAction) {
        onAction(data.action);
      }
    } catch (error) {
      console.error('Chat failed', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Forgive me, my neural connection is momentarily unstable.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-36 right-28 z-[200]">
      {/* Chat Bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group relative"
          style={{
            background: 'transparent',
          }}
        >
          <img src="/assets/thangka/michi-logo.png" alt="Michi" className="w-16 h-16 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:animate-pulse" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-white animate-bounce" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="w-96 h-[500px] flex flex-col bg-zinc-950/80 backdrop-blur-xl border border-yellow-700/50 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-yellow-700/30 to-amber-900/30 border-b border-yellow-700/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src="/assets/thangka/michi-logo.png" alt="Michi" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-yellow-500 tracking-widest uppercase">Michi Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-zinc-400">Neural Sync Active</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth cht-scroll"
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-yellow-600/20 text-yellow-100 border border-yellow-600/30' 
                      : 'bg-zinc-900/50 text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {m.content}
                  {m.suggestions && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setInput(s);
                            // We don't call handleSend here because we want the user to see what they clicked
                            // actually, let's just send it immediately for a better UX
                            const fakeEvent = { preventDefault: () => {} };
                            setTimeout(() => {
                               const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
                               if (inputEl) {
                                 inputEl.value = s;
                                 const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
                                 inputEl.dispatchEvent(enterEvent);
                               }
                            }, 10);
                          }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-[10px] font-bold text-yellow-500 transition-all active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {m.action && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                       <div className="text-[10px] uppercase tracking-widest text-yellow-500 font-bold flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-yellow-500 rounded-full animate-ping" />
                        Executing {m.action.type.replace('_', ' ')}
                      </div>
                      {m.action.type === 'BOOK_APPOINTMENT' && (
                        <button 
                          onClick={() => onAction && onAction(m.action)}
                          className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-[0_4px_12px_rgba(218,165,32,0.3)]"
                        >
                          Open Booking Portal
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center gap-3">
                <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-yellow-500/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-yellow-500/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-yellow-500/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Michi is meditating...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-yellow-700/20 bg-black/40">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Michi about your health..."
                className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl py-2.5 pl-4 pr-12 text-sm text-zinc-200 focus:border-yellow-500/50 outline-none transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:hover:bg-yellow-600 rounded-lg text-black transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
