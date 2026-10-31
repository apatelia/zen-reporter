import React, { useEffect, useRef, useState } from 'react';

export interface ThemeControlsProps {
  theme: 'cafe' | 'sentinel' | 'streak';
  setTheme: (theme: 'cafe' | 'sentinel' | 'streak') => void;
  darkMode: 'system' | 'light' | 'dark';
  setDarkMode: (mode: 'system' | 'light' | 'dark') => void;
}

export function ThemeControls({ theme, setTheme, darkMode, setDarkMode }: ThemeControlsProps) {
  const themeContainerRef = useRef<HTMLDivElement>(null);
  const themeButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [themeIndicator, setThemeIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  const modeContainerRef = useRef<HTMLDivElement>(null);
  const modeButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [modeIndicator, setModeIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  const themes = [
    {
      id: 'cafe' as const,
      label: 'Cafe',
      colorDot: 'bg-[#006241] dark:bg-[#4ade80] ring-1 ring-black/10 dark:ring-white/20',
    },
    {
      id: 'sentinel' as const,
      label: 'Sentinel',
      colorDot: 'bg-[#6a5fc1] dark:bg-[#c2ef4e] ring-1 ring-black/10 dark:ring-white/20',
    },
    {
      id: 'streak' as const,
      label: 'Streak',
      colorDot: 'bg-[#533afd] dark:bg-[#665efd] ring-1 ring-black/10 dark:ring-white/20',
    },
  ];

  useEffect(() => {
    const updateThemeIndicator = () => {
      const container = themeContainerRef.current;
      const activeButton = themeButtonsRef.current[theme];
      if (!container || !activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      setThemeIndicator({
        left: activeRect.left - containerRect.left - container.clientLeft,
        top: activeRect.top - containerRect.top - container.clientTop,
        width: activeRect.width,
        height: activeRect.height,
        opacity: 1,
      });
    };

    updateThemeIndicator();
    window.addEventListener('resize', updateThemeIndicator);
    return () => window.removeEventListener('resize', updateThemeIndicator);
  }, [theme]);

  useEffect(() => {
    const updateModeIndicator = () => {
      const container = modeContainerRef.current;
      const activeButton = modeButtonsRef.current[darkMode];
      if (!container || !activeButton) return;

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeButton.getBoundingClientRect();

      setModeIndicator({
        left: activeRect.left - containerRect.left - container.clientLeft,
        top: activeRect.top - containerRect.top - container.clientTop,
        width: activeRect.width,
        height: activeRect.height,
        opacity: 1,
      });
    };

    updateModeIndicator();
    window.addEventListener('resize', updateModeIndicator);
    return () => window.removeEventListener('resize', updateModeIndicator);
  }, [darkMode]);

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Theme Segmented Control */}
      <div
        ref={themeContainerRef}
        className="relative inline-flex items-center rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs"
      >
        {/* Sliding Indicator */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${themeIndicator.left}px, ${themeIndicator.top}px, 0)`,
            width: `${themeIndicator.width}px`,
            height: `${themeIndicator.height}px`,
            opacity: themeIndicator.opacity,
          }}
          className="pointer-events-none absolute left-0 top-0 rounded-md bg-canvas shadow-sm shadow-black/8 ring-1 ring-border-default/80 dark:bg-accent-blue/25 dark:ring-accent-blue/30 transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
        />

        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                themeButtonsRef.current[t.id] = el;
              }}
              onClick={() => setTheme(t.id)}
              className={`relative z-10 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'text-accent-blue dark:text-accent-blue font-bold'
                  : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary font-medium'
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
      <div
        ref={modeContainerRef}
        className="relative inline-flex items-center rounded-lg border border-border-default bg-surface-100 p-0.5 shadow-2xs"
      >
        {/* Sliding Indicator */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(${modeIndicator.left}px, ${modeIndicator.top}px, 0)`,
            width: `${modeIndicator.width}px`,
            height: `${modeIndicator.height}px`,
            opacity: modeIndicator.opacity,
          }}
          className="pointer-events-none absolute left-0 top-0 rounded-md bg-canvas shadow-sm shadow-black/8 ring-1 ring-border-default/80 dark:bg-accent-blue/25 dark:ring-accent-blue/30 transition-all duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
        />

        <button
          ref={(el) => {
            modeButtonsRef.current['system'] = el;
          }}
          onClick={() => setDarkMode('system')}
          className={`relative z-10 inline-flex items-center justify-center p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
            darkMode === 'system'
              ? 'text-accent-blue dark:text-accent-blue font-bold'
              : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
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
          ref={(el) => {
            modeButtonsRef.current['light'] = el;
          }}
          onClick={() => setDarkMode('light')}
          className={`relative z-10 inline-flex items-center justify-center p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
            darkMode === 'light'
              ? 'text-accent-blue dark:text-accent-blue font-bold'
              : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
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
          ref={(el) => {
            modeButtonsRef.current['dark'] = el;
          }}
          onClick={() => setDarkMode('dark')}
          className={`relative z-10 inline-flex items-center justify-center p-1.5 rounded-md transition-colors duration-150 cursor-pointer ${
            darkMode === 'dark'
              ? 'text-accent-blue dark:text-accent-blue font-bold'
              : 'text-text-body-mid hover:text-text-ink hover:bg-surface-200/40 dark:text-text-muted dark:hover:text-text-on-primary'
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
