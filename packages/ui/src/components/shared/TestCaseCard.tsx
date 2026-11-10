import { useState, useCallback } from 'react';
import type { TestCase, TestStep, TestError, Attachment } from '@arpanp/zen-core';
import { getTagColor, isFlakyTest } from '@arpanp/zen-core';
import TestCaseDetail from './TestCaseDetail';

export interface TestCaseCardProps {
  testCase: TestCase;
  showSteps?: boolean;
  runId?: string;
}

const statusConfig = {
  passed: {
    bg: 'bg-surface-50 dark:bg-surface-50',
    text: 'text-success-600 dark:text-success-500',
    dot: 'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400 dark:ring-1 dark:ring-success-500/30',
    ring: 'ring-success-100 dark:ring-success-500/20',
  },
  flaky: {
    bg: 'bg-surface-50 dark:bg-surface-50',
    text: 'text-warning-600 dark:text-warning-500',
    dot: 'bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400 dark:ring-1 dark:ring-warning-500/30',
    ring: 'ring-warning-100 dark:ring-warning-500/20',
  },
  failed: {
    bg: 'bg-surface-50 dark:bg-surface-50',
    text: 'text-danger-600 dark:text-danger-500',
    dot: 'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
    ring: 'ring-danger-100 dark:ring-danger-500/20',
  },
  skipped: {
    bg: 'bg-surface-50 dark:bg-surface-50',
    text: 'text-text-muted dark:text-text-muted',
    dot: 'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-1 dark:ring-slate-600',
    ring: 'ring-surface-200 dark:ring-surface-200',
  },
  timedOut: {
    bg: 'bg-surface-50 dark:bg-surface-50',
    text: 'text-warning-600 dark:text-warning-500',
    dot: 'bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400 dark:ring-1 dark:ring-warning-500/30',
    ring: 'ring-warning-100 dark:ring-warning-500/20',
  },
  interrupted: {
    bg: 'bg-surface-50 dark:bg-surface-50',
    text: 'text-danger-600 dark:text-danger-500',
    dot: 'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
    ring: 'ring-danger-100 dark:ring-danger-500/20',
  },
};

