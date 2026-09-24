import { downloadCsv, type CsvColumn, type CsvRowValue } from '@/lib/exportToCsv';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  cell: (item: T, index: number) => React.ReactNode;
  csvValue?: (item: T, index: number) => CsvRowValue;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowKey: (item: T, index: number) => string;
  emptyMessage?: React.ReactNode;
  className?: string;
  compact?: boolean;
  exportFilename?: string;
  fullData?: T[];
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  emptyMessage,
  className = '',
  compact = false,
  exportFilename,
  fullData,
}: DataTableProps<T>) {
  const exportData = fullData ?? data;

  const handleExportCsv = () => {
    if (!exportFilename || exportData.length === 0) return;
    const csvCols: CsvColumn<T>[] = columns.map((col) => ({
      header: col.header,
      getValue: (item, idx) => {
        if (col.csvValue) return col.csvValue(item, idx);
        const val = (item as Record<string, unknown>)[col.key];
        if (
          typeof val === 'string' ||
          typeof val === 'number' ||
          typeof val === 'boolean' ||
          val === null ||
          val === undefined
        ) {
          return val;
        }
        return '';
      },
    }));
    downloadCsv(exportFilename, exportData, csvCols);
  };
  if (data.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  const thBase = compact
    ? 'px-2 py-2.5 font-bold text-text-ink dark:text-text-on-primary'
    : 'px-3 py-3 font-bold text-text-ink dark:text-text-on-primary';

  return (
    <div className={`space-y-2 ${className}`}>
      {exportFilename && exportData.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-surface-100 px-2.5 py-1 text-xs font-semibold text-text-body-mid shadow-xs transition-all hover:border-accent-blue hover:text-accent-blue dark:border-border-default dark:bg-surface-100 dark:text-text-body-mid dark:hover:border-accent-blue dark:hover:text-accent-blue cursor-pointer"
            title={`Export ${exportData.length} record(s) to CSV`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
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
                    <td
                      key={col.key}
                      className={`${cellBase} ${alignClass} ${col.className || ''}`}
                    >
                      {col.cell(item, index)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
