'use client';
import { useEffect } from 'react';

export default function useKeyboardShortcut(key, callback, { ctrl = false, shift = false, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return;
    function handler(e) {
      // Don't trigger shortcuts when typing in inputs
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Only allow Escape in inputs
        if (e.key !== 'Escape') return;
      }
      if (ctrl && !e.ctrlKey && !e.metaKey) return;
      if (shift && !e.shiftKey) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ctrl, shift, enabled]);
}
