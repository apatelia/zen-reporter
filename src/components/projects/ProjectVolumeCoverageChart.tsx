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
import type { ProjectStats } from '@/lib/statsUtils';
import LearnMoreButton from '@/components/shared/LearnMoreButton';

export interface ProjectVolumeCoverageChartProps {
  projectStats: ProjectStats[];
  title?: string;
  onOpenGuide: () => void;
}

const colorMap: Record<string, string> = {
  Executed: 'var(--color-success-500)',
  Skipped: 'var(--color-text-muted)',
};

const LegendFormatter = (value: string) => {
  return (
    <span style={{ color: colorMap[value] || 'var(--color-text-muted)', fontSize: '12px' }}>
      {value}
    </span>
  );
};

interface ChartDataItem {
  name: string;
  Executed: number;
  Skipped: number;
  'Coverage Density (%)': number;
  total: number;
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
          <span className="text-text-body-mid dark:text-text-muted">Total Tests:</span>
          <span className="font-bold tabular-nums">{data.total}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-success-600 dark:text-success-500">
            <span className="h-2 w-2 rounded-full bg-success-500" />
            Executed Tests:
          </span>
          <span className="font-bold tabular-nums">{data.Executed}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Skipped Tests:
          </span>
          <span className="font-bold tabular-nums">{data.Skipped}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-border-default font-semibold">
          <span className="text-emerald-600 dark:text-emerald-400">Coverage Density:</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {data['Coverage Density (%)']}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default function ProjectVolumeCoverageChart({
  projectStats,
  title = 'Test Volume & Coverage Density per Project',
  onOpenGuide,
}: ProjectVolumeCoverageChartProps) {
  const maxLen = projectStats.reduce((max, p) => Math.max(max, p.name.length), 0);
  const yAxisWidth = Math.max(80, Math.min(240, maxLen * 8 + 24));

  const data: ChartDataItem[] = projectStats.map((p) => {
    const executed = p.total - p.skipped;
    const coverageDensity = p.total > 0 ? Math.round((executed / p.total) * 100) : 0;
    return {
      name: p.name,
      Executed: executed,
      Skipped: p.skipped,
      'Coverage Density (%)': coverageDensity,
      total: p.total,
    };
  });

  const chartHeight = Math.max(300, projectStats.length * 40 + 80);

  return (
    <div className="rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-semibold text-text-ink dark:text-text-on-primary">{title}</h3>
          <LearnMoreButton onClick={onOpenGuide} />
        </div>
        <p className="text-xs text-text-body-mid dark:text-text-muted mt-0.5">
          Executed vs skipped test load and active test coverage density across projects
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
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            barSize={18}
            barGap={4}
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
              dataKey="Executed"
              stackId="a"
              fill="var(--color-success-500)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Skipped"
              stackId="a"
              fill="var(--color-border-chart)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
