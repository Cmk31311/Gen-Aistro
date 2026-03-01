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
    <div className="min-h-screen bg-bg">
      {/* Subtle warm ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#D4A853]/[0.03] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-accent focus:text-black">
          Skip to content
        </a>

        <header className="border-b border-border sticky top-0 z-20 bg-bg/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-semibold text-gradient-gold tracking-tight">Gen-Aistro</h1>
                <span className="hidden sm:inline text-[11px] uppercase tracking-[0.08em] text-content-3 border-l border-border pl-3">NASA Space Biology</span>
              </div>

              <div className="flex items-center space-x-1">
                {/* Action buttons */}
                <button onClick={() => setShowBookmarks(true)} className="relative p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-colors" aria-label="Open bookmarks">
                  <StarIcon size={16} />
                  {paperCount > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />}
                </button>
                <button onClick={toggleTheme} className="p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-colors" aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
                  {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                </button>
                <button onClick={() => setShowShortcuts(true)} className="hidden sm:flex p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-colors" aria-label="Keyboard shortcuts">
                  <KeyboardIcon size={16} />
                </button>

                {/* Desktop nav — underline tabs */}
                <nav className="hidden md:flex items-center ml-4 pl-4 border-l border-border space-x-1" role="tablist" aria-label="Main navigation">
                  {tabs.map(({ key, label }) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={activeTab === key}
                      onClick={() => setActiveTab(key)}
                      className={`relative px-3 py-1.5 text-sm transition-colors duration-200 ${
                        activeTab === key
                          ? 'text-content-1 font-medium'
                          : 'text-content-3 hover:text-content-2'
                      }`}
                    >
                      {label}
                      {activeTab === key && (
                        <span className="absolute -bottom-[11px] left-1 right-1 h-[2px] bg-accent rounded-full" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Mobile nav */}
            <nav className="flex md:hidden space-x-1 pb-3 overflow-x-auto border-t border-border pt-2" role="tablist" aria-label="Main navigation">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`relative flex-shrink-0 px-3 py-1.5 text-sm transition-colors duration-200 ${
                    activeTab === key
                      ? 'text-content-1 font-medium'
                      : 'text-content-3 hover:text-content-2'
                  }`}
                >
                  {label}
                  {activeTab === key && (
                    <span className="absolute bottom-0 left-1 right-1 h-[2px] bg-accent rounded-full" />
                  )}
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

        <footer className="border-t border-border mt-16">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <p className="text-center text-content-3 text-xs">
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
