'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';

const SessionContext = createContext(null);

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession();
  return session?.access_token ?? null;
}

export function SessionProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [loadedSessions, setLoadedSessions] = useState(false);

  const loadSessions = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { sessions: data } = await res.json();
        setSessions(data || []);
        setLoadedSessions(true);
      }
    } catch {}
  }, []);

  const saveSession = useCallback(async (name, messages, datasetId = null, existingId = null) => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: existingId, name, messages, dataset_id: datasetId }),
      });
      if (!res.ok) return null;
      const { id } = await res.json();
      await loadSessions();
      return id;
    } catch {
      return null;
    }
  }, [loadSessions]);

  const loadSession = useCallback(async (id) => {
    const token = await getToken();
    if (!token) return null;
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const { session } = await res.json();
      return session;
    } catch {
      return null;
    }
  }, []);

  const deleteSession = useCallback(async (id) => {
    const token = await getToken();
    if (!token) return;
    try {
      await fetch(`/api/sessions?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
  }, []);

  return (
    <SessionContext.Provider value={{ sessions, loadedSessions, loadSessions, saveSession, loadSession, deleteSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
