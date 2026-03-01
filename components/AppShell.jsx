'use client';
import React, { useState, useCallback } from 'react';
import { TABS } from '../lib/constants';
import { useTheme } from '../context/ThemeContext';
import { useBookmarks } from '../context/BookmarkContext';
import useKeyboardShortcut from '../hooks/useKeyboardShortcut';
import SearchTab from './SearchTab/SearchTab';
import PublicationsTab from './PublicationsTab/PublicationsTab';
import AnalyticsTab from './AnalyticsTab/AnalyticsTab';
import InsightsTab from './InsightsTab/InsightsTab';
import BookmarksPanel from './BookmarksPanel';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import { StarIcon, SunIcon, MoonIcon, KeyboardIcon } from '../ui/Icons';

export default function AppShell() {
  const [activeTab, setActiveTab] = useState(TABS.SEARCH);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toggleTheme, isDark } = useTheme();
  const { paperCount } = useBookmarks();

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
  useKeyboardShortcut('b', useCallback(() => setShowBookmarks(prev => !prev), []), { ctrl: true });
  useKeyboardShortcut('?', useCallback(() => setShowShortcuts(prev => !prev), []));
  useKeyboardShortcut('Escape', useCallback(() => {
    setShowBookmarks(false);
    setShowShortcuts(false);
  }, []));

  const tabs = [
    { key: TABS.SEARCH, label: 'Search' },
    { key: TABS.GRAPH, label: 'Publications' },
    { key: TABS.ANALYTICS, label: 'Analytics' },
    { key: TABS.INSIGHTS, label: 'Insights' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-900/[0.07] rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-indigo-600 focus:text-white">
          Skip to content
        </a>

        <header className="border-b border-[#1a1a25] sticky top-0 z-20 bg-[#0a0a0f]/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Gen-Aistro</h1>
                <span className="hidden sm:inline text-xs text-zinc-600 border-l border-[#2a2a3a] pl-3">NASA Space Biology</span>
              </div>

              <div className="flex items-center space-x-1">
                <button onClick={() => setShowBookmarks(true)} className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a25] transition-colors" aria-label="Open bookmarks">
                  <StarIcon size={18} />
                  {paperCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />}
                </button>
                <button onClick={toggleTheme} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a25] transition-colors" aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
                  {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
                </button>
                <button onClick={() => setShowShortcuts(true)} className="hidden sm:flex p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a25] transition-colors" aria-label="Keyboard shortcuts">
                  <KeyboardIcon size={18} />
                </button>

                <nav className="hidden md:flex items-center ml-4 pl-4 border-l border-[#1a1a25] space-x-1" role="tablist" aria-label="Main navigation">
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={activeTab === key}
                      onClick={() => setActiveTab(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === key
                          ? 'bg-[#1a1a25] text-zinc-100'
                          : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#12121a]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <nav className="flex md:hidden space-x-1 pb-3 overflow-x-auto" role="tablist" aria-label="Main navigation">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === key ? 'bg-[#1a1a25] text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8" role="tabpanel" aria-live="polite">
          <div className="animate-fade-in">
            {activeTab === TABS.SEARCH && <SearchTab />}
            {activeTab === TABS.GRAPH && <PublicationsTab />}
            {activeTab === TABS.ANALYTICS && <AnalyticsTab />}
            {activeTab === TABS.INSIGHTS && <InsightsTab />}
          </div>
        </main>

        <footer className="border-t border-[#1a1a25] mt-16">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <p className="text-center text-zinc-600 text-xs">
              Powered by NASA Space Biology research data &middot; Built with Next.js and Groq AI
            </p>
          </div>
        </footer>
      </div>

      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
