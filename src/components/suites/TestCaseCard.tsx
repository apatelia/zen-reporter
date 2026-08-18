import { useState } from 'react';
import type { TestCase } from '@/lib/types';
import { getTagColor } from '@/lib/tagColors';
import TestCaseDetail from './TestCaseDetail';

interface Props {
  testCase: TestCase;
}

const statusConfig = {
  passed: {
    bg: 'bg-surface-50 dark:bg-surface-100',
    text: 'text-success-600 dark:text-success-500',
    dot: 'bg-success-500',
    ring: 'ring-success-100 dark:ring-success-500/20',
    border: 'border-success-200 dark:border-success-900/50',
  },
  failed: {
    bg: 'bg-surface-50 dark:bg-surface-100',
    text: 'text-danger-600 dark:text-danger-500',
    dot: 'bg-danger-500',
    ring: 'ring-danger-100 dark:ring-danger-500/20',
    border: 'border-danger-200 dark:border-danger-900/50',
  },
  skipped: {
    bg: 'bg-surface-50 dark:bg-surface-100',
    text: 'text-text-muted dark:text-text-muted',
    dot: 'bg-text-muted',
    ring: 'ring-surface-200 dark:ring-surface-200',
    border: 'border-slate-300 dark:border-slate-600',
  },
  timedOut: {
    bg: 'bg-surface-50 dark:bg-surface-100',
    text: 'text-warning-600 dark:text-warning-500',
    dot: 'bg-warning-500',
    ring: 'ring-warning-100 dark:ring-warning-500/20',
    border: 'border-warning-200 dark:border-warning-900/50',
  },
};

export default function TestCaseCard({ testCase }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[testCase.status];

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const statusIcons = {
    passed: (
      <svg
        className="h-3 w-3 text-text-on-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg
        className="h-3 w-3 text-text-on-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    skipped: (
      <svg
        className="h-3 w-3 text-text-on-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    ),
    timedOut: (
      <svg
        className="h-3 w-3 text-text-on-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
  };

  return (
    <div
      data-test-card="true"
      className={`rounded-md border ${config.border} ${config.bg} transition-all duration-200 hover:shadow-sm dark:hover:bg-surface-200/30`}
    >
      <div className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left side */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Status indicator */}
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${config.dot}`}
            >
              {statusIcons[testCase.status]}
            </span>

            {/* Test name */}
            <span className="text-sm font-medium text-text-ink dark:text-text-on-primary truncate">
              {testCase.title}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${config.text} ${testCase.status === 'passed' ? 'bg-success-50 dark:bg-success-500/10' : testCase.status === 'failed' ? 'bg-danger-50 dark:bg-danger-500/10' : testCase.status === 'timedOut' ? 'bg-warning-50 dark:bg-warning-500/10' : 'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600'}`}
            >
              {testCase.status.charAt(0).toUpperCase() + testCase.status.slice(1)}
            </span>
            <span className="text-xs font-medium text-text-body-mid dark:text-text-muted tabular-nums">
              {formatDuration(testCase.duration)}
            </span>
            <button
              className="rounded p-1 text-text-body-mid hover:bg-surface-100 dark:hover:bg-surface-200 hover:text-text-ink dark:hover:text-text-on-primary transition-colors"
              title={isExpanded ? 'Hide details' : 'Show details'}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <svg
                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tags row */}
        {testCase.tags && testCase.tags.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 pb-2 flex-wrap">
            {testCase.tags.map((tag) => {
              const color = getTagColor(tag);
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center rounded-full ${color.bg} ring-1 ${color.ring} px-2 py-0.5 text-[11px] font-semibold ${color.text}`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden Detail Section */}
      {isExpanded && (
        <div className="border-t border-border-default">
          <div className="px-3 py-3">
            <TestCaseDetail testCase={testCase} />
          </div>
        </div>
      )}
    </div>
  );
}
