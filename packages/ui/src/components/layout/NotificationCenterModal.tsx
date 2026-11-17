import { useEffect, useMemo } from 'react';
import BaseModal, { type ModalShortcut } from '@/components/shared/BaseModal';
import Kbd from '@/components/shared/Kbd';
import type { AppNotification } from '@arpanp/zen-core';

export interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onToggleRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isRead: (id: string) => boolean;
}

/**
 * Returns a category badge with appropriate background and border colors.
 *
 * @param category - Notification category.
 * @returns JSX badge element.
 */
function CategoryBadge({ category }: { category: AppNotification['category'] }) {
  switch (category) {
    case 'warning':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          Warning
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30">
          Error
        </span>
      );
    case 'success':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
          Success
        </span>
      );
    case 'info':
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
          Info
        </span>
      );
  }
}

/**
 * Returns a badge indicating notification scope (Run vs System).
 *
 * @param scope - Scope of notification ('run' or 'system').
 * @returns JSX badge element.
 */
function ScopeBadge({ scope }: { scope?: AppNotification['scope'] }) {
  if (scope === 'system') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
        System
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-surface-200/60 dark:bg-surface-200 text-text-body-mid dark:text-text-muted border border-border-default/60">
      Run
    </span>
  );
}

/**
 * Renders the title and body message for a notification item, suppressing redundant
 * generic titles while preserving distinct descriptions.
 *
 * @param title - Optional title of the notification.
 * @param message - Optional body message text of the notification.
 * @returns JSX content block containing formatted title and message.
 */
function NotificationMessageBody({ title, message }: { title?: string; message?: string }) {
  const isGenericTitle =
    !title ||
    /^(configuration notice|system notice|warning notice|info notice|notice)$/i.test(title.trim());

  return (
    <>
      {!isGenericTitle && (
        <h5 className="mt-2 text-xs font-bold text-text-ink dark:text-text-on-primary leading-snug">
          {title}
        </h5>
      )}

      {message && (
        <p
          className={`${
            !isGenericTitle ? 'mt-1' : 'mt-2'
          } text-xs text-text-body-mid dark:text-text-muted leading-relaxed font-mono break-words select-text`}
        >
          {message}
        </p>
      )}
    </>
  );
}

/**
 * Category-themed icon node for notification cards.
 *
 * @param category - Category of notification.
 * @returns SVG icon element.
 */
function CategoryIcon({ category }: { category: AppNotification['category'] }) {
  switch (category) {
    case 'warning':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
          <svg
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
          <svg
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
      );
    case 'success':
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
          <svg
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      );
    case 'info':
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/20">
          <svg
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        </div>
      );
  }
}

/**
 * Formats a timestamp into a human-readable date and time string.
 * Displays both date and time so notices are unambiguous across historical test runs.
 *
 * @param timestamp - Epoch timestamp in milliseconds.
 * @returns Formatted date and time string.
 */
