'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { CloseIcon, ChatIcon, StarIcon } from '../ui/Icons';

export default function SessionsPanel({ isOpen, onClose, onLoadSession }) {
  const { sessions, loadedSessions, loadSessions, deleteSession, loadSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    if (isOpen && !loadedSessions) loadSessions();
  }, [isOpen, loadedSessions, loadSessions]);

  const handleLoad = async (id) => {
    setLoadingId(id);
    try {
      const session = await loadSession(id);
      if (session) {
        onLoadSession(session);
        onClose();
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 w-full sm:w-[400px] bg-bg flex flex-col animate-slide-right shadow-[-12px_0_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/80 bg-surface-1 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center">
              <StarIcon size={16} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-content-1">Saved Sessions</h3>
              <p className="text-[11px] text-content-3 mt-0.5">{sessions.length} sessions</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-3 hover:text-content-1 p-2 hover:bg-surface-2 rounded-lg transition-all">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {!loadedSessions ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-surface-2 rounded-xl" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <ChatIcon size={32} className="text-content-3/30 mb-3" />
              <p className="text-sm text-content-2">No saved sessions yet</p>
              <p className="text-xs text-content-3 mt-1">Save a session after searching to find it here</p>
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="bg-surface-1 rounded-xl border border-border p-4 hover:border-accent/20 transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-content-1 truncate">{session.name}</h4>
                    <p className="text-xs text-content-3 mt-0.5">
                      {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleLoad(session.id)}
                      disabled={loadingId === session.id}
                      className="px-3 py-1.5 bg-accent/10 text-accent text-xs rounded-lg hover:bg-accent/20 transition-all font-medium disabled:opacity-50"
                    >
                      {loadingId === session.id ? '...' : 'Load'}
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-1.5 text-content-3 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
