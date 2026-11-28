'use client';

import { useCallback, useState } from 'react';

import type { AdminNotification } from './notifications';

/**
 * Notifications for the header bell.
 *
 * The backend has no administrator notifications endpoint yet, so the list
 * starts empty and the panel shows its "all caught up" state. When the endpoint
 * exists, load the list here (TanStack Query, live updates over the WebSocket
 * gateway) and send read state to the backend; the panel needs no changes.
 */
export function useAdminNotifications() {
  const [items, setItems] = useState<ReadonlyArray<AdminNotification>>([]);

  const markRead = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
  }, []);

  return { items, markRead, markAllRead };
}
