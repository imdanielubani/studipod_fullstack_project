'use client';

import { Keyboard, LifeBuoy, LogOut, ShieldCheck, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_PAGES } from '@/config/navigation';
import { useDismiss } from '@/hooks/use-dismiss';
import { cn } from '@/lib/utils';

export type AccountSummary = {
  fullName: string;
  email: string;
  initials: string;
  roleLabel: string | null;
  /** "Signed in today at 08:14 · Lagos, NG"; omitted when unknown. */
  signInLine: string | null;
};

type AccountMenuProps = {
  account: AccountSummary;
  onSignOut: () => void;
  onShowShortcuts?: () => void;
  helpCentreUrl?: string | null;
  /** Trigger style: the avatar sits on the blue header or the dark mobile top bar. */
  className?: string;
};

/**
 * Avatar button that opens the account menu (320px, right-aligned, 8px below).
 * Escape or a click outside closes it. Arrow keys move between items.
 */
export function AccountMenu({
  account,
  onSignOut,
  onShowShortcuts,
  helpCentreUrl = null,
  className,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismiss(isOpen, close, menuRef, [triggerRef]);

  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [isOpen]);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Account menu for ${account.fullName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="grid place-items-center rounded-full focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Avatar initials={account.initials} />
      </button>

      {isOpen ? (
        <>
          <div aria-hidden className="fixed inset-0 z-40 bg-overlay md:hidden" />
          <div
            ref={menuRef}
            id={menuId}
            className="fixed top-[52px] right-4 z-50 w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-line bg-surface shadow-elevation-xl md:absolute md:top-full md:right-0 md:mt-2"
          >
            <AccountMenuContent
              account={account}
              onClose={close}
              onSignOut={onSignOut}
              onShowShortcuts={onShowShortcuts}
              helpCentreUrl={helpCentreUrl}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

type AccountMenuContentProps = {
  account: AccountSummary;
  onClose: () => void;
  onSignOut: () => void;
  onShowShortcuts?: () => void;
  helpCentreUrl: string | null;
};

function AccountMenuContent({
  account,
  onClose,
  onSignOut,
  onShowShortcuts,
  helpCentreUrl,
}: AccountMenuContentProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    const move = (next: number) => {
      event.preventDefault();
      items[(next + items.length) % items.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(items.length - 1);
    else if (event.key === 'Tab') onClose();
  };

  return (
    <div role="menu" aria-label="Account" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-3 p-4">
        <Avatar initials={account.initials} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <p className="truncate text-body-md font-medium text-fg">{account.fullName}</p>
          <p className="w-full truncate text-caption text-fg-secondary">{account.email}</p>
          {account.roleLabel ? <Badge tone="brand">{account.roleLabel}</Badge> : null}
        </div>
      </div>

      <MenuDivider />
      <div className="flex flex-col gap-0.5 px-3 py-2">
        <MenuLink
          href={ACCOUNT_PAGES.profile.href}
          icon={User}
          label={ACCOUNT_PAGES.profile.label}
          shortcut="G P"
          onSelect={onClose}
        />
        <MenuLink
          href={ACCOUNT_PAGES.security.href}
          icon={ShieldCheck}
          label={ACCOUNT_PAGES.security.label}
          shortcut="G S"
          onSelect={onClose}
        />
      </div>

      {onShowShortcuts || helpCentreUrl ? (
        <>
          <MenuDivider />
          <div className="flex flex-col gap-0.5 px-3 py-2">
            {onShowShortcuts ? (
              <MenuButton
                icon={Keyboard}
                label="Keyboard shortcuts"
                shortcut="?"
                onSelect={() => {
                  onClose();
                  onShowShortcuts();
                }}
              />
            ) : null}
            {helpCentreUrl ? (
              <a
                role="menuitem"
                href={helpCentreUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={menuItemClass}
              >
                <LifeBuoy aria-hidden className="size-[18px] shrink-0 text-icon" />
                <span className="flex-1">Help centre</span>
              </a>
            ) : null}
          </div>
        </>
      ) : null}

      <MenuDivider />
      <div className="px-3 py-2">
        <MenuButton icon={LogOut} label="Sign out" tone="danger" onSelect={onSignOut} />
      </div>

      {account.signInLine ? (
        <p className="border-t border-line bg-canvas px-4 py-2 text-caption text-fg-tertiary">
          {account.signInLine}
        </p>
      ) : null}
    </div>
  );
}

const menuItemClass = cn(
  'flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-body-md text-fg',
  'hover:bg-subtle focus-visible:bg-subtle focus-visible:outline-none',
);

function MenuDivider() {
  return <div role="separator" className="h-px bg-line" />;
}

function Shortcut({ keys }: { keys: string }) {
  return (
    <kbd className="rounded-sm bg-subtle px-1 py-0.5 font-mono text-[12px] leading-4 font-medium text-fg-secondary">
      {keys}
    </kbd>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  shortcut,
  onSelect,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  shortcut: string;
  onSelect: () => void;
}) {
  return (
    <Link role="menuitem" href={href as Route} onClick={onSelect} className={menuItemClass}>
      <Icon aria-hidden className="size-[18px] shrink-0 text-icon" />
      <span className="flex-1">{label}</span>
      <Shortcut keys={shortcut} />
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  label,
  shortcut,
  tone = 'default',
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(menuItemClass, tone === 'danger' && 'text-danger-fg')}
    >
      <Icon
        aria-hidden
        className={cn('size-[18px] shrink-0', tone === 'danger' ? 'text-icon-danger' : 'text-icon')}
      />
      <span className="flex-1">{label}</span>
      {shortcut ? <Shortcut keys={shortcut} /> : null}
    </button>
  );
}
