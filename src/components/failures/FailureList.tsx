import type { FailedTest } from '@/lib/utils';
import TestCaseCard from '../suites/TestCaseCard';

interface Props {
  failedTests: FailedTest[];
  hasSuites?: boolean;
}

export default function FailureList({ failedTests, hasSuites = true }: Props) {
  if (failedTests.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-md border border-success-200 bg-success-50/50 px-6 py-6 shadow-sm dark:border-success-500/30 dark:bg-success-500/10">
        <svg
          className="h-8 w-8 text-success-500 dark:text-success-400 shrink-0"
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
          <p className="text-sm font-semibold text-success-600 dark:text-success-400">
            No failures
          </p>
          <p className="text-xs text-text-body-mid dark:text-text-muted">
            {hasSuites ? 'All tests passed successfully.' : 'No suites/tests found.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {failedTests.map((test, idx) => (
        <TestCaseCard key={idx} testCase={test.testCase} showSteps={false} />
      ))}
    </div>
  );
}
