import { formatDuration, formatDate, computePassRate } from '@/lib/utils';
import type { ResultSummary, TestSuite } from '@/lib/types';
import SummaryCard from './SummaryCard';
import PassRateRing from './PassRateRing';
import QuickStats from './QuickStats';
import ProjectBarCharts from './ProjectBarCharts';
import FileSummary from './FileSummary';

interface Props {
  summary: ResultSummary;
  suites: TestSuite[];
}

export default function Overview({ summary, suites }: Props) {
  const passRate = computePassRate(summary);

  return (
    <div className="w-full space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
          Overview
        </h2>
        <p className="mt-1 text-sm text-text-body-mid dark:text-text-muted">
          {formatDate(summary.startTime)} — {formatDate(summary.endTime)}
        </p>
      </div>

      {/* Run Info Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <div className="rounded-md bg-canvas border border-border-default shadow-sm overflow-hidden">
          <div className="h-1 bg-accent-blue" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                {summary.workers && summary.workers > 1
                  ? 'Duration (Parallel Execution)'
                  : 'Duration (Sequential Execution)'}
              </span>
            </div>
            <span className="text-3xl font-bold text-text-ink dark:text-text-on-primary">
              {formatDuration(summary.duration)}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-canvas border border-border-default shadow-sm overflow-hidden">
          <div className="h-1 bg-warning-500" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                Projects / Browsers
              </span>
            </div>
            <span className="text-3xl font-bold text-text-ink dark:text-text-on-primary">
              {summary.numberOfProjects}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-canvas border border-border-default shadow-sm overflow-hidden">
          <div className="h-1 bg-danger-500" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                Suites / Files
              </span>
            </div>
            <span className="text-3xl font-bold text-text-ink dark:text-text-on-primary">
              {suites.length}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-canvas border border-border-default shadow-sm overflow-hidden">
          <div className="h-1 bg-success-500" />
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                Test Cases
              </span>
            </div>
            <span className="text-3xl font-bold text-text-ink dark:text-text-on-primary">
              {summary.total}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards + Pass Rate Ring */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Summary Cards + Quick Stats */}
        <div className="flex flex-col justify-between lg:col-span-9">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <SummaryCard
              label="Passed"
              value={summary.passed}
              total={summary.total}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              }
              color="success"
            />
            <SummaryCard
              label="Failed"
              value={summary.failed}
              total={summary.total}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              color="danger"
            />
            <SummaryCard
              label="Timed Out"
              value={summary.timedOut}
              total={summary.total}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              }
              color="danger"
            />
            <SummaryCard
              label="Interrupted"
              value={summary.interrupted ?? 0}
              total={summary.total}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              }
              color="danger"
            />
            <SummaryCard
              label="Skipped"
              value={summary.skipped}
              total={summary.total}
              icon={
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              }
              color="warning"
            />
          </div>

          <QuickStats summary={summary} suites={suites} />
        </div>

        {/* Pass Rate Ring */}
        <div className="flex flex-col justify-between rounded-md bg-canvas border border-border-default p-5 text-center shadow-sm lg:col-span-3">
          <PassRateRing passRate={passRate} />
        </div>
      </div>

      {/* Project Summary + File Summary */}
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ProjectBarCharts summary={summary} suites={suites} title="Projects Summary" />
          <FileSummary summary={summary} suites={suites} />
        </div>
      </div>
    </div>
  );
}
