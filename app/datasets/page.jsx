'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getSupabase } from '../../lib/supabase';
import UploadWizard from '../../components/UploadWizard';
import { SparklesIcon, DatabaseIcon } from '../../ui/Icons';

const STATUS_COLORS = {
  ready: 'bg-green-400/15 text-green-400 border-green-400/20',
  processing: 'bg-amber-400/15 text-amber-400 border-amber-400/20',
  pending: 'bg-blue-400/15 text-blue-400 border-blue-400/20',
  error: 'bg-red-400/15 text-red-400 border-red-400/20',
};

export default function DatasetsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchDatasets = async () => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;

      const res = await fetch('/api/datasets', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { datasets: ds } = await res.json();
        setDatasets(ds || []);
      }
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/datasets');
      return;
    }
    if (user) fetchDatasets();
  }, [user, authLoading]);

  const handleDelete = async (e, dsId) => {
    e.stopPropagation();
    if (!confirm('Delete this dataset and all its data? This cannot be undone.')) return;
    setDeletingId(dsId);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      const res = await fetch('/api/datasets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: dsId }),
      });
      if (res.ok) setDatasets((prev) => prev.filter((d) => d.id !== dsId));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadComplete = (datasetId) => {
    setShowUpload(false);
    if (datasetId) {
      router.push(`/dashboard/${datasetId}`);
    } else {
      fetchDatasets();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-content-3">Loading...</div>
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
                  <h1 className="text-xl font-bold text-gradient-gold tracking-tight">Gen-Aistro</h1>
                </a>
                <span className="text-[11px] uppercase tracking-[0.1em] text-accent/60 border-l border-border pl-3 font-medium">My Datasets</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-content-3">{user?.email}</span>
                <a href="/" className="text-sm text-content-3 hover:text-accent transition-colors">NASA Dashboard</a>
                <button onClick={signOut} className="text-sm text-content-3 hover:text-red-400 transition-colors">Sign Out</button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {showUpload ? (
            <UploadWizard
              onComplete={handleUploadComplete}
              onCancel={() => setShowUpload(false)}
            />
          ) : (
            <>
              {/* Header row */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-content-1">Your Datasets</h2>
                  <p className="text-sm text-content-3 mt-1">Upload CSV datasets and explore them with AI</p>
                </div>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all"
                >
                  + Upload Dataset
                </button>
              </div>

              {/* Dataset list */}
              {loading ? (
                <div className="text-center py-16 text-content-3">Loading datasets...</div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-16">
                  <DatabaseIcon size={48} className="text-content-3/30 mx-auto mb-4" />
                  <h3 className="text-lg text-content-2 mb-2">No datasets yet</h3>
                  <p className="text-sm text-content-3 mb-6">Upload a CSV, TXT, MD, or PDF file to get started with AI-powered research exploration.</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-lg text-sm hover:shadow-glow transition-all"
                  >
                    Upload your first dataset
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {datasets.map((ds) => (
                    <div
                      key={ds.id}
                      onClick={() => {
                        if (ds.status === 'ready') router.push(`/dashboard/${ds.id}`);
                      }}
                      className={`w-full text-left bg-surface-1 border border-border rounded-xl p-5 transition-all ${
                        ds.status === 'ready' ? 'hover:border-accent/30 hover:shadow-card-hover cursor-pointer' : 'opacity-70 cursor-default'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-semibold text-content-1">{ds.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[ds.status] || STATUS_COLORS.pending}`}>
                            {ds.status}
                          </span>
                          <button
                            onClick={(e) => handleDelete(e, ds.id)}
                            disabled={deletingId === ds.id}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-400/20 text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                          >
                            {deletingId === ds.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      {ds.description && (
                        <p className="text-sm text-content-3 mb-2">{ds.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-content-3">
                        <span>{ds.total_chunks || 0} chunks</span>
                        <span>{new Date(ds.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Processing progress bar */}
                      {ds.status === 'processing' && ds.total_chunks > 0 && (
                        <div className="mt-3">
                          <div className="w-full bg-surface-3 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${Math.round((ds.processed_chunks / ds.total_chunks) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-content-3 mt-1">
                            {ds.processed_chunks} / {ds.total_chunks} chunks processed
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
