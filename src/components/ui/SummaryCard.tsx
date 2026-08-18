import type { ReactNode } from "react";

interface Props {
  label: string;
  value: number;
  total?: number;
  icon?: ReactNode;
  color: "success" | "danger" | "warning" | "info";
}

const bgMap = {
  success:
    "bg-success-50 border-success-200/50 dark:bg-success-50/20 dark:border-success-800/40",
  danger:
    "bg-danger-50 border-danger-200/50 dark:bg-danger-50/20 dark:border-danger-800/40",
  warning:
    "bg-warning-50 border-warning-200/50 dark:bg-warning-50/20 dark:border-warning-800/40",
  info: "bg-info-50 border-info-200/50 dark:bg-info-50/20 dark:border-info-800/40",
};

const textMap = {
  success: "text-success-600 dark:text-success-500",
  danger: "text-danger-600 dark:text-danger-500",
  warning: "text-warning-600 dark:text-warning-500",
  info: "text-info-600 dark:text-info-500",
};

const progressBgMap = {
  success: "bg-success-500",
  danger: "bg-danger-500",
  warning: "bg-warning-500",
  info: "bg-info-500",
};

export default function SummaryCard({
  label,
  value,
  total,
  icon,
  color,
}: Props) {
  return (
    <div className={`rounded-md p-6 shadow-sm border ${bgMap[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-semibold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            {label}
          </p>
          <p className={`mt-2 text-4xl font-extrabold ${textMap[color]}`}>
            {value}
          </p>
        </div>
        {icon && <div className={textMap[color]}>{icon}</div>}
      </div>
      {total !== undefined && (
        <div className="mt-5">
          <div className="h-1.5 w-full rounded-[50px] bg-border-default dark:bg-surface-200">
            <div
              className={`h-1.5 rounded-[50px] ${progressBgMap[color]}`}
              style={{ width: `${(value / total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] font-medium text-text-body-mid dark:text-text-muted">
            {Math.round((value / total) * 100)}% of total
          </p>
        </div>
      )}
    </div>
  );
}
