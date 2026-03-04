'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getSupabase } from '../../../lib/supabase';
import { SparklesIcon, SearchIcon, ChatIcon, DatabaseIcon, TrendingUpIcon } from '../../../ui/Icons';

// ── Analytics Sub-Component ──────────────────────────────────
function AnalyticsPanel({ datasetId, getToken }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const yearCanvasRef = useRef(null);
  const termsCanvasRef = useRef(null);

  useEffect(() => {
    fetchStats();
  }, [datasetId]);

  useEffect(() => {
    if (stats?.year_distribution?.length) drawYearChart();
    if (stats?.top_terms?.length) drawTermsChart();
  }, [stats]);

  const fetchStats = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/datasets/${datasetId}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const drawYearChart = () => {
    const canvas = yearCanvasRef.current;
    if (!canvas || !stats?.year_distribution?.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth;
    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const data = stats.year_distribution;
    const maxCount = Math.max(...data.map(d => d.count));
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = Math.max(4, Math.min(30, chartW / data.length - 4));

    // Grid lines
    ctx.strokeStyle = '#2A2A2E';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#87837E';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxCount * (1 - i / 4)), pad.left - 8, y + 3);
    }

    // Bars
    data.forEach((d, i) => {
      const x = pad.left + (chartW / data.length) * i + (chartW / data.length - barW) / 2;
      const barH = (d.count / maxCount) * chartH;
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#F0C05A');
      grad.addColorStop(1, '#B8923E');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      // Year label (show every Nth to avoid overlap)
      if (data.length <= 20 || i % Math.ceil(data.length / 15) === 0) {
        ctx.fillStyle = '#87837E';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.year, x + barW / 2, h - pad.bottom + 15);
      }
    });
  };

  const drawTermsChart = () => {
    const canvas = termsCanvasRef.current;
    if (!canvas || !stats?.top_terms?.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth;
    const terms = stats.top_terms;
    const barH = 28;
    const h = terms.length * barH + 20;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const maxCount = Math.max(...terms.map(t => t.count));
    const labelW = 120;
    const chartW = w - labelW - 60;

    terms.forEach((t, i) => {
      const y = i * barH + 10;
      const bw = (t.count / maxCount) * chartW;

      // Label
      ctx.fillStyle = '#D6D3D1';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(t.term, labelW - 10, y + 17);

      // Bar
      const grad = ctx.createLinearGradient(labelW, y, labelW + bw, y);
      grad.addColorStop(0, '#F0C05A');
      grad.addColorStop(1, 'rgba(240,192,90,0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(labelW, y + 4, bw, 18, 4);
      ctx.fill();

      // Count
      ctx.fillStyle = '#87837E';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${t.count} (${t.pct}%)`, labelW + bw + 8, y + 17);
    });
  };

  if (loading) return <div className="text-center py-16 text-content-3 animate-pulse">Loading analytics...</div>;
  if (!stats) return <div className="text-center py-16 text-content-3">Failed to load analytics</div>;

  const yearRange = stats.year_distribution?.length
    ? `${stats.year_distribution[0].year} – ${stats.year_distribution[stats.year_distribution.length - 1].year}`
    : 'N/A';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Documents', value: stats.total_docs },
          { label: 'Chunks', value: stats.total_chunks.toLocaleString() },
          { label: 'Year Range', value: yearRange },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-1 border border-border rounded-xl p-5 shadow-card text-center">
            <p className="text-2xl font-bold text-accent">{value}</p>
            <p className="text-xs text-content-3 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Year distribution */}
      {stats.year_distribution?.length > 0 && (
        <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-medium text-content-2 mb-4">Year Distribution</h3>
          <div><canvas ref={yearCanvasRef} /></div>
        </div>
      )}

      {/* Top terms */}
      {stats.top_terms?.length > 0 && (
        <div className="bg-surface-1 border border-border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-medium text-content-2 mb-4">Top Terms (by document frequency)</h3>
          <div><canvas ref={termsCanvasRef} /></div>
        </div>
      )}
    </div>
  );
}

// ── Explorer Sub-Component ───────────────────────────────────
function ExplorerPanel({ datasetId, getToken }) {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [docChunks, setDocChunks] = useState([]);
  const [docLoading, setDocLoading] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchDocuments();
  }, [datasetId, page]);

  const fetchDocuments = async (searchOverride) => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/datasets/${datasetId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ page, limit, search: searchOverride ?? search }),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Documents fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchDocuments(search);
  };

  const expandDocument = async (docId) => {
    if (expandedDoc === docId) {
      setExpandedDoc(null);
      return;
    }
    setExpandedDoc(docId);
    setDocLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/datasets/${datasetId}/documents?doc_id=${encodeURIComponent(docId)}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const { chunks } = await res.json();
        setDocChunks(chunks || []);
      }
    } catch (err) {
      console.error('Document detail error:', err);
    } finally {
      setDocLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in">
      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search documents by title or content..."
          className="flex-1 bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-sm text-content-1 placeholder:text-content-3/50 focus:outline-none focus:border-accent/50 transition-all"
        />
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all"
        >
          Search
        </button>
      </div>

      <p className="text-xs text-content-3 mb-4">{total} documents found</p>

      {loading ? (
        <div className="text-center py-16 text-content-3 animate-pulse">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-content-3">No documents found</div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc, i) => (
            <div key={i} className="bg-surface-1 border border-border rounded-xl overflow-hidden transition-all hover:border-accent/20">
              <button
                onClick={() => expandDocument(doc.doc_id)}
                className="w-full text-left p-4"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-sm font-medium text-content-1 truncate max-w-[70%]">
                    {doc.doc_title || doc.doc_id || 'Untitled'}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-content-3">
                    {doc.year && <span>{doc.year}</span>}
                    <span>{doc.chunk_count} chunk{doc.chunk_count !== 1 ? 's' : ''}</span>
                    <span className="text-accent">{expandedDoc === doc.doc_id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {doc.preview && (
                  <p className="text-xs text-content-3 line-clamp-2">{doc.preview}...</p>
                )}
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-accent hover:underline mt-1 inline-block">
                    {doc.url.length > 60 ? doc.url.slice(0, 60) + '...' : doc.url}
                  </a>
                )}
              </button>

              {/* Expanded: show all chunks */}
              {expandedDoc === doc.doc_id && (
                <div className="border-t border-border px-4 py-3 bg-surface-2/50">
                  {docLoading ? (
                    <p className="text-xs text-content-3 animate-pulse">Loading full text...</p>
                  ) : docChunks.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {docChunks.map((chunk, ci) => (
                        <div key={ci} className="text-xs text-content-2 leading-relaxed">
                          {docChunks.length > 1 && (
                            <span className="text-accent/60 font-medium mr-1">Chunk {chunk.chunk_index + 1}:</span>
                          )}
                          {chunk.text}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-content-3">No text available</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-surface-2 border border-border rounded-lg text-content-2 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <span className="text-xs text-content-3">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm bg-surface-2 border border-border rounded-lg text-content-2 hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
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
    const { data: { session } } = await getSupabase().auth.getSession();
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

      const searchRes = await fetch(`/api/datasets/${id}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: query.trim(), topK: 8 }),
      });
      if (!searchRes.ok) throw new Error('Search failed');
      const { results } = await searchRes.json();
      setSources(results || []);

      const askRes = await fetch(`/api/datasets/${id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ question: userMsg, conversation_history: history }),
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

  const tabs = [
    { key: 'search', label: 'Search', icon: SearchIcon },
    { key: 'chat', label: 'Chat', icon: ChatIcon },
    { key: 'analytics', label: 'Analytics', icon: TrendingUpIcon },
    { key: 'explorer', label: 'Explorer', icon: DatabaseIcon },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#F0C05A]/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
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
                <span className="text-xs text-content-3">{dataset.total_chunks?.toLocaleString()} chunks</span>
                <a href="/datasets" className="text-sm text-content-3 hover:text-accent transition-colors">My Datasets</a>
              </div>
            </div>

            <nav className="flex space-x-1 pb-2 overflow-x-auto" role="tablist">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`relative flex-shrink-0 flex items-center space-x-1.5 px-3 py-2 text-sm transition-all ${
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
                      <span className="flex items-center gap-2"><SearchIcon size={16} />Search</span>
                    )}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 mb-6">{error}</div>}

              {answer && (
                <div className="bg-surface-1 border border-border rounded-xl p-6 shadow-card mb-6">
                  <h3 className="text-sm font-medium text-accent mb-3 flex items-center gap-2"><SparklesIcon size={14} />AI Answer</h3>
                  <div className="text-content-1 text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>
                </div>
              )}

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

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <AnalyticsPanel datasetId={id} getToken={getToken} />
          )}

          {/* Explorer Tab */}
          {activeTab === 'explorer' && (
            <ExplorerPanel datasetId={id} getToken={getToken} />
          )}
        </main>
      </div>
    </div>
  );
}
