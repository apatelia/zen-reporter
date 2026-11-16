import HeaderRunSwitcher from '@/components/layout/HeaderRunSwitcher';
import ThemeControls, { type ThemeId } from '@/components/layout/ThemeControls';
import type { ThemeMode } from '@/App';
import { formatDateRange, formatDuration } from '@arpanp/zen-core';
import type { HistoryData, HistoryRun, ResultSummary } from '@arpanp/zen-core';

export interface HeaderProps {
  projectName: string | undefined;
  testRunName: string | undefined;
  summary: ResultSummary | null;
  historyData: HistoryData | null;
  currentRunId: string | null;
  onSelectRun: (runId: string) => void;
  onOpenFullRunSwitcher: () => void;
  onActiveRunSelected: (run: HistoryRun) => void;
  onCopyBranch: () => void;
  branchCopied: boolean;
  onCopyCommit: () => void;
  commitCopied: boolean;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeId) => void;
  darkMode: 'system' | 'light' | 'dark';
  onDarkModeChange: (mode: 'system' | 'light' | 'dark') => void;
}

/**
 * Header top bar: project/run breadcrumb, quick run switcher, run metadata
 * (date range, duration, git branch/commit with copy buttons), and theme controls.
 *
 * @param projectName - Project name from the report; falls back to 'Test Execution Report'.
 * @param testRunName - Run name from the report; falls back to 'Playwright Test Reporter'.
 * @param summary - Run summary powering the date range, duration, and git metadata chips.
 * @param historyData - Run history; the quick switcher renders only when more than one run exists.
 * @param currentRunId - Id of the run currently being viewed, passed to the quick switcher.
 * @param onSelectRun - Callback that loads the run picked from the quick switcher.
 * @param onOpenFullRunSwitcher - Callback that opens the full run switcher modal.
 * @param onActiveRunSelected - Callback shown when the already-active run is picked from the quick switcher.
 * @param onCopyBranch - Callback that copies the git branch to the clipboard and shows the toast.
 * @param branchCopied - Whether the branch was just copied, controlling the check-icon flash.
 * @param onCopyCommit - Callback that copies the full commit SHA to the clipboard and shows the toast.
 * @param commitCopied - Whether the commit was just copied, controlling the check-icon flash.
 * @param theme - Active dashboard theme id.
 * @param onThemeChange - Callback that applies the theme picked by the theme controls.
 * @param darkMode - Active dark-mode preference.
 * @param onDarkModeChange - Callback that applies and persists the dark-mode preference.
 * @returns The rendered header element.
 */
export default function Header({
  projectName,
  testRunName,
  summary,
  historyData,
  currentRunId,
  onSelectRun,
  onOpenFullRunSwitcher,
  onActiveRunSelected,
  onCopyBranch,
  branchCopied,
  onCopyCommit,
  commitCopied,
  theme,
  onThemeChange,
  darkMode,
  onDarkModeChange,
}: HeaderProps) {
  return (
    <header className="h-24 border-b border-border-default bg-surface-50/50 px-6 sm:px-8 shrink-0 flex items-center justify-between gap-6 py-3">
      <div className="flex flex-col justify-between h-full min-w-0">
        {/* Row 1: Breadcrumb */}
        <div className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-text-ink dark:text-text-on-primary leading-tight min-w-0">
          <span className="font-extrabold text-text-ink dark:text-text-on-primary truncate">
            {projectName || 'Test Execution Report'}
          </span>
          <svg
            className="h-4 w-4 text-text-muted shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span
            className="font-medium text-text-body-mid dark:text-text-muted truncate max-w-md"
            title={testRunName || 'Playwright Test Reporter'}
          >
            {testRunName || 'Playwright Test Reporter'}
          </span>
        </div>

        {/* Row 2: Controls & Metadata */}
        <div className="flex items-center gap-2.5 flex-wrap text-xs text-text-body-mid dark:text-text-muted min-w-0">
          {historyData && historyData.runs && historyData.runs.length > 1 && (
            <>
              <HeaderRunSwitcher
                currentRunId={currentRunId}
                runs={historyData.runs}
                onSelectRun={onSelectRun}
                onOpenFullModal={onOpenFullRunSwitcher}
                onActiveRunSelected={onActiveRunSelected}
              />
              <span className="text-text-muted/60 font-medium select-none">|</span>
            </>
          )}
          {summary && (
            <>
              <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-medium text-text-body-mid dark:text-text-muted leading-none shrink-0 select-none">
                <svg
                  className="h-3.5 w-3.5 text-text-muted shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <span>{formatDateRange(summary.startTime, summary.endTime)}</span>
              </div>
              <span className="text-text-muted/60 font-medium select-none">|</span>
              <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-semibold text-success-700 dark:text-success-400 leading-none shrink-0 select-none">
                <svg
                  className="h-3.5 w-3.5 text-success-600 dark:text-success-400 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="10" x2="14" y1="2" y2="2" />
                  <line x1="12" x2="15" y1="14" y2="11" />
                  <circle cx="12" cy="14" r="8" />
                </svg>
                <span>{formatDuration(summary.duration)}</span>
              </div>
              {(summary.gitBranch || summary.gitCommit) && (
                <>
                  {summary.gitBranch && (
                    <>
                      <span className="text-text-muted/60 font-medium select-none">|</span>
                      <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-semibold leading-none text-text-ink dark:text-text-on-primary shrink-0 select-none">
                        <svg
                          className="h-3.5 w-3.5 text-accent-blue shrink-0"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
                        </svg>
                        <span className="truncate max-w-56">{summary.gitBranch}</span>
                        <button
                          type="button"
                          onClick={onCopyBranch}
                          className="inline-flex items-center justify-center p-1 rounded-md text-text-muted hover:text-accent-blue hover:bg-surface-200/60 transition-colors cursor-pointer"
                          title={`Copy branch name (${summary.gitBranch}) (b)`}
                          aria-label="Copy branch name"
                        >
                          {branchCopied ? (
                            <svg
                              className="h-3.5 w-3.5 text-success-600 dark:text-success-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                  {summary.gitCommit && (
                    <>
                      <span className="text-text-muted/60 font-medium select-none">|</span>
                      <div className="inline-flex items-center gap-1.5 h-7.5 text-xs font-mono font-semibold leading-none text-text-ink dark:text-text-on-primary shrink-0 select-none">
                        <svg
                          className="h-3.5 w-3.5 text-accent-blue shrink-0"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.75}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="8" cy="8" r="3" />
                          <line x1="8" y1="1" x2="8" y2="5" />
                          <line x1="8" y1="11" x2="8" y2="15" />
                        </svg>
                        <span>{summary.gitCommit}</span>
                        <button
                          type="button"
                          onClick={onCopyCommit}
                          className="inline-flex items-center justify-center p-1 rounded-md text-text-muted hover:text-accent-blue hover:bg-surface-200/60 transition-colors cursor-pointer font-sans"
                          title={`Copy commit SHA (${summary.gitCommitFull || summary.gitCommit}) (g)`}
                          aria-label="Copy commit SHA"
                        >
                          {commitCopied ? (
                            <svg
                              className="h-3.5 w-3.5 text-success-600 dark:text-success-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between h-full shrink-0">
        <ThemeControls
          layout="stack"
          theme={theme}
          setTheme={onThemeChange}
          darkMode={darkMode}
          setDarkMode={onDarkModeChange}
        />
      </div>
    </header>
  );
}
