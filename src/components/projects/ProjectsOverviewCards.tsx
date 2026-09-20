import type { ProjectExecutiveKPIs } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import { StatCard } from '@/components/shared';

interface Props {
  kpis: ProjectExecutiveKPIs;
}

export default function ProjectsOverviewCards({ kpis }: Props) {
  const cards = [
    {
      label: 'Total Projects',
      value: `${kpis.totalProjects}`,
      subtext:
        kpis.totalProjects === 1
          ? '1 Playwright Project'
          : `${kpis.totalProjects} Playwright Projects`,
      description: 'Total number of configured Playwright project profiles in this test run',
      badgeClass: 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500',
    },
    {
      label: 'Most Stable Project',
      value: kpis.mostStableProject ? kpis.mostStableProject.name : 'N/A',
      subtext: kpis.mostStableProject
        ? `${kpis.mostStableProject.passRate}% Pass Rate (${kpis.mostStableProject.total} tests)`
        : 'No tests',
      description: 'Project target with the highest pass rate and lowest flakiness rate',
      badgeClass: 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500',
    },
    {
      label: 'Slowest Project',
      value: kpis.slowestProject ? kpis.slowestProject.name : 'N/A',
      subtext: kpis.slowestProject
        ? `${formatDuration(kpis.slowestProject.totalDuration)} total (${formatDuration(kpis.slowestProject.avgDuration)} avg)`
        : 'No tests',
      description: 'Project target consuming the highest cumulative execution duration',
      badgeClass: 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500',
    },
    {
      label: 'Parity Variance',
      value: `${kpis.passRateParityDelta}%`,
      subtext:
        kpis.passRateParityDelta === 0
          ? 'Perfect cross-project consistency'
          : `${kpis.passRateParityDelta}% pass rate gap across targets`,
      description: 'Difference between the highest and lowest project pass rates',
      badgeClass:
        kpis.passRateParityDelta > 15
          ? 'bg-danger-500/10 text-danger-600 dark:bg-danger-500/20 dark:text-danger-500'
          : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500',
    },
    {
      label: 'Flaky Tests',
      value: `${kpis.totalFlakyCount}`,
      subtext:
        kpis.totalFlakyCount === 0
          ? '0 Retries detected'
          : `${kpis.totalFlakyCount} tests required retries`,
      description: 'Count of test cases across all projects that required retries to pass',
      badgeClass:
        kpis.totalFlakyCount > 0
          ? 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-500'
          : 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card, index) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          subtext={card.subtext}
          description={card.description}
          badgeClass={card.badgeClass}
          isFirst={index === 0}
          isLast={index === cards.length - 1}
        />
      ))}
    </div>
  );
}
