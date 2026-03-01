'use client';
import React, { createContext, useContext, useCallback } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

const BookmarkContext = createContext(null);

export function BookmarkProvider({ children }) {
  const [bookmarks, setBookmarks] = useLocalStorage('genaistro-bookmarks', {
    papers: [],
    searches: [],
    readingLists: []
  });

  // Paper bookmarks
  const addPaperBookmark = useCallback((paper) => {
    setBookmarks(prev => ({
      ...prev,
      papers: prev.papers.some(p => p.id === paper.id)
        ? prev.papers
        : [...prev.papers, { id: paper.id, title: paper.title, url: paper.url, addedAt: new Date().toISOString() }]
    }));
  }, [setBookmarks]);

  const removePaperBookmark = useCallback((paperId) => {
    setBookmarks(prev => ({
      ...prev,
      papers: prev.papers.filter(p => p.id !== paperId)
    }));
  }, [setBookmarks]);

  const isPaperBookmarked = useCallback((paperId) => {
    return bookmarks.papers.some(p => p.id === paperId);
  }, [bookmarks.papers]);

  const togglePaperBookmark = useCallback((paper) => {
    if (isPaperBookmarked(paper.id)) {
      removePaperBookmark(paper.id);
    } else {
      addPaperBookmark(paper);
    }
  }, [isPaperBookmarked, removePaperBookmark, addPaperBookmark]);

  // Search bookmarks
  const addSearchBookmark = useCallback((query, answer) => {
    setBookmarks(prev => ({
      ...prev,
      searches: [...prev.searches, { query, answer: answer?.substring(0, 200), savedAt: new Date().toISOString() }]
    }));
  }, [setBookmarks]);

  const removeSearchBookmark = useCallback((index) => {
    setBookmarks(prev => ({
      ...prev,
      searches: prev.searches.filter((_, i) => i !== index)
    }));
  }, [setBookmarks]);

  // Reading lists
  const createReadingList = useCallback((name) => {
    const id = Date.now().toString(36);
    setBookmarks(prev => ({
      ...prev,
      readingLists: [...prev.readingLists, { id, name, created: new Date().toISOString(), papers: [] }]
    }));
    return id;
  }, [setBookmarks]);

  const deleteReadingList = useCallback((listId) => {
    setBookmarks(prev => ({
      ...prev,
      readingLists: prev.readingLists.filter(l => l.id !== listId)
    }));
  }, [setBookmarks]);

  const addToReadingList = useCallback((listId, paper) => {
    setBookmarks(prev => ({
      ...prev,
      readingLists: prev.readingLists.map(l =>
        l.id === listId && !l.papers.some(p => p.id === paper.id)
          ? { ...l, papers: [...l.papers, { id: paper.id, title: paper.title, url: paper.url }] }
          : l
      )
    }));
  }, [setBookmarks]);

  const removeFromReadingList = useCallback((listId, paperId) => {
    setBookmarks(prev => ({
      ...prev,
      readingLists: prev.readingLists.map(l =>
        l.id === listId
          ? { ...l, papers: l.papers.filter(p => p.id !== paperId) }
          : l
      )
    }));
  }, [setBookmarks]);

  return (
    <BookmarkContext.Provider value={{
      bookmarks,
      addPaperBookmark,
      removePaperBookmark,
      isPaperBookmarked,
      togglePaperBookmark,
      addSearchBookmark,
      removeSearchBookmark,
      createReadingList,
      deleteReadingList,
      addToReadingList,
      removeFromReadingList,
      paperCount: bookmarks.papers.length,
      searchCount: bookmarks.searches.length,
      listCount: bookmarks.readingLists.length
    }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be used within BookmarkProvider');
  return ctx;
}
