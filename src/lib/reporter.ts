import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  detectPackageManager
} from "./dataProcessor";
import type {
  ReportData,
  ResultSummary,
  TestCase as TestCaseModel,
  TestRun as TestRunModel,
  TestSuite
} from "./types";
import {
  buildSuitesFromCases,
  convertPlaywrightSteps,
  sanitizeAnsi
} from "./utils";

function getDescribePath (test: TestCase): string[] {
  const path: string[] = [];
  let curr: Suite | undefined = test.parent;
  while (curr) {
    if (curr.type === "file" || curr.type === "project" || curr.type === "root") {
      break;
    }
    if (curr.type === "describe" && curr.title) {
      path.unshift(curr.title);
    }
    curr = curr.parent;
  }
  return path;
}

interface ReporterConfig {
  outputDir: string;
  packageManager: string;
}

function resolveConfig (
  rawConfig?: Record<string, unknown>,
  cwd: string = process.cwd(),
): ReporterConfig {
  const outputDir = rawConfig?.outputDir
    ? String(rawConfig.outputDir)
    : "zen-report";
  const packageManager = detectPackageManager(cwd);

  return { outputDir, packageManager };
}

class ZenReporter implements Reporter {
  private config!: FullConfig;
  private reportConfig!: ReporterConfig;
  private testCaseMap = new Map<string, TestCaseModel>();
  private startTime = "";
  private testCases: TestCaseModel[] = [];
  private options?: Record<string, unknown>;

  constructor (options?: Record<string, unknown>) {
    this.options = options;
  }

  private buildSuites (): TestSuite[] {
    return buildSuitesFromCases(this.testCases);
  }

  onBegin (config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.reportConfig = resolveConfig(
      this.options || (config as any).reporterConfig,
    );
    this.startTime = new Date().toISOString();
    this.testCaseMap.clear();
    this.testCases = [];
  }

  onTestBegin (test: TestCase, _result: TestResult): void {
    const fileName =
      test.parent.location?.file.replace(process.cwd(), "") || "unknown file";

    const testCase: TestCaseModel = {
      title: test.title,
      parent: test.parent.title,
      project: test.parent.project()?.name || "unknown",
      fileName: fileName,
      status: "passed",
      duration: 0,
      steps: [],
      errors: [],
      tags: test.tags.flatMap((tag) => tag.replace("@", "")),
      describePath: getDescribePath(test),
    };

    testCase.tags?.push(testCase.project);

    this.testCaseMap.set(test.id, testCase);
  }

  onTestEnd (test: TestCase, result: TestResult): void {
    const testCase = this.testCaseMap.get(test.id);
    if (!testCase) return;

    testCase.status =
      result.status === "passed"
        ? "passed"
        : result.status === "failed"
          ? "failed"
          : result.status === "skipped"
            ? "skipped"
            : result.status === "timedOut"
              ? "timedOut"
              : "passed";
    testCase.duration = result.duration;

    if (result.error) {
      testCase.errors = [
        {
          name: "Error",
          message: sanitizeAnsi(result.error.message || ""),
          stack: sanitizeAnsi(result.error.stack || ""),
        },
      ];
    }

    if (result.steps && result.steps.length > 0) {
      testCase.steps = convertPlaywrightSteps(result.steps);
    }

    this.testCases.push(testCase);
  }

  onEnd (_result: FullResult): void {
    const endTime = new Date().toISOString();
    const totalDuration = this.testCases.reduce(
      (sum, tc) => sum + tc.duration,
      0,
    );

    const passed = this.testCases.filter(
      (tc) => tc.status === "passed",
    ).length;
    const failed = this.testCases.filter(
      (tc) => tc.status === "failed",
    ).length;
    const skipped = this.testCases.filter(
      (tc) => tc.status === "skipped",
    ).length;
    const timedOut = this.testCases.filter(
      (tc) => tc.status === "timedOut",
    ).length;
    const numberOfProjects = this.config.projects.length;

    const summary: ResultSummary = {
      total: this.testCases.length,
      passed,
      failed,
      skipped,
      timedOut,
      startTime: this.startTime,
      endTime,
      duration: totalDuration,
      numberOfProjects,
    };

    const suites = this.buildSuites();

    const testRun: TestRunModel = {
      summary,
      suites,
    };

    const reportData: ReportData = { testRun };

    const cwd = process.cwd();
    const normalizedCwd = cwd.endsWith("/") ? cwd.slice(0, -1) : cwd;
    const outputDir = path.resolve(normalizedCwd, this.reportConfig.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, "report.json");
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), "utf8");

    // Generate the single-file HTML report
    try {
      const pm = this.reportConfig.packageManager;
      const buildCmd =
        pm === "pnpm"
          ? "pnpm exec tsx ../zen-reporter/scripts/generate_report.ts"
          : pm === "yarn"
            ? "yarn exec tsx ../zen-reporter/scripts/generate_report.ts"
            : pm === "bun"
              ? "bunx tsx ../zen-reporter/scripts/generate_report.ts"
              : "npx tsx ../zen-reporter/scripts/generate_report.ts";

      const reportRoot = path.resolve(normalizedCwd, "..", "zen-reporter");
      execSync(buildCmd, {
        cwd: reportRoot,
        stdio: "inherit",
        env: { ...process.env, PW_REPORTER_OUTPUT: this.reportConfig.outputDir },
      });

      // Copy generated HTML to output directory
      const srcHtml = path.join(reportRoot, this.reportConfig.outputDir, "index.html");
      const destHtml = path.join(outputDir, "index.html");
      if (fs.existsSync(srcHtml)) {
        fs.copyFileSync(srcHtml, destHtml);
        console.log(`\n✓ Report generated: ${destHtml}`);
        console.log(`\n💡 Run "${getShowReportCommand(pm)}" to view the report`);
      }
    } catch (err) {
      console.error(
        "Report generation failed, keeping report.json:",
        err,
      );
    }
  }
}

export function getShowReportCommand (pm?: string, cwd: string = process.cwd()): string {
  const manager = pm || detectPackageManager(cwd);
  switch (manager) {
    case "pnpm":
      return "pnpm zen-reporter show";
    case "yarn":
      return "yarn zen-reporter show";
    case "bun":
      return "bunx zen-reporter show";
    default:
      return "npx zen-reporter show";
  }
}

export default ZenReporter;
