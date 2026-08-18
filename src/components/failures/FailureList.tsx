import type { FailedTest } from '@/lib/utils';
import { parseAnsiToHtml } from '@/lib/utils';
import { getTagColor } from '@/lib/tagColors';

interface Props {
  failedTests: FailedTest[];
}

export default function FailureList({ failedTests }: Props) {
  if (failedTests.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md bg-success-50 dark:bg-success-50/20 px-6 py-8 text-center">
        <svg
          className="h-8 w-8 text-success-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="text-left">
          <p className="text-sm font-semibold text-success-600 dark:text-success-500">
            No failures
          </p>
          <p className="text-xs text-text-body-mid dark:text-text-muted">
            All tests passed successfully.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {failedTests.map((test, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-md border border-danger-200 dark:border-danger-900/50 bg-surface-50 dark:bg-surface-100 transition-all duration-200 hover:shadow-sm"
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-start gap-3 min-w-0">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-danger-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text-ink dark:text-text-on-primary truncate">
                    {test.title}
                  </span>
                  {/* Tags */}
                  {test.tags?.map((tag) => {
                    const color = getTagColor(tag);
                    return (
                      <span
                        key={tag}
                        className={`inline-flex items-center rounded-full ${color.bg} ring-1 ${color.ring} px-2.5 py-0.5 text-xs font-semibold ${color.text} shrink-0`}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-text-body-mid dark:text-text-muted font-mono truncate">
                  {test.fileName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {test.duration > 0 && (
                <span className="text-xs font-medium text-text-body-mid dark:text-text-muted tabular-nums">
                  {test.duration >= 1000
                    ? `${(test.duration / 1000).toFixed(1)}s`
                    : `${test.duration}ms`}
                </span>
              )}
              {test.type === 'Timed Out' ? (
                <span className="inline-flex items-center rounded-full bg-warning-50 dark:bg-warning-500/10 border border-warning-200 dark:border-warning-900/50 px-2.5 py-0.5 text-xs font-semibold text-warning-600 dark:text-warning-500">
                  {test.type}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-900/50 px-2.5 py-0.5 text-xs font-semibold text-danger-600 dark:text-danger-500">
                  {test.type}
                </span>
              )}
            </div>
          </div>
          {test.errors && test.errors.length > 0 && (
            <div className="border-t border-danger-200 dark:border-danger-900/50 bg-canvas dark:bg-[#142622] px-4 py-3">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-danger-600 dark:text-danger-500 hover:text-danger-700 dark:hover:text-danger-400 select-none list-none [&::-webkit-details-marker]:hidden">
                  <svg
                    className="h-3 w-3 transition-transform duration-200 group-open:rotate-90"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span>Error Details</span>
                </summary>
                <div className="mt-3 space-y-3">
                  {test.errors.map((err, errIdx) => (
                    <div
                      key={errIdx}
                      className="space-y-2 rounded-md border border-danger-200 dark:border-danger-900/40 bg-surface-50/50 dark:bg-surface-200/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-danger-200/50 dark:border-danger-900/30 pb-1.5">
                        <p className="text-xs font-bold text-danger-600 dark:text-danger-500">
                          {err.name}: {err.message}
                        </p>
                        {err.location && (
                          <span className="text-[11px] font-mono text-text-body-mid dark:text-text-muted">
                            {err.location.file}:{err.location.line}:{err.location.column}
                          </span>
                        )}
                      </div>

                      {err.cause && (
                        <div className="rounded bg-danger-500/10 p-2 text-xs border border-danger-500/20">
                          <span className="font-bold text-danger-600 dark:text-danger-400">
                            Cause:{' '}
                          </span>
                          <span className="text-text-body-mid dark:text-text-muted font-mono">
                            {typeof err.cause === 'object'
                              ? JSON.stringify(err.cause)
                              : String(err.cause)}
                          </span>
                        </div>
                      )}

                      {err.snippet && (
                        <div>
                          <p className="text-[11px] font-semibold text-text-body-mid dark:text-text-muted mb-1">
                            Code Snippet:
                          </p>
                          <pre
                            className="rounded-md bg-[#0d1a17] p-2.5 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(err.snippet) }}
                          />
                        </div>
                      )}

                      {err.stack && (
                        <div>
                          <p className="text-[11px] font-semibold text-text-body-mid dark:text-text-muted mb-1">
                            Stack Trace:
                          </p>
                          <pre className="rounded-md bg-[#0d1a17] p-3 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] overflow-x-auto">
                            {err.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
