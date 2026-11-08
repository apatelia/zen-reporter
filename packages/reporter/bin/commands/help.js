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
  npx zr history report                 Generate history.json for server and local history inspection
  npx zr history clean [options]        Clean SQLite history runs and delete orphaned disk attachments
                                          --all                 Remove all historical runs
                                          --recent <N>          Delete the most recent N runs
                                          --keep <N>            Retain latest N runs, deleting older ones
                                          --run-id <ID>         Delete a specific run by ID
                                          --run-name <NAME>     Delete run by unique name (warns if ambiguous)
                                          --dry-run             Preview what would be removed without deleting
                                          --vacuum              Force VACUUM repacking (default for >= 10 runs or --all)
                                          --no-vacuum           Skip VACUUM repacking
                                          -y, --yes             Skip confirmation prompt
  npx zr history vacuum                 Directly repack SQLite history.db with VACUUM to reclaim free space
  npx zr history migrate [--clean]      Migrate historical .jsonl runs into SQLite history.db
  npx zr history query "<SQL>"          Arbitrary SQL; table "runs" = read_json of runs/*.jsonl
`);
}
