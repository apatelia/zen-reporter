import { useEffect, useRef, useState } from 'react';
import { PageSizeControl } from './PageSizeControl';

export interface PageChangeEventDetail {
  page: number;
  totalPages: number;
  label: string;
}

declare global {
  interface WindowEventMap {
    'zen:page-change': CustomEvent<PageChangeEventDetail>;
  }
}

export interface PaginationFooterProps {
  label: string;
  total: number;
  start: number;
  pageLength: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  pageSizeId?: string;
}

/**
 * Pagination footer component providing item range counts, optional rows-per-page selection,
 * page navigation buttons, and an editable page number input with strict bounds validation.
 *
 * @param props - Pagination footer properties.
 * @param props.label - Plural label for item type being paginated (e.g. "files", "tests").
 * @param props.total - Total number of items across all pages.
 * @param props.start - 0-indexed starting index of items on current page.
 * @param props.pageLength - Number of items rendered on current page.
 * @param props.currentPage - Active 1-indexed page number.
 * @param props.totalPages - Total calculated pages available.
 * @param props.onPageChange - Callback invoked when active page changes.
 * @param props.className - Optional container style override.
 * @param props.pageSize - Optional active page size for the rows per page control.
 * @param props.onPageSizeChange - Optional callback invoked when the page size changes.
 * @param props.pageSizeOptions - Optional array of page size choices.
 * @param props.pageSizeId - Optional HTML id for the page size select input.
 * @returns Rendered pagination footer layout or null if total items is 0.
 */
export function PaginationFooter({
  label,
  total,
  start,
  pageLength,
  currentPage,
  totalPages,
  onPageChange,
  className = 'mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium text-text-body-mid dark:text-text-muted',
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  pageSizeId,
}: PaginationFooterProps) {
  const footerRef = useRef<HTMLDivElement>(null);
  const [prevPage, setPrevPage] = useState(currentPage);
  const [inputVal, setInputVal] = useState(() => String(currentPage));
  const [showPill, setShowPill] = useState(false);
  const pillTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pillTimeoutRef.current) {
        clearTimeout(pillTimeoutRef.current);
      }
    };
  }, []);

  if (prevPage !== currentPage) {
    setPrevPage(currentPage);
    setInputVal(String(currentPage));
  }

  if (total === 0) return null;

  const handlePageSizeChange = (newSize: number) => {
    if (!onPageSizeChange) return;

    // Anchor scroll to top of table section if the top is above current viewport
    const container = footerRef.current?.closest('section') || footerRef.current?.parentElement;
    if (container) {
      const topPadding = 16;
      const rect = container.getBoundingClientRect();
      const scrollParent = footerRef.current?.closest('.overflow-auto') as HTMLElement | null;

      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        if (rect.top < parentRect.top) {
          const delta = rect.top - parentRect.top - topPadding;
          scrollParent.scrollBy({ top: delta, behavior: 'smooth' });
        }
      } else {
        if (rect.top < topPadding) {
          container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    onPageSizeChange(newSize);
  };

  const commitPageChange = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const validPage = Math.max(1, Math.min(totalPages, parsed));
      if (validPage !== currentPage) {
        handlePageTransition(validPage);
      }
      setInputVal(String(validPage));
    } else {
      setInputVal(String(currentPage));
    }
  };

  const handlePageTransition = (newPage: number) => {
    // Show localized floating pill in center of this pagination footer
    setShowPill(true);
    if (pillTimeoutRef.current) {
      clearTimeout(pillTimeoutRef.current);
    }
    pillTimeoutRef.current = setTimeout(() => {
      setShowPill(false);
    }, 1200);

    // Dispatch page notification event for subtle table animation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('zen:page-change', {
          detail: {
            page: newPage,
            totalPages,
            label,
          },
        })
      );
    }
    onPageChange(newPage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitPageChange(inputVal);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setInputVal(String(currentPage));
      (e.target as HTMLInputElement).blur();
    }
  };

  const pageButtonClass =
    'rounded-md border border-border-default bg-surface-100 px-3 py-1 text-xs font-bold text-text-ink dark:bg-surface-200 dark:text-text-on-primary hover:bg-surface-200 dark:hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-success-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer transition-colors';

  return (
    <div
      ref={footerRef}
      className={`relative ${className}`}
      data-pagination-footer="true"
      data-current-page={currentPage}
      data-total-pages={totalPages}
      data-item-label={label}
    >
      {/* Floating pill overlay in the center of the pagination footer */}
      {showPill && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 rounded-full border border-border-default bg-surface-100/95 dark:bg-surface-200/95 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-text-ink dark:text-text-on-primary shadow-md transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-accent-blue animate-pulse" />
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <span className="text-[11px] text-text-body-mid dark:text-text-muted">
            · {label.charAt(0).toUpperCase() + label.slice(1)}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span>
          Showing{' '}
          <strong className="font-semibold text-text-ink dark:text-text-on-primary">
            {start + 1}–{start + pageLength}
          </strong>{' '}
          of{' '}
          <strong className="font-semibold text-text-ink dark:text-text-on-primary">{total}</strong>{' '}
          {label}
        </span>
        {pageSize !== undefined && onPageSizeChange && (
          <>
            <span
              className="hidden sm:inline-block text-border-default dark:text-border-chart select-none"
              aria-hidden="true"
            >
              •
            </span>
            <PageSizeControl
              id={pageSizeId || `page-size-${label.replace(/\s+/g, '-')}`}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              options={pageSizeOptions}
              totalItems={total}
            />
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-pagination-prev="true"
          disabled={currentPage === 1}
          onClick={() => handlePageTransition(currentPage - 1)}
          className={pageButtonClass}
          aria-label="Previous page"
          title="Previous page (p)"
        >
          Previous
        </button>

        <div className="flex items-center gap-1.5 text-xs select-none">
          <span className="text-text-body-mid dark:text-text-muted">Page</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => commitPageChange(inputVal)}
            onKeyDown={handleKeyDown}
            aria-label="Page number"
            title={`Enter page number (1 to ${totalPages})`}
            className="h-7 w-12 text-center rounded-md border border-border-default bg-canvas dark:bg-canvas px-1 text-xs font-semibold text-text-ink dark:text-text-on-primary cursor-text hover:border-border-chart focus:border-accent-blue focus:outline-hidden focus:ring-2 focus:ring-accent-blue/30 shadow-xs tabular-nums transition-colors"
          />
          <span className="text-text-body-mid dark:text-text-muted">
            of{' '}
            <strong className="font-semibold text-text-ink dark:text-text-on-primary">
              {totalPages}
            </strong>
          </span>
        </div>

        <button
          type="button"
          data-pagination-next="true"
          disabled={currentPage === totalPages}
          onClick={() => handlePageTransition(currentPage + 1)}
          className={pageButtonClass}
          aria-label="Next page"
          title="Next page (n)"
        >
          Next
        </button>
      </div>
    </div>
  );
}
