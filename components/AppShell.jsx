'use client';
import React, { useState, useCallback } from 'react';
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
import { StarIcon, SunIcon, MoonIcon, KeyboardIcon, RocketIcon, DatabaseIcon, TrendingUpIcon, ZapIcon, SparklesIcon, FlaskIcon } from '../ui/Icons';

export default function AppShell() {
  const [activeTab, setActiveTab] = useState(TABS.SEARCH);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toggleTheme, isDark } = useTheme();
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
    <div className="min-h-screen bg-bg">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#F0C05A]/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[-100px] left-[60%] w-[500px] h-[300px] bg-[#F0C05A]/[0.025] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-accent focus:text-black">
          Skip to content
        </a>

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 bg-bg/75 backdrop-blur-xl border-b border-white/[0.06]">
          {/* Glow line across top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent pointer-events-none" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center h-14 gap-3 overflow-x-auto scrollbar-none">

              {/* Logo */}
              <a href="/" className="flex items-center gap-2 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-accent/15 border border-accent/25 flex items-center justify-center shadow-[0_0_14px_rgba(240,192,90,0.18)]">
                  <SparklesIcon size={13} className="text-accent" />
                </div>
                <span className="text-[15px] font-bold text-gradient-gold tracking-tight whitespace-nowrap">Gen-Aistro</span>
              </a>

              {/* Separator */}
              <div className="h-5 w-px bg-white/8 shrink-0" />

              {/* Nav tabs — pill active state */}
              <nav className="flex items-center gap-0.5 shrink-0" role="tablist">
                {tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={activeTab === key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 whitespace-nowrap ${
                      activeTab === key
                        ? 'bg-accent/12 text-accent font-medium ring-1 ring-accent/20'
                        : 'text-content-3 hover:text-content-1 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              {/* Spacer */}
              <div className="flex-1 min-w-0" />

              {/* Utility icons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => setShowBookmarks(true)} className="relative p-2 rounded-lg text-content-3 hover:text-accent hover:bg-white/5 transition-all" aria-label="Bookmarks">
                  <StarIcon size={15} />
                  {paperCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full shadow-[0_0_6px_rgba(240,192,90,0.7)]" />}
                </button>
                <button onClick={toggleTheme} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-white/5 transition-all" aria-label="Toggle theme">
                  {isDark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                </button>
                <button onClick={() => setShowShortcuts(true)} className="hidden sm:flex p-2 rounded-lg text-content-3 hover:text-accent hover:bg-white/5 transition-all" aria-label="Shortcuts">
                  <KeyboardIcon size={15} />
                </button>
              </div>

              {/* Separator */}
              <div className="h-5 w-px bg-white/8 shrink-0" />

              {/* My Datasets + Sign In */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/datasets"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-accent/25 text-accent bg-gradient-to-br from-accent/12 to-accent/4 hover:border-accent/45 hover:from-accent/20 hover:to-accent/8 transition-all shadow-[0_0_16px_rgba(240,192,90,0.07)] whitespace-nowrap"
                >
                  <DatabaseIcon size={13} />
                  <span>My Datasets</span>
                </a>
                {!user && (
                  <a
                    href="/login"
                    className="flex items-center px-3 py-1.5 text-sm text-content-2 hover:text-accent hover:bg-white/5 rounded-lg transition-all whitespace-nowrap"
                  >
                    Sign In
                  </a>
                )}
              </div>

            </div>
          </div>
        </header>

        <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8" role="tabpanel" aria-live="polite">
          <div className="animate-fade-in">
            {activeTab === TABS.SEARCH && <SearchTab />}
            {activeTab === TABS.GRAPH && <PublicationsTab />}
            {activeTab === TABS.ANALYTICS && <AnalyticsTab />}
            {activeTab === TABS.INSIGHTS && <InsightsTab />}
            {activeTab === TABS.RESEARCH && <DeepResearchTab />}
          </div>
        </main>

        <footer className="mt-16">
          <div className="h-px bg-gradient-to-r from-transparent via-accent/15 to-transparent" />
        </footer>
      </div>

      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
