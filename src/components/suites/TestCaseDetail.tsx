import { useState } from 'react';
import type { Attachment, TestCase, TestError, TestStep } from '@/lib/types';
import {
  formatDurationVerbose,
  parseAnsiToHtml,
  highlightExpectedReceived,
  getStepCodeSnippet,
  highlightCodeSnippet,
} from '@/lib/utils';

interface Props {
  testCase: TestCase;
  showSteps?: boolean;
}

/**
 * Normalized view of a single test attempt. Earlier (failed) attempts are
 * recorded by the reporter with their own steps/output/attachments; the
 * final attempt is derived from the TestCase model itself.
 */
interface AttemptView {
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  error: TestError | null;
  steps?: TestStep[];
  stdout?: string[];
  stderr?: string[];
  attachments?: Attachment[];
}

const statusConfig = {
  passed: {
    bg: 'bg-success-100 text-success-700 ring-1 ring-success-200 dark:bg-success-500/20 dark:text-success-400 dark:ring-1 dark:ring-success-500/30',
    text: 'text-success-600 dark:text-success-400',
    dot: 'bg-success-500',
  },
  failed: {
    bg: 'bg-danger-100 text-danger-700 ring-1 ring-danger-200 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
    text: 'text-danger-600 dark:text-danger-400',
    dot: 'bg-danger-500',
  },
  skipped: {
    bg: 'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-1 dark:ring-slate-600',
    text: 'text-text-muted dark:text-text-muted',
    dot: 'bg-surface-300',
  },
  timedOut: {
    bg: 'bg-warning-100 text-warning-700 ring-1 ring-warning-200 dark:bg-warning-500/20 dark:text-warning-400 dark:ring-1 dark:ring-warning-500/30',
    text: 'text-warning-600 dark:text-warning-400',
    dot: 'bg-warning-500',
  },
  interrupted: {
    bg: 'bg-danger-100 text-danger-700 ring-1 ring-danger-200 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
    text: 'text-danger-600 dark:text-danger-400',
    dot: 'bg-danger-500',
  },
};

