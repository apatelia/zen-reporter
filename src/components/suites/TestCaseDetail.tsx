import type { TestCase } from '@/lib/types';

interface Props {
  testCase: TestCase;
}

const statusConfig = {
  passed: {
    bg: 'bg-success-500 text-white dark:bg-success-500/20 dark:text-success-500',
    text: 'text-success-600 dark:text-success-500',
  },
  failed: {
    bg: 'bg-danger-500 text-white dark:bg-danger-500/20 dark:text-danger-500',
    text: 'text-danger-600 dark:text-danger-500',
  },
  skipped: {
    bg: 'bg-surface-200 text-text-body-mid dark:bg-surface-200/50 dark:text-text-body-mid',
    text: 'text-text-muted dark:text-text-muted',
  },
  timedOut: {
    bg: 'bg-warning-500 text-white dark:bg-warning-500/20 dark:text-warning-500',
    text: 'text-warning-600 dark:text-warning-500',
  },
};

export default function TestCaseDetail({ testCase }: Props) {
  return (
    <>
      {/* Execution Steps */}
      {testCase.steps && testCase.steps.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Execution Steps
          </h5>
          <div className="space-y-1">
            {testCase.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-md border border-border-default dark:border-[#2b5148] bg-canvas dark:bg-[#142622] p-2.5 text-sm shadow-xs"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${statusConfig[step.status].bg} text-xs font-bold`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className={`font-medium text-sm ${statusConfig[step.status].text}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-text-body-mid dark:text-text-muted tabular-nums">
                    {step.duration}ms
                  </p>
                  {step.subSteps && step.subSteps.length > 0 && (
                    <div className="mt-1 ml-2 border-l-2 border-border-default dark:border-border-default pl-2 space-y-1">
                      {step.subSteps.map((sub, i) => (
                        <p key={i} className="text-xs text-text-body-mid dark:text-text-muted">
                          ↳ {sub.title}{' '}
                          <span className="text-text-body-mid dark:text-text-muted">
                            ({sub.duration}ms)
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Direct Errors */}
      {testCase.errors && testCase.errors.length > 0 && (
        <div>
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Test Failures
          </h5>
          <div className="space-y-2">
            {testCase.errors.map((err, idx) => (
              <div
                key={idx}
                className="rounded-md border border-danger-200 dark:border-danger-900/50 bg-canvas dark:bg-[#142622] overflow-hidden shadow-xs"
              >
                <div className="flex items-center gap-2 border-b border-danger-200 dark:border-danger-900/50 bg-danger-50 dark:bg-danger-500/10 px-3 py-1.5">
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
                    {err.name}
                  </span>
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm text-danger-600 dark:text-danger-500 font-medium">
                    {err.message}
                  </p>
                  {err.stack && (
                    <pre className="mt-2 rounded-md bg-[#0d1a17] p-3 text-xs font-mono leading-relaxed text-[#f2f0eb] border border-[#213e37] overflow-x-auto">
                      {err.stack}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No details */}
      {!testCase.steps && !testCase.errors && (
        <p className="text-sm text-text-body-mid dark:text-text-muted italic">
          No detailed steps or errors recorded.
        </p>
      )}
    </>
  );
}
