'use client';
import Modal from '../ui/Modal';
import { KEYBOARD_SHORTCUTS } from '../lib/constants';

export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" maxWidth="max-w-md">
      <div className="space-y-2">
        {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between p-2">
            <span className="text-blue-200/80 text-sm">{shortcut.description}</span>
            <div className="flex items-center space-x-1">
              {shortcut.keys.map((key, j) => (
                <span key={j}>
                  {j > 0 && <span className="text-blue-200/40 mx-0.5">+</span>}
                  <kbd className="px-2 py-1 bg-black/40 text-blue-200 text-xs rounded border border-white/20 font-mono">
                    {key}
                  </kbd>
                </span>
              ))}
              {shortcut.alt && (
                <>
                  <span className="text-blue-200/40 text-xs mx-1">or</span>
                  {shortcut.alt.map((key, j) => (
                    <kbd key={j} className="px-2 py-1 bg-black/40 text-blue-200 text-xs rounded border border-white/20 font-mono">
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
