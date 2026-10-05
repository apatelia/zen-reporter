import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipContentProps,
} from 'recharts';
import { computeProjectStats, collectAllCases } from '@/lib/statsUtils';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import type { TestSuite } from '@/lib/types/report';

export interface ProjectFlakyRateChartProps {
  suites: TestSuite[];
  title?: string;
  onOpenGuide?: () => void;
}

interface ChartDataItem {
  name: string;
  'Flaky Tests': number;
  'Flaky Rate (%)': number;
  total: number;
  executed: number;
}

const renderTooltip = (props: TooltipContentProps) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload as ChartDataItem;
  if (!data) return null;

  return (
    <div className="p-3 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs mb-1 border-b border-border-default pb-1">{label}</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-text-body-mid dark:text-text-muted">Executed Tests:</span>
          <span className="font-bold tabular-nums">{data.executed}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-warning-600 dark:text-warning-500">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--color-warning-500)' }}
            />
            Flaky Test Cases:
          </span>
          <span className="font-bold tabular-nums text-warning-600 dark:text-warning-500">
            {data['Flaky Tests']}
          </span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border-default font-semibold">
          <span className="text-warning-600 dark:text-warning-500">Flakiness Rate:</span>
          <span className="font-bold tabular-nums text-warning-600 dark:text-warning-500">
            {data['Flaky Rate (%)']}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ProjectFlakyRateChart({
  suites,
  title = 'Flaky Test Count & Retry Rate by Project',
  onOpenGuide,
}: ProjectFlakyRateChartProps) {
  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);

  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((p) => ({
    name: p.name,
    'Flaky Tests': p.flakyCount,
    'Flaky Rate (%)': p.flakyRate,
    total: p.total,
    executed: p.executed,
  }));

  const hasFlakyData = projectStats.length > 0 && data.some((d) => d['Flaky Tests'] > 0);

  return (
    <div className="rounded-md bg-surface-50 border border-border-default p-5 shadow-xs flex flex-col justify-between">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-text-ink dark:text-text-on-primary">{title}</h3>
          <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
            Cross-project comparison of unstable/flaky test occurrences and retry dependency
          </p>
        </div>

        {onOpenGuide && <LearnMoreButton onClick={onOpenGuide} />}
      </div>

      {!hasFlakyData ? (
        <div className="flex h-65 flex-col items-center justify-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-200 text-text-muted">
            <svg
              className="h-5 w-5 text-text-body-mid dark:text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-ink dark:text-text-on-primary">
            No flaky tests detected
          </p>
          <p className="mt-1 text-xs text-text-body-mid dark:text-text-muted">
            All test cases executed without requiring retries to pass.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barSize={18}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-chart)"
              horizontal={false}
            />
            <XAxis type="number" fontSize={12} tick={{ fill: 'var(--color-text-muted)' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              fontSize={12}
              tick={{ fill: 'var(--color-text-ink)' }}
            />
            <Tooltip
              content={renderTooltip}
              wrapperStyle={{
                backgroundColor: 'var(--color-surface-100)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                outline: 'none',
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
            />
            <Bar dataKey="Flaky Tests" fill="var(--color-warning-500)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
