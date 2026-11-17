import { useMemo } from 'react';
import type { AppNotification, ResultSummary, TestSuite } from '@arpanp/zen-core';
import { collectAllCases } from '@arpanp/zen-core';
import TestResultsHero from './TestResultsHero';
import ParallelSpeedupCard from './ParallelSpeedupCard';
import TestSpeedConsistencyCard from './TestSpeedConsistencyCard';
import WorkerUtilizationCard from './WorkerUtilizationCard';
import NotificationsBanner from '@/components/shared/NotificationsBanner';

export interface OverviewProps {
  summary: ResultSummary;
  suites: TestSuite[];
  isMinimalReport?: boolean;
  notifications?: AppNotification[];
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
}

/**
 * Executive dashboard overview tab component.
 *
 * @param props.summary - Test execution result summary.
 * @param props.suites - Test suites payload.
 * @param props.isMinimalReport - Whether running in minimal report mode.
 * @param props.notifications - Optional notifications list for top alert banner.
 * @param props.unreadNotificationCount - Unread notifications count.
 * @param props.onOpenNotifications - Callback to open notification center modal.
 * @returns React functional component rendering the Overview page.
 */
export default function Overview({
  summary,
  suites,
  isMinimalReport,
  notifications,
  unreadNotificationCount = 0,
  onOpenNotifications,
}: OverviewProps) {
  const allCases = useMemo(() => collectAllCases(suites), [suites]);

  return (
    <div className="w-full space-y-6">
      <h1 className="sr-only">Overview</h1>

      {/* Notifications Alert Banner (Run/System alerts) */}
      {notifications && notifications.length > 0 && onOpenNotifications && (
        <section>
          <NotificationsBanner
            notifications={notifications}
            unreadCount={unreadNotificationCount}
            onOpenNotifications={onOpenNotifications}
          />
        </section>
      )}

      {/* Section 1: Executive Test Results & Metadata Hero */}
      <section>
        <TestResultsHero summary={summary} suites={suites} />
      </section>

      {/* Section 2: Executive Diagnostics (Responsive 1/2/3-Column Grid) */}
      {!isMinimalReport && (
        <section className="space-y-3 pt-2">
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            <TestSpeedConsistencyCard allCases={allCases} />
            <ParallelSpeedupCard summary={summary} />
            <WorkerUtilizationCard summary={summary} allCases={allCases} />
          </div>
        </section>
      )}
    </div>
  );
}
