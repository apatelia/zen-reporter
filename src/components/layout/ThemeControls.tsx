import React from 'react';

export interface ThemeControlsProps {
  theme: 'cafe' | 'concept' | 'sentinel';
  setTheme: (theme: 'cafe' | 'concept' | 'sentinel') => void;
  darkMode: 'system' | 'light' | 'dark';
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
}

export function ThemeControls({ theme, setTheme, darkMode, setDarkMode }: ThemeControlsProps) {
  const themes = [
    {
      id: 'cafe' as const,
      label: 'Cafe',
      colorDot: 'bg-[#006241]',
    },
    {
      id: 'concept' as const,
      label: 'Concept',
      colorDot: 'bg-[#0075de]',
    },
    {
      id: 'sentinel' as const,
      label: 'Sentinel',
      colorDot: 'bg-[#6a5fc1]',
    },
  ];

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Theme Segmented Control */}
      <div className="inline-flex items-center rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs">
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
                  : 'border border-transparent text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
              }`}
              title={`Switch theme to ${t.label}`}
            >
              <span className={`h-2 w-2 rounded-full ${t.colorDot} shrink-0`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Segmented Toggle */}
      <div className="inline-flex items-center rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs">
        <button
          onClick={() => setDarkMode('system')}
          className={`inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
            darkMode === 'system'
              ? 'bg-canvas dark:bg-surface-200 border border-border-active text-text-ink dark:text-text-on-primary shadow-xs font-bold'
              : 'border border-transparent text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
          }`}
          title="Switch to System Theme (follows OS setting)"
          aria-label="System Theme"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
            />
          </svg>
        </button>

        <button
          onClick={() => setDarkMode('light')}
          className={`inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
            darkMode === 'light'
              ? 'bg-canvas dark:bg-surface-200 border border-border-active text-amber-600 dark:text-amber-400 shadow-xs font-bold'
              : 'border border-transparent text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
          }`}
          title="Switch to Light Mode"
          aria-label="Light Mode"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
        </button>

        <button
          onClick={() => setDarkMode('dark')}
          className={`inline-flex items-center justify-center p-1.5 rounded-md transition-all duration-150 cursor-pointer ${
            darkMode === 'dark'
              ? 'bg-canvas dark:bg-surface-200 border border-border-active text-info-600 dark:text-info-400 shadow-xs font-bold'
              : 'border border-transparent text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
          }`}
          title="Switch to Dark Mode"
          aria-label="Dark Mode"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ThemeControls;
