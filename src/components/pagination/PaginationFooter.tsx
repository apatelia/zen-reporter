interface PaginationFooterProps {
  label: string;
  total: number;
  start: number;
  pageLength: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

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
  if (total === 0) return null;
  const pageButtonClass =
    'rounded-md border border-border-default bg-surface-100 px-3 py-1 text-xs font-bold text-text-ink dark:bg-surface-200 dark:text-text-on-primary hover:bg-surface-200 dark:hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-success-500 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';

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
        >
          Previous
        </button>
        <span className="font-semibold">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={pageButtonClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}
