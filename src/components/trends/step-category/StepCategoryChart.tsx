import { STEP_CATEGORIES } from '@/lib/stepCategoryClassifier';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import { parseTrendDateParts, renderTrendTick } from '../TrendTick';

export interface StepCategoryChartPoint {
  name: string;
  started_at?: string;
  run_total?: number;
  hasStepData?: boolean;
  [categoryLabel: string]: string | number | boolean | undefined;
}

export interface StepCategoryChartProps {
  chartData: StepCategoryChartPoint[];
  viewMode: 'percent' | 'count';
}

const renderCategoryTooltip = (props: TooltipContentProps, viewMode: 'percent' | 'count') => {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;

  const dataItem = payload[0]?.payload as StepCategoryChartPoint | undefined;
  const hasStepData = dataItem?.hasStepData !== false;

  const valStr = String(label);
  const dateParts = parseTrendDateParts(valStr);
  let dateLine = valStr;
  let timeLine = '';

  if (dateParts) {
    dateLine = dateParts[0] || valStr;
    timeLine = dateParts[1] || '';
  }

  return (
    <div className="p-2.5 text-text-ink dark:text-text-on-primary">
      <div className="font-bold text-xs">{dateLine}</div>
      {timeLine && (
        <div className="text-[11px] text-text-body-mid dark:text-text-muted mb-1.5">{timeLine}</div>
      )}
      {!hasStepData ? (
        <div className="text-xs italic text-text-body-mid dark:text-text-muted py-1">
          No step category data recorded for this run
        </div>
      ) : (
        <div className="space-y-1 text-xs">
          {payload.map((entry) => {
            const val = Number(entry.value);
            const formattedVal = viewMode === 'percent' ? `${val}%` : `${val} steps`;
            const catConfig = STEP_CATEGORIES.find((c) => c.label === entry.name);
            const color = catConfig ? catConfig.color : entry.color;
            return (
              <div
                key={String(entry.name)}
                className="flex items-center justify-between gap-4 font-medium"
              >
                <span className="flex items-center gap-1.5 text-text-ink dark:text-text-on-primary">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {entry.name}:
                </span>
                <span className="font-bold tabular-nums text-text-ink dark:text-text-on-primary">
                  {formattedVal}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export function StepCategoryChart({ chartData, viewMode }: StepCategoryChartProps) {
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set());

  const handleLegendClick = (dataKey: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        // Don't allow hiding all categories
        if (next.size < STEP_CATEGORIES.length - 1) {
          next.add(dataKey);
        }
      }
      return next;
    });
  };

  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--color-border-chart, #e5e7eb)"
          />
          <XAxis
            dataKey="name"
            tick={renderTrendTick}
            axisLine={{ stroke: 'var(--color-border-chart, #e5e7eb)' }}
            tickLine={false}
            interval={0}
            height={45}
          />
          <YAxis
            domain={viewMode === 'percent' ? [0, 100] : [0, 'auto']}
            tickFormatter={(val) => (viewMode === 'percent' ? `${val}%` : `${val}`)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--color-text-body-mid)', fontSize: 11 }}
          />
          <Tooltip
            content={(props) => renderCategoryTooltip(props, viewMode)}
            wrapperStyle={{
              backgroundColor: 'var(--color-surface-100)',
              border: '1px solid var(--color-border-default)',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              outline: 'none',
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
            onClick={(e) => {
              if (e && e.dataKey) {
                handleLegendClick(String(e.dataKey));
              }
            }}
            formatter={(value) => {
              const isHidden = hiddenCategories.has(value);
              return (
                <span
                  className={`font-medium font-sans cursor-pointer transition-opacity select-none ${
                    isHidden
                      ? 'line-through text-text-body-mid/40 dark:text-text-muted/40'
                      : 'text-text-body-mid dark:text-text-muted hover:text-text-ink dark:hover:text-text-on-primary'
                  }`}
                  title={isHidden ? `Show ${value}` : `Hide ${value}`}
                >
                  {value}
                </span>
              );
            }}
          />
          {STEP_CATEGORIES.map((cat) => (
            <Bar
              key={cat.key}
              dataKey={cat.label}
              stackId="a"
              fill={cat.color}
              stroke={cat.borderColor}
              strokeWidth={0.5}
              hide={hiddenCategories.has(cat.label)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
