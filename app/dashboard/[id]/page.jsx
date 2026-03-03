'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { SparklesIcon, SearchIcon, ChatIcon, DatabaseIcon } from '../../../ui/Icons';

export default function DatasetDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [dataset, setDataset] = useState(null);
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard/' + id);
      return;
    }
    if (user) fetchDataset();
  }, [user, authLoading, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchDataset = async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/datasets', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const { datasets } = await res.json();
        const ds = datasets?.find((d) => d.id === id);
        if (ds) setDataset(ds);
        else router.push('/datasets');
      }
    } catch (err) {
      console.error('Failed to load dataset:', err);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);

    try {
      const token = await getToken();

      // Search for relevant chunks
      const searchRes = await fetch(`/api/datasets/${id}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query: query.trim(), topK: 8 }),
      });

      if (!searchRes.ok) throw new Error('Search failed');
      const { results } = await searchRes.json();
      setSources(results || []);

      // Ask AI
      const askRes = await fetch(`/api/datasets/${id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question: query.trim() }),
      });

      if (!askRes.ok) throw new Error('AI response failed');
      const { answer: ans } = await askRes.json();
      setAnswer(ans || 'No answer generated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, id]);

  const handleChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const token = await getToken();
      const history = [...chatHistory, { role: 'user', content: userMsg }];

      const res = await fetch(`/api/datasets/${id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: userMsg,
          conversation_history: history,
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const { answer: ans } = await res.json();
      setChatHistory((prev) => [...prev, { role: 'assistant', content: ans }]);
    } catch (err) {
      setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatHistory, id]);

  if (authLoading || !dataset) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-content-3">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#F0C05A]/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border sticky top-0 z-20 bg-bg/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <a href="/" className="flex items-center space-x-2">
                  <SparklesIcon size={18} className="text-accent" />
                  <span className="text-xl font-bold text-gradient-gold tracking-tight">Gen-Aistro</span>
                </a>
                <span className="text-[11px] uppercase tracking-[0.1em] text-accent/60 border-l border-border pl-3 font-medium truncate max-w-[200px]">
                  {dataset.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-content-3">{dataset.total_chunks} chunks</span>
                <a href="/datasets" className="text-sm text-content-3 hover:text-accent transition-colors">My Datasets</a>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex space-x-1 pb-2" role="tablist">
              {[
                { key: 'search', label: 'Search', icon: SearchIcon },
                { key: 'chat', label: 'Chat', icon: ChatIcon },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`relative flex items-center space-x-1.5 px-3 py-2 text-sm transition-all ${
                    activeTab === key ? 'text-accent font-medium' : 'text-content-3 hover:text-content-2'
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  {activeTab === key && (
                    <span className="absolute -bottom-[9px] left-1 right-1 h-[2.5px] bg-accent rounded-full shadow-[0_1px_8px_rgba(240,192,90,0.3)]" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="animate-fade-in">
              {/* Search input */}
              <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-card mb-6">
                <div className="flex gap-3">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
                    placeholder={`Ask anything about "${dataset.name}"...`}
                    rows={2}
                    className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-3 text-content-1 placeholder:text-content-3/50 resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="px-6 self-end py-3 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Searching
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <SearchIcon size={16} />
                        Search
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">{error}</div>
              )}

              {/* Answer */}
              {answer && (
                <div className="bg-surface-1 border border-border rounded-xl p-6 shadow-card mb-6">
                  <h3 className="text-sm font-medium text-accent mb-3 flex items-center gap-2">
                    <SparklesIcon size={14} />
                    AI Answer
                  </h3>
                  <div className="text-content-1 text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
                </div>
              )}

              {/* Sources */}
              {sources.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-content-2 mb-3">Sources ({sources.length})</h3>
                  <div className="grid gap-3">
                    {sources.map((s, i) => (
                      <div key={i} className="bg-surface-1 border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-accent">{s.doc_title || 'Untitled'}</span>
                          {s.year && <span className="text-xs text-content-3">{s.year}</span>}
                          {s.score > 0 && <span className="text-xs text-content-3 ml-auto">{(s.score * 100).toFixed(0)}% match</span>}
                        </div>
                        <p className="text-xs text-content-2 line-clamp-3">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!answer && !loading && !error && (
                <div className="text-center py-16">
                  <DatabaseIcon size={48} className="text-content-3/20 mx-auto mb-4" />
                  <p className="text-content-3 text-sm">Search your dataset with natural language questions</p>
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="animate-fade-in">
              <div className="bg-surface-1 border border-border rounded-xl shadow-card overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ height: 'calc(100% - 72px)' }}>
                  {chatHistory.length === 0 && (
                    <div className="text-center py-16">
                      <ChatIcon size={32} className="text-content-3/20 mx-auto mb-3" />
                      <p className="text-content-3 text-sm">Start a conversation about your dataset</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-accent/15 text-content-1 border border-accent/20'
                          : 'bg-surface-2 text-content-1 border border-border'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                  <div className="flex gap-3">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                      placeholder="Type a message..."
                      className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-content-1 placeholder:text-content-3/50 focus:outline-none focus:border-accent/50 transition-all"
                    />
                    <button
                      onClick={handleChat}
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
