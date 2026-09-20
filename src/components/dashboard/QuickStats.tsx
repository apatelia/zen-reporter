import {
  formatDuration,
  computeSlowestTest,
  computeFastestTest,
  getTotalTags,
  collectAllCases,
} from '@/lib/utils';
import type { ResultSummary, TestSuite } from '@/lib/types';
import { StatCard } from '@/components/shared';

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
    <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          description={stat.description}
          valueClassName={stat.className}
          className="p-4!"
          isFirst={index === 0}
          isLast={index === stats.length - 1}
        />
      ))}
    </div>
  );
}
