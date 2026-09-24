import type { ResultSummary, TestSuite } from '@/lib/types';
import { computePassRate, formatDuration } from '@/lib/utils';
import ExecutionEfficiencyCard from './ExecutionEfficiencyCard';
import PassRateRing from './PassRateRing';
import QuickStats from './QuickStats';
import RunInfoCard from './RunInfoCard';
import SummaryCard from './SummaryCard';
import TestHealthCard from './TestHealthCard';

interface Props {
  summary: ResultSummary;
  suites: TestSuite[];
  isMinimalReport?: boolean;
}

export default function Overview({ summary, suites, isMinimalReport }: Props) {
  const passRate = computePassRate(summary);

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-ink dark:text-text-on-primary sm:text-3xl">
          Overview
        </h2>
      </div>

      {/* Section 1: Execution Environment & Metadata */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Run Environment
          </span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        {/* Run Info Bar (5 Cards Grid) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <RunInfoCard
            label="Total Run Duration"
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
          <RunInfoCard
            label="Worker Threads"
            value={
              summary.workers && summary.workers > 1
                ? `${summary.workers} Workers`
                : '1 Worker (Serial)'
            }
            barColorClass="bg-accent-house"
          />
        </div>
      </section>

      {/* Section 2: Test Results & Breakdown */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Test Results & Status
          </span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        {/* Summary Cards + Quick Stats */}
        <div className="space-y-4">
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
      </section>

      {/* Section 3: Visual Analytics & Insights */}
      {!isMinimalReport && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Performance & Health Analytics
            </span>
            <div className="flex-1 h-px bg-border-default" />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            <div className="flex flex-col justify-between rounded-md bg-canvas border border-border-default p-4 text-center shadow-sm lg:col-span-4">
              <PassRateRing passRate={passRate} />
            </div>
            <div className="lg:col-span-4 flex flex-col">
              <ExecutionEfficiencyCard summary={summary} />
            </div>
            <div className="lg:col-span-4 flex flex-col">
              <TestHealthCard suites={suites} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
