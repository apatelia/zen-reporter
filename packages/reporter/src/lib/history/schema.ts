/**
 * Relational schema definitions for SQLite and PostgreSQL.
 * Provides normalized tables for test runs and test case executions,
 * along with a unified view matching RUN_ROW_FIELDS for analytical queries.
 */

export const CREATE_RUNS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS history_runs (
  run_id TEXT PRIMARY KEY,
  run_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  run_duration_ms INTEGER NOT NULL,
  run_sequential_duration_ms INTEGER,
  run_total INTEGER NOT NULL,
  run_passed INTEGER NOT NULL,
  run_failed INTEGER NOT NULL,
  run_skipped INTEGER NOT NULL,
  run_timed_out INTEGER NOT NULL,
  run_interrupted INTEGER NOT NULL,
  run_workers INTEGER,
  run_projects INTEGER,
  step_assertions INTEGER DEFAULT 0,
  step_actions INTEGER DEFAULT 0,
  step_network INTEGER DEFAULT 0,
  step_hooks INTEGER DEFAULT 0,
  step_waits INTEGER DEFAULT 0,
  step_others INTEGER DEFAULT 0,
  git_branch TEXT,
  git_commit TEXT,
  git_commit_full TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_TEST_CASES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS history_test_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  file TEXT NOT NULL,
  suite TEXT,
  title TEXT NOT NULL,
  project TEXT,
  status TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  attempts INTEGER DEFAULT 1,
  failed_attempts INTEGER DEFAULT 0,
  passed_on_retry INTEGER DEFAULT 0,
  error_message TEXT,
  error_stack TEXT,
  error_file TEXT,
  error_line INTEGER,
  tags TEXT,
  steps_json TEXT,
  stdout_json TEXT,
  stderr_json TEXT,
  FOREIGN KEY (run_id) REFERENCES history_runs(run_id) ON DELETE CASCADE
);
`;

export const CREATE_ATTACHMENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS history_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  test_file TEXT NOT NULL,
  test_title TEXT NOT NULL,
  test_status TEXT,
  name TEXT NOT NULL,
  content_type TEXT,
  file_path TEXT NOT NULL,
  body_text TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES history_runs(run_id) ON DELETE CASCADE
);
`;

export const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_history_runs_started ON history_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_tests_run_id ON history_test_cases(run_id);
CREATE INDEX IF NOT EXISTS idx_history_tests_title_status ON history_test_cases(title, status);
CREATE INDEX IF NOT EXISTS idx_history_tests_file ON history_test_cases(file);
CREATE INDEX IF NOT EXISTS idx_hist_att_run_id ON history_attachments(run_id);
CREATE INDEX IF NOT EXISTS idx_hist_att_file_title ON history_attachments(test_file, test_title);
`;

export const CREATE_HISTORY_VIEW_SQL = `
CREATE VIEW IF NOT EXISTS history_view AS
SELECT
  r.run_id,
  r.run_name,
  r.project_name,
  r.started_at,
  r.ended_at,
  r.run_duration_ms,
  r.run_sequential_duration_ms,
  r.run_total,
  r.run_passed,
  r.run_failed,
  r.run_skipped,
  r.run_timed_out,
  r.run_interrupted,
  r.run_workers,
  r.run_projects,
  r.step_assertions,
  r.step_actions,
  r.step_network,
  r.step_hooks,
  r.step_waits,
  r.step_others,
  r.git_branch,
  r.git_commit,
  r.git_commit_full,
  t.file,
  t.suite,
  t.title,
  t.project,
  t.status,
  t.duration_ms,
  t.attempts,
  t.failed_attempts,
  t.passed_on_retry,
  t.error_message,
  t.error_stack,
  t.error_file,
  t.error_line,
  t.tags
FROM history_runs r
LEFT JOIN history_test_cases t ON r.run_id = t.run_id;
`;

export const INIT_SCHEMA_STATEMENTS = [
  CREATE_RUNS_TABLE_SQL,
  CREATE_TEST_CASES_TABLE_SQL,
  CREATE_ATTACHMENTS_TABLE_SQL,
  CREATE_INDEXES_SQL,
  CREATE_HISTORY_VIEW_SQL,
];
