import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryData } from '@/lib/types';
import { formatDateParts, formatDuration } from '@/lib/utils';
import { LearnMoreButton } from '@/components/shared';

interface DurationTrendProps {
  history: HistoryData;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-5 shadow-xs';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

const PROJECT_BRAND_COLORS: Record<string, string> = {
  chromium: 'var(--color-accent-green)',
  firefox: 'var(--color-warning-500)',
  webkit: 'var(--color-accent-gold)',
  'desktop chrome': 'var(--color-accent-green)',
  'desktop firefox': 'var(--color-warning-500)',
  'desktop safari': 'var(--color-accent-gold)',
  'mobile chrome': 'var(--color-accent-cafe)',
  'mobile safari': 'var(--color-warning-600)',
};

const DISTINCT_PROJECT_COLORS = [
  'var(--color-success-500)',
  'var(--color-danger-500)',
  'var(--color-warning-500)',
  'var(--color-info-600)',
  'var(--color-accent-house)',
  'var(--color-accent-gold)',
  'var(--color-accent-pink)',
  'var(--color-accent-orange)',
  'var(--color-success-700)',
  'var(--color-danger-700)',
  'var(--color-warning-700)',
  'var(--color-info-700)',
];

function getProjectColor(project: string, index: number): string {
  const normalized = project.toLowerCase().trim();
  if (PROJECT_BRAND_COLORS[normalized]) {
    return PROJECT_BRAND_COLORS[normalized];
  }
  for (const [key, val] of Object.entries(PROJECT_BRAND_COLORS)) {
    if (key.length > 3 && normalized.includes(key)) return val;
  }
  return DISTINCT_PROJECT_COLORS[index % DISTINCT_PROJECT_COLORS.length];
}

const renderTrendTick = ({
  x,
  y,
  payload,
}: {
  x: number | string;
  y: number | string;
  payload: { value: unknown };
}) => {
  const tickX = Number(x);
  const tickY = Number(y);
  const [dateLine, timeLine] = formatDateParts(String(payload.value));
  return (
    <g>
      <text
        x={tickX}
        y={tickY + 10}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill="var(--color-text-ink)"
      >
        {dateLine}
      </text>
      <text
        x={tickX}
        y={tickY + 24}
        textAnchor="middle"
        fontSize={11}
        fill="var(--color-text-body-mid)"
      >
        {timeLine}
      </text>
    </g>
  );
};

const renderDurationTooltip = (props: TooltipContentProps) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const [dateLine, timeLine] = formatDateParts(String(label));
  return (
    <div className="p-2.5 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs">{dateLine}</div>
      <div className="text-[11px] text-text-body-mid dark:text-text-muted mb-1.5">{timeLine}</div>
      <div className="space-y-1 text-xs">
        {payload.map((entry) => (
          <div
            key={String(entry.name)}
            className="flex items-center justify-between gap-4 font-medium"
          >
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold tabular-nums">
              {formatDuration(Number(entry.value) * 1000)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DurationTrend({ history }: DurationTrendProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { durationChartData, projectNames } = useMemo(() => {
    if (!history || !history.runs.length) return { durationChartData: [], projectNames: [] };

    const recentRuns = history.runs.slice(-15);
    const projectSet = new Set<string>();
    recentRuns.forEach((run) => {
      if (run.project_durations) {
        Object.keys(run.project_durations).forEach((p) => projectSet.add(p));
      }
    });

    if (
      projectSet.size === 0 &&
      (history as unknown as { project_trends?: { project: string }[] }).project_trends
    ) {
      (history as unknown as { project_trends: { project: string }[] }).project_trends.forEach(
        (pt) => pt.project && projectSet.add(pt.project)
      );
    }

    if (projectSet.size === 0) {
      (history.flaky || []).forEach((f) => f.project && projectSet.add(f.project));
      (history.slowest || []).forEach((s) => s.project && projectSet.add(s.project));
      (history.regressions || []).forEach((r) => r.project && projectSet.add(r.project));
    }

    const projectsList = Array.from(projectSet);

    const data = recentRuns.map((run) => {
      const item: Record<string, unknown> = {
        started_at: run.started_at,
        run_name: run.run_name,
      };

      if (run.project_durations && Object.keys(run.project_durations).length > 0) {
        projectsList.forEach((proj) => {
          item[proj] = run.project_durations?.[proj] ?? null;
        });
      } else {
        projectsList.forEach((proj) => {
          item[proj] = null;
        });
      }
      return item;
    });

    return { durationChartData: data, projectNames: projectsList };
  }, [history]);

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className={headingClass}>Duration trend</h2>
          <LearnMoreButton onClick={() => setIsModalOpen(true)} />
        </div>
      </div>
      {history.runs.length > 15 && (
        <p className="mt-1 text-xs font-medium text-text-body-mid dark:text-text-muted">
          Showing project execution duration (in seconds) for the 15 most recent runs
        </p>
      )}
      {durationChartData.length < 2 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 space-y-2 mt-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 border border-border-default text-text-body-mid dark:text-text-muted">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-text-ink dark:text-text-on-primary">
            Historical trend chart requires at least 2 test runs
          </p>
          <p className="text-[11px] text-text-body-mid dark:text-text-muted max-w-md">
            Execute future runs and run{' '}
            <code className="rounded bg-surface-200 px-1.5 py-0.5 font-mono text-[10px] text-text-ink dark:text-text-on-primary border border-border-default">
              npx zr history report
            </code>{' '}
            to visualize project duration trends across runs over time.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={durationChartData} margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-chart)" />
              <XAxis
                dataKey="started_at"
                fontSize={11}
                height={48}
                interval={0}
                tick={renderTrendTick}
              />
              <YAxis
                fontSize={11}
                fontWeight={500}
                tick={{ fill: 'var(--color-text-ink)' }}
                unit="s"
              />
              <Tooltip
                content={renderDurationTooltip}
                wrapperStyle={{
                  backgroundColor: 'var(--color-surface-100)',
                  border: '1px solid var(--color-border-default)',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  outline: 'none',
                }}
              />
              <Legend
                iconType="circle"
                formatter={(value: string) => (
                  <span
                    style={{ color: 'var(--color-text-ink)', fontSize: '12px', fontWeight: 500 }}
                  >
                    {value}
                  </span>
                )}
                wrapperStyle={{
                  paddingTop: '8px',
                  textAlign: 'center',
                  width: '100%',
                  fontSize: '12px',
                }}
              />
              {projectNames.map((proj, idx) => {
                const color = getProjectColor(proj, idx);
                return (
                  <Line
                    key={proj}
                    type="monotone"
                    dataKey={proj}
                    name={proj}
                    stroke={color}
                    strokeWidth={2.5}
                    connectNulls={true}
                    dot={{ r: 4, fill: color, stroke: 'var(--color-surface-50)', strokeWidth: 1.5 }}
                    activeDot={{
                      r: 6,
                      fill: color,
                      stroke: 'var(--color-surface-50)',
                      strokeWidth: 2,
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Dynamic Modal Guide Component */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-lg border border-border-default bg-canvas p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border-default pb-3.5">
              <div>
                <h3 className="text-xl font-bold text-text-ink dark:text-text-on-primary">
                  Project Duration Trend Guide
                </h3>
                <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
                  Metric definitions, targets, and diagnostic guidelines for Zen Reporter
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1.5 text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors cursor-pointer"
                title="Close guide"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Duration Guide Content */}
            <div className="space-y-4 text-xs text-text-body-mid dark:text-text-muted leading-relaxed">
              <div className="rounded-md border border-border-default bg-surface-50 p-4 space-y-2">
                <h4 className="font-bold text-sm text-text-ink dark:text-text-on-primary">
                  Project Duration Diagnostics
                </h4>
                <p>
                  Tracks run execution times by project across recent historical runs to identify
                  performance degradation and bottlenecks over time.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-border-default pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md bg-accent-blue px-4 py-2 text-xs font-bold text-text-on-primary hover:bg-accent-blue/90 transition-colors cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
