import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractNotificationsFromReport } from '@arpanp/zen-core';
import type { AppNotification, ReportData, UserNotificationPreferences } from '@arpanp/zen-core';

const NOTIFICATIONS_STORAGE_KEY = 'zen:notifications:preferences';

/**
 * Loads user notification preferences (read status) from localStorage.
 *
 * @returns Map of notification IDs to their read flags.
 */
function loadStoredPreferences(): UserNotificationPreferences {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserNotificationPreferences;
  } catch {
    return {};
  }
}

/**
 * Persists user notification preferences (read status) to localStorage.
 *
 * @param prefs - Map of notification IDs to their read flags.
 * @returns {void}
 */
function saveStoredPreferences(prefs: UserNotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  totalCount: number;
  toggleRead: (id: string) => void;
  markAllAsRead: () => void;
  isRead: (id: string) => boolean;
}

/**
 * Custom hook to manage notifications for the dashboard, extracting run-scoped
 * warnings and system notices from active report data while managing read/unread state.
 *
 * @param reportData - Active test report data.
 * @param effectiveRunId - Resolved ID of the current test run.
 * @returns Notification items, badge counters, and state management actions.
 */
export function useNotifications(
  reportData: ReportData | null,
  effectiveRunId: string | null
): UseNotificationsResult {
  const [preferences, setPreferences] =
    useState<UserNotificationPreferences>(loadStoredPreferences);

  // Derive notifications from report data
  const rawNotifications = useMemo<AppNotification[]>(() => {
    return extractNotificationsFromReport(reportData, effectiveRunId);
  }, [reportData, effectiveRunId]);

  // Persist preferences to localStorage on change and prune stale entries
  useEffect(() => {
    // Prune preferences to prevent unbounded growth:
    // Keep active notices for the current run, plus any other recent entries up to a safe limit.
    const activeIds = new Set(rawNotifications.map((n) => n.id));
    const pruned: UserNotificationPreferences = {};

    // Always keep active notices from the current run
    for (const id of activeIds) {
      if (preferences[id]) {
        pruned[id] = preferences[id];
      }
    }

    // Retain at most 100 historical notification records to prevent unbounded growth
    const otherKeys = Object.keys(preferences).filter((k) => !activeIds.has(k));
    for (const k of otherKeys.slice(-100)) {
      pruned[k] = preferences[k];
    }

    saveStoredPreferences(pruned);
  }, [preferences, rawNotifications]);

  const updatePreferences = useCallback(
    (updater: (prev: UserNotificationPreferences) => UserNotificationPreferences) => {
      setPreferences(updater);
    },
    []
  );

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return rawNotifications.filter((n) => !preferences[n.id]?.read).length;
  }, [rawNotifications, preferences]);

  const isRead = useCallback(
    (id: string): boolean => {
      return Boolean(preferences[id]?.read);
    },
    [preferences]
  );

  const toggleRead = useCallback(
    (id: string) => {
      updatePreferences((prev) => ({
        ...prev,
        [id]: {
          read: !prev[id]?.read,
        },
      }));
    },
    [updatePreferences]
  );

  const markAllAsRead = useCallback(() => {
    updatePreferences((prev) => {
      let hasChanges = false;
      const next = { ...prev };
      for (const item of rawNotifications) {
        if (!prev[item.id]?.read) {
          hasChanges = true;
          next[item.id] = {
            read: true,
          };
        }
      }
      return hasChanges ? next : prev;
    });
  }, [rawNotifications, updatePreferences]);

  return {
    notifications: rawNotifications,
    unreadCount,
    totalCount: rawNotifications.length,
    toggleRead,
    markAllAsRead,
    isRead,
  };
}
