import { useState, useMemo } from 'react';
import InsightsGuides, { type InsightModalType } from './InsightsGuides';
import type { TestSuite } from '@/lib/types/report';
import type { HistoryData } from '@/lib/types/history';
import { formatDate, formatDurationVerbose } from '@/lib/formatters';
import { computeProjectStats, collectAllCases } from '@/lib/statsUtils';
import ProjectFlakyRateChart from './ProjectFlakyRateChart';
import ProjectDurationChart from '@/components/insights/ProjectDurationChart';
import { usePagination } from '@/components/pagination/usePagination';
import { PageSizeControl } from '@/components/pagination/PageSizeControl';
import { PaginationFooter } from '@/components/pagination/PaginationFooter';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import HistoryDisabledBanner from '@/components/shared/HistoryDisabledBanner';
import DateFilterControl from '@/components/shared/DateFilterControl';
import { DataTable, ExportCsvButton, exportColumnsToCsv } from '@/components/shared/DataTable';
import SearchInput from '@/components/shared/SearchInput';
import type { ColumnDef } from '@/components/shared/DataTable';
import type { DateFilterRange } from '@/components/shared/DateFilterControl';
import { generateExportFilename } from '@/lib/exportFilename';

export interface InsightsSectionProps {
  history: HistoryData | null;
  suites: TestSuite[];
  isHistoryDisabled?: boolean;
}

const sectionClass =
  'overflow-hidden rounded-md bg-canvas border border-border-default shadow-sm p-4';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

const lastStatusStyles: Record<string, { label: string; pillClass: string; tooltip: string }> = {
  passed: {
    label: 'Passed',
    pillClass: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
    tooltip: 'Regression resolved: test passed in the latest run.',
  },
  failed: {
    label: 'Failed',
    pillClass: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
    tooltip: 'Test failed during the last run. Fixing may be required.',
  },
  timedOut: {
    label: 'Timed Out',
    pillClass: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
    tooltip: 'Test timed out during the last run. Fixing may be required.',
  },
  interrupted: {
    label: 'Interrupted',
    pillClass: 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-500',
    tooltip: 'Test run was interrupted. Try to re-run the test to verify status.',
  },
  skipped: {
    label: 'Skipped',
    pillClass:
      'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
    tooltip: 'Test was skipped. Try to re-run the test to verify status.',
  },
};

