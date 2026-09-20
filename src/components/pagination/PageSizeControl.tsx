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
      <select
        id={id}
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="rounded-md border border-border-default bg-surface-100 px-2.5 py-1 text-xs font-semibold text-text-ink dark:bg-surface-200 dark:text-text-on-primary focus:outline-none focus:ring-2 focus:ring-success-500 cursor-pointer"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
