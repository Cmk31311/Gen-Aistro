'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseIcon, SparklesIcon } from '../../ui/Icons';

export default function ChatPanel({ isOpen, onClose, initialQuery, initialAnswer, chunks }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize messages when panel opens with new data
  useEffect(() => {
    if (isOpen && initialQuery && initialAnswer) {
      setMessages([
        { role: 'user', content: initialQuery },
        { role: 'assistant', content: initialAnswer },
      ]);
      setInput('');
    }
  }, [isOpen, initialQuery, initialAnswer]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape
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
      <div
        className="fixed inset-0 bg-black/40 lg:bg-transparent z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 w-full sm:w-[420px] lg:w-[480px] bg-surface-1 border-l border-border shadow-[−8px_0_32px_rgba(0,0,0,0.4)] flex flex-col animate-slide-right"
        role="complementary"
        aria-label="Follow-up chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            <SparklesIcon size={18} className="text-accent" />
            <h3 className="text-sm font-semibold text-content-1 tracking-tight">Follow-up Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="text-content-3 hover:text-content-1 p-1.5 hover:bg-surface-2 rounded-lg transition-colors"
            aria-label="Close chat panel"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Source chips */}
        <div className="px-5 py-3 border-b border-border flex-shrink-0 overflow-x-auto">
          <p className="text-[10px] uppercase tracking-[0.1em] text-content-3 mb-2 font-medium">
            Sources ({chunks?.length || 0})
          </p>
          <div className="flex gap-1.5 flex-nowrap">
            {chunks?.slice(0, 5).map((c, i) => (
              <span key={i} className="flex-shrink-0 px-2 py-1 bg-surface-2 text-content-3 rounded-md text-[11px] border border-border max-w-[160px] truncate">
                {c.doc_title}
              </span>
            ))}
            {chunks?.length > 5 && (
              <span className="flex-shrink-0 px-2 py-1 bg-surface-2 text-content-3 rounded-md text-[11px] border border-border">
                +{chunks.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent/15 text-content-1 border border-accent/20'
                  : 'bg-surface-2 text-content-2 border border-border'
              } ${i >= 2 ? 'animate-fade-in' : ''}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
                <div className="flex space-x-1.5">
                  <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          <div className="flex items-end space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..."
              rows={1}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-content-1 placeholder-content-3 resize-none focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-colors"
              style={{ maxHeight: '120px' }}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 py-3 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
