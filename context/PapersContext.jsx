'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { groupChunksByDocId } from '../lib/paperUtils';

const PapersContext = createContext(null);

export function PapersProvider({ children }) {
  const [publications, setPublications] = useState([]);
  const [rawChunks, setRawChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullDataLoaded, setFullDataLoaded] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError('');

    // Phase 1: Load lightweight metadata from API + stats + graph (fast)
    Promise.all([
      fetch('/api/papers?limit=9999').then(r => r.json()),
      fetch('/data/stats.json').then(r => r.json()).catch(() => null),
      fetch('/api/graph').then(r => r.json()).catch(() => null)
    ])
      .then(([papersData, statsData, graph]) => {
        // Convert API metadata to publication format (without chunks initially)
        const pubs = (papersData.publications || []).map(p => ({
          id: p.id,
          title: p.title,
          year: p.year,
          url: p.url,
          type: 'publication',
          chunks: [] // Empty until full data loads
        }));
        setPublications(pubs);
        setStats(statsData);
        setGraphData(graph);
        setLoading(false);

        // Phase 2: Load full chunk data in background for search/analysis features
        fetch('/data/papers.json')
          .then(r => r.json())
          .then(chunks => {
            setRawChunks(chunks);
            const fullPubs = groupChunksByDocId(chunks);
            setPublications(fullPubs);
            setFullDataLoaded(true);
          })
          .catch(err => {
            console.warn('Failed to load full chunk data:', err);
            // Not critical - metadata is still available
          });
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
      rawChunks,
      loading,
      fullDataLoaded,
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
