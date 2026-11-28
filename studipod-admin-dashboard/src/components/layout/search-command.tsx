'use client';

import { CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useId, useMemo, useState, useSyncExternalStore, type KeyboardEvent } from 'react';

import { Modal } from '@/components/ui/modal';
import { ACCOUNT_PAGES, type NavSection } from '@/config/navigation';
import { cn } from '@/lib/utils';

export type SearchDestination = { key: string; label: string; context: string; href: string };

/** Every page the administrator may open, plus their personal account pages. */
export function buildSearchDestinations(sections: ReadonlyArray<NavSection>): SearchDestination[] {
  const pages = sections.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.pages.map((page) => ({
        key: page.key,
        label: page.label,
        context: group.label,
        href: page.href,
      })),
    ),
  );
  return [
    ...pages,
    {
      key: 'my-profile',
      label: ACCOUNT_PAGES.profile.label,
      context: 'Account',
      href: ACCOUNT_PAGES.profile.href,
    },
    {
      key: 'my-security',
      label: ACCOUNT_PAGES.security.label,
      context: 'Account',
      href: ACCOUNT_PAGES.security.href,
    },
  ];
}

/** Case-insensitive match on the page and its group; pages starting with the query come first. */
export function filterDestinations(
  destinations: ReadonlyArray<SearchDestination>,
  query: string,
): SearchDestination[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...destinations];
  const matches = destinations.filter((item) =>
    `${item.label} ${item.context}`.toLowerCase().includes(needle),
  );
  return matches.sort((a, b) => {
    const aStarts = a.label.toLowerCase().startsWith(needle) ? 0 : 1;
    const bStarts = b.label.toLowerCase().startsWith(needle) ? 0 : 1;
    return aStarts - bStarts;
  });
}

const subscribeNever = () => () => undefined;

/** True on Apple platforms, where the shortcut is ⌘K instead of Ctrl K. */
export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    () => false,
  );
}

/** The search field on the blue page header; opens the search dialog. */
export function SearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const isApple = useIsApplePlatform();
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-keyshortcuts={isApple ? 'Meta+K' : 'Control+K'}
      className={cn(
        'flex h-9 w-[320px] items-center gap-2 rounded-md border border-glass-line bg-glass pr-2 pl-3 text-left text-body-md text-on-sidebar transition-colors hover:bg-white/12',
        'focus-visible:shadow-focus focus-visible:outline-none',
        className,
      )}
    >
      <Search aria-hidden className="size-4 shrink-0" />
      <span className="flex-1">Search…</span>
      <kbd className="rounded-sm bg-glass px-1 py-0.5 font-mono text-[12px] leading-4 font-medium">
        {isApple ? '⌘ K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
  destinations: ReadonlyArray<SearchDestination>;
};

/** Jump to any page you may open. Arrow keys choose a result; Enter opens it. */
export function SearchDialog({ open, onClose, destinations }: SearchDialogProps) {
  const titleId = useId();
  return (
    <Modal open={open} labelledBy={titleId} onDismiss={onClose} className="max-w-[560px] p-0">
      {open ? (
        <SearchPanel titleId={titleId} onClose={onClose} destinations={destinations} />
      ) : null}
    </Modal>
  );
}

function SearchPanel({
  titleId,
  onClose,
  destinations,
}: {
  titleId: string;
  onClose: () => void;
  destinations: ReadonlyArray<SearchDestination>;
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const results = useMemo(() => filterDestinations(destinations, query), [destinations, query]);
  const activeIndex = Math.min(highlighted, Math.max(results.length - 1, 0));

  const go = (destination: SearchDestination | undefined) => {
    if (!destination) return;
    onClose();
    router.push(destination.href as Route);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlighted((activeIndex + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((activeIndex - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[activeIndex]);
    }
  };

  return (
    <div className="flex flex-col">
      <h2 id={titleId} className="sr-only">
        Search the console
      </h2>
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search aria-hidden className="size-[18px] shrink-0 text-icon" />
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          aria-label="Search pages"
          placeholder="Search pages…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          className="h-12 min-w-0 flex-1 bg-transparent text-body-md text-fg outline-none placeholder:text-fg-tertiary"
        />
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label="Pages"
        className="max-h-[min(360px,60dvh)] overflow-y-auto p-2"
      >
        {results.map((result, index) => (
          <li
            key={result.key}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            onPointerMove={() => setHighlighted(index)}
            onClick={() => go(result)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2',
              index === activeIndex ? 'bg-subtle' : '',
            )}
          >
            <span className="flex-1 text-body-md text-fg">{result.label}</span>
            <span className="text-caption text-fg-tertiary">{result.context}</span>
            {index === activeIndex ? (
              <CornerDownLeft aria-hidden className="size-4 text-icon" />
            ) : null}
          </li>
        ))}
      </ul>
      {results.length === 0 ? (
        <p role="status" className="px-6 pb-8 text-center text-body-md text-fg-secondary">
          No pages match “{query.trim()}”.
        </p>
      ) : null}

      <p className="border-t border-line bg-canvas px-4 py-2 text-caption text-fg-tertiary">
        Use ↑ ↓ to choose, Enter to open, Esc to close.
      </p>
    </div>
  );
}
