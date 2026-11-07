import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  serial,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Multi-tenant organizations or teams.
 */
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Tenant API keys for authenticating report uploads and history queries.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull().unique(),
    name: text('name').notNull(),
    revoked: boolean('revoked').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_api_keys_tenant').on(table.tenantId),
    index('idx_api_keys_hash').on(table.keyHash),
  ]
);

/**
 * Test Runs recorded for a tenant.
 */
export const runs = pgTable(
  'runs',
  {
    id: text('id').primaryKey(), // runId (e.g. 2026-11-04T12-00-00-unit-tests-shard1)
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    runName: text('run_name').notNull(),
    projectName: text('project_name').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
    runDurationMs: integer('run_duration_ms').notNull(),
    runSequentialDurationMs: integer('run_sequential_duration_ms'),
    runTotal: integer('run_total').notNull(),
    runPassed: integer('run_passed').notNull(),
    runFailed: integer('run_failed').notNull(),
    runSkipped: integer('run_skipped').notNull(),
    runTimedOut: integer('run_timed_out').default(0).notNull(),
    runInterrupted: integer('run_interrupted').default(0).notNull(),
    runWorkers: integer('run_workers'),
    runProjects: integer('run_projects'),
    stepAssertions: integer('step_assertions').default(0).notNull(),
    stepActions: integer('step_actions').default(0).notNull(),
    stepNetwork: integer('step_network').default(0).notNull(),
    stepHooks: integer('step_hooks').default(0).notNull(),
    stepWaits: integer('step_waits').default(0).notNull(),
    stepOthers: integer('step_others').default(0).notNull(),
    gitBranch: text('git_branch'),
    gitCommit: text('git_commit'),
    gitCommitFull: text('git_commit_full'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_runs_tenant_started').on(table.tenantId, table.startedAt),
    index('idx_runs_project').on(table.tenantId, table.projectName),
  ]
);

/**
 * Lightweight test case execution metadata.
 * Kept lean so querying run tests or search queries is fast.
 */
export const testCases = pgTable(
  'test_cases',
  {
    id: text('id').primaryKey(), // Deterministic: `${runId}::${file}::${title}` or generated
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    file: text('file').notNull(),
    suite: text('suite'),
    title: text('title').notNull(),
    project: text('project'),
    status: text('status').notNull(),
    durationMs: integer('duration_ms').notNull(),
    attempts: integer('attempts').default(1).notNull(),
    failedAttempts: integer('failed_attempts').default(0).notNull(),
    passedOnRetry: integer('passed_on_retry').default(0).notNull(),
    errorMessage: text('error_message'),
    errorLine: integer('error_line'),
    errorFile: text('error_file'),
    tags: jsonb('tags').$type<string[]>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_test_cases_run').on(table.runId),
    index('idx_test_cases_tenant_file').on(table.tenantId, table.file),
    index('idx_test_cases_status').on(table.runId, table.status),
  ]
);

/**
 * Heavy blob details for a test case (stack trace, step breakdowns, console stdout/stderr).
 * Lazy loaded only when a test card is expanded.
 */
export const testDetails = pgTable('test_details', {
  testId: text('test_id')
    .primaryKey()
    .references(() => testCases.id, { onDelete: 'cascade' }),
  errorStack: text('error_stack'),
  stepsJson: jsonb('steps_json'),
  stdoutJson: jsonb('stdout_json'),
  stderrJson: jsonb('stderr_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Binary & text attachments (screenshots, videos, traces).
 */
export const attachments = pgTable(
  'attachments',
  {
    id: serial('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    testId: text('test_id').references(() => testCases.id, { onDelete: 'cascade' }),
    testFile: text('test_file').notNull(),
    testTitle: text('test_title').notNull(),
    testStatus: text('test_status'),
    name: text('name').notNull(),
    contentType: text('content_type'),
    s3Key: text('s3_key').notNull(),
    s3Url: text('s3_url'),
    bodyText: text('body_text'),
    sizeBytes: integer('size_bytes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_attachments_run').on(table.runId),
    index('idx_attachments_test').on(table.testId),
  ]
);

// Table Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  apiKeys: many(apiKeys),
  runs: many(runs),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [runs.tenantId],
    references: [tenants.id],
  }),
  testCases: many(testCases),
  attachments: many(attachments),
}));

export const testCasesRelations = relations(testCases, ({ one }) => ({
  run: one(runs, {
    fields: [testCases.runId],
    references: [runs.id],
  }),
  details: one(testDetails, {
    fields: [testCases.id],
    references: [testDetails.testId],
  }),
}));
