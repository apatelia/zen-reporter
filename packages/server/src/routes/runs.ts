import path from 'node:path';
import { Hono } from 'hono';
import { desc, eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { runs, testCases, testDetails, attachments } from '../db/schema.js';
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  BUCKET_NAME,
} from '../services/storage.js';
import type { Env } from '../types.js';

export const runsRouter = new Hono<Env>();

/**
 * GET /api/v1/runs - Paginated list of runs for the tenant
 */
runsRouter.get('/', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  const tenantRuns = await db.query.runs.findMany({
    where: eq(runs.tenantId, tenantId),
    orderBy: [desc(runs.startedAt)],
    limit,
    offset,
  });

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(runs)
    .where(eq(runs.tenantId, tenantId));

  return c.json({
    data: tenantRuns,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
    },
  });
});

/**
 * POST /api/v1/runs - Ingest a completed test run
 */
runsRouter.post('/', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json();

  const {
    runId,
    runName,
    projectName,
    startedAt,
    endedAt,
    runDurationMs,
    runSequentialDurationMs,
    runTotal,
    runPassed,
    runFailed,
    runSkipped,
    runTimedOut = 0,
    runInterrupted = 0,
    runWorkers,
    runProjects,
    stepAssertions = 0,
    stepActions = 0,
    stepNetwork = 0,
    stepHooks = 0,
    stepWaits = 0,
    stepOthers = 0,
    gitBranch,
    gitCommit,
    gitCommitFull,
    testCases: incomingTestCases = [],
    attachments: incomingAttachments = [],
  } = body;

  if (!runId || !runName || !startedAt || !endedAt) {
    return c.json(
      { error: 'Missing required run fields (runId, runName, startedAt, endedAt)' },
      400
    );
  }

  // Atomic transaction for run ingestion and related test case / details records
  await db.transaction(async (tx) => {
    // Insert or update run
    await tx
      .insert(runs)
      .values({
        id: runId,
        tenantId,
        runName,
        projectName: projectName || 'Default',
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        runDurationMs: Number(runDurationMs) || 0,
        runSequentialDurationMs: runSequentialDurationMs ? Number(runSequentialDurationMs) : null,
        runTotal: Number(runTotal) || 0,
        runPassed: Number(runPassed) || 0,
        runFailed: Number(runFailed) || 0,
        runSkipped: Number(runSkipped) || 0,
        runTimedOut: Number(runTimedOut) || 0,
        runInterrupted: Number(runInterrupted) || 0,
        runWorkers: runWorkers ? Number(runWorkers) : null,
        runProjects: runProjects ? Number(runProjects) : null,
        stepAssertions: Number(stepAssertions) || 0,
        stepActions: Number(stepActions) || 0,
        stepNetwork: Number(stepNetwork) || 0,
        stepHooks: Number(stepHooks) || 0,
        stepWaits: Number(stepWaits) || 0,
        stepOthers: Number(stepOthers) || 0,
        gitBranch,
        gitCommit,
        gitCommitFull,
      })
      .onConflictDoUpdate({
        target: runs.id,
        set: {
          runName,
          runTotal: Number(runTotal) || 0,
          runPassed: Number(runPassed) || 0,
          runFailed: Number(runFailed) || 0,
        },
      });

    // Batch insert lightweight test cases
    const testCaseRows = [];
    const testDetailRows = [];

    for (const tc of incomingTestCases) {
      const testId = tc.id || `${runId}::${tc.project || 'default'}::${tc.file}::${tc.title}`;
      testCaseRows.push({
        id: testId,
        runId,
        tenantId,
        file: tc.file,
        suite: tc.suite || null,
        title: tc.title,
        project: tc.project || null,
        status: tc.status,
        durationMs: Number(tc.durationMs) || 0,
        attempts: Number(tc.attempts) || 1,
        failedAttempts: Number(tc.failedAttempts) || 0,
        passedOnRetry: Number(tc.passedOnRetry) || 0,
        errorMessage: tc.errorMessage || null,
        errorLine: tc.errorLine ? Number(tc.errorLine) : null,
        errorFile: tc.errorFile || null,
        tags: tc.tags || [],
      });

      if (tc.errorStack || tc.stepsJson || tc.stdoutJson || tc.stderrJson) {
        testDetailRows.push({
          testId,
          errorStack: tc.errorStack || null,
          stepsJson: tc.stepsJson || null,
          stdoutJson: tc.stdoutJson || null,
          stderrJson: tc.stderrJson || null,
        });
      }
    }

    // Chunked batch insertion (100 per batch)
    const BATCH_SIZE = 100;
    for (let i = 0; i < testCaseRows.length; i += BATCH_SIZE) {
      const chunk = testCaseRows.slice(i, i + BATCH_SIZE);
      await tx.insert(testCases).values(chunk).onConflictDoNothing();
    }

    for (let i = 0; i < testDetailRows.length; i += BATCH_SIZE) {
      const chunk = testDetailRows.slice(i, i + BATCH_SIZE);
      await tx.insert(testDetails).values(chunk).onConflictDoNothing();
    }

    // Batch insert attachments metadata
    if (incomingAttachments.length > 0) {
      interface IncomingAttachment {
        testId?: string;
        file?: string;
        title?: string;
        project?: string;
        status?: string;
        name: string;
        contentType?: string;
        s3Key?: string;
        storageKey?: string;
        s3Url?: string;
        storageUrl?: string;
        bodyText?: string;
        sizeBytes?: number;
      }
      const attachmentRows = (incomingAttachments as IncomingAttachment[]).map((att) => {
        const testId =
          att.testId ||
          (att.file && att.title
            ? `${runId}::${att.project || 'default'}::${att.file}::${att.title}`
            : null);
        const key = att.storageKey || att.s3Key || '';
        const url = att.storageUrl || att.s3Url || null;
        return {
          runId,
          tenantId,
          testId,
          testFile: att.file || '',
          testTitle: att.title || '',
          testStatus: att.status || null,
          name: att.name,
          contentType: att.contentType || null,
          s3Key: key,
          s3Url: url,
          bodyText: att.bodyText || null,
          sizeBytes: att.sizeBytes ? Number(att.sizeBytes) : null,
        };
      });

      for (let i = 0; i < attachmentRows.length; i += BATCH_SIZE) {
        const chunk = attachmentRows.slice(i, i + BATCH_SIZE);
        await tx.insert(attachments).values(chunk);
      }
    }
  });

  return c.json({ success: true, runId }, 201);
});

