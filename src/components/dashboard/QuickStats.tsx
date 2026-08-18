import { formatDuration, computeSlowestTest, getTotalTags, collectAllCases } from '@/lib/utils';
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
  const totalTags = getTotalTags(allCases);

  const stats = [
    {
      label: 'Avg Duration',
      value: formatDuration(avgDuration),
    },
    {
      label: 'Failure Rate',
      value: `${failureRate}%`,
      className:
        failureRate > 10
          ? 'text-danger-600 dark:text-danger-500'
          : 'text-success-600 dark:text-success-500',
    },
    {
      label: 'Slowest Test',
      value: formatDuration(slowestTest),
    },
    {
      label: 'Total Tags',
      value: `${totalTags}`,
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md bg-canvas border border-border-default px-5 py-4 shadow-sm"
        >
          <p className="text-[14px] font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {stat.label}
          </p>
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
