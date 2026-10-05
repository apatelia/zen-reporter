import type { ResultSummary, TestSuite } from '@/lib/types/report';
import { formatDuration } from '@/lib/formatters';
import { computeStatusPercentages } from '@/lib/statsUtils';
import PassRateRing from './PassRateRing';

export interface TestResultsHeroProps {
  summary: ResultSummary;
  suites: TestSuite[];
}

export default function TestResultsHero({ summary, suites }: TestResultsHeroProps) {
  const statusPcts = computeStatusPercentages(summary);
  const totalFailures = summary.failed + summary.timedOut + (summary.interrupted ?? 0);
  const isParallel = Boolean(summary.workers && summary.workers > 1);

  const failureRateClass =
    statusPcts.failureRate === 0 || statusPcts.failureRate <= 10
      ? 'bg-success-500/10 text-success-600 dark:text-success-400 border-success-500/20'
      : statusPcts.failureRate <= 40
        ? 'bg-warning-500/10 text-warning-600 dark:text-warning-400 border-warning-500/20'
        : 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border-danger-500/20';

  const items = [
    {
      label: 'Passed',
      value: summary.passed,
      pct: statusPcts.passed,
      color: 'bg-success-500',
      text: 'text-success-600 dark:text-success-500',
      bg: 'bg-success-500/5 dark:bg-success-500/10 border-success-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'Failed',
      value: summary.failed,
      pct: statusPcts.failed,
      color: 'bg-danger-500',
      text: 'text-danger-600 dark:text-danger-500',
      bg: 'bg-danger-500/5 dark:bg-danger-500/10 border-danger-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      label: 'Timed Out',
      value: summary.timedOut,
      pct: statusPcts.timedOut,
      color: 'bg-danger-600 dark:bg-danger-400',
      text: 'text-danger-600 dark:text-danger-500',
      bg: 'bg-danger-500/5 dark:bg-danger-500/10 border-danger-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      label: 'Interrupted',
      value: summary.interrupted ?? 0,
      pct: statusPcts.interrupted,
      color: 'bg-amber-600 dark:bg-amber-500',
      text: 'text-amber-600 dark:text-amber-500',
      bg: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
    },
    {
      label: 'Skipped',
      value: summary.skipped,
      pct: statusPcts.skipped,
      color: 'bg-warning-500',
      text: 'text-warning-600 dark:text-warning-500',
      bg: 'bg-warning-500/5 dark:bg-warning-500/10 border-warning-500/20',
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full rounded-md border border-border-default bg-canvas p-5 shadow-xs">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        {/* Left Side: Pass Rate Gauge */}
        <div className="flex flex-col items-center justify-between border-b border-border-default/60 pb-5 lg:w-64 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <PassRateRing passRate={statusPcts.passRate} />
        </div>

        {/* Right Side: Integrated Unbordered Metadata Strip + Execution Breakdown */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Integrated Test Run Info Header */}
          <div className="border-b border-border-default/60 pb-2.5 mb-2 space-y-1.5">
            <div className="flex items-center">
              <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
                Test Run Info
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Duration:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {formatDuration(summary.duration)}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default/80" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Projects:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {summary.numberOfProjects}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default/80" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Suites:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {suites.length}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default/80" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Tests:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {summary.total}
                </span>
              </div>

              <div className="h-3.5 w-px bg-border-default/80" />

              <div className="flex items-center gap-1.5">
                <span className="text-text-body-mid dark:text-text-muted font-semibold">
                  Workers:
                </span>
                <span className="text-sm font-extrabold text-text-ink dark:text-text-on-primary">
                  {isParallel ? `${summary.workers} Workers` : '1 Worker'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Breakdown Header + Progress Bar + 5 Status Cards Grid */}
          <div className="space-y-3.5 mt-auto">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
                  Test Results & Breakdown
                </h3>
                <p className="text-xs text-text-body-mid dark:text-text-muted">
                  Distribution across {summary.total} total test case execution outcomes
                </p>
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${failureRateClass}`}
              >
                <span>Failure Rate: {statusPcts.failureRate}%</span>
                <span className="opacity-40">•</span>
                <span>
                  {totalFailures} {totalFailures === 1 ? 'failure' : 'failures'}
                </span>
              </div>
            </div>

            {/* Multi-segmented Progress Bar */}
            <div className="h-6 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-200 flex">
              {items.map((item) =>
                item.pct > 0 ? (
                  <div
                    key={item.label}
                    className={`h-full ${item.color} transition-all duration-300`}
                    style={{ width: `${item.pct}%` }}
                    title={`${item.label}: ${item.value} (${item.pct}%)`}
                  />
                ) : null
              )}
            </div>

            {/* 5 Status Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {items.map((item) => (
                <div
                  key={item.label}
                  className={`flex flex-col justify-between rounded-md border p-3 shadow-2xs transition-all ${item.bg}`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
                    <span>{item.label}</span>
                    <span className={item.text}>{item.icon}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className={`text-2xl font-bold ${item.text}`}>{item.value}</span>
                    <span className="text-xs font-medium text-text-body-mid dark:text-text-muted">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