export default function TestCaseCard({ testCase, showSteps, runId }: TestCaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailedCase, setDetailedCase] = useState<TestCase>(testCase);
  const isFlaky = isFlakyTest(testCase);
  const effectiveStatus = isFlaky ? 'flaky' : testCase.status;
  const config = statusConfig[effectiveStatus];

  const handleToggle = useCallback(async () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    // If expanding and detailed steps/errors/attachments are empty, check if we need to fetch on demand
    const hasDetailsAlready =
      (detailedCase.steps && detailedCase.steps.length > 0) ||
      (detailedCase.errors && detailedCase.errors.length > 0) ||
      (detailedCase.stdout && detailedCase.stdout.length > 0) ||
      (detailedCase.attachments && detailedCase.attachments.length > 0);

    if (nextExpanded && !hasDetailsAlready && typeof window !== 'undefined') {
      const activeRunId =
        runId || new URLSearchParams(window.location.search).get('runId') || 'latest';
      const testIdentifier = encodeURIComponent(
        `${activeRunId}::${detailedCase.fileName}::${detailedCase.title}`
      );

      setIsLoadingDetails(true);
      try {
        // Try server endpoint /api/v1/runs/:runId/tests/:testId or dev /api/tests/:runId/:testId
        const endpoint = `/api/v1/runs/${encodeURIComponent(activeRunId)}/tests/${testIdentifier}`;
        const devEndpoint = `/api/tests/${encodeURIComponent(activeRunId)}/${encodeURIComponent(detailedCase.title)}`;

        let resp = await fetch(endpoint).catch(() => null);
        if (!resp || !resp.ok) {
          resp = await fetch(devEndpoint).catch(() => null);
        }

        if (resp && resp.ok) {
          const data = await resp.json();
          setDetailedCase((prev) => {
            const steps: TestStep[] = data.details?.stepsJson || data.steps || prev.steps || [];
            const errors: TestError[] = data.details?.errorStack
              ? [
                  {
                    name: 'Error',
                    message: data.errorMessage || '',
                    stack: data.details.errorStack,
                    location: data.errorLine
                      ? { file: data.errorFile || '', line: data.errorLine, column: 0 }
                      : null,
                    snippet: '',
                    cause: null,
                  },
                ]
              : data.errors || prev.errors || [];
            const stdout: string[] = data.details?.stdoutJson || data.stdout || prev.stdout || [];
            const stderr: string[] = data.details?.stderrJson || data.stderr || prev.stderr || [];
            const rawAttachments = (data.attachments || []) as Array<{
              name: string;
              contentType?: string;
              content_type?: string;
              url?: string;
              s3Url?: string;
              file_path?: string;
              path?: string;
              bodyText?: string;
              body_text?: string;
              body?: string;
            }>;
            const mappedAttachments: Attachment[] = rawAttachments.map((a) => ({
              name: a.name,
              contentType: a.contentType || a.content_type || 'application/octet-stream',
              path: a.url || a.s3Url || a.file_path || a.path || null,
              body: a.bodyText || a.body_text || a.body || null,
            }));

            return {
              ...prev,
              steps,
              errors,
              stdout,
              stderr,
              attachments: mappedAttachments.length > 0 ? mappedAttachments : prev.attachments,
              failedAttempts: data.failedAttempts || prev.failedAttempts,
              attempts: data.attempts ?? prev.attempts,
            };
          });
        }
      } catch {
        /* fallback to existing static case data */
      } finally {
        setIsLoadingDetails(false);
      }
    }
  }, [isExpanded, detailedCase, runId]);

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const statusIcons = {
    passed: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    skipped: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    ),
    timedOut: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
      </svg>
    ),
    interrupted: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
        />
      </svg>
    ),
    flaky: (
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  };

  return (
    <div
      data-test-card="true"
      className={`rounded-md shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${config.bg} transition-all duration-200 hover:shadow-md`}
    >
      <div
        className="cursor-pointer hover:bg-surface-100/50 dark:hover:bg-surface-200/30 rounded-md transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between px-3 py-2">
          {/* Left side */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Status indicator */}
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${config.dot}`}
            >
              {statusIcons[effectiveStatus]}
            </span>

            {/* Test name */}
            <span className="text-sm font-medium text-text-ink dark:text-text-on-primary truncate">
              {testCase.title}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${config.text} ${effectiveStatus === 'passed' ? 'bg-success-50 dark:bg-success-500/10' : effectiveStatus === 'flaky' ? 'bg-warning-50 dark:bg-warning-500/10' : effectiveStatus === 'failed' || effectiveStatus === 'interrupted' ? 'bg-danger-50 dark:bg-danger-500/10' : effectiveStatus === 'timedOut' ? 'bg-warning-50 dark:bg-warning-500/10' : 'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600'}`}
            >
              {effectiveStatus === 'timedOut'
                ? 'Timed Out'
                : effectiveStatus === 'interrupted'
                  ? 'Interrupted'
                  : effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
            </span>
            {testCase.attempts && testCase.attempts > 1 && (
              <span
                className="hidden sm:inline-flex items-center rounded-full bg-surface-200/80 text-text-body-mid ring-1 ring-border-default px-2 py-0.5 text-xs font-semibold dark:bg-surface-200/50 dark:text-text-muted dark:ring-surface-200"
                title={`Retried ${testCase.attempts - 1} time${testCase.attempts - 1 === 1 ? '' : 's'}`}
              >
                {testCase.attempts - 1} {testCase.attempts - 1 === 1 ? 'Retry' : 'Retries'}
              </span>
            )}
            <span className="text-xs font-medium text-text-body-mid dark:text-text-muted tabular-nums">
              {formatDuration(
                testCase.steps && testCase.steps.length > 0
                  ? testCase.steps.reduce((acc, step) => acc + (step.duration || 0), 0)
                  : testCase.duration
              )}
            </span>
            <button
              className="rounded p-1 text-text-body-mid hover:bg-surface-100 dark:hover:bg-surface-200 hover:text-text-ink dark:hover:text-text-on-primary transition-colors flex items-center justify-center"
              title={isExpanded ? 'Hide details' : 'Show details'}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {isLoadingDetails ? (
                <svg
                  className="h-4 w-4 animate-spin text-text-body-mid"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
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
            <TestCaseDetail testCase={detailedCase} showSteps={showSteps} />
          </div>
        </div>
      )}
    </div>
  );
}
