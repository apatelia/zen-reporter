import { useState, useMemo } from 'react';
import InsightsGuides, { type InsightModalType } from './InsightsGuides';
import type { HistoryData, TestSuite } from '@/lib/types';
import {
  formatDate,
  formatDurationVerbose,
  computeProjectStats,
  collectAllCases,
} from '@/lib/utils';
import ProjectFlakyRateChart from './ProjectFlakyRateChart';
import ProjectDurationChart from '@/components/insights/ProjectDurationChart';
import { usePagination, PageSizeControl, PaginationFooter } from '@/components/pagination';
import {
  LearnMoreButton,
  HistoryDisabledBanner,
  DateFilterControl,
  DataTable,
  SearchInput,
  type ColumnDef,
  type DateFilterRange,
} from '@/components/shared';

interface Props {
  history: HistoryData | null;
  suites: TestSuite[];
  isHistoryDisabled?: boolean;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-5 shadow-xs';
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

export default function InsightsSection({ history, suites, isHistoryDisabled }: Props) {
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

    if (
      (flakyFilterRange.fromTimestamp || flakyFilterRange.toTimestamp) &&
      filteredFlakyRuns.length === 0
    ) {
      list = [];
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
        const regDate = row.last_run_at || row.regressed_at;
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
    []
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
        header: 'Regressed In',
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
    []
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
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
        Analytical Insights
      </h2>

      {/* 1. Duration & P95 Latency Benchmark Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProjectDurationChart
          projectStats={computeProjectStats(collectAllCases(suites))}
          title="Execution Duration & P95 Latency Benchmark"
          className="rounded-md border border-border-default bg-surface-50 p-5 shadow-xs flex flex-col justify-between"
        />
        <ProjectFlakyRateChart suites={suites} title="Flaky Test Count & Retry Rate by Project" />
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
              <PageSizeControl
                id="flaky-page-size"
                pageSize={flakyPag.pageSize}
                onPageSizeChange={flakyPag.changePageSize}
              />
            </div>

            <div className="pt-3 pb-1 border-b border-border-default/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <DateFilterControl
                onFilterChange={(range) => {
                  setFlakyFilterRange(range);
                  flakyPag.setPage(1);
                }}
                availableTimestamps={availableTimestamps}
              />
              <SearchInput
                value={flakySearchTerm}
                onChange={(val) => {
                  setFlakySearchTerm(val);
                  flakyPag.setPage(1);
                }}
                placeholder="Search tests..."
                className="w-44 sm:w-48 shrink-0"
                inputClassName="w-full rounded-md border border-border-default bg-surface-50 pl-9 pr-7 py-1.5 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary"
              />
            </div>

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
                  exportFilename="flaky_tests.csv"
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
              <PageSizeControl
                id="regressions-page-size"
                pageSize={regressionsPag.pageSize}
                onPageSizeChange={regressionsPag.changePageSize}
              />
            </div>

            <div className="pt-3 pb-1 border-b border-border-default/50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <DateFilterControl
                onFilterChange={(range) => {
                  setRegressionFilterRange(range);
                  regressionsPag.setPage(1);
                }}
                availableTimestamps={availableTimestamps}
              />
              <SearchInput
                value={regressionSearchTerm}
                onChange={(val) => {
                  setRegressionSearchTerm(val);
                  regressionsPag.setPage(1);
                }}
                placeholder="Search tests..."
                className="w-44 sm:w-48 shrink-0"
                inputClassName="w-full rounded-md border border-border-default bg-surface-50 pl-9 pr-7 py-1.5 text-xs text-text-ink placeholder:text-text-muted focus:border-accent-blue focus:outline-none dark:bg-surface-50 dark:text-text-on-primary"
              />
            </div>

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
                  exportFilename="test_regressions.csv"
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
            <div className="flex items-center gap-2">
              <h2 className={headingClass}>Slowest tests</h2>
              <LearnMoreButton onClick={() => setActiveModal('slowest-tests')} />
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
                exportFilename="slowest_tests.csv"
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
