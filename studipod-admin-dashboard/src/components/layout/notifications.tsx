'use client';

import { differenceInMinutes, format, isToday, isYesterday, startOfDay } from 'date-fns';
import {
  Bell,
  CircleCheck,
  CreditCard,
  Flag,
  Inbox,
  ShieldAlert,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { useDismiss } from '@/hooks/use-dismiss';
import { cn } from '@/lib/utils';

export type NotificationKind = 'report' | 'payment' | 'access' | 'video' | 'users' | 'resolved';
export type NotificationSeverity = 'danger' | 'warning' | 'info' | 'success';

export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  /** Record the notification is about; opening it marks it read. */
  href?: string;
  /** Inline actions; notifications with actions count as "Needs action". */
  actions?: ReadonlyArray<{ label: string; href: string }>;
};

const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  report: Flag,
  payment: CreditCard,
  access: ShieldAlert,
  video: Video,
  users: Users,
  resolved: CircleCheck,
};

const SEVERITY_STYLES: Record<NotificationSeverity, string> = {
  danger: 'bg-danger-bg text-icon-danger',
  warning: 'bg-warning-bg text-icon-warning',
  info: 'bg-info-bg text-icon-brand',
  success: 'bg-success-bg text-icon-success',
};

type Tab = 'all' | 'action' | 'updates';

