'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon, SparklesIcon, ChatIcon } from '../../ui/Icons';

export default function ChatPanel({ isOpen, onClose, initialQuery, initialAnswer, chunks }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
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
      const data = await response.json();

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.answer || 'No response generated.' },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, chunks]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 w-full sm:w-[440px] lg:w-[500px] bg-bg flex flex-col animate-slide-right shadow-[-12px_0_40px_rgba(0,0,0,0.5)]"
        role="complementary"
        aria-label="Follow-up chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/80 bg-surface-1 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center">
              <ChatIcon size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-content-1">Follow-up Chat</h3>
              <p className="text-[11px] text-content-3 mt-0.5">{messages.length} messages</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                showSources
                  ? 'bg-accent/15 text-accent border border-accent/25'
                  : 'text-content-3 hover:text-content-2 hover:bg-surface-2 border border-transparent'
              }`}
            >
              {chunks?.length || 0} sources
            </button>
            <button
              onClick={onClose}
              className="text-content-3 hover:text-content-1 p-2 hover:bg-surface-2 rounded-lg transition-all"
              aria-label="Close chat panel"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        {/* Collapsible source chips */}
        {showSources && (
          <div className="px-6 py-3 border-b border-border/60 bg-surface-1/50 flex-shrink-0 animate-fade-in">
            <div className="flex flex-wrap gap-1.5">
              {chunks?.map((c, i) => (
                <span key={i} className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-lg text-[11px] border border-border max-w-[200px] truncate font-medium">
                  {c.doc_title}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${i >= 2 ? 'animate-fade-in' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/15 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0">
                  <SparklesIcon size={12} className="text-accent" />
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'max-w-[80%] bg-accent/12 text-content-1 border border-accent/15 rounded-br-md'
                  : 'max-w-[88%] bg-surface-1 text-content-2 border border-border rounded-bl-md'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="w-6 h-6 rounded-md bg-accent/10 border border-accent/15 flex items-center justify-center mr-2.5 mt-1 flex-shrink-0">
                <SparklesIcon size={12} className="text-accent" />
              </div>
              <div className="bg-surface-1 border border-border rounded-2xl rounded-bl-md px-4 py-3.5">
                <div className="flex space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-accent/60 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area — elevated and prominent */}
        <div className="flex-shrink-0 bg-surface-1 border-t border-border/80 p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up..."
                rows={1}
                className="w-full bg-bg border border-border hover:border-border-hover rounded-xl px-4 py-3 pr-3 text-sm text-content-1 placeholder-content-3/70 resize-none focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all"
                style={{ maxHeight: '100px' }}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="h-[46px] px-5 bg-gradient-to-r from-accent to-accent-hover text-black font-bold rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 shadow-[0_2px_8px_rgba(240,192,90,0.2)] hover:shadow-[0_4px_16px_rgba(240,192,90,0.3)]"
            >
              Send
            </button>
          </div>
          <p className="text-[10px] text-content-3/50 mt-2 text-center">Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}
