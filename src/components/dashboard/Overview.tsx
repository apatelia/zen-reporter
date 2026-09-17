import type { ResultSummary, TestSuite } from '@/lib/types';
import { computePassRate, formatDate, formatDuration } from '@/lib/utils';
import FileSummary from './FileSummary';
import PassRateRing from './PassRateRing';
import ProjectBarCharts from './ProjectBarCharts';
import QuickStats from './QuickStats';
import RunInfoCard from './RunInfoCard';
import SummaryCard from './SummaryCard';

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
        <RunInfoCard
          label={
            summary.workers && summary.workers > 1
              ? 'Duration (Parallel Execution)'
              : 'Duration (Sequential Execution)'
          }
          value={formatDuration(summary.duration)}
          barColorClass="bg-accent-blue"
        />
        <RunInfoCard
          label="Projects / Browsers"
          value={summary.numberOfProjects}
          barColorClass="bg-warning-500"
        />
        <RunInfoCard label="Suites / Files" value={suites.length} barColorClass="bg-danger-500" />
        <RunInfoCard label="Test Cases" value={summary.total} barColorClass="bg-success-500" />
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
        <div
          className={`grid grid-cols-1 gap-6 ${
            suites.length > 0 ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
          }`}
        >
          {suites.length > 0 && <ProjectBarCharts suites={suites} title="Projects Summary" />}
          <FileSummary suites={suites} />
        </div>
      </div>
    </div>
  );
}
