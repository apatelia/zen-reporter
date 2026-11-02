import React, { useEffect } from 'react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidthClass?: string;
  maxHeightClass?: string;
  children: React.ReactNode;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  footerActions,
  maxWidthClass = 'max-w-2xl',
  maxHeightClass = 'max-h-[90vh]',
  children,
}: BaseModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full ${maxWidthClass} ${maxHeightClass} flex flex-col rounded-lg border border-border-default bg-canvas p-5 shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border-default pb-3.5 mb-4 shrink-0">
          <div className="min-w-0 pr-4">
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary truncate">
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <div className="mt-0.5 text-xs text-text-body-mid dark:text-text-muted">
                {subtitle}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-200/50 dark:hover:text-text-on-primary transition-colors cursor-pointer"
              title="Close modal"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>

        {/* Modal Footer (if provided) */}
        {footerActions && (
          <div className="flex items-center justify-end border-t border-border-default pt-3.5 mt-4 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
}
