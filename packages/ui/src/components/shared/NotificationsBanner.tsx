import Kbd from '@/components/shared/Kbd';
import type { AppNotification } from '@arpanp/zen-core';

export interface NotificationsBannerProps {
  notifications: AppNotification[];
  unreadCount: number;
  onOpenNotifications: () => void;
  className?: string;
}

/**
 * Banner displayed on summary view when run-scoped or system-pertinent notifications exist,
 * providing direct visibility and quick access to the notification center modal.
 *
 * @param props.notifications - List of all pertinent notifications.
 * @param props.unreadCount - Number of unread notifications.
 * @param props.onOpenNotifications - Callback to open the full notification center modal.
 * @param props.className - Optional extra classes for container styling.
 * @returns React functional component rendering the notifications banner.
 */
export default function NotificationsBanner({
  notifications,
  unreadCount,
  onOpenNotifications,
  className = '',
}: NotificationsBannerProps) {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  const hasWarnings = notifications.some((n) => n.category === 'warning');

  // Choose styling based on priority: warning (amber) > info (blue)
  let containerColor = 'border-accent-blue/30 bg-accent-blue/5 text-accent-blue';
  let iconColor = 'text-accent-blue';

  if (hasWarnings) {
    containerColor = 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200';
    iconColor = 'text-amber-600 dark:text-amber-400';
  }

  // Select highest-severity item as the primary headline (warning > info)
  const primaryNotice = notifications.find((n) => n.category === 'warning') ?? notifications[0];
  const moreCount = notifications.length - 1;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3.5 shadow-2xs transition-colors ${containerColor} ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <svg
          className={`h-5 w-5 shrink-0 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          {hasWarnings ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          )}
        </svg>

        <div className="text-xs sm:text-sm font-medium leading-snug truncate">
          <span className="font-bold mr-1.5">{primaryNotice.title}:</span>
          <span>{primaryNotice.message || 'Notification recorded for this execution.'}</span>
          {moreCount > 0 && (
            <span className="ml-2 font-normal opacity-80">
              (+{moreCount} more {moreCount === 1 ? 'notice' : 'notices'})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenNotifications}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold bg-surface-50 dark:bg-surface-200 border border-border-default/60 text-text-ink dark:text-text-on-primary hover:bg-surface-100 dark:hover:bg-surface-100 transition-colors cursor-pointer group"
          title="Open Notifications (o)"
          aria-label="Open Notifications"
        >
          <span>View All</span>
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white dark:text-surface-950">
              {unreadCount}
            </span>
          )}
          <Kbd size="sm" variant="keycap" flat className="ml-0.5">
            O
          </Kbd>
        </button>
      </div>
    </div>
  );
}
