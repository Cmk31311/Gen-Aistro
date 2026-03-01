'use client';
import Modal from '../ui/Modal';
import { KEYBOARD_SHORTCUTS } from '../lib/constants';

export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" maxWidth="max-w-md">
      <div className="space-y-1">
        {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
            <span className="text-content-2 text-sm">{shortcut.description}</span>
            <div className="flex items-center space-x-1">
              {shortcut.keys.map((key, j) => (
                <span key={j}>
                  {j > 0 && <span className="text-content-3 mx-0.5">+</span>}
                  <kbd className="px-2 py-1 bg-surface-2 text-accent/80 text-xs rounded-lg border border-border-hover font-mono font-medium">
                    {key}
                  </kbd>
                </span>
              ))}
              {shortcut.alt && (
                <>
                  <span className="text-content-3 text-xs mx-1.5">or</span>
                  {shortcut.alt.map((key, j) => (
                    <kbd key={j} className="px-2 py-1 bg-surface-2 text-accent/80 text-xs rounded-lg border border-border-hover font-mono font-medium">
                      {key}
                    </kbd>
                  ))}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
