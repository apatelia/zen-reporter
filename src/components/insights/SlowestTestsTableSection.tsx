import { useMemo } from 'react';
import type { HistorySlowRow } from '@/lib/types/history';
import { formatDurationVerbose } from '@/lib/formatters';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import { DataTable } from '@/components/shared/DataTable';
import type { ColumnDef } from '@/components/shared/DataTable';
import { generateExportFilename } from '@/lib/exportFilename';

export interface SlowestTestsTableSectionProps {
  slowest: HistorySlowRow[];
  onOpenGuide: () => void;
}

const sectionClass =
  'overflow-hidden rounded-md bg-surface-50 border border-border-default shadow-xs p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

/**
 * Renders the top slowest tests table section in Insights with CSV export.
 *
 * @param props - Component props containing slow test history rows and modal guide callback.
 * @returns React functional component rendering the slowest tests table section.
 */
export default function SlowestTestsTableSection({
  slowest,
  onOpenGuide,
}: SlowestTestsTableSectionProps) {
  const slowestRows = slowest.slice(0, 5);

  const slowestColumns: ColumnDef<(typeof slowestRows)[0]>[] = useMemo(
    () => [
      {
        key: 'suite',
        header: 'Suite',
        cell: (row) => row.suite || '-',
        csvValue: (row) => row.suite || '',
      },
      {
        key: 'title',
        header: 'Test',
        className: 'font-bold',
        cell: (row) => row.title,
        csvValue: (row) => row.title,
      },
      {
        key: 'project',
        header: 'Project',
        cell: (row) => row.project,
        csvValue: (row) => row.project,
      },
      {
        key: 'avg_duration',
        header: 'Average Duration',
        align: 'right',
        className: 'font-bold text-accent-blue dark:text-success-500',
        cell: (row) => formatDurationVerbose(row.avg_duration_ms ?? row.avg_ms),
        csvValue: (row) => formatDurationVerbose(row.avg_duration_ms ?? row.avg_ms),
      },
      {
        key: 'max_duration',
        header: 'Max Duration',
        align: 'right',
        cell: (row) => formatDurationVerbose(row.max_duration_ms ?? row.max_ms),
        csvValue: (row) => formatDurationVerbose(row.max_duration_ms ?? row.max_ms),
      },
      {
        key: 'last_run_duration',
        header: 'Last Run Duration',
        align: 'right',
        cell: (row) => formatDurationVerbose(row.last_duration_ms ?? row.last_ms),
        csvValue: (row) => formatDurationVerbose(row.last_duration_ms ?? row.last_ms),
      },
      {
        key: 'runs',
        header: 'Runs Count',
        align: 'right',
        cell: (row) => row.runs,
        csvValue: (row) => row.runs,
      },
    ],
    []
  );

  return (
    <section className={sectionClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={headingClass}>Slowest tests</h2>
            <LearnMoreButton onClick={onOpenGuide} />
          </div>
          <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
            Top test cases with the highest average execution duration across historical runs
          </p>
        </div>
      </div>
      {slowest.length === 0 ? (
        <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
          No test duration data.
        </p>
      ) : (
        <DataTable
          data={slowestRows}
          fullData={slowest}
          columns={slowestColumns}
          getRowKey={(row) => `${row.project}/${row.file}/${row.title}`}
          compact
          exportFilename={() => generateExportFilename('slowest_tests')}
          className="mt-3"
        />
      )}
    </section>
  );
}
