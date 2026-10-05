import { useState } from 'react';
import type { TestError } from '@/lib/types/report';
import {
  highlightCodeSnippet,
  highlightExpectedReceived,
  sanitizeAnsi,
} from '@/lib/codeHighlighting';
import type { AttemptView } from './AttemptView';

export interface TestErrorAlertProps {
  error: TestError;
  status: AttemptView['status'];
}

export function TestErrorAlert({ error, status }: TestErrorAlertProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = sanitizeAnsi(error.stack || error.message || '');

    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-4">
      <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
        Test Failures
      </h5>
      <div className="space-y-2">
        <div className="rounded-md border border-danger-300/80 dark:border-danger-500/40 bg-white dark:bg-surface-100/40 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between gap-2 border-b border-danger-200 dark:border-danger-500/30 bg-danger-50 dark:bg-danger-500/10 px-3 py-1.5">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <svg
                className="h-3.5 w-3.5 text-danger-500 shrink-0"
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
              <span className="text-sm font-bold text-danger-700 dark:text-danger-400 truncate">
                {error.name}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer shrink-0 shadow-2xs ${
                copied
                  ? 'border-success-400 dark:border-success-500/60 bg-success-500 text-white dark:bg-success-500 dark:text-surface-950 font-bold'
                  : 'border-border-default dark:border-danger-500/40 bg-white dark:bg-danger-500/20 text-text-ink dark:text-text-ink hover:bg-surface-100 dark:hover:bg-danger-500/30 hover:border-accent-blue dark:hover:border-danger-500/60'
              }`}
              title="Copy stack trace"
            >
              {copied ? (
                <>
                  <svg
                    className="h-3.5 w-3.5 text-white dark:text-surface-950"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-3.5 w-3.5 text-text-body-mid dark:text-text-ink"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v9.25c0 .621-.504 1.125-1.125 1.125z"
                    />
                  </svg>
                  <span>Copy Trace</span>
                </>
              )}
            </button>
          </div>
          <div className="px-3 py-2">
            <p className="text-sm text-danger-700 dark:text-danger-400 font-medium">
              {error.message}
            </p>

            {error.cause && (
              <div className="mt-2 rounded-md bg-danger-500/10 p-2 text-xs border border-danger-500/20">
                <span className="font-bold text-danger-600 dark:text-danger-400">Cause: </span>
                <span className="text-text-body-mid dark:text-text-muted">
                  {typeof error.cause === 'object'
                    ? JSON.stringify(error.cause)
                    : String(error.cause)}
                </span>
              </div>
            )}

            {error.snippet && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-text-body-mid dark:text-text-muted mb-1">
                  Code Snippet:
                </p>
                <div
                  className="rounded-md bg-surface-100 dark:bg-surface-950 p-2.5 text-xs font-mono leading-relaxed text-text-ink dark:text-slate-200 border border-border-default dark:border-border-subtle overflow-x-auto"
                  /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                  dangerouslySetInnerHTML={{
                    __html: highlightCodeSnippet(sanitizeAnsi(error.snippet), status),
                  }}
                />
              </div>
            )}

            {error.stack && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-text-body-mid dark:text-text-muted mb-1">
                  Stack Trace:
                </p>
                <pre
                  className="rounded-md bg-surface-100 dark:bg-surface-950 p-3 text-xs font-mono leading-relaxed text-text-ink dark:text-slate-200 border border-border-default dark:border-border-subtle overflow-x-auto"
                  /* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml */
                  dangerouslySetInnerHTML={{
                    __html: highlightExpectedReceived(error.stack),
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