export default function InsightsSection({
  history,
  suites,
  isHistoryDisabled,
}: InsightsSectionProps) {
  const [activeModal, setActiveModal] = useState<InsightModalType>(null);
  const [flakyFilterRange, setFlakyFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [flakySearchTerm, setFlakySearchTerm] = useState('');

  const [regressionFilterRange, setRegressionFilterRange] = useState<DateFilterRange>({
    fromTimestamp: null,
    toTimestamp: null,
    label: null,
  });
  const [regressionSearchTerm, setRegressionSearchTerm] = useState('');

  const isRegressionFiltered = Boolean(
    regressionFilterRange.fromTimestamp || regressionFilterRange.toTimestamp
  );
  const isFlakyFiltered = Boolean(flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp);

  const availableTimestamps = useMemo(
    () => history?.runs.map((r) => r.started_at) ?? [],
    [history]
  );

  const filteredFlakyRuns = useMemo(() => {
    if (!history?.runs) return [];
    if (!flakyFilterRange.fromTimestamp && !flakyFilterRange.toTimestamp) return history.runs;

    return history.runs.filter((run) => {
      const runTime = new Date(run.started_at).getTime();
      if (flakyFilterRange.fromTimestamp && runTime < flakyFilterRange.fromTimestamp) return false;
      if (flakyFilterRange.toTimestamp && runTime > flakyFilterRange.toTimestamp) return false;
      return true;
    });
  }, [history, flakyFilterRange]);

  const filteredFlaky = useMemo(() => {
    if (!history?.flaky) return [];
    let list = history.flaky;

    if (flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp) {
      if (filteredFlakyRuns.length === 0) {
        list = [];
      } else {
        list = list.filter((row) => {
          const dateStr = row.last_flaky_at || row.last_seen_at;
          if (!dateStr) return true;
          const time = new Date(dateStr).getTime();
          if (flakyFilterRange.fromTimestamp && time < flakyFilterRange.fromTimestamp) return false;
          if (flakyFilterRange.toTimestamp && time > flakyFilterRange.toTimestamp) return false;
          return true;
        });
      }
    }

    if (flakySearchTerm.trim()) {
      const query = flakySearchTerm.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          row.suite.toLowerCase().includes(query) ||
          (row.project && row.project.toLowerCase().includes(query))
      );
    }

    return list;
  }, [history, flakyFilterRange, filteredFlakyRuns, flakySearchTerm]);

  const filteredRegressions = useMemo(() => {
    if (!history?.regressions) return [];
    let list = history.regressions;

    if (regressionFilterRange.fromTimestamp || regressionFilterRange.toTimestamp) {
      list = list.filter((row) => {
        const regDate = row.regressed_at || row.last_run_at;
        if (!regDate) return true;
        const time = new Date(regDate).getTime();
        if (regressionFilterRange.fromTimestamp && time < regressionFilterRange.fromTimestamp)
          return false;
        if (regressionFilterRange.toTimestamp && time > regressionFilterRange.toTimestamp)
          return false;
        return true;
      });
    }

    if (regressionSearchTerm.trim()) {
      const query = regressionSearchTerm.trim().toLowerCase();
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(query) ||
          row.suite.toLowerCase().includes(query) ||
          (row.project && row.project.toLowerCase().includes(query))
      );
    }

    return list;
  }, [history, regressionFilterRange, regressionSearchTerm]);

  const flakyPag = usePagination(filteredFlaky.length, 10);
  const regressionsPag = usePagination(filteredRegressions.length, 10);

  const flakyRows = filteredFlaky.slice(flakyPag.start, flakyPag.start + flakyPag.pageSize);
  const regressionRows = filteredRegressions.slice(
    regressionsPag.start,
    regressionsPag.start + regressionsPag.pageSize
  );
  const slowestRows = history?.slowest.slice(0, 5) ?? [];

  const flakyColumns: ColumnDef<(typeof flakyRows)[0]>[] = useMemo(
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
        key: 'last_seen',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <span>Last Flaky Date</span>
            {isFlakyFiltered && (
              <span
                className="inline-flex items-center gap-1 rounded bg-accent-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent-blue dark:bg-accent-blue/20 dark:text-accent-blue"
                title="Date range filter active on this column"
              >
                Filtered
              </span>
            )}
          </span>
        ),
        headerLabel: 'Last Flaky Date',
        cell: (row) => {
          const dateStr = row.last_flaky_at || row.last_seen_at;
          return dateStr ? formatDate(dateStr) : '-';
        },
        csvValue: (row) => {
          const dateStr = row.last_flaky_at || row.last_seen_at;
          return dateStr ? formatDate(dateStr) : '';
        },
      },
      {
        key: 'failed_runs',
        header: 'Failed Runs',
        align: 'right',
        cell: (row) => (
          <span
            className={row.failed_runs > 0 ? 'text-danger-600 dark:text-danger-500 font-bold' : ''}
          >
            {row.failed_runs}
          </span>
        ),
        csvValue: (row) => row.failed_runs,
      },
      {
        key: 'passed_runs',
        header: 'Passed Runs',
        align: 'right',
        cell: (row) => (
          <span
            className={
              row.passed_runs > 0 ? 'text-success-600 dark:text-success-500 font-bold' : ''
            }
          >
            {row.passed_runs}
          </span>
        ),
        csvValue: (row) => row.passed_runs,
      },
      {
        key: 'recovered_by_retry',
        header: 'Recovered by Retry',
        align: 'right',
        cell: (row) => (
          <span
            className={
              row.recovered_by_retry > 0 ? 'text-warning-600 dark:text-warning-500 font-bold' : ''
            }
          >
            {row.recovered_by_retry}
          </span>
        ),
        csvValue: (row) => row.recovered_by_retry,
      },
      {
        key: 'total_runs',
        header: 'Total Runs',
        align: 'right',
        className: 'font-bold',
        cell: (row) => row.total_runs,
        csvValue: (row) => row.total_runs,
      },
    ],
    [isFlakyFiltered]
  );

  const regressionColumns: ColumnDef<(typeof regressionRows)[0]>[] = useMemo(
    () => [
      {
        key: 'title',
        header: 'Test',
        className: 'font-bold',
        cell: (row) => row.title,
        csvValue: (row) => row.title,
      },
      {
        key: 'suite',
        header: 'Suite',
        cell: (row) => row.suite || '-',
        csvValue: (row) => row.suite || '',
      },
      {
        key: 'project',
        header: 'Project',
        cell: (row) => row.project,
        csvValue: (row) => row.project,
      },
      {
        key: 'regressed_in',
        header: (
          <span className="inline-flex items-center gap-1.5">
            <span>Regressed In</span>
            {isRegressionFiltered && (
              <span
                className="inline-flex items-center gap-1 rounded bg-success-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-success-600 dark:bg-success-500/20 dark:text-success-400"
                title="Date range filter active on Regressed In column"
              >
                Filtered
              </span>
            )}
          </span>
        ),
        headerLabel: 'Regressed In',
        className: 'text-danger-600 dark:text-danger-500 font-bold',
        cell: (row) => formatDate(row.regressed_at),
        csvValue: (row) => formatDate(row.regressed_at),
      },
      {
        key: 'last_run',
        header: 'Last Run',
        cell: (row) => formatDate(row.last_run_at),
        csvValue: (row) => formatDate(row.last_run_at),
      },
      {
        key: 'last_status',
        header: 'Last Run Status',
        cell: (row) => {
          const status = lastStatusStyles[row.last_status] ?? {
            label: row.last_status,
            pillClass:
              'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600',
            tooltip: 'Try to re-run the test to verify status.',
          };
          return (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.pillClass}`}
            >
              {status.label}
            </span>
          );
        },
        csvValue: (row) => row.last_status,
      },
    ],
    [isRegressionFiltered]
  );

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
    <div className="space-y-6">
      {isHistoryDisabled && <HistoryDisabledBanner />}
      <h1 className="sr-only">Analytical Insights</h1>

      {/* 1. Duration & P95 Latency Benchmark Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectDurationChart
          projectStats={computeProjectStats(collectAllCases(suites))}
          title="Execution Duration & P95 Latency Benchmark"
          className="rounded-md border border-border-default bg-surface-50 p-5 shadow-xs flex flex-col justify-between"
          onOpenGuide={() => setActiveModal('duration-benchmark')}
        />
        <ProjectFlakyRateChart
          suites={suites}
          title="Flaky Test Count & Retry Rate by Project"
          onOpenGuide={() => setActiveModal('project-flaky-rate')}
        />
      </div>

      {!history ? (
        <div className="flex items-center justify-center py-16 text-center rounded-md border border-border-default bg-surface-50 p-6">
          <div>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-md bg-surface-100 border border-border-default">
              <svg
                className="h-8 w-8 text-text-ink dark:text-text-on-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-text-ink dark:text-text-on-primary">
              No history data
            </h3>
            <p className="mt-1.5 text-sm text-text-body-mid dark:text-text-muted">
              Run{' '}
              <code className="rounded bg-surface-200 px-1.5 py-0.5 text-xs font-mono font-semibold text-text-ink dark:text-text-on-primary border border-border-default">
                npx zr history report
              </code>{' '}
              after your test runs to populate flaky test history, regressions, and slowest tests.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Flaky Tests Section */}
          <section className={sectionClass}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={headingClass}>Flaky tests</h2>
                  <LearnMoreButton onClick={() => setActiveModal('flaky-tests')} />
                </div>
                <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
                  Tests that failed in some runs and passed in others (minimum 1 failure and 1
                  success)
                </p>
              </div>
              {history.flaky.length > 0 && filteredFlaky.length > 0 && (
                <PageSizeControl
                  id="flaky-page-size"
                  pageSize={flakyPag.pageSize}
                  onPageSizeChange={flakyPag.changePageSize}
                />
              )}
            </div>

            {history.flaky.length > 0 && (
              <div className="pt-3 pb-3 border-b border-border-default/50 flex flex-col gap-3">
                <DateFilterControl
                  onFilterChange={(range) => {
                    setFlakyFilterRange(range);
                    flakyPag.setPage(1);
                  }}
                  availableTimestamps={availableTimestamps}
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <SearchInput
                    value={flakySearchTerm}
                    onChange={(val) => {
                      setFlakySearchTerm(val);
                      flakyPag.setPage(1);
                    }}
                    placeholder="Search flaky tests by title, suite, or project..."
                    className="w-full sm:w-80 md:w-96"
                  />
                  {filteredFlaky.length > 0 && (
                    <ExportCsvButton
                      onClick={() =>
                        exportColumnsToCsv(
                          () =>
                            generateExportFilename('flaky_tests', {
                              dateRange: flakyFilterRange,
                              searchTerm: flakySearchTerm,
                            }),
                          filteredFlaky,
                          flakyColumns
                        )
                      }
                      count={filteredFlaky.length}
                    />
                  )}
                </div>
              </div>
            )}

            {filteredFlaky.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
                {flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp
                  ? 'No flaky tests detected in the selected date range.'
                  : 'No flaky tests detected.'}
              </p>
            ) : (
              <>
                <DataTable
                  data={flakyRows}
                  fullData={filteredFlaky}
                  columns={flakyColumns}
                  getRowKey={(row, i) => `${row.project}/${row.file}/${row.title}/${i}`}
                  compact
                  exportFilename={() =>
                    generateExportFilename('flaky_tests', {
                      dateRange: flakyFilterRange,
                      searchTerm: flakySearchTerm,
                    })
                  }
                  hideExportButton
                  className="mt-3"
                />
                <PaginationFooter
                  label="flaky tests"
                  total={filteredFlaky.length}
                  start={flakyPag.start}
                  pageLength={flakyRows.length}
                  currentPage={flakyPag.currentPage}
                  totalPages={flakyPag.totalPages}
                  onPageChange={flakyPag.setPage}
                />
              </>
            )}
          </section>

          {/* 3. Regressions Section */}
          <section className={sectionClass}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={headingClass}>Regressions</h2>
                  <LearnMoreButton onClick={() => setActiveModal('regressions')} />
                </div>
                <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
                  Tests that previously passed in a prior run but failed during a subsequent run
                </p>
              </div>
              {history.regressions.length > 0 && filteredRegressions.length > 0 && (
                <PageSizeControl
                  id="regressions-page-size"
                  pageSize={regressionsPag.pageSize}
                  onPageSizeChange={regressionsPag.changePageSize}
                />
              )}
            </div>

            {history.regressions.length > 0 && (
              <div className="pt-3 pb-3 border-b border-border-default/50 flex flex-col gap-3">
                <DateFilterControl
                  onFilterChange={(range) => {
                    setRegressionFilterRange(range);
                    regressionsPag.setPage(1);
                  }}
                  availableTimestamps={availableTimestamps}
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <SearchInput
                    value={regressionSearchTerm}
                    onChange={(val) => {
                      setRegressionSearchTerm(val);
                      regressionsPag.setPage(1);
                    }}
                    placeholder="Search regressions by title, suite, or project..."
                    className="w-full sm:w-80 md:w-96"
                  />
                  {filteredRegressions.length > 0 && (
                    <ExportCsvButton
                      onClick={() =>
                        exportColumnsToCsv(
                          () =>
                            generateExportFilename('test_regressions', {
                              dateRange: regressionFilterRange,
                              searchTerm: regressionSearchTerm,
                            }),
                          filteredRegressions,
                          regressionColumns
                        )
                      }
                      count={filteredRegressions.length}
                    />
                  )}
                </div>
              </div>
            )}

            {filteredRegressions.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
                {regressionFilterRange.fromTimestamp || regressionFilterRange.toTimestamp
                  ? 'No regressions detected in the selected date range.'
                  : 'No regressions detected.'}
              </p>
            ) : (
              <>
                <DataTable
                  data={regressionRows}
                  fullData={filteredRegressions}
                  columns={regressionColumns}
                  getRowKey={(row) => `${row.project}/${row.file}/${row.title}`}
                  compact
                  exportFilename={() =>
                    generateExportFilename('test_regressions', {
                      dateRange: regressionFilterRange,
                      searchTerm: regressionSearchTerm,
                    })
                  }
                  hideExportButton
                  className="mt-3"
                />
                <PaginationFooter
                  label="regressions"
                  total={filteredRegressions.length}
                  start={regressionsPag.start}
                  pageLength={regressionRows.length}
                  currentPage={regressionsPag.currentPage}
                  totalPages={regressionsPag.totalPages}
                  onPageChange={regressionsPag.setPage}
                />
              </>
            )}
          </section>

          {/* 4. Slowest Tests Section */}
          <section className={sectionClass}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <h2 className={headingClass}>Slowest tests</h2>
                <LearnMoreButton onClick={() => setActiveModal('slowest-tests')} />
              </div>
            </div>
            {history.slowest.length === 0 ? (
              <p className="mt-3 text-xs font-medium text-text-body-mid dark:text-text-muted">
                No test duration data.
              </p>
            ) : (
              <DataTable
                data={slowestRows}
                fullData={history.slowest}
                columns={slowestColumns}
                getRowKey={(row) => `${row.project}/${row.file}/${row.title}`}
                compact
                exportFilename={() => generateExportFilename('slowest_tests')}
                className="mt-3"
              />
            )}
          </section>
        </>
      )}

      {/* Dynamic Modal Guide Component */}
      <InsightsGuides activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
