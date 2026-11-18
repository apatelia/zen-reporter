import { execFileSync } from 'child_process';

/**
 * Resolves current Git branch name from CI environment variables or local Git CLI.
 *
 * @returns Current Git branch name, or undefined if not in a repository.
 */
export function getGitBranch(): string | undefined {
  // 1. Check common CI environment variables
  const ciBranch =
    process.env.GITHUB_HEAD_REF || // Pull request target branch in GitHub Actions
    process.env.GITHUB_REF_NAME || // Branch or tag name in GitHub Actions
    process.env.CI_COMMIT_REF_NAME || // GitLab CI
    process.env.GIT_BRANCH || // Jenkins / Generic
    process.env.BRANCH_NAME; // Generic CI

  if (ciBranch && ciBranch.trim()) {
    return ciBranch.trim();
  }

  // 2. Fall back to local git CLI invocation
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 2000,
    }).trim();

    if (branch && branch !== 'HEAD') {
      return branch;
    }
  } catch {
    /* ignore git failure */
  }

  return undefined;
}

/**
 * Resolves current Git short and full commit hashes from CI environment variables or local Git CLI.
 *
 * @returns Object containing short (7-char) and full (40-char) commit hashes, or empty object if not in a repository.
 */
export function getGitCommit(): { short?: string; full?: string } {
  // 1. Check common CI environment variables
  const ciSha =
    process.env.GITHUB_SHA ||
    process.env.CI_COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA;

  if (ciSha && ciSha.trim()) {
    const full = ciSha.trim();
    return { short: full.slice(0, 7), full };
  }

  // 2. Fall back to local git CLI invocation
  try {
    const full = execFileSync('git', ['rev-parse', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 2000,
    }).trim();

    if (full) {
      return { short: full.slice(0, 7), full };
    }
  } catch {
    /* ignore git failure */
  }

  return {};
}
