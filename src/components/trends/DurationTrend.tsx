import LearnMoreButton from '@/components/shared/LearnMoreButton';
import { formatDateParts, formatDuration } from '@/lib/formatters';
import { getProjectColor } from '@/lib/theme';
import type { HistoryData } from '@/lib/types/history';
import { useMemo } from 'react';
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
import { renderTrendTick } from './TrendTick';

interface DurationTrendProps {
  history: HistoryData;
  onOpenGuide?: () => void;
}

const sectionClass = 'rounded-md border border-border-default bg-surface-50 p-5 shadow-xs';
const headingClass = 'text-lg font-bold text-text-ink dark:text-text-on-primary';

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

export default function DurationTrend({ history, onOpenGuide }: DurationTrendProps) {
  const { durationChartData, projectNames } = useMemo(() => {
    if (!history || !history.runs.length) return { durationChartData: [], projectNames: [] };

    const recentRuns = history.runs.slice(-15);
    const projectSet = new Set<string>();
    recentRuns.forEach((run) => {
      if (run.project_durations) {
        Object.keys(run.project_durations).forEach((p) => projectSet.add(p));
      }
    });

    if (projectSet.size === 0 && history.project_trends) {
      history.project_trends.forEach((pt) => pt.project && projectSet.add(pt.project));
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
          item[proj] = run.project_durations?.[proj] ?? 0;
        });
      } else {
        projectsList.forEach((proj) => {
          item[proj] = 0;
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
          {onOpenGuide && <LearnMoreButton onClick={onOpenGuide} />}
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
    </section>
  );
}
