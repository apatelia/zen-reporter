import React from 'react';
import InfoTooltip from '@/components/shared/InfoTooltip';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  description?: string;
  badgeClass?: string;
  valueClassName?: string;
  title?: string;
  subtextTitle?: string;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
}

export default function StatCard({
  label,
  value,
  subtext,
  description,
  badgeClass,
  valueClassName = '',
  title,
  subtextTitle,
  isFirst = false,
  isLast = false,
  className = '',
}: StatCardProps) {
  const valueTitle = title || (typeof value === 'string' ? value : undefined);
  const subTitle = subtextTitle || subtext;

  return (
    <div
      className={`h-full flex flex-col justify-between rounded-md bg-canvas border border-border-default p-4 shadow-xs ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {label}
          </span>
          {description && <InfoTooltip text={description} isFirst={isFirst} isLast={isLast} />}
        </div>
        <p
          className={`mt-2 text-xl font-bold text-text-ink dark:text-text-on-primary truncate ${valueClassName}`}
          title={valueTitle}
        >
          {value}
        </p>
      </div>

      {subtext && (
        <div className="mt-3">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium truncate max-w-full ${badgeClass || ''}`}
            title={subTitle}
          >
            {subtext}
          </span>
        </div>
      )}
    </div>
  );
}
