import { expect, test } from '@playwright/test';
import { extractNotificationsFromReport } from '@arpanp/zen-core';
import type { ReportData } from '@arpanp/zen-core';

test.describe('Notification Center Unit Tests', () => {
  const dummySummary = {
    total: 10,
    passed: 10,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    startTime: '2026-11-17T01:00:00.000Z',
    endTime: '2026-11-17T01:00:05.000Z',
    duration: 5000,
    numberOfProjects: 1,
  };

  test('extracts empty array when report has no config warnings', () => {
    const report: ReportData = {
      testRun: {
        summary: dummySummary,
        suites: [],
        projectName: 'Clean Project',
      },
    };

    const notifications = extractNotificationsFromReport(report, 'run-1');
    expect(notifications).toEqual([]);
  });

  test('extracts warning notifications when report data contains configWarnings', () => {
    const report: ReportData = {
      testRun: {
        summary: dummySummary,
        suites: [],
        projectName: 'Notice Project',
        configWarnings: [
          'Unknown theme "Streak". Falling back to default "Sage" theme.',
          'Invalid outputDir "   ". Falling back to default "zen-report".',
        ],
      },
    };

    const notifications = extractNotificationsFromReport(report, 'run-42');
    expect(notifications).toHaveLength(2);

    expect(notifications[0]).toEqual({
      id: 'run-42:config-warning:0:Unknown theme "Streak". Falling back to default "Sage" theme.',
      category: 'warning',
      scope: 'run',
      title: 'Configuration Notice',
      message: 'Unknown theme "Streak". Falling back to default "Sage" theme.',
      timestamp: new Date('2026-11-17T01:00:00.000Z').getTime(),
      runId: 'run-42',
      runName: 'run-42',
    });

    expect(notifications[1]).toEqual({
      id: 'run-42:config-warning:1:Invalid outputDir "   ". Falling back to default "zen-report".',
      category: 'warning',
      scope: 'run',
      title: 'Configuration Notice',
      message: 'Invalid outputDir "   ". Falling back to default "zen-report".',
      timestamp: new Date('2026-11-17T01:00:00.000Z').getTime(),
      runId: 'run-42',
      runName: 'run-42',
    });
  });

  test('uses fallback runId "current" when effectiveRunId is null', () => {
    const report: ReportData = {
      testRun: {
        summary: dummySummary,
        suites: [],
        configWarnings: ['Invalid singleSummaryFile value.'],
      },
    };

    const notifications = extractNotificationsFromReport(report, null);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toEqual({
      id: 'current:config-warning:0:Invalid singleSummaryFile value.',
      category: 'warning',
      scope: 'run',
      title: 'Configuration Notice',
      message: 'Invalid singleSummaryFile value.',
      timestamp: new Date('2026-11-17T01:00:00.000Z').getTime(),
      runId: 'current',
      runName: 'current',
    });
  });

  test('extracts system notices with scope "system" and info category', () => {
    const report: ReportData = {
      testRun: {
        summary: dummySummary,
        suites: [],
        systemNotices: ['Node v20.10 runtime environment detected.', 'Database vacuum scheduled.'],
      },
    };

    const notifications = extractNotificationsFromReport(report, 'run-system');
    expect(notifications).toHaveLength(2);

    expect(notifications[0]).toEqual({
      id: 'system:0:Node v20.10 runtime environment detected.',
      category: 'info',
      scope: 'system',
      title: 'System Notice',
      message: 'Node v20.10 runtime environment detected.',
      timestamp: new Date('2026-11-17T01:00:00.000Z').getTime(),
      runId: 'run-system',
      runName: 'run-system',
    });

    expect(notifications[1]).toEqual({
      id: 'system:1:Database vacuum scheduled.',
      category: 'info',
      scope: 'system',
      title: 'System Notice',
      message: 'Database vacuum scheduled.',
      timestamp: new Date('2026-11-17T01:00:00.000Z').getTime(),
      runId: 'run-system',
      runName: 'run-system',
    });
  });

  test('extracts system alert warning for remote ingestion failure fallback', () => {
    const report: ReportData = {
      testRun: {
        summary: dummySummary,
        suites: [],
        systemNotices: [
          'Remote history ingestion server unreachable or rejected upload. Execution history was preserved in local SQLite storage.',
        ],
      },
    };

    const notifications = extractNotificationsFromReport(report, 'run-fallback');
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toEqual({
      id: 'system:0:Remote history ingestion server unreachable or rejected upload. Execution history was preserved in local SQLite storage.',
      category: 'warning',
      scope: 'system',
      title: 'System Alert',
      message:
        'Remote history ingestion server unreachable or rejected upload. Execution history was preserved in local SQLite storage.',
      timestamp: new Date('2026-11-17T01:00:00.000Z').getTime(),
      runId: 'run-fallback',
      runName: 'run-fallback',
    });
  });
});
