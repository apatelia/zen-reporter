import { useState } from 'react';

export interface PaginationFooterProps {
  label: string;
  total: number;
  start: number;
  pageLength: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination footer component providing item range counts, page navigation buttons,
 * and an editable page number input with strict bounds validation.
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
  className = 'mt-4 flex items-center justify-between text-xs font-medium text-text-ink dark:text-text-on-primary',
}: PaginationFooterProps) {
  const [prevPage, setPrevPage] = useState(currentPage);
  const [inputVal, setInputVal] = useState(() => String(currentPage));

  if (prevPage !== currentPage) {
    setPrevPage(currentPage);
    setInputVal(String(currentPage));
  }

  if (total === 0) return null;

  const commitPageChange = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const validPage = Math.max(1, Math.min(totalPages, parsed));
      if (validPage !== currentPage) {
        onPageChange(validPage);
      }
      setInputVal(String(validPage));
    } else {
      setInputVal(String(currentPage));
    }
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
    <div className={className}>
      <span>
        Showing {start + 1}–{start + pageLength} of {total} {label}
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={pageButtonClass}
          aria-label="Previous page"
        >
          Previous
        </button>

        <div className="flex items-center gap-1.5 font-semibold select-none">
          <span>Page</span>
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
            className="w-11 text-center rounded border border-border-default bg-surface-100 py-0.5 px-1 font-bold text-xs text-text-ink dark:bg-surface-200 dark:text-text-on-primary focus:outline-none focus:ring-2 focus:ring-success-500 focus:border-success-500 shadow-2xs tabular-nums"
          />
          <span>of {totalPages}</span>
        </div>

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={pageButtonClass}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
