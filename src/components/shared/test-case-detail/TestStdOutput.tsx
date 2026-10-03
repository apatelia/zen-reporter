export interface TestStdOutputProps {
  stdout?: string[];
  stderr?: string[];
}

export function TestStdOutput({ stdout, stderr }: TestStdOutputProps) {
  const hasStdout = stdout && stdout.length > 0;
  const hasStderr = stderr && stderr.length > 0;

  if (!hasStdout && !hasStderr) return null;

  return (
    <>
      {hasStdout && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-text-muted">
            Standard Output (stdout)
          </h5>
          <pre className="rounded-md bg-surface-950 p-3 text-xs font-mono leading-relaxed text-canvas dark:text-surface-900 border border-border-default dark:border-border-subtle overflow-x-auto">
            {stdout.join('\n')}
          </pre>
        </div>
      )}

      {hasStderr && (
        <div className="mb-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-body-mid dark:text-danger-500">
            Standard Error (stderr)
          </h5>
          <pre className="rounded-md bg-danger-50 dark:bg-surface-950 p-3 text-xs font-mono leading-relaxed text-danger-700 dark:text-danger-400 border border-danger-200 dark:border-danger-900/50 overflow-x-auto">
            {stderr.join('\n')}
          </pre>
        </div>
      )}
    </>
  );
}
