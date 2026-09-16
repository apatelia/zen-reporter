import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { computeProjectStats, collectAllCases } from '@/lib/utils';
import type { ResultSummary, TestSuite } from '@/lib/types';

const colorMap: Record<string, string> = {
  Passed: 'var(--color-success-500)',
  Failed: 'var(--color-danger-500)',
  Interrupted: 'var(--color-danger-600)',
  Skipped: 'var(--color-text-muted)',
  'Timed Out': 'var(--color-warning-500)',
};

const LegendFormatter = (value: string) => {
  return <span style={{ color: colorMap[value] || 'var(--color-text-muted)' }}>{value}</span>;
};

interface Props {
  summary: ResultSummary;
  suites: TestSuite[];
  title?: string;
}

interface ChartDataItem {
  name: string;
  Passed: number;
  Failed: number;
  Interrupted: number;
  Skipped: number;
  'Timed Out': number;
}

export default function ProjectBarCharts({ summary, suites, title = 'Projects Summary' }: Props) {
  const allCases = collectAllCases(suites);
  const projectStats = computeProjectStats(allCases);

  const data: ChartDataItem[] = projectStats.map((project) => ({
    name: project.name,
    Passed: project.passed,
    Failed: project.failed,
    Interrupted: project.interrupted,
    Skipped: project.skipped,
    'Timed Out': project.timedOut,
  }));

  return (
    <div className="rounded-md bg-canvas border border-border-default px-6 py-6 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-text-ink dark:text-text-on-primary">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          barSize={32}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border-default)"
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
            tick={{ fill: 'var(--color-text-muted)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface-100)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value, name, _item, _index, _payload) => {
              const val = value as number;
              const nm = name as string;
              return [`${val}`, nm];
            }}
          />
          <Legend
            formatter={LegendFormatter}
            iconType="circle"
            wrapperStyle={{
              paddingTop: '8px',
              textAlign: 'center',
              width: '100%',
            }}
          />
          <Bar
            dataKey="Passed"
            stackId="status"
            fill="var(--color-success-500)"
            radius={[0, 4, 4, 0]}
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
            radius={[4, 0, 0, 4]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
