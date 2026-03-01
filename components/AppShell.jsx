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

export default function AppShell() {
  const [activeTab, setActiveTab] = useState(TABS.SEARCH);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { theme, toggleTheme, isDark } = useTheme();
  const { paperCount } = useBookmarks();

  // Keyboard shortcuts
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

  const tabConfig = [
    { key: TABS.SEARCH, label: 'Search', icon: '\uD83D\uDD0D' },
    { key: TABS.GRAPH, label: 'Publications', icon: '\uD83D\uDCDA' },
    { key: TABS.ANALYTICS, label: 'Analytics', icon: '\uD83D\uDCCA' },
    { key: TABS.INSIGHTS, label: 'Insights', icon: '\uD83D\uDCA1' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        {isDark ? (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
            <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
            <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '2.5s' }}></div>
            <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '3s', animationDuration: '3.5s' }}></div>
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '4s', animationDuration: '2s' }}></div>
            <div className="absolute top-[16%] left-[16%] w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}></div>
            <div className="absolute bottom-[16%] right-[16%] w-2.5 h-2.5 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}></div>
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-purple-500/20 via-transparent to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl"></div>
            <div className="absolute top-[20%] left-0 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '5s', animationDuration: '2s' }}></div>
            <div className="absolute bottom-[20%] right-0 w-1 h-1 bg-blue-200 rounded-full animate-ping" style={{ animationDelay: '7s', animationDuration: '1.5s' }}></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-purple-200/30 via-transparent to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-blue-200/30 via-transparent to-transparent rounded-full blur-3xl"></div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Skip to content */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-purple-600 focus:text-white">
          Skip to content
        </a>

        {/* Header */}
        <header className={`${isDark ? 'bg-black/20' : 'bg-white/80'} backdrop-blur-md border-b ${isDark ? 'border-white/10' : 'border-slate-200'} sticky top-0 z-20`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{'\uD83D\uDE80'}</div>
                <div>
                  <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'bg-gradient-to-r from-white via-blue-200 to-purple-200' : 'bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
                    Gen-Aistro
                  </h1>
                  <p className={`${isDark ? 'text-blue-200/70' : 'text-slate-500'} text-sm`}>NASA Space Biology Knowledge Engine</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Bookmarks Button */}
                <button
                  onClick={() => setShowBookmarks(true)}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-blue-200/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  aria-label="Open bookmarks"
                >
                  {'\u2606'}
                  {paperCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {paperCount}
                    </span>
                  )}
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-blue-200/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  {isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}
                </button>

                {/* Shortcuts Help */}
                <button
                  onClick={() => setShowShortcuts(true)}
                  className={`hidden sm:block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-blue-200/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                  aria-label="Keyboard shortcuts"
                >
                  ?
                </button>

                {/* Navigation Tabs - Desktop */}
                <nav className="hidden md:flex space-x-1 ml-4" role="tablist" aria-label="Main navigation">
                  {tabConfig.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={activeTab === key}
                      onClick={() => setActiveTab(key)}
                      className={`px-3 lg:px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                        activeTab === key
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                          : isDark
                            ? 'text-blue-200/70 hover:text-white hover:bg-white/10'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex md:hidden space-x-1 mt-3 overflow-x-auto" role="tablist" aria-label="Main navigation">
              {tabConfig.map(({ key, label, icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-shrink-0 px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeTab === key
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                      : isDark
                        ? 'text-blue-200/70 hover:text-white hover:bg-white/10'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-8" role="tabpanel" aria-live="polite">
          {activeTab === TABS.SEARCH && <SearchTab />}
          {activeTab === TABS.GRAPH && <PublicationsTab />}
          {activeTab === TABS.ANALYTICS && <AnalyticsTab />}
          {activeTab === TABS.INSIGHTS && <InsightsTab />}
        </main>

        {/* Footer */}
        <footer className={`${isDark ? 'bg-black/20' : 'bg-white/80'} backdrop-blur-md border-t ${isDark ? 'border-white/10' : 'border-slate-200'} mt-16`}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center">
              <p className={`${isDark ? 'text-blue-200/70' : 'text-slate-500'} text-sm`}>
                Powered by NASA Space Biology research data and advanced AI technology
              </p>
              <p className={`${isDark ? 'text-blue-200/50' : 'text-slate-400'} text-xs mt-2`}>
                Built with Next.js, Tailwind CSS, and Groq AI &middot; Press <kbd className="px-1 py-0.5 bg-black/20 rounded text-[10px]">?</kbd> for keyboard shortcuts
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <BookmarksPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
      <KeyboardShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