/**
 * GET /api/v1/runs/:runId - Fetch run summary, test cases overview, and attachments
 */
runsRouter.get('/:runId', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const runId = c.req.param('runId');

  const run = await db.query.runs.findFirst({
    where: and(eq(runs.id, runId), eq(runs.tenantId, tenantId)),
  });

  if (!run) {
    return c.json({ error: 'Run not found' }, 404);
  }

  const runTestCases = await db.query.testCases.findMany({
    where: eq(testCases.runId, runId),
  });

  const runAttachments = await db.query.attachments.findMany({
    where: eq(attachments.runId, runId),
  });

  return c.json({
    run,
    testCases: runTestCases,
    attachments: runAttachments,
  });
});

/**
 * GET /api/v1/runs/:runId/tests/:testId - Lazy load detailed execution traces, steps, and logs
 */
runsRouter.get('/:runId/tests/:testId', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const runId = c.req.param('runId');
  const testId = c.req.param('testId');

  const testCase = await db.query.testCases.findFirst({
    where: and(
      eq(testCases.id, testId),
      eq(testCases.runId, runId),
      eq(testCases.tenantId, tenantId)
    ),
  });

  if (!testCase) {
    return c.json({ error: 'Test case not found' }, 404);
  }

  const details = await db.query.testDetails.findFirst({
    where: eq(testDetails.testId, testId),
  });

  const testAttachmentsList = await db.query.attachments.findMany({
    where: and(eq(attachments.runId, runId), eq(attachments.testId, testId)),
  });

  // Attach signed download URLs for non-inline attachments
  const attachmentsWithUrls = await Promise.all(
    testAttachmentsList.map(async (att) => {
      let downloadUrl = att.s3Url;
      if (!downloadUrl && att.s3Key) {
        try {
          downloadUrl = await getPresignedDownloadUrl(att.s3Key);
        } catch {
          downloadUrl = null;
        }
      }
      return {
        ...att,
        url: downloadUrl,
      };
    })
  );

  return c.json({
    ...testCase,
    details: details || null,
    attachments: attachmentsWithUrls,
  });
});

/**
 * POST /api/v1/runs/:runId/attachments/presign - Request presigned upload URL for binary attachment
 */
runsRouter.post('/:runId/attachments/presign', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const runId = c.req.param('runId');
  const { fileName, contentType } = await c.req.json();

  if (!fileName || !contentType) {
    return c.json({ error: 'fileName and contentType are required' }, 400);
  }

  // Security: prevent path traversal attacks by stripping directories from fileName
  const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeContentType = String(contentType).slice(0, 100);

  const s3Key = `${tenantId}/${runId}/${Date.now()}-${sanitizedFileName}`;
  const { uploadUrl, headers } = await getPresignedUploadUrl(s3Key, safeContentType);

  return c.json({
    uploadUrl,
    headers: headers || {},
    s3Key,
    storageKey: s3Key,
    bucket: BUCKET_NAME,
  });
});
