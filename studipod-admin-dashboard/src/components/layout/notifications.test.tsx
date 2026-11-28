import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  formatNotificationTime,
  groupNotificationsByDay,
  NotificationCenter,
  NotificationPanel,
  type AdminNotification,
} from './notifications';

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function yesterdayAt(hours: number, minutes: number): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

const SAMPLE: ReadonlyArray<AdminNotification> = [
  {
    id: 'n1',
    kind: 'report',
    severity: 'danger',
    title: 'New high-severity report',
    description: 'RPT-2059 · Harassment in private messages · assigned to you',
    createdAt: minutesAgo(23),
    isRead: false,
    actions: [
      { label: 'Review report', href: '/moderation' },
      { label: 'Reassign', href: '/moderation' },
    ],
  },
  {
    id: 'n2',
    kind: 'resolved',
    severity: 'success',
    title: 'RPT-2041 closed',
    description: 'Daniel Mensah was suspended by Tobi Okonkwo.',
    createdAt: minutesAgo(26),
    isRead: true,
  },
  {
    id: 'n3',
    kind: 'video',
    severity: 'success',
    title: 'Video limits changed',
    description: 'Funmi Oladipo changed group sessions to 6 people.',
    createdAt: yesterdayAt(17, 5),
    isRead: true,
  },
];

describe('formatNotificationTime', () => {
  const now = new Date();

  it('uses relative times today and clock times yesterday', () => {
    expect(formatNotificationTime(new Date(now.getTime() - 23 * 60_000), now)).toMatch(
      /^(23 min ago|\d+ h ago)$/,
    );
    expect(formatNotificationTime(new Date(yesterdayAt(17, 5)), now)).toBe('17:05');
  });
});

describe('groupNotificationsByDay', () => {
  it('sorts newest first and groups under Today and Yesterday', () => {
    const groups = groupNotificationsByDay([...SAMPLE].reverse());
    expect(groups.map((group) => group.label)).toEqual(['Today', 'Yesterday']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['n1', 'n2']);
  });
});

describe('NotificationPanel', () => {
  const renderPanel = (items: ReadonlyArray<AdminNotification>, onMarkAllRead = vi.fn()) =>
    render(
      <NotificationPanel
        notifications={items}
        onMarkAllRead={onMarkAllRead}
        onOpen={vi.fn()}
        viewAllHref="/notifications"
        onNavigate={vi.fn()}
      />,
    );

  it('shows counts per tab, the new badge and unread rows', () => {
    const onMarkAllRead = vi.fn();
    renderPanel(SAMPLE, onMarkAllRead);

    expect(screen.getByText('1 new')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All · 3' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Needs action · 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Updates · 2' })).toBeInTheDocument();
    expect(screen.getByText('(unread)', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review report' })).toHaveAttribute(
      'href',
      '/moderation',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('filters to items that need action', () => {
    renderPanel(SAMPLE);
    fireEvent.click(screen.getByRole('tab', { name: 'Needs action · 1' }));
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('New high-severity report')).toBeInTheDocument();
    expect(within(panel).queryByText('RPT-2041 closed')).not.toBeInTheDocument();
  });

  it('shows the caught-up state without notifications', () => {
    renderPanel([]);
    expect(screen.getByText('You’re all caught up')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all notifications' })).toBeInTheDocument();
  });
});

describe('NotificationCenter', () => {
  it('announces unread items and closes on Escape, returning focus to the bell', () => {
    render(
      <NotificationCenter
        notifications={SAMPLE}
        onMarkAllRead={vi.fn()}
        onOpen={vi.fn()}
        viewAllHref="/notifications"
      />,
    );
    const bell = screen.getByRole('button', { name: 'View notifications, 1 unread' });
    fireEvent.click(bell);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
  });
});
