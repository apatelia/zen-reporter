import { useMemo } from 'react';
import type { TestSuite } from '@arpanp/zen-core';
import {
  collectAllCases,
  computeProjectStats,
  computeProjectExecutiveKPIs,
  formatDuration,
  type ProjectStats,
} from '@arpanp/zen-core';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import PassRateBadge from '@/components/shared/PassRateBadge';
import StatusCountBadge from '@/components/shared/StatusCountBadge';
import InfoTooltip from '@/components/shared/InfoTooltip';

export interface ProjectParityScorecardProps {
  suites: TestSuite[];
}

interface DisplayedProjectRow extends ProjectStats {
  highlightRoles?: ('highest' | 'lowest' | 'slowest')[];
}

/**
 * Project parity scorecard card evaluating cross-project stability, pass rates, and duration parity.
 *
 * @param props - Component properties.
 * @param props.suites - Test suite hierarchy to evaluate.
 * @returns Rendered ProjectParityScorecard component.
 */
export default function ProjectParityScorecard({ suites }: ProjectParityScorecardProps) {
  const allCases = useMemo(() => collectAllCases(suites), [suites]);
  const projectStats = useMemo(() => computeProjectStats(allCases), [allCases]);
  const kpis = useMemo(() => computeProjectExecutiveKPIs(projectStats), [projectStats]);

  const hasMultipleProjects = projectStats.length > 1;
  const parityDelta = kpis.passRateParityDelta;

  let parityBadgeClass =
    'bg-success-500/10 text-success-600 dark:text-success-500 border-success-500/20';
  let parityBadgeLabel = 'Consistent';

  if (!hasMultipleProjects) {
    parityBadgeClass = 'bg-surface-200/50 text-text-muted border-border-default';
    parityBadgeLabel = '1 Project';
  } else if (parityDelta > 15) {
    parityBadgeClass = 'bg-danger-500/10 text-danger-600 dark:text-danger-500 border-danger-500/20';
    parityBadgeLabel = `⚠ ${parityDelta}% Spread`;
  } else if (parityDelta > 0) {
    parityBadgeClass =
      'bg-warning-500/10 text-warning-600 dark:text-warning-500 border-warning-500/20';
    parityBadgeLabel = `Δ ${parityDelta}% Spread`;
  }

  // Curate executive projects (highest pass rate, lowest pass rate, slowest project)
  const displayedProjects = useMemo<DisplayedProjectRow[]>(() => {
    if (projectStats.length <= 1) {
      return projectStats;
    }

    // 1. Highest pass rate project (most stable)
    const sortedByPassRate = [...projectStats].sort((a, b) => {
      if (b.passRate !== a.passRate) return b.passRate - a.passRate;
      if (a.flakyRate !== b.flakyRate) return a.flakyRate - b.flakyRate;
      return b.total - a.total;
    });
    const highestProj = sortedByPassRate[0];

    // 2. Lowest pass rate project
    const lowestProj = sortedByPassRate[sortedByPassRate.length - 1];

    // 3. Slowest project (by total duration; duration tie → highest avg time per test, then name)
    const sortedByDuration = [...projectStats].sort((a, b) => {
      if (b.totalDuration !== a.totalDuration) return b.totalDuration - a.totalDuration;
      if (b.avgDuration !== a.avgDuration) return b.avgDuration - a.avgDuration;
      return a.name.localeCompare(b.name);
    });
    const slowestProj = sortedByDuration[0];

    // Map each project to its applicable roles
    const rolesByProject = new Map<string, ('highest' | 'lowest' | 'slowest')[]>();

    const addRole = (name: string, role: 'highest' | 'lowest' | 'slowest') => {
      const existing = rolesByProject.get(name) ?? [];
      if (!existing.includes(role)) {
        existing.push(role);
        rolesByProject.set(name, existing);
      }
    };

    // Assign Most/Least Stable only when there's a real pass-rate spread; suppress when all equal
    if (highestProj.passRate !== lowestProj.passRate) {
      addRole(highestProj.name, 'highest');
      addRole(lowestProj.name, 'lowest');
    }
    addRole(slowestProj.name, 'slowest');

    if (projectStats.length <= 3) {
      return projectStats.map((p) => ({
        ...p,
        highlightRoles: rolesByProject.get(p.name),
      }));
    }

    // When > 3 projects, curate the executive top 3
    if (lowestProj.name === slowestProj.name) {
      const result: DisplayedProjectRow[] = [
        { ...highestProj, highlightRoles: rolesByProject.get(highestProj.name) },
        { ...lowestProj, highlightRoles: rolesByProject.get(lowestProj.name) },
      ];

      // If there are other projects, include the next slowest as the 3rd project
      const nextSlowest = sortedByDuration.find(
        (p) => p.name !== highestProj.name && p.name !== lowestProj.name
      );
      if (nextSlowest) {
        result.push({
          ...nextSlowest,
          highlightRoles: rolesByProject.get(nextSlowest.name),
        });
      }
      return result;
    }

    const result: DisplayedProjectRow[] = [
      { ...highestProj, highlightRoles: rolesByProject.get(highestProj.name) },
      { ...lowestProj, highlightRoles: rolesByProject.get(lowestProj.name) },
    ];

    if (slowestProj.name !== highestProj.name) {
      result.push({
        ...slowestProj,
        highlightRoles: rolesByProject.get(slowestProj.name),
      });
    }

    return result;
  }, [projectStats]);

  const columns: ColumnDef<DisplayedProjectRow>[] = [
    {
      key: 'name',
      header: 'Project',
      headerClassName: 'w-auto',
      className: 'w-auto',
      cell: (p) => (
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <span
            className="font-semibold text-text-ink dark:text-text-on-primary truncate shrink min-w-0"
            title={p.name}
          >
            {p.name}
          </span>
        </div>
      ),
    },
    {
      key: 'flag',
      header: 'Flag',
      align: 'center',
      headerClassName: 'w-24 whitespace-nowrap',
      className: 'w-24 whitespace-nowrap',
      cell: (p) => {
        if (!p.highlightRoles?.length) {
          return <span className="text-text-muted">—</span>;
        }
        return (
          <div className="flex flex-col items-center gap-1">
            {p.highlightRoles.map((role) => {
              if (role === 'highest') {
                return (
                  <span
                    key="highest"
                    className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border border-success-500/40 bg-success-500/15 text-success-800 dark:bg-success-950/60 dark:text-success-300 dark:border-success-500/50 shadow-xs"
                  >
                    Most Stable
                  </span>
                );
              }
              if (role === 'lowest') {
                return (
                  <span
                    key="lowest"
                    className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border border-danger-500/40 bg-danger-500/15 text-danger-800 dark:bg-danger-950/60 dark:text-danger-300 dark:border-danger-500/50 shadow-xs"
                  >
                    Least Stable
                  </span>
                );
              }
              return (
                <span
                  key="slowest"
                  className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/50 shadow-xs"
                >
                  Slowest
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'passRate',
      header: 'Pass Rate',
      align: 'center',
      headerClassName: 'w-28 whitespace-nowrap',
      className: 'w-28 whitespace-nowrap',
      /**
       * Renders the pass rate badge with the project's total test count in parentheses.
       *
       * @param p - Project row data containing the computed pass rate and total test count.
       * @returns The rendered pass rate cell element.
       */
      cell: (p) => (
        <span className="inline-flex items-center gap-1">
          <PassRateBadge passRate={p.passRate} />
          <span className="text-[11px] text-text-muted tabular-nums">({p.total})</span>
        </span>
      ),
    },
    {
      key: 'failed',
      header: 'Failed',
      align: 'center',
      headerClassName: 'w-16 whitespace-nowrap',
      className: 'w-16 whitespace-nowrap',
      cell: (p) => (
        <StatusCountBadge
          count={p.failed + p.timedOut + p.interrupted}
          type="failed"
          showZeroBadge
        />
      ),
    },
    {
      key: 'flaky',
      header: 'Flaky',
      align: 'center',
      headerClassName: 'w-16 whitespace-nowrap',
      className: 'w-16 whitespace-nowrap',
      cell: (p) => <StatusCountBadge count={p.flakyCount} type="flaky" showZeroBadge />,
    },
    {
      key: 'skipped',
      header: 'Skipped',
      align: 'center',
      headerClassName: 'w-16 whitespace-nowrap',
      className: 'w-16 whitespace-nowrap',
      cell: (p) => <StatusCountBadge count={p.skipped} type="skipped" showZeroBadge />,
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      headerClassName: 'w-20 whitespace-nowrap',
      className: 'w-20 whitespace-nowrap',
      cell: (p) => (
        <span className="font-mono text-text-body-mid dark:text-text-muted tabular-nums">
          {formatDuration(p.totalDuration)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col justify-between w-full h-full rounded-md bg-surface-50 border border-border-default p-5 shadow-xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-text-ink dark:text-text-on-primary">
              Cross-Project Parity Scorecard
            </h3>
            <InfoTooltip
              text="Compares test pass rates and duration across Playwright projects. Spread shows the pass rate difference between the highest and lowest performing projects."
              className="z-30"
            />
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${parityBadgeClass}`}
          >
            {parityBadgeLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
          Target environment health, stability parity, and execution duration
        </p>
      </div>

      {/* Main KPI Summary */}
      <div className="my-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-text-ink dark:text-text-on-primary">
          {projectStats.length}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider text-text-body-mid dark:text-text-muted">
          {projectStats.length === 1 ? 'Target Project' : 'Target Projects Executed'}
        </span>
      </div>

      {/* Compact table: naturally holds 1 to 3 curated executive rows */}
      <div className="w-full rounded border border-border-default bg-surface-100/40 overflow-hidden">
        <DataTable
          compact
          data={displayedProjects}
          columns={columns}
          getRowKey={(p) => p.name}
          hideExportButton
          className="space-y-0"
          emptyMessage={
            <div className="p-4 text-center text-xs text-text-muted">
              No project execution data available
            </div>
          }
        />
      </div>
    </div>
  );
}
