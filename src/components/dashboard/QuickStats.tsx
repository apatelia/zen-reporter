import {
  formatDuration,
  computeSlowestTest,
  computeFastestTest,
  getTotalTags,
  collectAllCases,
} from '@/lib/utils';
import type { ResultSummary, TestSuite } from '@/lib/types';

interface Props {
  summary: ResultSummary;
  suites: TestSuite[];
}

export default function QuickStats({ summary, suites }: Props) {
  const allCases = collectAllCases(suites);
  const avgDuration = summary.total > 0 ? Math.round(summary.duration / summary.total) : 0;
  const failureRate =
    summary.total > 0 ? Math.round(((summary.failed + summary.timedOut) / summary.total) * 100) : 0;
  const slowestTest = computeSlowestTest(allCases);
  const fastestTest = computeFastestTest(allCases);
  const totalTags = getTotalTags(allCases);

  const stats = [
    {
      label: 'Avg Duration',
      value: formatDuration(avgDuration),
      description: 'Average duration per test case: total run duration / total test count',
    },
    {
      label: 'Slowest Test',
      value: formatDuration(slowestTest),
      description: 'Maximum duration among all executed test cases',
    },
    {
      label: 'Fastest Test',
      value: formatDuration(fastestTest),
      description: 'Minimum duration among executed test cases (excluding skipped tests)',
    },
    {
      label: 'Total Tags',
      value: `${totalTags}`,
      description: 'Count of unique tag annotations across all test cases',
    },
    {
      label: 'Failure Rate',
      value: `${failureRate}%`,
      description:
        'Percentage of total tests that failed or timed out: ((failed + timedOut) / total) × 100',
      className:
        failureRate > 10
          ? 'text-danger-600 dark:text-danger-500'
          : 'text-success-600 dark:text-success-500',
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md bg-canvas border border-border-default px-5 py-4 shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              {stat.label}
            </p>
            <div className="group relative inline-flex items-center">
              <svg
                className="h-3.5 w-3.5 cursor-help text-text-body-mid opacity-60 hover:opacity-100 dark:text-text-muted transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
              </svg>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 group-hover:block z-50 w-48 rounded bg-slate-900 dark:bg-slate-800 p-2 text-center text-xs text-white shadow-lg ring-1 ring-slate-700">
                {stat.description}
                <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
              </div>
            </div>
          </div>
          <p
            className={`mt-1.5 text-xl font-bold text-text-ink dark:text-text-on-primary ${stat.className || ''}`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
