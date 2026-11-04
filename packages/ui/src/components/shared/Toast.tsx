import { useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastProps {
  notification: ToastNotification | null;
  onDismiss: () => void;
  className?: string;
}

/**
 * Reusable Toast notification component.
 * Positioned fixed or absolute with auto-dismiss timer and hover pause.
 */
export default function Toast({ notification, onDismiss, className = '' }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!notification) return;

    const duration = notification.duration ?? (notification.type === 'error' ? 4500 : 3200);

    if (!isHovered) {
      const timer = setTimeout(() => {
        onDismissRef.current();
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [notification, isHovered]);

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-18 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 p-3.5 w-full max-w-md rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-3 ${
        isSuccess
          ? 'bg-surface-50 dark:bg-surface-200 border-success-500 text-text-ink dark:text-text-on-primary shadow-success-500/10 ring-1 ring-success-500/20'
          : isError
            ? 'bg-surface-50 dark:bg-surface-200 border-danger-500 text-text-ink dark:text-text-on-primary shadow-danger-500/15 ring-1 ring-danger-500/20'
            : 'bg-surface-50 dark:bg-surface-200 border-border-default text-text-ink dark:text-text-on-primary shadow-2xl'
      } ${className}`}
    >
      <div className="shrink-0 pt-0.5">
        {isSuccess && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success-500 text-white shadow-xs">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        {isError && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-white shadow-xs">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        )}
        {!isSuccess && !isError && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue text-white shadow-xs">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-xs font-bold leading-tight text-text-ink dark:text-text-on-primary">
          {notification.title}
        </h4>
        {notification.message && (
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted leading-relaxed break-words">
            {notification.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-text-muted hover:text-text-ink dark:hover:text-text-on-primary hover:bg-surface-200 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
