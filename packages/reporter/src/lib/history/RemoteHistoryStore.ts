import * as fs from 'fs';
import * as path from 'path';
import { buildRunId } from '../runHistory.js';
import { getGitBranch, getGitCommit } from '../gitUtils.js';
import { buildSuitesFromCases } from '@arpanp/zen-core';
import type { HistoryStore } from './HistoryStore.js';
import type { WriteRunHistoryOptions } from '../runHistoryWriter.js';
import type {
  Attachment,
  FailedAttempt,
  HistoryData,
  ReportData,
  RemoteHistoryConfig,
  TestCase,
  TestStep,
} from '@arpanp/zen-core';

interface RemoteRunDto {
  id: string;
  runName: string;
  projectName: string;
  startedAt: string;
  endedAt: string;
  runDurationMs: number;
  runSequentialDurationMs: number | null;
  runTotal: number;
  runPassed: number;
  runFlaky?: number;
  runFailed: number;
  runSkipped: number;
  runTimedOut: number;
  runInterrupted: number;
  runWorkers: number | null;
  runProjects: number | null;
  gitBranch: string | null;
  gitCommit: string | null;
  gitCommitFull: string | null;
  playwrightVersion?: string | null;
  osName?: string | null;
}

interface RemoteTestCaseDto {
  id: string;
  file: string;
  suite?: string | null;
  title: string;
  project?: string | null;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  durationMs: number;
  attempts: number;
  failedAttempts: number;
  passedOnRetry: number;
  errorMessage?: string | null;
  errorLine?: number | null;
  errorFile?: string | null;
  tags?: string[];
}

/** Attachment row as returned by the server's per-test detail endpoint. */
interface RemoteAttachmentDto {
  name: string;
  contentType?: string | null;
  s3Url?: string | null;
  bodyText?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
}

/** Heavy detail blob as returned by the server's per-test detail endpoint. */
interface RemoteTestDetailDto {
  details?: {
    errorStack?: string | null;
    stepsJson?: unknown | null;
    failedAttemptsJson?: unknown | null;
    stdoutJson?: unknown | null;
    stderrJson?: unknown | null;
  } | null;
  attachments?: RemoteAttachmentDto[];
}

/**
 * Casts an unknown JSON value to a TestStep list.
 *
 * @param value - Raw JSON array from the detail endpoint.
 * @returns The parsed list, or undefined when absent or empty.
 */
const toStepList = (value: unknown): TestStep[] | undefined =>
  Array.isArray(value) && value.length > 0 ? (value as TestStep[]) : undefined;

/**
 * Casts an unknown JSON value to a string list.
 *
 * @param value - Raw JSON array from the detail endpoint.
 * @returns The parsed list, or undefined when absent or empty.
 */
const toStrList = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.length > 0 ? (value as string[]) : undefined;

export interface RemoteHistoryStoreOptions extends RemoteHistoryConfig {
  outputDir?: string;
}

/**
 * Remote HTTP implementation of `HistoryStore`.
 * Targets a centralized Zen Reporter ingestion service (`packages/server` or SaaS endpoint).
 * Streams test run metadata, lightweight test cases, and uploads binary attachments via presigned S3 URLs.
 */
export class RemoteHistoryStore implements HistoryStore {
  readonly serverUrl: string;
  readonly apiKey?: string;
  readonly projectId?: string;
  readonly runId?: string;
  readonly timeoutMs: number;
  readonly outputDir: string;

  constructor(options: RemoteHistoryStoreOptions) {
    this.serverUrl = options.serverUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey || process.env.ZEN_REPORTER_API_KEY;
    this.projectId = options.projectId || process.env.ZEN_REPORTER_PROJECT_ID;
    this.runId = options.runId || process.env.ZEN_REPORTER_RUN_ID || process.env.GITHUB_RUN_ID;
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.outputDir = options.outputDir ?? 'zen-report';
  }

