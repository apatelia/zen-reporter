import React from 'react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  cell: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowKey: (item: T, index: number) => string;
  emptyMessage?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  emptyMessage,
  className = '',
  compact = false,
}: DataTableProps<T>) {
  if (data.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  const thBase = compact
    ? 'px-2 py-2.5 font-bold text-text-ink dark:text-text-on-primary'
    : 'px-3 py-3 font-bold text-text-ink dark:text-text-on-primary';

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-border-default bg-surface-100/50 dark:bg-surface-100/30">
            {columns.map((col) => {
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';
              return (
                <th
                  key={col.key}
                  className={`${thBase} ${alignClass} ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={getRowKey(item, index)}
              className="border-b border-border-default hover:bg-surface-100/60 dark:hover:bg-surface-200/40 transition-colors"
            >
              {columns.map((col) => {
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';
                const cellBase = compact
                  ? 'px-2 py-2.5 text-text-ink dark:text-text-on-primary tabular-nums'
                  : 'px-3 py-3 text-text-ink dark:text-text-on-primary tabular-nums';

                return (
                  <td key={col.key} className={`${cellBase} ${alignClass} ${col.className || ''}`}>
                    {col.cell(item, index)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PassRateBadge({ passRate }: { passRate: number | null }) {
  if (passRate === null) return <span>-</span>;

  const colorClass =
    passRate >= 90
      ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500'
      : passRate >= 60
        ? 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-500'
        : 'bg-danger-50 text-danger-700 dark:bg-danger-500/20 dark:text-danger-500';

  return (
    <span className={`inline-block px-2 py-0.5 rounded font-bold ${colorClass}`}>{passRate}%</span>
  );
}
