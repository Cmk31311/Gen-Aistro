'use client';
import { useState, useEffect } from 'react';
import { useBookmarks } from '../../context/BookmarkContext';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { extractKeyTerms } from '../../lib/paperUtils';
import { StarIcon, StarFilledIcon, ExternalLinkIcon, CloseIcon } from '../../ui/Icons';

export default function PublicationDetail({ publication, onClose }) {
  const { isPaperBookmarked, togglePaperBookmark, bookmarks, addToReadingList } = useBookmarks();
  const { user } = useAuth();
  const bookmarked = isPaperBookmarked(publication.id);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [annotations, setAnnotations] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Load annotations for this paper
  useEffect(() => {
    if (!user) return;
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/annotations?paper_id=${encodeURIComponent(publication.id)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setAnnotations(await res.json());
    })();
  }, [publication.id, user]);

  async function handleSaveNote() {
    if (!noteInput.trim() || !user) return;
    setSavingNote(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ paper_id: publication.id, note: noteInput.trim() }),
      });
      if (res.ok) {
        const saved = await res.json();
        setAnnotations(prev => [saved, ...prev]);
        setNoteInput('');
      }
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteAnnotation(id) {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/annotations?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }

  // Lazy-load text chunks + similar papers from API (keeps initial bundle small)
  useEffect(() => {
    setDetail(null);
    setDetailLoading(true);
    fetch(`/api/papers/${encodeURIComponent(publication.id)}`)
      .then(r => r.json())
      .then(data => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [publication.id]);

  const abstract = detail?.chunks?.[0]?.text?.substring(0, 500) || '';
  const keyTerms = extractKeyTerms(publication.title + ' ' + abstract);
  const similarPapers = detail?.similarPapers || [];

  return (
    <div className="mt-6 bg-surface-1 rounded-xl border border-border p-4 sm:p-7 animate-slide-up shadow-card">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 mr-4">
          <h3 className="text-lg font-bold text-gradient-gold tracking-tight">{publication.title}</h3>
          <p className="text-content-3 text-sm mt-1.5">ID: {publication.id}</p>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button onClick={() => togglePaperBookmark(publication)} className={`p-2 rounded-lg transition-all ${bookmarked ? 'text-accent bg-accent-muted' : 'text-content-3 hover:text-accent hover:bg-surface-2'}`}>
            {bookmarked ? <StarFilledIcon size={16} /> : <StarIcon size={16} />}
          </button>
          {publication.url && (
            <button onClick={() => window.open(publication.url, '_blank', 'noopener,noreferrer')} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all">
              <ExternalLinkIcon size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-all">
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Year', value: publication.year || 'N/A' },
            { label: 'Chunks', value: `${publication.chunkCount || 0} segments` },
            { label: 'Status', value: publication.url ? 'Online' : 'Metadata only' },
            { label: 'ID', value: publication.id },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 bg-bg rounded-lg border border-border">
              <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-1 font-medium">{label}</div>
              <div className="text-sm text-content-1 font-medium">{value}</div>
            </div>
          ))}
        </div>

        {keyTerms.length > 0 && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Key Terms</h4>
            <div className="flex flex-wrap gap-2">
              {keyTerms.map(term => (
                <span key={term} className="px-3 py-1 bg-accent-muted text-accent rounded-lg text-xs border border-accent/20 font-medium">{term}</span>
              ))}
            </div>
          </div>
        )}

        {detailLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-2.5 bg-surface-2 rounded w-1/3" />
            <div className="h-2.5 bg-surface-2 rounded" />
            <div className="h-2.5 bg-surface-2 rounded w-4/5" />
            <div className="h-2.5 bg-surface-2 rounded w-2/3" />
          </div>
        ) : (
          <>
            {abstract && (
              <div>
                <h4 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Text Preview</h4>
                <p className="text-content-2 text-sm leading-relaxed">{abstract}...</p>
              </div>
            )}

            {similarPapers.length > 0 && (
              <div>
                <h4 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Similar Papers</h4>
                <div className="space-y-2">
                  {similarPapers.map(paper => (
                    <div key={paper.id} className="flex items-center justify-between p-3.5 bg-bg rounded-xl border border-border hover:border-accent/20 cursor-pointer transition-all group" onClick={() => paper.url && window.open(paper.url, '_blank', 'noopener,noreferrer')}>
                      <span className="text-content-2 text-sm line-clamp-1 flex-1 mr-3 group-hover:text-content-1">{paper.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-accent/50 rounded-full" style={{ width: `${paper.similarity * 100}%` }} />
                        </div>
                        <span className="text-xs text-accent font-medium w-8 text-right">{(paper.similarity * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {bookmarks.readingLists.length > 0 && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Add to Reading List</h4>
            <div className="flex flex-wrap gap-2">
              {bookmarks.readingLists.map(list => (
                <button key={list.id} onClick={() => addToReadingList(list.id, publication)} className="px-3.5 py-2 bg-surface-2 text-content-2 rounded-xl text-xs hover:text-accent hover:bg-accent-muted border border-border hover:border-accent/20 transition-all font-medium">
                  + {list.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {user && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Notes</h4>
            <div className="flex gap-2 mb-3">
              <textarea
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveNote(); }}
                placeholder="Add a note… (⌘↵ to save)"
                rows={2}
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm text-content-1 placeholder-content-3 resize-none focus:outline-none focus:border-accent/50 transition-colors"
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote || !noteInput.trim()}
                className="px-4 py-2 bg-accent text-bg rounded-lg text-xs font-medium hover:bg-accent/90 disabled:opacity-40 transition-all self-start"
              >
                {savingNote ? '…' : 'Save'}
              </button>
            </div>
            {annotations.length > 0 && (
              <div className="space-y-2">
                {annotations.map(ann => (
                  <div key={ann.id} className="group flex items-start gap-2 p-3 bg-bg rounded-lg border border-border">
                    <p className="flex-1 text-sm text-content-2 leading-relaxed">{ann.note}</p>
                    <button
                      onClick={() => handleDeleteAnnotation(ann.id)}
                      className="opacity-0 group-hover:opacity-100 text-content-3 hover:text-red-400 transition-all text-xs px-1 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