/** Collect top-level and step-level attachments for a single attempt, deduplicated. */
function collectAttemptAttachments(attempt: AttemptView): Attachment[] {
  const rawList: Attachment[] = [...(attempt.attachments || [])];
  const collectFromSteps = (steps?: TestStep[]) => {
    if (!steps) return;
    for (const step of steps) {
      if (step.attachments && step.attachments.length > 0) {
        rawList.push(...step.attachments);
      }
      if (step.subSteps && step.subSteps.length > 0) {
        collectFromSteps(step.subSteps);
      }
    }
  };
  collectFromSteps(attempt.steps);

  // Deduplicate by combination of name, path, and contentType
  const seen = new Set<string>();
  const deduplicated: Attachment[] = [];
  for (const att of rawList) {
    const key = `${att.name || ''}_${att.path || ''}_${att.contentType || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(att);
    }
  }
  return deduplicated;
}

/** Calculate total duration of an attempt, summing step durations if steps are present. */
function getAttemptDuration(attempt: AttemptView): number {
  if (attempt.steps && attempt.steps.length > 0) {
    const stepSum = attempt.steps.reduce((acc, step) => acc + (step.duration || 0), 0);
    if (stepSum > 0) return stepSum;
  }
  return attempt.duration;
}

interface StepItemProps {
  step: TestStep;
  idx: number;
}

function StepItem({ step, idx }: StepItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const snippetContent = step.snippet || getStepCodeSnippet(step.location);

  return (
    <div className="rounded-md border border-border-default bg-canvas p-2.5 text-sm shadow-xs transition-all">
      <div
        className="flex items-center justify-between gap-2.5 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${statusConfig[step.status].bg} text-xs font-bold`}
          >
            {idx + 1}
          </span>
          <p className={`font-medium text-sm truncate ${statusConfig[step.status].text}`}>
            {step.title}
          </p>
          {step.params && Object.keys(step.params).length > 0 && (
            <span className="text-xs text-text-body-mid dark:text-text-muted truncate font-normal">
              {Object.values(step.params)
                .map((val) => (typeof val === 'object' ? JSON.stringify(val) : String(val)))
                .join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-body-mid dark:text-text-muted tabular-nums font-medium">
            {step.duration}ms
          </span>
          <button
            type="button"
            className="rounded p-0.5 text-text-body-mid hover:bg-surface-100 dark:hover:bg-surface-200/50 hover:text-text-ink dark:text-text-muted dark:hover:text-text-on-primary transition-colors"
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

      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-border-default/60 dark:border-border-default/40">
          {/* Step Code Snippet with Syntax Highlighting */}
          {snippetContent ? (
            <div className="mt-1 mb-1.5">
              <div
                className="rounded-md bg-surface-100 dark:bg-surface-950 text-text-ink dark:text-surface-900 p-2.5 border border-border-default dark:border-border-subtle overflow-x-auto shadow-xs"
                /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                dangerouslySetInnerHTML={{
                  __html: highlightCodeSnippet(snippetContent),
                }}
              />
            </div>
          ) : (
            (!step.subSteps || step.subSteps.length === 0) &&
            (!step.annotations || step.annotations.length === 0) && (
              <div className="mt-1 mb-1.5 px-2.5 py-2 text-xs italic text-text-body-mid/70 dark:text-text-muted/60 bg-surface-100/50 dark:bg-surface-200/20 rounded border border-dashed border-border-default/60 dark:border-border-default/40">
                No code snippet available for this step.
              </div>
            )
          )}

          {/* Step Annotations */}
          {step.annotations && step.annotations.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {step.annotations.map((anno, aIdx) => (
                <span
                  key={`${anno.type}-${anno.description || aIdx}`}
                  className="inline-flex items-center rounded bg-surface-100 dark:bg-surface-200/30 px-2 py-0.5 text-[11px] text-text-body-mid"
                >
                  <span className="font-semibold mr-1">{anno.type}:</span>
                  {anno.description || 'N/A'}
                </span>
              ))}
            </div>
          )}

          {/* Step Sub-steps */}
          {step.subSteps && step.subSteps.length > 0 && (
            <div className="mt-1.5 ml-2 border-l-2 border-border-default dark:border-border-default pl-2 space-y-2">
              {step.subSteps.map((sub) => {
                const subSnippet = sub.snippet || getStepCodeSnippet(sub.location);
                return (
                  <div key={`${sub.title}-${sub.duration}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-text-body-mid dark:text-text-muted font-medium">
                        ↳ {sub.title}
                      </p>
                      <span className="text-[11px] text-text-body-mid/70 dark:text-text-muted/70 tabular-nums font-medium">
                        {sub.duration}ms
                      </span>
                    </div>
                    {subSnippet && (
                      <div className="mt-1 ml-3">
                        <div
                          className="rounded-md bg-surface-100 dark:bg-surface-950 text-text-ink dark:text-surface-900 p-2 border border-border-default dark:border-border-subtle overflow-x-auto shadow-xs"
                          /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                          dangerouslySetInnerHTML={{
                            __html: highlightCodeSnippet(subSnippet),
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestCaseDetail({ testCase, showSteps = true }: Props) {
  // Build one view per attempt. If the test ultimately failed/timed out, its
  // final failure is already the last entry of `failedAttempts`; otherwise
  // the final attempt is derived from the TestCase model.
  const finalAttempt: AttemptView = {
    status: testCase.status,
    duration:
      testCase.steps && testCase.steps.length > 0
        ? testCase.steps.reduce((acc, step) => acc + (step.duration || 0), 0)
        : testCase.duration,
    error: testCase.errors && testCase.errors.length > 0 ? testCase.errors[0] : null,
    steps: testCase.steps,
    stdout: testCase.stdout,
    stderr: testCase.stderr,
    attachments: testCase.attachments,
  };
  const failedAttempts = testCase.failedAttempts || [];
  const attempts: AttemptView[] =
    testCase.status === 'failed' ||
    testCase.status === 'timedOut' ||
    testCase.status === 'interrupted'
      ? failedAttempts.length > 0
        ? failedAttempts
        : [finalAttempt]
      : [...failedAttempts, finalAttempt];

  const hasAttemptTabs = attempts.length > 1;
  // Default to the final attempt (last tab).
  const [activeAttemptIdx, setActiveAttemptIdx] = useState(attempts.length - 1);
  const activeAttempt = attempts[Math.max(0, Math.min(activeAttemptIdx, attempts.length - 1))];

  const [activeAttachment, setActiveAttachment] = useState<{
    name: string;
    url: string;
    type: 'image' | 'text';
    contentType?: string;
    content?: string;
  } | null>(null);

  // Collect annotations from test case (per-test, not per-attempt)
  const caseAnnotations = testCase.annotations || [];
  const validAnnotations = caseAnnotations.filter(
    (anno) => anno.description && anno.description.trim().length > 0
  );

  // Helper to determine image URL / preview suitability
  const getAttachmentUrl = (att: Attachment): string | null => {
    if (att.body) {
      const bodyStr =
        typeof att.body === 'string' ? att.body : Buffer.from(att.body).toString('base64');
      if (bodyStr.startsWith('data:')) {
        return bodyStr;
      }
      const mime = att.contentType || 'image/png';
      return `data:${mime};base64,${bodyStr}`;
    }
    if (att.path) {
      return att.path;
    }
    return null;
  };

  const isImageAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('image/')) ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || att.path || '')
    );
  };

  const isTextAttachment = (att: Attachment): boolean => {
    return (
      (att.contentType && att.contentType.startsWith('text/')) ||
      /\.(txt|log|json|csv|html|xml|md|yaml|yml|js|ts|jsx|tsx|css)$/i.test(
        att.name || att.path || ''
      )
    );
  };

  const getTextContent = (att: Attachment): string => {
    if (att.body) {
      if (typeof att.body === 'string') {
        // If it's a base64 string or plain string
        try {
          return atob(att.body);
        } catch {
          return att.body;
        }
      }
      return Buffer.from(att.body).toString('utf-8');
    }
    return '';
  };

  const statusLabel = (status: AttemptView['status']): string =>
    status === 'timedOut'
      ? 'Timed Out'
      : status === 'interrupted'
        ? 'Interrupted'
        : status.charAt(0).toUpperCase() + status.slice(1);

  // Renders the detail sections for a single attempt (steps, failures,
  // attachments, stdout/stderr). Used for both the single-attempt case and
  // the per-attempt tabs.
  const renderAttemptSections = (attempt: AttemptView) => {
    const attachments = collectAttemptAttachments(attempt);

    return (
      <>
        {/* Execution Steps */}
        {showSteps && attempt.steps && attempt.steps.length > 0 && (
          <div className="mb-4">
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              Execution Steps
            </h5>
            <div className="space-y-1">
              {attempt.steps.map((step, idx) => (
                <StepItem key={`${step.title}-${step.duration}`} step={step} idx={idx} />
              ))}
            </div>
          </div>
        )}

        {/* Direct Errors */}
        {attempt.error && (
          <div className="mb-4">
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              Test Failures
            </h5>
            <div className="space-y-2">
              <div className="rounded-md border border-danger-200 dark:border-danger-900/50 bg-canvas overflow-hidden shadow-xs">
                <div className="flex items-center justify-between border-b border-danger-200 dark:border-danger-900/50 bg-danger-50 dark:bg-danger-500/10 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 text-danger-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="text-sm font-bold text-danger-600 dark:text-danger-500">
                      {attempt.error.name}
                    </span>
                  </div>
                  {attempt.error.location && (
                    <span className="text-xs font-mono text-text-body-mid dark:text-text-muted">
                      {attempt.error.location.file}:{attempt.error.location.line}:
                      {attempt.error.location.column}
                    </span>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm text-danger-600 dark:text-danger-500 font-medium">
                    {attempt.error.message}
                  </p>

                  {attempt.error.cause && (
                    <div className="mt-2 rounded-md bg-danger-500/10 p-2 text-xs border border-danger-500/20">
                      <span className="font-bold text-danger-600 dark:text-danger-400">
                        Cause:{' '}
                      </span>
                      <span className="text-text-body-mid dark:text-text-muted">
                        {typeof attempt.error.cause === 'object'
                          ? JSON.stringify(attempt.error.cause)
                          : String(attempt.error.cause)}
                      </span>
                    </div>
                  )}

                  {attempt.error.snippet && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-text-body-mid dark:text-text-muted mb-1">
                        Code Snippet:
                      </p>
                      <pre
                        className="rounded-md bg-surface-950 p-2.5 text-xs font-mono leading-relaxed text-canvas dark:text-surface-900 border border-border-default dark:border-border-subtle overflow-x-auto"
                        /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                        dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(attempt.error.snippet) }}
                      />
                    </div>
                  )}

                  {attempt.error.stack && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-text-body-mid dark:text-text-muted mb-1">
                        Stack Trace:
                      </p>
                      <pre
                        className="rounded-md bg-surface-950 p-3 text-xs font-mono leading-relaxed text-canvas dark:text-surface-900 border border-border-default dark:border-border-subtle overflow-x-auto"
                        /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                        dangerouslySetInnerHTML={{
                          __html: highlightExpectedReceived(attempt.error.stack),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {attachments.length > 0 && (
          <div className="mb-4">
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              Attachments
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachments.map((att, idx) => {
                const url = getAttachmentUrl(att);
                const isImg = isImageAttachment(att);
                const isTxt = isTextAttachment(att);

                if (isImg && url) {
                  return (
                    <div
                      key={`img-${att.name || att.path || idx}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-canvas p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveAttachment({
                            name: att.name || 'Image Attachment',
                            url,
                            type: 'image',
                          })
                        }
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            {att.name || 'Screenshot'}
                          </p>
                          <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                            Click to preview image
                          </p>
                        </div>
                      </button>
                      <a
                        href={url}
                        download={att.name || 'screenshot'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1.5 text-text-body-mid dark:text-text-muted hover:bg-surface-200 dark:hover:bg-surface-200/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                        title="Download image"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </a>
                    </div>
                  );
                }

                if (isTxt) {
                  const textContent = getTextContent(att);
                  const mime = att.contentType || 'text/plain';
                  const base64 =
                    typeof att.body === 'string'
                      ? att.body
                      : att.body
                        ? Buffer.from(att.body).toString('base64')
                        : Buffer.from(textContent).toString('base64');
                  const downloadHref = url && url !== '#' ? url : `data:${mime};base64,${base64}`;

                  return (
                    <div
                      key={`txt-${att.name || att.path || idx}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-canvas p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveAttachment({
                            name: att.name || 'Text Attachment',
                            url: downloadHref,
                            type: 'text',
                            contentType: mime,
                            content: textContent,
                          })
                        }
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            {att.name || 'Text Attachment'}
                          </p>
                          <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                            Click to preview text
                          </p>
                        </div>
                      </button>
                      <a
                        href={downloadHref}
                        download={att.name || 'attachment.txt'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1.5 text-text-body-mid dark:text-text-muted hover:bg-surface-200 dark:hover:bg-surface-200/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shrink-0"
                        title="Download text file"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </a>
                    </div>
                  );
                }

                const isZip =
                  att.name?.endsWith('.zip') ||
                  att.contentType === 'application/zip' ||
                  att.contentType === 'application/x-zip-compressed';

                return (
                  <a
                    key={`att-${att.name || att.path || idx}`}
                    href={url || '#'}
                    download={att.name || 'attachment'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-md border border-border-default bg-canvas p-2.5 text-sm hover:border-primary-500 transition-colors shadow-xs group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-500/10 text-warning-600 dark:text-warning-500 shrink-0">
                      {isZip ? (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs text-text-ink dark:text-text-on-primary truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {att.name || 'Attachment'}
                      </p>
                      <p className="text-[11px] text-text-body-mid dark:text-text-muted">
                        Click to download
                      </p>
                    </div>
                    <svg
                      className="h-4 w-4 text-text-body-mid group-hover:text-primary-600 dark:text-text-muted group-hover:text-primary-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Standard Output (stdout) */}
        {attempt.stdout && attempt.stdout.length > 0 && (
          <div className="mb-4">
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
              Standard Output (stdout)
            </h5>
            <pre className="rounded-md bg-surface-950 p-3 text-xs font-mono leading-relaxed text-canvas dark:text-surface-900 border border-border-default dark:border-border-subtle overflow-x-auto">
              {attempt.stdout.join('\n')}
            </pre>
          </div>
        )}

        {/* Standard Error (stderr) */}
        {attempt.stderr && attempt.stderr.length > 0 && (
          <div className="mb-4">
            <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-danger-500">
              Standard Error (stderr)
            </h5>
            <pre className="rounded-md bg-danger-50 dark:bg-surface-950 p-3 text-xs font-mono leading-relaxed text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-900/50 overflow-x-auto">
              {attempt.stderr.join('\n')}
            </pre>
          </div>
        )}

        {/* No details */}
        {!attempt.steps &&
          !attempt.error &&
          attachments.length === 0 &&
          (!attempt.stdout || attempt.stdout.length === 0) &&
          (!attempt.stderr || attempt.stderr.length === 0) && (
            <p className="text-sm text-text-body-mid dark:text-text-muted italic">
              {hasAttemptTabs
                ? 'No detailed steps or errors recorded for this attempt.'
                : 'No detailed steps or errors recorded.'}
            </p>
          )}
      </>
    );
  };

  return (
    <>
      {/* Test Case Annotations Description */}
      {validAnnotations.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Annotations & Description
          </h5>
          <div className="space-y-2">
            {validAnnotations.map((anno, idx) => (
              <div
                key={`valid-anno-${anno.type}-${anno.description || idx}`}
                className="rounded-md border border-border-default bg-canvas p-3 text-sm shadow-xs"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded bg-surface-200 dark:bg-surface-200/50 px-2 py-0.5 text-xs font-semibold text-text-body-mid">
                    {anno.type}
                  </span>
                </div>
                <p className="text-text-ink dark:text-text-on-primary text-sm font-medium">
                  {anno.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attempt Tabs — one tab per attempt, final attempt shown by default */}
      {hasAttemptTabs && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {attempts.map((attempt, idx) => {
              const isActive = idx === activeAttemptIdx;
              const tabTitle = idx === 0 ? 'Run' : `Retry #${idx}`;
              return (
                <button
                  key={`attempt-tab-${attempt.status}-${attempt.duration}`}
                  type="button"
                  onClick={() => {
                    setActiveAttemptIdx(idx);
                    setActiveAttachment(null);
                  }}
                  title={idx === 0 ? 'Original run details' : `Retry #${idx} details`}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-primary-500 bg-canvas text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/50'
                      : 'border-border-default bg-canvas text-text-body-mid hover:bg-surface-100 dark:text-text-muted dark:hover:bg-surface-200/30'
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusConfig[attempt.status].dot}`}
                  />
                  {tabTitle}
                  <span className="font-normal text-[11px] text-text-body-mid dark:text-text-muted tabular-nums">
                    {statusLabel(attempt.status)} ·{' '}
                    {formatDurationVerbose(getAttemptDuration(attempt))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {renderAttemptSections(activeAttempt)}

      {/* Attachment Preview Modal */}
      {activeAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setActiveAttachment(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-surface-50 dark:bg-surface-100 p-4 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-default dark:border-border-default/50 pb-3 mb-3 shrink-0">
              <h4 className="text-sm font-semibold text-text-ink dark:text-text-on-primary truncate pr-4">
                {activeAttachment.name}
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={activeAttachment.url}
                  download={activeAttachment.name || 'attachment'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-white bg-[#006241] hover:bg-[#00754a] border border-[#004d33] dark:bg-[#00754a] dark:hover:bg-[#008f5a] dark:border-[#009e64] transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Download file"
                >
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveAttachment(null)}
                  className="rounded-md p-1.5 text-text-body-mid hover:text-danger-600 bg-surface-100 hover:bg-danger-50 dark:bg-surface-200/50 dark:text-text-on-primary dark:hover:bg-danger-500/20 dark:hover:text-danger-400 border border-border-default dark:border-border-default/50 transition-colors"
                  title="Close"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] overflow-auto flex-1 flex justify-center">
              {activeAttachment.type === 'image' ? (
                <img
                  src={activeAttachment.url}
                  alt={activeAttachment.name}
                  className="max-h-[75vh] w-auto object-contain rounded"
                />
              ) : (
                <pre className="w-full max-h-[75vh] overflow-y-auto rounded-md bg-surface-950 p-4 text-xs font-mono leading-relaxed text-canvas dark:text-surface-900 border border-border-default dark:border-border-subtle whitespace-pre-wrap wrap-break-word">
                  {activeAttachment.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
