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
  return (
    <div className="mb-4">
      <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
        Test Failures
      </h5>
      <div className="space-y-2">
        <div className="rounded-md border border-danger-200 dark:border-danger-900/50 bg-white dark:bg-surface-100/40 overflow-hidden shadow-xs">
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
                {error.name}
              </span>
            </div>
            {error.location && (
              <span className="text-xs font-mono text-text-body-mid dark:text-text-muted">
                {error.location.file}:{error.location.line}:{error.location.column}
              </span>
            )}
          </div>
          <div className="px-3 py-2">
            <p className="text-sm text-danger-600 dark:text-danger-500 font-medium">
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