  /**
   * Fetches a JSON resource authenticated with the store's API key.
   *
   * @param url - Absolute URL of the resource to fetch.
   * @returns Parsed JSON body, or null when the request fails or returns a non-OK status.
   */
  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  /**
   * Fetches multiple JSON resources with bounded concurrency (5 at a time), preserving input order.
   *
   * @param urls - List of absolute URLs to fetch.
   * @returns Parsed JSON bodies in the same order as urls (null for failed requests).
   */
  private async fetchJsonBatch<T>(urls: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = new Array(urls.length).fill(null);
    if (urls.length === 0) {
      return results;
    }
    const CONCURRENCY = 5;
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const chunk = urls.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map((url) => this.fetchJson<T>(url)));
      for (let j = 0; j < chunkResults.length; j++) {
        results[i + j] = chunkResults[j];
      }
    }
    return results;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  /**
   * Initializes the remote store by checking endpoint connectivity.
   *
   * @returns Resolves when the connection check completes.
   */
  async init(): Promise<void> {
    // Ping server health or verify auth
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(`${this.serverUrl}/health`, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        console.warn(`[RemoteHistoryStore] Ingestion server health check returned ${res.status}`);
      }
    } catch (err) {
      console.warn(
        `[RemoteHistoryStore] Warning: Ingestion server unreachable at ${this.serverUrl}:`,
        (err as Error).message
      );
    }
  }

  /**
   * Uploads a binary attachment file to remote storage using a presigned URL.
   *
   * @param runId - Unique identifier of the test run.
   * @param filePath - Local filesystem path of the attachment to upload.
   * @param name - Display name of the attachment.
   * @param contentType - MIME type of the attachment.
   * @returns The storage key or null if upload failed.
   */
  private async uploadAttachmentFile(
    runId: string,
    filePath: string,
    name: string,
    contentType: string
  ): Promise<{ s3Key: string; s3Url?: string } | null> {
    try {
      // 1. Request presigned upload URL from server
      const presignRes = await fetch(
        `${this.serverUrl}/api/v1/runs/${encodeURIComponent(runId)}/attachments/presign`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            fileName: name,
            contentType: contentType || 'application/octet-stream',
          }),
        }
      );

      if (!presignRes.ok) {
        return null;
      }

      const { uploadUrl, s3Key, storageKey, headers } = (await presignRes.json()) as {
        uploadUrl: string;
        s3Key?: string;
        storageKey?: string;
        headers?: Record<string, string>;
      };
      const key = storageKey || s3Key;
      if (!uploadUrl || !key) {
        return null;
      }

      // 2. Read local file buffer and PUT to presigned URL
      const fileData = fs.readFileSync(filePath);
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          ...(headers || {}),
        },
        body: fileData,
      });

      if (!uploadRes.ok) {
        return null;
      }

      return { s3Key: key };
    } catch {
      return null;
    }
  }

  /**
   * Persists a completed test run, uploads binary attachments, and streams metadata to the server.
   *
   * @param options - Execution options containing summary metrics, test cases, and attachments.
   * @returns The unique run ID assigned to this execution.
   */
  async saveRun(options: WriteRunHistoryOptions): Promise<string> {
    const runId = buildRunId(options.startTime, options.testRunName, options.shard, this.runId);
    const gitBranch = getGitBranch();
    const gitCommitInfo = getGitCommit();

    // Collect attachments to upload
    const uploadedAttachments: Array<{
      file: string;
      title: string;
      project?: string;
      status?: string;
      name: string;
      contentType?: string;
      s3Key: string;
      bodyText?: string;
      sizeBytes?: number;
    }> = [];

    const cwd = process.cwd();
    const outputDir = path.resolve(cwd, options.outputDir || this.outputDir);

    // Collect attachment tasks to upload with bounded concurrency
    interface AttachmentToUpload {
      file: string;
      title: string;
      project?: string;
      status?: string;
      name: string;
      contentType?: string;
      absPath: string;
      size: number;
    }

    const pendingUploads: AttachmentToUpload[] = [];

    for (const tc of options.testCases) {
      for (const att of tc.attachments || []) {
        if (att.body) {
          // Inline text attachment
          uploadedAttachments.push({
            file: tc.fileName,
            title: tc.title,
            project: tc.project,
            status: tc.status,
            name: att.name,
            contentType: att.contentType,
            s3Key: '',
            bodyText: att.body,
          });
        } else if (att.path) {
          // Binary attachment file on disk
          const absPath = path.isAbsolute(att.path) ? att.path : path.resolve(outputDir, att.path);
          if (fs.existsSync(absPath)) {
            const stats = fs.statSync(absPath);
            pendingUploads.push({
              file: tc.fileName,
              title: tc.title,
              project: tc.project,
              status: tc.status,
              name: att.name,
              contentType: att.contentType,
              absPath,
              size: stats.size,
            });
          }
        }
      }
    }

    // Upload with bounded concurrency (up to 5 concurrent uploads)
    const CONCURRENCY = 5;
    for (let i = 0; i < pendingUploads.length; i += CONCURRENCY) {
      const chunk = pendingUploads.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (item) => {
          const uploadInfo = await this.uploadAttachmentFile(
            runId,
            item.absPath,
            item.name,
            item.contentType || 'application/octet-stream'
          );
          if (uploadInfo) {
            return {
              file: item.file,
              title: item.title,
              project: item.project,
              status: item.status,
              name: item.name,
              contentType: item.contentType,
              s3Key: uploadInfo.s3Key,
              sizeBytes: item.size,
            };
          }
          return null;
        })
      );
      for (const res of results) {
        if (res) uploadedAttachments.push(res);
      }
    }

    // Prepare ingestion payload
    const payload = {
      runId,
      runName: options.testRunName,
      projectName: this.projectId || options.projectName || 'Default',
      startedAt: options.startTime,
      endedAt: options.endedAt,
      runDurationMs: options.summary.duration,
      runSequentialDurationMs: options.summary.totalSequentialDuration ?? null,
      runTotal: options.summary.total,
      runPassed: options.summary.passed,
      runFlaky: options.summary.flaky ?? 0,
      runFailed: options.summary.failed,
      runSkipped: options.summary.skipped,
      runTimedOut: options.summary.timedOut ?? 0,
      runInterrupted: options.summary.interrupted ?? 0,
      runWorkers: options.summary.workers,
      runProjects: options.summary.numberOfProjects,
      stepAssertions: options.stepCategories?.assertions ?? 0,
      stepActions: options.stepCategories?.actions ?? 0,
      stepNetwork: options.stepCategories?.network ?? 0,
      stepHooks: options.stepCategories?.hooks ?? 0,
      stepWaits: options.stepCategories?.waits ?? 0,
      stepOthers: options.stepCategories?.others ?? 0,
      gitBranch: gitBranch || null,
      gitCommit: gitCommitInfo?.short || null,
      gitCommitFull: gitCommitInfo?.full || null,
      playwrightVersion: options.summary.playwrightVersion ?? null,
      osName: options.summary.osName ?? null,
      testCases: options.testCases.map((tc) => {
        const suite = (tc.describePath?.length ? tc.describePath.join(' > ') : tc.parent) || '';
        const attempts = tc.attempts ?? 1;
        const failedAttempts = tc.failedAttempts?.length ?? 0;
        const passedOnRetry = attempts > 1 && tc.status === 'passed' ? 1 : 0;
        const errorMessage = tc.errors?.[0]?.message ?? null;
        const errorStack = tc.errors?.[0]?.stack ?? null;
        const errorFile = tc.errors?.[0]?.location?.file ?? null;
        const errorLine = tc.errors?.[0]?.location?.line ?? null;

        return {
          id: `${runId}::${tc.project || 'default'}::${tc.fileName}::${tc.title}`,
          file: tc.fileName,
          suite: suite || null,
          title: tc.title,
          project: tc.project || null,
          status: tc.status,
          durationMs: Math.round(tc.duration),
          attempts,
          failedAttempts,
          passedOnRetry,
          errorMessage,
          errorStack,
          errorLine,
          errorFile,
          tags: tc.tags || [],
          stepsJson: tc.steps || [],
          failedAttemptsJson:
            tc.failedAttempts && tc.failedAttempts.length > 0 ? tc.failedAttempts : null,
          stdoutJson: tc.stdout || [],
          stderrJson: tc.stderr || [],
        };
      }),
      attachments: uploadedAttachments,
    };

    const res = await fetch(`${this.serverUrl}/api/v1/runs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Remote ingestion failed with status ${res.status}: ${errText}`);
    }

    return runId;
  }

  /**
   * Retrieves aggregated historical runs from the remote server.
   *
   * @param windowSize - Maximum number of runs to fetch (default: 50).
   * @returns Historical run dataset.
   */
  async getHistoryData(windowSize = 50): Promise<HistoryData> {
    const res = await fetch(`${this.serverUrl}/api/v1/runs?limit=${windowSize}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to query history from remote server: ${res.status}`);
    }

    const { data: runsData = [] } = (await res.json()) as { data: RemoteRunDto[] };

    return {
      generated_at: new Date().toISOString(),
      runs: runsData.map((r: RemoteRunDto) => ({
        run_id: r.id,
        run_name: r.runName,
        started_at: r.startedAt,
        run_duration_ms: r.runDurationMs,
        run_sequential_duration_ms: r.runSequentialDurationMs ?? undefined,
        run_workers: r.runWorkers ?? undefined,
        run_total: r.runTotal,
        run_passed: r.runPassed,
        run_flaky: r.runFlaky ?? 0,
        run_failed: r.runFailed,
        run_skipped: r.runSkipped,
        run_timed_out: r.runTimedOut,
        run_interrupted: r.runInterrupted,
        pass_rate:
          r.runTotal > 0
            ? Math.round(((r.runPassed + (r.runFlaky ?? 0)) / r.runTotal) * 100)
            : null,
        git_branch: r.gitBranch ?? undefined,
        git_commit: r.gitCommit ?? undefined,
        git_commit_full: r.gitCommitFull ?? undefined,
        playwright_version: r.playwrightVersion ?? undefined,
        os_name: r.osName ?? undefined,
      })),
      flaky: [],
      regressions: [],
      slowest: [],
      files: [],
      tests: [],
    };
  }

  /**
   * Reconstructs report data for a specific remote test run, including per-test
   * steps, console output, retry details, and attachments.
   *
   * @param runId - Unique identifier of the test run.
   * @returns ReportData structure for UI hydration, or null if run is not found.
   */
  async getRunReport(runId: string): Promise<ReportData | null> {
    const res = await fetch(`${this.serverUrl}/api/v1/runs/${encodeURIComponent(runId)}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      run?: RemoteRunDto;
      testCases?: RemoteTestCaseDto[];
    };
    if (!json?.run) {
      return null;
    }

    const run = json.run;
    const rawCases = json.testCases || [];

    // Lazy-load per-test details (steps, logs, retries, attachments) with bounded concurrency
    const detailUrls = rawCases.map(
      (tc) =>
        `${this.serverUrl}/api/v1/runs/${encodeURIComponent(runId)}/tests/${encodeURIComponent(
          tc.id
        )}`
    );
    const details = await this.fetchJsonBatch<RemoteTestDetailDto>(detailUrls);

    const testCases: TestCase[] = rawCases.map((tc, i) => {
      const blob = details[i]?.details;
      const steps = toStepList(blob?.stepsJson);
      const rawFailedAttempts = blob?.failedAttemptsJson;
      const failedAttempts =
        Array.isArray(rawFailedAttempts) && rawFailedAttempts.length > 0
          ? (rawFailedAttempts as FailedAttempt[])
          : undefined;
      const stdout = toStrList(blob?.stdoutJson);
      const stderr = toStrList(blob?.stderrJson);

      const attachments: Attachment[] | undefined = details[i]?.attachments?.length
        ? details[i]!.attachments.map((a) => ({
            name: a.name,
            contentType: a.contentType || 'application/octet-stream',
            path: a.url || a.s3Url || null,
            body: a.bodyText ?? null,
          }))
        : undefined;

      return {
        title: tc.title,
        parent: tc.suite || '',
        project: tc.project || '',
        fileName: tc.file,
        status: tc.status,
        duration: tc.durationMs,
        steps,
        errors: tc.errorMessage
          ? [
              {
                name: 'Error',
                message: tc.errorMessage,
                stack: blob?.errorStack || '',
                location: tc.errorLine
                  ? { file: tc.errorFile || '', line: tc.errorLine, column: 0 }
                  : null,
                snippet: '',
                cause: null,
              },
            ]
          : undefined,
        stdout,
        stderr,
        annotations: [],
        attachments,
        tags: tc.tags || [],
        describePath: tc.suite ? tc.suite.split(' > ') : [],
        attempts: tc.attempts,
        failedAttempts,
      };
    });

    return {
      testRun: {
        projectName: run.projectName,
        testRunName: run.runName,
        summary: {
          total: run.runTotal,
          passed: run.runPassed,
          flaky: run.runFlaky ?? 0,
          failed: run.runFailed,
          skipped: run.runSkipped,
          timedOut: run.runTimedOut,
          interrupted: run.runInterrupted,
          duration: run.runDurationMs,
          totalSequentialDuration: run.runSequentialDurationMs || 0,
          startTime: run.startedAt,
          endTime: run.endedAt,
          workers: run.runWorkers || 1,
          numberOfProjects: run.runProjects || 1,
          gitBranch: run.gitBranch || undefined,
          gitCommit: run.gitCommit || undefined,
          gitCommitFull: run.gitCommitFull || undefined,
          playwrightVersion: run.playwrightVersion ?? undefined,
          osName: run.osName ?? undefined,
        },
        suites: buildSuitesFromCases(testCases),
        theme: 'Sage',
      },
    };
  }

  /**
   * Closes any open resources or connections.
   *
   * @returns Resolves when cleanup completes.
   */
  async close(): Promise<void> {
    // No persistent connection to close
  }
}
