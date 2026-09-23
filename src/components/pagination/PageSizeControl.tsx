import { PAGE_SIZE_OPTIONS } from './usePagination';

interface PageSizeControlProps {
  id: string;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
}

export function PageSizeControl({
  id,
  pageSize,
  onPageSizeChange,
  options = PAGE_SIZE_OPTIONS,
}: PageSizeControlProps) {
  return (
    <label
      className="flex items-center gap-2 text-xs font-medium text-text-ink dark:text-text-on-primary"
      htmlFor={id}
    >
      <span>Rows per page</span>
      <div className="relative inline-flex items-center">
        <select
          id={id}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="appearance-none rounded-md border border-border-default bg-surface-100 pl-3 pr-8 py-1 text-xs font-semibold text-text-ink dark:bg-surface-200 dark:text-text-on-primary focus:outline-none focus:ring-2 focus:ring-success-500 cursor-pointer"
        >
          {options.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-text-body-mid dark:text-text-muted shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </label>
  );
}
