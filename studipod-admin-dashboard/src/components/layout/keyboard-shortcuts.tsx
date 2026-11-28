'use client';

import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

/** How long after "G" the second key of a "go to" shortcut is accepted. */
const SEQUENCE_TIMEOUT_MS = 1_000;

type ShortcutHandlers = {
  onSearch: () => void;
  onShowShortcuts: () => void;
  onGoToProfile: () => void;
  onGoToSecurity: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Console-wide shortcuts: Ctrl/⌘ K search, "?" shortcuts help, G then P my
 * profile, G then S security. Single keys are ignored while typing in a field.
 */
export function useGlobalShortcuts(handlers: ShortcutHandlers, enabled = true): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let pendingGoUntil = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      const current = handlersRef.current;
      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        current.onSearch();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (isTypingTarget(event.target) || document.querySelector('dialog[open]')) return;

      if (event.key === '?') {
        event.preventDefault();
        current.onShowShortcuts();
        return;
      }
      if (Date.now() < pendingGoUntil) {
        pendingGoUntil = 0;
        if (key === 'p') current.onGoToProfile();
        if (key === 's') current.onGoToSecurity();
        return;
      }
      if (key === 'g') pendingGoUntil = Date.now() + SEQUENCE_TIMEOUT_MS;
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

const SHORTCUTS: ReadonlyArray<{ keys: string[]; description: string }> = [
  { keys: ['Ctrl', 'K'], description: 'Search the console (⌘ K on Mac)' },
  { keys: ['G', 'P'], description: 'Go to my profile' },
  { keys: ['G', 'S'], description: 'Go to my security settings' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close menus and dialogs' },
];

export function KeyboardShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  return (
    <Modal open={open} labelledBy={titleId} onDismiss={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="text-h3 font-semibold text-fg">
          Keyboard shortcuts
        </h2>
        <dl className="flex flex-col divide-y divide-line">
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-body-md text-fg">{description}</dt>
              <dd className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-6 rounded-sm border border-line bg-subtle px-1.5 py-0.5 text-center font-mono text-[12px] leading-4 font-medium text-fg-secondary"
                  >
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
