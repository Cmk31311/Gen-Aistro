'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

const PapersContext = createContext(null);

export function PapersProvider({ children }) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError('');

    // Load lightweight metadata + stats + graph (no embeddings, no full text)
    Promise.all([
      fetch('/api/papers?limit=9999').then(r => r.json()),
      fetch('/data/stats.json').then(r => r.json()).catch(() => null),
      fetch('/api/graph').then(r => r.json()).catch(() => null)
    ])
      .then(([papersData, statsData, graph]) => {
        const pubs = (papersData.publications || []).map(p => ({
          id: p.id,
          title: p.title,
          year: p.year,
          url: p.url,
          chunkCount: p.chunkCount || 0,
          type: 'publication',
        }));
        setPublications(pubs);
        setStats(statsData);
        setGraphData(graph);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setError('Failed to load publications data');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <PapersContext.Provider value={{
      publications,
      loading,
      error,
      stats,
      graphData,
      reload: loadData
    }}>
      {children}
    </PapersContext.Provider>
  );
}

export function usePapers() {
  const ctx = useContext(PapersContext);
  if (!ctx) throw new Error('usePapers must be used within PapersProvider');
  return ctx;
}
