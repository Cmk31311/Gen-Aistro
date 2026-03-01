'use client';
import Modal from '../ui/Modal';
import { KEYBOARD_SHORTCUTS } from '../lib/constants';

export default function KeyboardShortcutsHelp({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" maxWidth="max-w-md">
      <div className="space-y-1">
        {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <span className="text-zinc-400 text-sm">{shortcut.description}</span>
            <div className="flex items-center space-x-1">
              {shortcut.keys.map((key, j) => (
                <span key={j}>
                  {j > 0 && <span className="text-zinc-600 mx-0.5">+</span>}
                  <kbd className="px-1.5 py-0.5 bg-[#1a1a25] text-zinc-300 text-xs rounded border border-[#2a2a3a] font-mono">
                    {key}
                  </kbd>
                </span>
              ))}
              {shortcut.alt && (
                <>
                  <span className="text-zinc-600 text-xs mx-1">or</span>
                  {shortcut.alt.map((key, j) => (
                    <kbd key={j} className="px-1.5 py-0.5 bg-[#1a1a25] text-zinc-300 text-xs rounded border border-[#2a2a3a] font-mono">
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