/** "23 min ago" and "3 h ago" today, "17:05" yesterday, "20 Nov" before. */
export function formatNotificationTime(createdAt: Date, now: Date): string {
  if (isToday(createdAt)) {
    const minutes = Math.max(0, differenceInMinutes(now, createdAt));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)} h ago`;
  }
  if (isYesterday(createdAt)) return format(createdAt, 'HH:mm');
  return format(createdAt, 'd MMM');
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'd MMMM');
}

/** Newest first, grouped by day. */
export function groupNotificationsByDay(
  items: ReadonlyArray<AdminNotification>,
): Array<{ label: string; items: AdminNotification[] }> {
  const sorted = [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const groups: Array<{ key: number; label: string; items: AdminNotification[] }> = [];
  for (const item of sorted) {
    const date = new Date(item.createdAt);
    const key = startOfDay(date).getTime();
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(date), items: [item] });
  }
  return groups.map(({ label, items: groupItems }) => ({ label, items: groupItems }));
}

type NotificationCenterProps = {
  notifications: ReadonlyArray<AdminNotification>;
  onMarkAllRead: () => void;
  onOpen: (id: string) => void;
  /** Where "View all notifications" leads. */
  viewAllHref: string;
  /** The bell sits on the blue header (desktop) or the dark top bar (mobile). */
  className?: string;
};

/**
 * Header bell with a coral dot while anything is unread. Opens the notification
 * panel: 400px, right-aligned to the bell, 8px gap, scrolls after 640px.
 */
export function NotificationCenter({
  notifications,
  onMarkAllRead,
  onOpen,
  viewAllHref,
  className,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = notifications.filter((item) => !item.isRead).length;

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismiss(isOpen, close, panelRef, [triggerRef]);

  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className="relative grid size-9 place-items-center rounded-full border border-glass-line bg-glass text-white transition-colors hover:bg-white/15 focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Bell aria-hidden className="size-[18px]" />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent-coral"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          tabIndex={-1}
          className="fixed top-[60px] right-2 left-2 z-50 focus:outline-none md:absolute md:top-full md:right-0 md:left-auto md:mt-2 md:w-[400px]"
        >
          <NotificationPanel
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
            onOpen={(id) => {
              onOpen(id);
              setIsOpen(false);
            }}
            viewAllHref={viewAllHref}
            onNavigate={() => setIsOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

type NotificationPanelProps = {
  notifications: ReadonlyArray<AdminNotification>;
  onMarkAllRead: () => void;
  onOpen: (id: string) => void;
  viewAllHref: string;
  onNavigate: () => void;
};

export function NotificationPanel({
  notifications,
  onMarkAllRead,
  onOpen,
  viewAllHref,
  onNavigate,
}: NotificationPanelProps) {
  const [tab, setTab] = useState<Tab>('all');
  const unread = notifications.filter((item) => !item.isRead).length;
  const needsAction = notifications.filter((item) => (item.actions?.length ?? 0) > 0);
  const updates = notifications.filter((item) => (item.actions?.length ?? 0) === 0);
  const visible = tab === 'all' ? notifications : tab === 'action' ? needsAction : updates;
  const groups = groupNotificationsByDay(visible);
  const now = new Date();

  const tabs: ReadonlyArray<{ key: Tab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'action', label: 'Needs action', count: needsAction.length },
    { key: 'updates', label: 'Updates', count: updates.length },
  ];

  return (
    <div className="flex max-h-[min(640px,calc(100dvh-80px))] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-elevation-xl">
      <div className="flex items-center gap-2 p-4">
        <h2 className="text-h4 font-semibold text-fg">Notifications</h2>
        {unread > 0 ? <Badge tone="brand">{`${unread} new`}</Badge> : null}
        <span className="flex-1" />
        {unread > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="rounded-sm text-caption font-medium text-link hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      <div className="border-b border-line px-4 pb-3">
        <div
          role="tablist"
          aria-label="Filter notifications"
          className="flex gap-0.5 rounded-lg bg-subtle p-1"
        >
          {tabs.map(({ key, label, count }) => {
            const isSelected = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setTab(key)}
                className={cn(
                  'h-8 flex-1 rounded-md px-3 text-body-md font-medium whitespace-nowrap transition-colors',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                  isSelected
                    ? 'bg-surface text-fg shadow-elevation-xs'
                    : 'text-fg-secondary hover:text-fg',
                )}
              >
                {notifications.length > 0 ? `${label} · ${count}` : label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-8 py-12 text-center">
            <span className="mb-1 grid size-12 place-items-center rounded-full bg-brand-soft text-icon-brand">
              <Inbox aria-hidden className="size-6" />
            </span>
            <p className="text-body-md font-medium text-fg">You’re all caught up</p>
            <p className="text-caption text-fg-secondary">
              New reports, failed payments and access requests will appear here.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h3 className="border-b border-line bg-canvas px-4 py-2 text-overline font-semibold text-fg-tertiary uppercase">
                {group.label}
              </h3>
              <ul>
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    time={formatNotificationTime(new Date(item.createdAt), now)}
                    onOpen={onOpen}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas px-4 py-3 text-caption">
        <Link
          href={viewAllHref as Route}
          onClick={onNavigate}
          className="rounded-sm font-medium text-link hover:underline focus-visible:shadow-focus focus-visible:outline-none"
        >
          View all notifications
        </Link>
        <span className="text-right text-fg-tertiary">Only alerts for your role are shown</span>
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  time,
  onOpen,
  onNavigate,
}: {
  item: AdminNotification;
  time: string;
  onOpen: (id: string) => void;
  onNavigate: () => void;
}) {
  const Icon = KIND_ICONS[item.kind];
  const title = (
    <span
      className={cn(
        'min-w-0 flex-1 text-body-sm',
        item.isRead ? 'text-fg-secondary' : 'font-medium text-fg',
      )}
    >
      {item.title}
      {item.isRead ? null : <span className="sr-only"> (unread)</span>}
    </span>
  );

  return (
    <li
      className={cn(
        'flex gap-3 border-b border-line px-4 py-3',
        item.isRead ? 'bg-surface' : 'bg-brand-soft',
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          SEVERITY_STYLES[item.severity],
        )}
      >
        <Icon aria-hidden className="size-[18px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          {item.href ? (
            <Link
              href={item.href as Route}
              onClick={() => onOpen(item.id)}
              className="flex min-w-0 flex-1 rounded-sm hover:underline focus-visible:shadow-focus focus-visible:outline-none"
            >
              {title}
            </Link>
          ) : (
            title
          )}
          <span className="shrink-0 text-caption text-fg-tertiary">{time}</span>
          {item.isRead ? null : (
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand" />
          )}
        </div>
        <p className="text-caption text-fg-secondary">{item.description}</p>
        {item.actions && item.actions.length > 0 ? (
          <div className="flex gap-4 pt-1 text-caption font-medium">
            {item.actions.map((action, index) => (
              <Link
                key={action.label}
                href={action.href as Route}
                onClick={() => {
                  onOpen(item.id);
                  onNavigate();
                }}
                className={cn(
                  'rounded-sm hover:underline focus-visible:shadow-focus focus-visible:outline-none',
                  index === 0 ? 'text-link' : 'text-fg-secondary',
                )}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}
