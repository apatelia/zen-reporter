import React, { useCallback, useEffect, useRef, useState } from 'react';
import logoRaw from '@/assets/logo.svg?raw';
import logoDarkRaw from '@/assets/logo-dark.svg?raw';
import pkg from '../../../package.json';

const logo = `data:image/svg+xml;utf8,${encodeURIComponent(logoRaw)}`;
const logoDark = `data:image/svg+xml;utf8,${encodeURIComponent(logoDarkRaw)}`;

export type TabKey =
  'overview' | 'projects' | 'suites' | 'files' | 'failures' | 'history' | 'insights' | 'trends';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M3.75 4.5h16.5m-16.5 3.75h16.5"
        />
      </svg>
    ),
  },
  {
    key: 'suites',
    label: 'Suites',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        />
      </svg>
    ),
  },
  {
    key: 'files',
    label: 'Files',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    key: 'failures',
    label: 'Failures',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
    ),
  },
  {
    key: 'history',
    label: 'History',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
        />
      </svg>
    ),
  },
  {
    key: 'trends',
    label: 'Trends',
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18L9 11.25l4.306 4.307a.5.5 0 00.71 0l7.234-7.234M21 8.25V12M21 8.25H17.25"
        />
      </svg>
    ),
  },
];

function SidebarItem({
  buttonRef,
  icon,
  label,
  isActive,
  onClick,
  badge,
  disabledBadge,
  isCollapsed,
  shortcutKey,
}: {
  buttonRef?: (el: HTMLButtonElement | null) => void;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  disabledBadge?: boolean;
  isCollapsed?: boolean;
  shortcutKey?: string;
}) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      title={
        isCollapsed
          ? disabledBadge
            ? `${label} (${shortcutKey}) (History recording disabled)`
            : `${label} (${shortcutKey})`
          : undefined
      }
      className={`group relative z-10 flex w-full items-center ${
        isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
      } rounded-md text-sm font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
        isActive
          ? 'text-accent-blue dark:text-accent-blue font-bold'
          : 'text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-body-mid dark:hover:bg-surface-100 dark:hover:text-text-on-primary font-medium'
      }`}
    >
      <span
        className={`shrink-0 transition-colors ${
          isActive
            ? 'text-accent-blue dark:text-accent-blue'
            : 'text-text-body-mid group-hover:text-text-ink dark:text-text-body-mid dark:group-hover:text-text-on-primary'
        }`}
      >
        {icon}
      </span>
      {!isCollapsed && <span className="truncate">{label}</span>}
      {!isCollapsed && (
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {shortcutKey && (
            <kbd className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1 text-[11px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100/60 dark:bg-surface-200/50">
              {shortcutKey}
            </kbd>
          )}
          {badge !== undefined && badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1.5 text-[11px] font-bold text-white dark:text-surface-950 shadow-xs">
              {badge}
            </span>
          )}
          {disabledBadge && (
            <span
              title="History recording disabled"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0"
            >
              <svg
                className="h-3 w-3 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </span>
          )}
        </div>
      )}
      {isCollapsed && badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white dark:text-surface-950 shadow-xs">
          {badge}
        </span>
      )}
      {isCollapsed && disabledBadge && (
        <span
          title="History recording disabled"
          className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white dark:text-surface-950 shadow-xs"
        >
          !
        </span>
      )}
    </button>
  );
}

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  failedCount: number;
  timedOutCount: number;
  interruptedCount: number;
  isHistoryDisabled: boolean;
  isMinimalReport?: boolean;
  onOpenConfigGenerator?: () => void;
  onOpenHelp?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  failedCount,
  timedOutCount,
  interruptedCount,
  isHistoryDisabled,
  isMinimalReport,
  onOpenConfigGenerator,
  onOpenHelp,
}: SidebarProps) {
  const navContainerRef = useRef<HTMLElement>(null);
  const tabButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({ top: 0, height: 0, opacity: 0 });

  const visibleTabs = isMinimalReport
    ? TABS.filter(
        (t) =>
          t.key !== 'projects' && t.key !== 'history' && t.key !== 'insights' && t.key !== 'trends'
      )
    : TABS;

  const updateIndicator = useCallback(() => {
    const container = navContainerRef.current;
    const activeButton = tabButtonsRef.current[activeTab];
    if (!container || !activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();

    setIndicatorStyle({
      top: activeRect.top - containerRect.top,
      height: activeRect.height,
      opacity: 1,
    });
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator, visibleTabs]);

  return (
    <aside
      className={`flex flex-col border-r border-border-default bg-surface-50 transition-all duration-200 ${
        isCollapsed ? 'w-16 min-w-16 shrink-0' : 'w-52 min-w-52 shrink-0'
      }`}
    >
      {/* Sidebar Header (Aligned with Main Top Bar) */}
      <div
        className={`flex h-16 items-center border-b border-border-default ${
          isCollapsed ? 'justify-center px-2' : 'justify-start min-w-0 px-4'
        }`}
      >
        <a
          href="https://zen-reporter.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
          title={`Zen Reporter v${pkg.version}`}
        >
          <img
            src={logo}
            alt="Zen Reporter"
            className="h-7 w-7 shrink-0 object-contain drop-shadow-xs transition-transform group-hover:scale-105 dark:hidden"
          />
          <img
            src={logoDark}
            alt="Zen Reporter"
            className="h-7 w-7 shrink-0 object-contain drop-shadow-xs transition-transform group-hover:scale-105 hidden dark:block"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="inline-flex items-center gap-1 text-sm font-bold tracking-tight text-accent-blue dark:text-accent-blue group-hover:underline truncate leading-tight transition-colors">
                Zen Reporter
                <svg
                  className="h-3 w-3 shrink-0 text-text-muted group-hover:opacity-100 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </span>
              <span className="text-[10px] font-medium text-text-muted truncate leading-tight">
                v{pkg.version}
              </span>
            </div>
          )}
        </a>
      </div>

      {/* Nav */}
      <nav
        ref={navContainerRef}
        className={`relative flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'} py-2 overflow-hidden`}
      >
        {/* Sliding Active Pill Indicator */}
        <div
          aria-hidden="true"
          style={{
            transform: `translate3d(0, ${indicatorStyle.top}px, 0)`,
            top: 0,
            left: isCollapsed ? 8 : 12,
            right: isCollapsed ? 8 : 12,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
          }}
          className="pointer-events-none absolute rounded-md bg-canvas shadow-sm shadow-black/8 ring-1 ring-border-default/80 dark:bg-accent-blue/25 dark:ring-accent-blue/40 transition-transform duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
        >
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-accent-blue dark:bg-accent-blue" />
        </div>

        {visibleTabs.map((tab, idx) => (
          <SidebarItem
            key={tab.key}
            buttonRef={(el) => {
              tabButtonsRef.current[tab.key] = el;
            }}
            icon={tab.icon}
            label={tab.label}
            isActive={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            shortcutKey={idx < 9 ? String(idx + 1) : undefined}
            badge={
              tab.key === 'failures' ? failedCount + timedOutCount + interruptedCount : undefined
            }
            disabledBadge={
              isHistoryDisabled &&
              (tab.key === 'history' || tab.key === 'insights' || tab.key === 'trends')
            }
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Sidebar Footer with Config Generator, Shortcuts Help & Collapse/Expand Toggle */}
      <div className="border-t border-border-default p-2 space-y-1">
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className={`flex w-full items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } rounded-md text-xs font-semibold text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-100 dark:hover:text-text-on-primary transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50`}
            title={isCollapsed ? 'Keyboard Shortcuts (?)' : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <svg
                className="h-4 w-4 shrink-0 text-text-body-mid group-hover:text-accent-blue dark:text-text-muted dark:group-hover:text-accent-blue transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.451 1.827v.75M12 18h.01"
                />
              </svg>
              {!isCollapsed && <span className="truncate">Shortcuts</span>}
            </div>
            {!isCollapsed && (
              <kbd className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1 text-[11px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100/60 dark:bg-surface-200/50">
                ?
              </kbd>
            )}
          </button>
        )}
        {onOpenConfigGenerator && (
          <button
            type="button"
            onClick={onOpenConfigGenerator}
            className={`flex w-full items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } rounded-md text-xs font-semibold text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-100 dark:hover:text-text-on-primary transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50`}
            title={isCollapsed ? 'Playwright Config Generator (c)' : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <svg
                className="h-4 w-4 shrink-0 text-text-body-mid group-hover:text-accent-blue dark:text-text-muted dark:group-hover:text-accent-blue transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.332.184.735.2 1.08.047l1.196-.532a1.125 1.125 0 011.396.346l1.296 2.245a1.125 1.125 0 01-.286 1.411l-1.02.825a1.125 1.125 0 00-.41 1.047c.074.394.074.8 0 1.194a1.125 1.125 0 00.41 1.047l1.02.825c.394.318.52.85.286 1.411l-1.296 2.245a1.125 1.125 0 01-1.396.346l-1.196-.532a1.125 1.125 0 00-1.08.047c-.332.184-.582.496-.645.87l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a1.125 1.125 0 00-.645-.87 1.125 1.125 0 00-1.08-.047l-1.196.532a1.125 1.125 0 01-1.396-.346l-1.296-2.245a1.125 1.125 0 01.286-1.411l1.02-.825a1.125 1.125 0 00.41-1.047 7.15 7.15 0 010-1.194 1.125 1.125 0 00-.41-1.047l-1.02-.825a1.125 1.125 0 01-.286-1.411l1.296-2.245a1.125 1.125 0 011.396-.346l1.196.532c.345.153.748.137 1.08-.047.332-.184.582-.496.645-.87l.213-1.281z"
                />
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {!isCollapsed && <span className="truncate">Config Generator</span>}
            </div>
            {!isCollapsed && (
              <kbd className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1 text-[11px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100/60 dark:bg-surface-200/50">
                c
              </kbd>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`flex w-full items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
          } rounded-md text-xs font-semibold text-text-body-mid hover:bg-surface-100 hover:text-text-ink dark:text-text-muted dark:hover:bg-surface-100 dark:hover:text-text-on-primary transition-colors cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50`}
          title={isCollapsed ? 'Expand sidebar (\\)' : 'Collapse sidebar (\\)'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                isCollapsed ? '' : 'rotate-180'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            {!isCollapsed && <span className="truncate">Collapse</span>}
          </div>
          {!isCollapsed && (
            <kbd className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-flex h-4.5 min-w-4.5 items-center justify-center rounded px-1 text-[11px] font-medium leading-none text-text-muted border border-border-default/60 bg-surface-100/60 dark:bg-surface-200/50">
              \
            </kbd>
          )}
        </button>
      </div>
    </aside>
  );
}
