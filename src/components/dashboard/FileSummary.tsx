import { collectAllCases, computeFileStats, truncateFileName } from '@/lib/utils';
import type { TestSuite } from '@/lib/types';

interface Props {
  suites: TestSuite[];
  title?: string;
}

export default function FileSummary({ suites, title = 'Files Summary' }: Props) {
  const allCases = collectAllCases(suites);
  const fileStats = computeFileStats(allCases);

  if (fileStats.length === 0) return null;

  const badgeColors: Record<string, string> = {
    passed:
      'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400 dark:ring-1 dark:ring-success-500/30',
    failed:
      'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
    skipped:
      'bg-slate-200/80 text-slate-800 ring-1 ring-slate-300 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-1 dark:ring-slate-600',
    timedOut:
      'bg-warning-50 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400 dark:ring-1 dark:ring-warning-500/30',
    interrupted:
      'bg-danger-50 text-danger-600 dark:bg-danger-500/20 dark:text-danger-400 dark:ring-1 dark:ring-danger-500/30',
  };

  return (
    <div className="overflow-hidden rounded-md bg-canvas border border-border-default shadow-sm">
      <div className="overflow-x-auto">
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th
                  colSpan={8}
                  className="px-3 py-2.5 text-left text-lg font-semibold text-text-ink dark:text-text-on-primary"
                >
                  {title}
                </th>
              </tr>
              <tr className="border-b border-border-subtle">
                <th className="px-1.5 py-2.5 text-left font-semibold text-text-ink dark:text-text-on-primary">
                  File
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Total
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Passed
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Failed
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Timed Out
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Interrupted
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Skipped
                </th>
                <th className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                  Pass Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {fileStats.map((file) => (
                <tr key={file.fileName} className="border-b border-border-subtle last:border-b-0">
                  <td className="px-1.5 py-2.5">
                    <div className="max-w-44 truncate font-medium text-text-ink dark:text-text-on-primary">
                      {truncateFileName(file.fileName)}
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5 text-center text-text-body-mid dark:text-text-muted">
                    {file.total}
                  </td>
                  <td className="px-1.5 py-2.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeColors.passed}`}
                    >
                      {file.passed}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeColors.failed}`}
                    >
                      {file.failed}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeColors.timedOut}`}
                    >
                      {file.timedOut}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeColors.interrupted}`}
                    >
                      {file.interrupted}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeColors.skipped}`}
                    >
                      {file.skipped}
                    </span>
                  </td>
                  <td className="px-1.5 py-2.5 text-center font-semibold text-text-ink dark:text-text-on-primary">
                    {file.total > 0 ? Math.round((file.passed / file.total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
