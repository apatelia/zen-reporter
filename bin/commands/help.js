/**
 * Prints CLI usage instructions and available subcommands to stdout.
 */
export function printHelp() {
  console.log(`
Zen Reporter CLI

Usage:
  npx zr show                           Serve and view the HTML report
  npx zr summary                        Output Markdown summary snippet for current run results
  npx zr env                            Print environment details (versions, OS)
  npx zr history                        List historic runs
  npx zr history runs                   Same as above
  npx zr history flaky                  Tests that failed in some runs and passed in others
  npx zr history regressions            Tests that passed in one run, failed in the next (latest regression per test)
  npx zr history slow [--limit N]       Slowest tests across runs (default 10)
  npx zr history trend                  Per-run pass rate over time
  npx zr history report                 Generate history.json and inject into index.html (History tab)
  npx zr history query "<SQL>"          Arbitrary SQL; table "runs" = read_json of runs/*.jsonl
`);
}