function formatNotificationTime(timestamp?: number): string {
  if (!timestamp) return 'Current Run';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Notification Center Modal presenting run and application notices backed by BaseModal.
 *
 * @param props - Component properties.
 * @param props.isOpen - Whether the modal dialog is visible.
 * @param props.onClose - Callback triggered to close the modal.
 * @param props.notifications - Active notification items.
 * @param props.unreadCount - Number of unread notifications.
 * @param props.onToggleRead - Callback to toggle read status of a notification.
 * @param props.onMarkAllAsRead - Callback to mark all notifications as read.
 * @param props.isRead - Function returning whether a notification is read.
 * @returns The rendered notification center modal.
 */
export default function NotificationCenterModal({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onToggleRead,
  onMarkAllAsRead,
  isRead,
}: NotificationCenterModalProps) {
  // Handle modal-scoped shortcuts (R for Read All, 1-9 for toggling item read/unread)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          e.target.isContentEditable
        ) {
          return;
        }
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;

      if (key === 'r' || key === 'R') {
        e.preventDefault();
        onMarkAllAsRead();
        return;
      }

      // Numbers 1-9: Toggle Read/Unread on the corresponding notification
      if (/^[1-9]$/.test(key)) {
        const index = parseInt(key, 10) - 1;
        if (index < notifications.length) {
          e.preventDefault();
          onToggleRead(notifications[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, notifications, onToggleRead, onMarkAllAsRead]);

  const hasNotifications = notifications.length > 0;

  const modalShortcuts = useMemo<ModalShortcut[]>(() => {
    if (!hasNotifications) return [];
    return [
      { keyDesc: '1–9', label: 'Toggle Read', preserveCase: true },
      { keyDesc: 'R', label: 'Mark All Read', preserveCase: true },
    ];
  }, [hasNotifications]);

  const titleNode = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue dark:bg-accent-blue/20">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary">
          Notifications
        </h3>
        {hasNotifications && (
          <span
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread out of ${notifications.length} notifications`
                : `${notifications.length} notifications, all read`
            }
            className={`rounded-full px-2 py-0.5 text-xs font-semibold shadow-2xs transition-colors ${
              unreadCount > 0
                ? 'bg-amber-500 text-white dark:text-surface-950 font-bold'
                : 'bg-surface-200 dark:bg-surface-100 text-text-body-mid dark:text-text-muted border border-border-default/60'
            }`}
          >
            {unreadCount > 0 && unreadCount < notifications.length
              ? `${unreadCount} / ${notifications.length}`
              : unreadCount > 0
                ? `${unreadCount}`
                : `${notifications.length}`}
          </span>
        )}
      </div>
    </div>
  );

  const headerActionsNode =
    hasNotifications && unreadCount > 0 ? (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMarkAllAsRead}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-text-body-mid hover:text-accent-blue hover:bg-accent-blue/10 dark:text-text-muted dark:hover:text-accent-blue dark:hover:bg-accent-blue/10 transition-colors cursor-pointer"
          title="Mark all notifications as read (R)"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Mark All Read</span>
        </button>
      </div>
    ) : null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={titleNode}
      subtitle="Alerts, configuration warnings, and system notices."
      headerActions={headerActionsNode}
      maxWidthClass="max-w-2xl"
      maxHeightClass="max-h-[85vh]"
      shortcuts={modalShortcuts}
    >
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {!hasNotifications ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 mb-3">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h4 className="text-sm font-bold text-text-ink dark:text-text-on-primary">
              All caught up!
            </h4>
            <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted max-w-xs leading-relaxed">
              No active warnings or notices for this test execution run.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item, idx) => {
              const read = isRead(item.id);
              return (
                <div
                  key={item.id}
                  className={`group relative flex items-start gap-3.5 rounded-lg border p-3.5 transition-all ${
                    read
                      ? 'border-border-default/60 bg-surface-50/40 dark:bg-surface-200/20 opacity-80'
                      : 'border-amber-500/30 bg-amber-500/3 dark:border-amber-500/20 dark:bg-amber-500/5 shadow-xs'
                  }`}
                >
                  <CategoryIcon category={item.category} />

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <CategoryBadge category={item.category} />
                      <ScopeBadge scope={item.scope} />
                      <span className="text-[11px] font-medium text-text-muted">
                        {formatNotificationTime(item.timestamp)}
                      </span>
                      {!read && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-amber-500"
                          title="Unread notice"
                        />
                      )}
                    </div>

                    {item.runName && (
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] font-medium text-text-muted/90 dark:text-text-muted/80">
                        <span className="text-text-muted/60 select-none">Run:</span>
                        <span className="font-semibold text-text-ink dark:text-text-on-primary break-all">
                          {item.runName}
                        </span>
                      </div>
                    )}

                    {/* Content: Suppress redundant generic titles while preserving distinct ones with proper breathing room */}
                    <NotificationMessageBody title={item.title} message={item.message} />
                  </div>

                  {/* Action: Mark Read/Unread Toggle Button with Numbered Shortcut Keycap */}
                  <div className="absolute top-3 right-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => onToggleRead(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer select-none ${
                        read
                          ? 'text-text-muted hover:text-accent-blue hover:bg-surface-200/60 dark:hover:bg-surface-100'
                          : 'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400'
                      }`}
                      title={
                        idx < 9
                          ? `${read ? 'Mark notice as unread' : 'Mark notice as read'} (${idx + 1})`
                          : read
                            ? 'Mark notice as unread'
                            : 'Mark notice as read'
                      }
                      aria-label={
                        idx < 9
                          ? `${read ? 'Mark notice as unread' : 'Mark notice as read'} (${idx + 1})`
                          : read
                            ? 'Mark notice as unread'
                            : 'Mark notice as read'
                      }
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        {read ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        )}
                      </svg>
                      {idx < 9 && (
                        <Kbd
                          size="sm"
                          variant="keycap"
                          flat
                          title={`Press ${idx + 1} to toggle read status`}
                        >
                          {idx + 1}
                        </Kbd>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
