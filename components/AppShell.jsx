'use client';
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TABS } from '../lib/constants';
import { useTheme } from '../context/ThemeContext';
import { useBookmarks } from '../context/BookmarkContext';
import { useAuth } from '../context/AuthContext';
import useKeyboardShortcut from '../hooks/useKeyboardShortcut';
import SearchTab from './SearchTab/SearchTab';
import PublicationsTab from './PublicationsTab/PublicationsTab';
import AnalyticsTab from './AnalyticsTab/AnalyticsTab';
import InsightsTab from './InsightsTab/InsightsTab';
import DeepResearchTab from './DeepResearchTab';
import BookmarksPanel from './BookmarksPanel';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { StarIcon, KeyboardIcon, RocketIcon, DatabaseIcon, TrendingUpIcon, ZapIcon, SparklesIcon, FlaskIcon } from '../ui/Icons';

export default function AppShell() {
  const [activeTab, setActiveTab] = useState(TABS.SEARCH);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { paperCount } = useBookmarks();
  const { user } = useAuth();

  useKeyboardShortcut('k', useCallback(() => {
    setActiveTab(TABS.SEARCH);
    setTimeout(() => document.querySelector('textarea')?.focus(), 100);
  }, []), { ctrl: true });
  useKeyboardShortcut('/', useCallback(() => {
    setActiveTab(TABS.SEARCH);
    setTimeout(() => document.querySelector('textarea')?.focus(), 100);
  }, []));
  useKeyboardShortcut('1', useCallback(() => setActiveTab(TABS.SEARCH), []));
  useKeyboardShortcut('2', useCallback(() => setActiveTab(TABS.GRAPH), []));
  useKeyboardShortcut('3', useCallback(() => setActiveTab(TABS.ANALYTICS), []));
  useKeyboardShortcut('4', useCallback(() => setActiveTab(TABS.INSIGHTS), []));
  useKeyboardShortcut('5', useCallback(() => setActiveTab(TABS.RESEARCH), []));
  useKeyboardShortcut('b', useCallback(() => setShowBookmarks(prev => !prev), []), { ctrl: true });
  useKeyboardShortcut('?', useCallback(() => setShowShortcuts(prev => !prev), []));
  useKeyboardShortcut('Escape', useCallback(() => {
    setShowBookmarks(false);
    setShowShortcuts(false);
  }, []));

  const tabs = [
    { key: TABS.SEARCH, label: 'Search', icon: RocketIcon },
    { key: TABS.GRAPH, label: 'Publications', icon: DatabaseIcon },
    { key: TABS.ANALYTICS, label: 'Analytics', icon: TrendingUpIcon },
    { key: TABS.INSIGHTS, label: 'Insights', icon: ZapIcon },
    { key: TABS.RESEARCH, label: 'Research', icon: FlaskIcon }
  ];

  return (
    <div className="min-h-screen bg-bg text-content-2 selection:bg-accent/20">
      {/* Absolute Ambient Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-[-10%] left-[20%] w-[800px] h-[500px] bg-accent/5 blur-[120px] rounded-full" 
        />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 3, delay: 0.5 }}
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] rounded-full" 
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-accent focus:text-bg">
          Skip to content
        </a>

        {/* ── Floated Header ─────────────────────────────────────────── */}
        <header className="sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-auto max-w-6xl mt-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between h-14 px-4 rounded-2xl glass-header shadow-glass border border-white/5"
          >
            <div className="flex items-center gap-6 h-full">
              {/* Logo */}
              <a href="/" className="flex items-center gap-2.5 shrink-0 group">
                <div className="w-8 h-8 rounded-[10px] bg-accent/10 border border-accent/20 flex items-center justify-center shadow-glow-accent transition-transform group-hover:scale-105">
                  <SparklesIcon size={14} className="text-accent" />
                </div>
                <span className="text-[16px] font-semibold text-content-1 tracking-tight">Gen-Aistro</span>
              </a>

              <div className="hidden md:block w-px h-5 bg-white/10" />

              {/* Dynamic Nav Tabs */}
              <nav className="hidden md:flex items-center gap-1" role="tablist">
                {tabs.map(({ key, label, icon: Icon }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(key)}
                      className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[13px] font-medium transition-colors duration-200 ${
                        isActive ? 'text-accent' : 'text-content-3 hover:text-content-1'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTabIndicator"
                          className="absolute inset-0 bg-accent/10 rounded-xl"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <Icon size={14} className="relative z-10" />
                      <span className="relative z-10">{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right utility actions */}
            <div className="flex items-center gap-1.5 shrink-0 h-full">
              <div className="flex items-center gap-0.5">
                <button onClick={() => setShowBookmarks(true)} className="relative p-2 rounded-xl text-content-3 hover:text-content-1 hover:bg-white/5 transition-all" aria-label="Bookmarks">
                  <StarIcon size={16} />
                  {paperCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_8px_rgba(229,169,61,0.8)]" 
                    />
                  )}
                </button>
                <button onClick={() => setShowShortcuts(true)} className="hidden sm:flex p-2 rounded-xl text-content-3 hover:text-content-1 hover:bg-white/5 transition-all" aria-label="Shortcuts">
                  <KeyboardIcon size={16} />
                </button>
              </div>

              <div className="w-px h-5 bg-white/10 mx-1" />

              {/* My Datasets + Auth */}
              <div className="flex items-center gap-2">
                <a
                  href="/datasets"
                  className="flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-xl text-accent/90 border border-accent/20 bg-accent/5 hover:border-accent/40 hover:text-accent hover:bg-accent/10 transition-all shadow-glow-subtle whitespace-nowrap"
                >
                  <DatabaseIcon size={14} />
                  <span>Datasets</span>
                </a>
                {!user && (
                  <a
                    href="/login"
                    className="flex items-center px-4 py-1.5 text-[13px] font-medium text-bg bg-content-1 hover:bg-white rounded-xl transition-all shadow-glass"
                  >
                    Sign In
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </header>

        {/* ── Main Content Area ──────────────────────────────────────── */}
        <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-12 pb-24" role="tabpanel" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {activeTab === TABS.SEARCH && <SearchTab />}
              {activeTab === TABS.GRAPH && <PublicationsTab />}
              {activeTab === TABS.ANALYTICS && <AnalyticsTab />}
              {activeTab === TABS.INSIGHTS && <InsightsTab />}
              {activeTab === TABS.RESEARCH && <DeepResearchTab />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-auto max-w-6xl mx-auto w-full px-4 sm:px-6 pb-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="pt-4 flex justify-between text-xs text-content-3">
            <span>Powered by NASA Open Data</span>
            <span>Gen-Aistro v1.0</span>
          </div>
        </footer>
      </div>

      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
