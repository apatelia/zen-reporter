export type NotificationCategory = 'warning' | 'info' | 'error' | 'success';
export type NotificationScope = 'run' | 'system';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  scope?: NotificationScope;
  title: string;
  message?: string;
  timestamp?: number;
  runId?: string;
  runName?: string;
}

export interface NotificationState {
  read: boolean;
}

export interface UserNotificationPreferences {
  [id: string]: NotificationState;
}

/**
 * Extracts raw notification objects from the given report data and run id.
 *
 * @param reportData - Active test report data payload.
 * @param effectiveRunId - Resolved execution run id string.
 * @returns Array of structured application notification items.
 */
export function extractNotificationsFromReport(
  reportData: import('./report.js').ReportData | null,
  effectiveRunId: string | null
): AppNotification[] {
  const items: AppNotification[] = [];
  const testRun = reportData?.testRun;
  const runId = effectiveRunId || 'current';
  const runName = testRun?.testRunName || runId;
  const timestamp = testRun?.summary?.startTime
    ? new Date(testRun.summary.startTime).getTime()
    : undefined;

  // 1. Config warnings (Run-scoped)
  const warnings = testRun?.configWarnings;
  if (warnings && warnings.length > 0) {
    warnings.forEach((warning, idx) => {
      const isInfo = warning.toLowerCase().startsWith('info:');
      const cleanMessage = isInfo ? warning.replace(/^info:\s*/i, '') : warning;

      items.push({
        id: `${runId}:config-warning:${idx}:${warning}`,
        category: isInfo ? 'info' : 'warning',
        scope: 'run',
        title: 'Configuration Notice',
        message: cleanMessage,
        timestamp,
        runId,
        runName,
      });
    });
  }

  // 2. System notices (System-scoped)
  const systemNotices = testRun?.systemNotices;
  if (systemNotices && systemNotices.length > 0) {
    systemNotices.forEach((notice, idx) => {
      const isWarning =
        notice.toLowerCase().startsWith('warning:') ||
        notice.toLowerCase().includes('unreachable') ||
        notice.toLowerCase().includes('failed');
      const cleanMessage = notice.replace(/^(warning|info):\s*/i, '');

      items.push({
        id: `system:${idx}:${notice}`,
        category: isWarning ? 'warning' : 'info',
        scope: 'system',
        title: isWarning ? 'System Alert' : 'System Notice',
        message: cleanMessage,
        timestamp,
        runId,
        runName,
      });
    });
  }

  return items;
}
