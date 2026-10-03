import type { ReactNode } from 'react';
import { SUMMARY_CARD_THEME, type SummaryCardColor } from '@/lib/theme';

export interface SummaryCardProps {
  label: string;
  value: number;
  total?: number;
  icon?: ReactNode;
  color: SummaryCardColor;
}

export default function SummaryCard({ label, value, total, icon, color }: SummaryCardProps) {
  const theme = SUMMARY_CARD_THEME[color];

  return (
    <div className={`rounded-md p-4 shadow-sm border ${theme.bg}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {label}
          </p>
          <p className={`mt-1 text-3xl font-extrabold ${theme.text}`}>{value}</p>
        </div>
        {icon && <div className={theme.text}>{icon}</div>}
      </div>
      {total !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 w-full rounded-[50px] bg-border-default dark:bg-surface-200">
            <div
              className={`h-1.5 rounded-[50px] ${theme.progressBg}`}
              style={{ width: `${(value / total) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-medium text-text-body-mid dark:text-text-muted">
            {Math.round((value / total) * 100)}% of total
          </p>
        </div>
      )}
    </div>
  );
}
