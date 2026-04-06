'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon, SparklesIcon, ChatIcon } from '../../ui/Icons';

export default function ChatPanel({ isOpen, onClose, initialQuery, initialAnswer, chunks }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialQuery && initialAnswer) {
      setMessages([
        { role: 'user', content: initialQuery },
        { role: 'assistant', content: initialAnswer },
      ]);
      setInput('');
      setShowSources(false);
    }
  }, [isOpen, initialQuery, initialAnswer]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    setStreaming(true);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          chunks,
          temperature: 0.3,
          max_tokens: 800,
          conversation_history: updatedMessages,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          try {
            const event = JSON.parse(raw);
            if (event.token) {
              fullContent += event.token;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: fullContent };
                return next;
              });
            }
          } catch {}
        }
      }

      if (!fullContent) {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: 'No interpretation available.' };
          return next;
        });
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Critical error in neural link. Please re-initialize query.' },
      ]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }, [input, loading, messages, chunks]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40" 
            onClick={onClose} 
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full z-50 w-full sm:w-[460px] lg:w-[540px] bg-bg/95 backdrop-blur-3xl flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.8)] border-l border-white/5"
            role="complementary"
            aria-label="Interactive Query Terminal"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-transparent flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shadow-[0_0_15px_rgba(229,169,61,0.1)]">
                  <ChatIcon size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-content-1 to-content-2">Terminal Iteration</h3>
                  <p className="text-[11px] text-content-3 font-medium uppercase tracking-widest mt-1">v1.0 // {messages.length} Nodes</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold tracking-wide uppercase transition-all ${
                    showSources
                      ? 'bg-accent/15 text-accent border border-accent/25'
                      : 'glass-panel text-content-3 hover:text-content-1 border-white/5'
                  }`}
                >
                  {chunks?.length || 0} Data Points
                </button>
                <div className="w-px h-6 bg-white/5" />
                <button
                  onClick={onClose}
                  className="text-content-3 hover:text-content-1 p-2 hover:bg-white/5 rounded-xl transition-all"
                  aria-label="Terminate session"
                >
                  <CloseIcon size={18} />
                </button>
              </div>
            </div>

            {/* Collapsible source chips */}
            <AnimatePresence>
              {showSources && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-8 py-4 border-b border-white/5 bg-black/20 flex-shrink-0 overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2">
                    {chunks?.map((c, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white/5 text-content-2 rounded-xl text-[11px] border border-white/10 max-w-[220px] truncate font-medium">
                        {c.doc_title}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 min-h-0 container-snap">
              {messages.map((msg, i) => {
                const isStreamingThisMsg = streaming && msg.role === 'assistant' && i === messages.length - 1;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0 shadow-glow-subtle">
                        <SparklesIcon size={14} className="text-accent" />
                      </div>
                    )}
                    <div className={`px-6 py-4 text-[14px] leading-[1.7] ${
                      msg.role === 'user'
                        ? 'max-w-[85%] bg-accent/10 text-content-1 border border-accent/20 rounded-[20px] rounded-br-sm'
                        : 'max-w-[85%] glass-panel text-content-2 border border-white/10 rounded-[20px] rounded-bl-sm shadow-xl'
                    }`}>
                      <div className="whitespace-pre-wrap font-medium">
                        {msg.content}
                        {isStreamingThisMsg && (
                          <span className="inline-block w-1.5 h-4 bg-accent ml-1 animate-pulse align-middle rounded-full" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loading && !streaming && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                    <SparklesIcon size={14} className="text-accent" />
                  </div>
                  <div className="glass-panel border-white/10 rounded-[20px] rounded-bl-sm px-6 py-5">
                    <div className="flex space-x-2">
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-accent/80 rounded-full" />
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-accent/80 rounded-full" />
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-accent/80 rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 bg-transparent p-6 pb-8 border-t border-white/5 relative z-10">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
              <div className="flex items-end space-x-4">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Input command..."
                    rows={1}
                    className="w-full glass-panel hover:bg-white/5 border border-white/10 rounded-2xl px-5 py-4 pr-12 text-[14px] text-content-1 placeholder-content-3/50 resize-none focus:border-accent/40 focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all font-medium"
                    style={{ maxHeight: '120px' }}
                    disabled={loading}
                  />
                  <div className="absolute right-4 top-4 text-xs font-bold text-content-3/30 pointer-events-none select-none uppercase tracking-widest hidden sm:block">
                    CMD / INP
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="h-[54px] w-[54px] flex items-center justify-center bg-gradient-to-t from-accent-dim to-accent text-bg rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(229,169,61,0.2)]"
                >
                  <ChatIcon size={20} className="ml-0.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
