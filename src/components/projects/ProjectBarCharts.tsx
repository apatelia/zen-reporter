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
import type { ResultSummary, TestSuite } from '@/lib/types/report';
import LearnMoreButton from '@/components/shared/LearnMoreButton';
import { TEST_STATUS_COLOR_MAP } from '@/lib/theme';

const colorMap = TEST_STATUS_COLOR_MAP;

const LegendFormatter = (value: string) => {
  return (
    <span style={{ color: 'var(--color-text-ink)', fontSize: '12px', fontWeight: 500 }}>
      {value}
    </span>
  );
};

const renderProjectSummaryTooltip = (props: TooltipContentProps) => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="p-2.5 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs mb-1.5 border-b border-border-default pb-1">{label}</div>
      <div className="space-y-1 text-xs">
        {payload.map((entry) => {
          const val = Number(entry.value);
          if (val <= 0) return null;
          const seriesColor = colorMap[String(entry.name)] || entry.color;
          return (
            <div
              key={String(entry.name)}
              className="flex items-center justify-between gap-4 font-medium"
            >
              <span className="flex items-center gap-1.5 text-text-ink dark:text-text-on-primary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seriesColor }} />
                {entry.name}:
              </span>
              <span className="font-bold tabular-nums text-text-ink dark:text-text-on-primary">
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface ProjectBarChartsProps {
  summary?: ResultSummary;
  suites: TestSuite[];
  title?: string;
  onOpenGuide: () => void;
}

interface ChartDataItem {
  name: string;
  Passed: number;
  Failed: number;
  Interrupted: number;
  Skipped: number;
  'Timed Out': number;
}

export default function ProjectBarCharts({
  suites,
  title = 'Projects Summary',
  onOpenGuide,
}: ProjectBarChartsProps) {
  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);

  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((project) => ({
    name: project.name,
    Passed: project.passed,
    Failed: project.failed,
    Interrupted: project.interrupted,
    Skipped: project.skipped,
    'Timed Out': project.timedOut,
  }));

  const chartHeight = Math.max(300, projectStats.length * 40 + 80);

  return (
    <div className="rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-semibold text-text-ink dark:text-text-on-primary">{title}</h3>
          <LearnMoreButton onClick={onOpenGuide} />
        </div>
        <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
          Stacked status breakdown across project profiles
        </p>
      </div>

      {projectStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border border-dashed border-border-default bg-surface-100/50 p-6 space-y-1.5 mt-2">
          <p className="text-xs font-semibold text-text-ink dark:text-text-on-primary">
            No project data available for current run
          </p>
          <p className="text-[11px] text-text-body-mid dark:text-text-muted">
            No test cases were executed or matched the criteria.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
            barSize={18}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-chart)"
              horizontal={false}
            />
            <XAxis
              type="number"
              fontSize={12}
              tick={{ fill: 'var(--color-text-muted)' }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              fontSize={12}
              width={yAxisWidth}
              tick={{ fill: 'var(--color-text-muted)' }}
              tickFormatter={(val: string) =>
                val.length === maxLen && maxLen > 0 ? `\u00A0${val}` : val
              }
            />
            <Tooltip
              content={renderProjectSummaryTooltip}
              wrapperStyle={{
                backgroundColor: 'var(--color-surface-100)',
                border: '1px solid var(--color-border-default)',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                outline: 'none',
              }}
            />
            <Legend
              formatter={LegendFormatter}
              iconType="circle"
              wrapperStyle={{
                paddingTop: '8px',
                textAlign: 'center',
                width: '100%',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="Passed"
              stackId="status"
              fill="var(--color-success-500)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Failed"
              stackId="status"
              fill="var(--color-danger-500)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Interrupted"
              stackId="status"
              fill="var(--color-danger-600)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Skipped"
              stackId="status"
              fill="var(--color-text-muted)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Timed Out"
              stackId="status"
              fill="var(--color-warning-500)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
