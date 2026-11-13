import React, { useEffect } from 'react';
import Kbd from '@/components/shared/Kbd';

export interface ModalShortcut {
  keyDesc: string | string[];
  label: string;
  /**
   * If true, keeps the exact casing of `label`.
   * Defaults to false, which automatically formats the label to Title/Proper Case.
   */
  preserveCase?: boolean;
}

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
  shortcuts?: ModalShortcut[];
}

/**
 * Converts a string to Proper Case (Capitalizes the first letter of each word).
 *
 * @param str - Input string to capitalize.
 * @returns Capitalized string in Proper Case.
 */
function toProperCase(str: string): string {
  if (!str) return str;
  return str.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Base modal component providing backdrop overlay, escape key trapping, smart input blurring,
 * and a bottom keyboard shortcuts bar (shown only when the modal declares shortcuts beyond Esc).
 *
 * @param props - BaseModal configuration properties.
 * @param props.isOpen - Whether the modal dialog is currently visible.
 * @param props.onClose - Callback triggered when the modal is requested to close.
 * @param props.title - Modal title content or header node.
 * @param props.subtitle - Optional subtitle text or description node below the title.
 * @param props.headerActions - Optional action buttons rendered on the right side of the header.
 * @param props.footerActions - Optional action buttons rendered in the modal footer.
 * @param props.maxWidthClass - Tailwind CSS max-width class constraint.
 * @param props.maxHeightClass - Tailwind CSS max-height class constraint.
 * @param props.children - Modal body content elements.
 * @param props.shortcuts - Optional array of keyboard shortcuts applicable within this modal; the footer shortcuts bar is rendered only when this array is non-empty.
 * @returns The rendered modal element, or null if isOpen is false.
 */
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
  shortcuts,
}: BaseModalProps) {
  const modalBoxRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement;
        // If an input, textarea, or contenteditable element inside this modal is focused, blur it and focus the modal container first instead of closing the modal
        if (
          activeEl instanceof HTMLElement &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.tagName === 'SELECT' ||
            activeEl.isContentEditable)
        ) {
          e.preventDefault();
          e.stopPropagation();
          activeEl.blur();
          modalBoxRef.current?.focus();
          return;
        }

        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compile list of displayed shortcuts (always including Esc by default)
  const effectiveShortcuts: ModalShortcut[] = [
    ...(shortcuts || []),
    { keyDesc: 'Esc', label: 'close' },
  ];

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
        ref={modalBoxRef}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} ${maxHeightClass} flex flex-col rounded-lg border border-border-default bg-canvas p-5 shadow-2xl overflow-hidden focus:outline-hidden`}
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
        <div className="flex-1 min-h-0 overflow-y-auto p-0.5 -m-0.5">{children}</div>

        {/* Modal Footer (if provided) */}
        {footerActions && (
          <div className="flex items-center justify-end border-t border-border-default pt-3.5 mt-4 shrink-0">
            {footerActions}
          </div>
        )}

        {/* Modal Keyboard Shortcuts Bar (hidden unless the modal declares shortcuts; Esc is always included when shown) */}
        {shortcuts && shortcuts.length > 0 && (
          <div
            aria-label="Keyboard shortcuts"
            className="hidden sm:flex items-center gap-2.5 pt-3 mt-3 border-t border-border-default/60 text-[11px] text-text-muted shrink-0 select-none"
          >
            {effectiveShortcuts.map((sc, index) => {
              const keys = Array.isArray(sc.keyDesc) ? sc.keyDesc : [sc.keyDesc];
              const displayLabel = sc.preserveCase ? sc.label : toProperCase(sc.label);
              return (
                <span
                  key={`${keys.join('-')}-${sc.label}`}
                  className="inline-flex items-center gap-1.5"
                >
                  {index > 0 && <span className="text-text-muted/40 mr-1">·</span>}
                  <span className="inline-flex items-center gap-1">
                    {keys.map((k, kIdx) => (
                      <React.Fragment key={k}>
                        {kIdx > 0 && (
                          <span className="text-[10px] text-text-muted/60 mx-0.5">/</span>
                        )}
                        <Kbd size="sm">{k}</Kbd>
                      </React.Fragment>
                    ))}
                  </span>
                  <span className="leading-none">{displayLabel}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
