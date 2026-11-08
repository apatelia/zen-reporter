import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { handleEnv } from './env.js';
import { printHelp } from './help.js';
import { handleHistory } from './history.js';
import { handleShow } from './show.js';
import { handleSummary } from './summary.js';

/**
 * Handles the interactive Clean sub-flow.
 *
 * @param {string} cwd - Working directory.
 * @returns {Promise<void>}
 */
async function interactiveCleanMenu(cwd) {
  const cleanType = await clack.select({
    message: `Select cleanup mode: ${pc.dim('(Esc to go back)')}`,
    options: [
      {
        value: 'select',
        label: 'Select from List',
        hint: 'Browse runs table and pick Sr. No.(s) to delete',
      },
      {
        value: 'keep',
        label: 'Keep Latest N Runs',
        hint: 'Retain latest N runs, delete older ones',
      },
      { value: 'recent', label: 'Delete Recent N Runs', hint: 'Delete the most recent N runs' },
      {
        value: 'all',
        label: 'Delete All Runs',
        hint: 'Wipe all historical test runs and attachments',
      },
      { value: 'cancel', label: '← Cancel', hint: 'Return to history menu' },
    ],
  });

  if (clack.isCancel(cleanType) || cleanType === 'cancel') {
    return;
  }

  if (cleanType === 'select') {
    await handleHistory(['clean'], cwd);
  } else if (cleanType === 'keep') {
    const count = await clack.text({
      message: `How many latest runs to retain? ${pc.dim('(Esc to go back)')}`,
      initialValue: '25',
      validate: (val) => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num <= 0) return 'Please enter a positive integer.';
      },
    });
    if (clack.isCancel(count)) return;
    await handleHistory(['clean', '--keep', count], cwd);
  } else if (cleanType === 'recent') {
    const count = await clack.text({
      message: `How many recent runs to delete? ${pc.dim('(Esc to go back)')}`,
      initialValue: '1',
      validate: (val) => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num <= 0) return 'Please enter a positive integer.';
      },
    });
    if (clack.isCancel(count)) return;
    await handleHistory(['clean', '--recent', count], cwd);
  } else if (cleanType === 'all') {
    const sure = await clack.confirm({
      message: `${pc.red('Are you sure you want to delete ALL historical runs? This cannot be undone!')} ${pc.dim('(Esc to go back)')}`,
      initialValue: false,
    });
    if (clack.isCancel(sure) || !sure) {
      clack.log.info('Cleanup cancelled.');
      return;
    }
    await handleHistory(['clean', '--all'], cwd);
  }
}

/**
 * Handles the interactive History submenu.
 *
 * @param {string} cwd - Working directory.
 * @returns {Promise<void>}
 */
async function interactiveHistoryMenu(cwd) {
  while (true) {
    const action = await clack.select({
      message: `History Options: ${pc.dim('(Esc to go back)')}`,
      options: [
        { value: 'runs', label: 'Runs', hint: 'Show historic test runs' },
        {
          value: 'flaky',
          label: 'Flaky Tests',
          hint: 'Tests that passed in some runs and failed in others',
        },
        {
          value: 'regressions',
          label: 'Regressions',
          hint: 'Tests that passed previously and failed in latest',
        },
        { value: 'slow', label: 'Slow Tests', hint: 'Top slowest test executions across runs' },
        { value: 'trend', label: 'Trend', hint: 'Per-run pass rates over time' },
        {
          value: 'report',
          label: 'Generate Report',
          hint: 'Build aggregate history.json for report viewer',
        },
        {
          value: 'clean',
          label: 'Clean History',
          hint: 'Interactive cleanup of old or selected test runs',
        },
        {
          value: 'vacuum',
          label: 'Vacuum Database',
          hint: 'Reclaim unused disk space in history.db',
        },
        {
          value: 'migrate',
          label: 'Migrate JSONL',
          hint: 'Migrate legacy .jsonl runs into SQLite',
        },
        { value: 'back', label: '← Back', hint: 'Return to main menu' },
      ],
    });

    if (clack.isCancel(action) || action === 'back') {
      break;
    }

    console.log();

    try {
      if (action === 'runs') {
        await handleHistory(['runs', '--interactive'], cwd);
      } else if (action === 'flaky') {
        await handleHistory(['flaky', '--interactive'], cwd);
      } else if (action === 'regressions') {
        await handleHistory(['regressions', '--interactive'], cwd);
      } else if (action === 'slow') {
        const limitInput = await clack.text({
          message: `Number of slow tests to display: ${pc.dim('(Esc to go back)')}`,
          initialValue: '10',
          validate: (val) => {
            const num = parseInt(val, 10);
            if (isNaN(num) || num <= 0) return 'Please enter a positive integer.';
          },
        });
        if (clack.isCancel(limitInput)) {
          continue;
        }
        await handleHistory(['slow', '--limit', limitInput], cwd);
      } else if (action === 'trend') {
        await handleHistory(['trend', '--interactive'], cwd);
      } else if (action === 'report') {
        const s = clack.spinner();
        s.start('Generating history report (history.json)...');
        await handleHistory(['report'], cwd);
        s.stop('History report generated successfully.');
      } else if (action === 'clean') {
        await interactiveCleanMenu(cwd);
      } else if (action === 'vacuum') {
        const s = clack.spinner();
        s.start('Optimizing and repacking history.db (VACUUM)...');
        await handleHistory(['vacuum'], cwd);
        s.stop('Database optimization complete.');
      } else if (action === 'migrate') {
        const cleanChoice = await clack.confirm({
          message: `Delete source JSONL files after successful migration? ${pc.dim('(Esc to go back)')}`,
          initialValue: false,
        });
        if (clack.isCancel(cleanChoice)) {
          continue;
        }
        const migrateArgs = cleanChoice ? ['migrate', '--clean'] : ['migrate'];
        await handleHistory(migrateArgs, cwd);
      }
    } catch (err) {
      clack.log.error(err?.message || String(err));
    }

    console.log();
  }
}

/**
 * Main interactive CLI menu entrypoint.
 *
 * @param {string} cwd - Working directory.
 * @returns {Promise<void>}
 */
export async function runInteractiveMenu(cwd) {
  clack.intro(pc.cyan(pc.bold('Zen Reporter CLI')));

  let running = true;

  while (running) {
    const selected = await clack.select({
      message: `What would you like to do? ${pc.dim('(Esc to exit)')}`,
      options: [
        { value: 'show', label: 'Show Report', hint: 'Serve and open the HTML report in browser' },
        {
          value: 'history',
          label: 'History',
          hint: 'Browse runs, flaky tests, regressions, trends & cleanup',
        },
        {
          value: 'summary',
          label: 'Summary',
          hint: 'Output markdown summary snippet for latest run',
        },
        { value: 'env', label: 'Environment', hint: 'Print OS, Node.js and Playwright versions' },
        { value: 'help', label: 'Help', hint: 'Show CLI command usage and options' },
        { value: 'exit', label: 'Exit', hint: 'Quit Zen Reporter CLI' },
      ],
    });

    if (clack.isCancel(selected) || selected === 'exit') {
      clack.outro(pc.dim('Goodbye!'));
      process.exit(0);
    }

    console.log();

    try {
      if (selected === 'show') {
        await handleShow(cwd);
        running = false;
        break;
      } else if (selected === 'history') {
        await interactiveHistoryMenu(cwd);
      } else if (selected === 'summary') {
        await handleSummary(cwd);
      } else if (selected === 'env') {
        await handleEnv(cwd);
      } else if (selected === 'help') {
        printHelp();
      }
    } catch (err) {
      clack.log.error(err?.message || String(err));
    }

    console.log();
  }

  clack.outro(pc.dim('Done.'));
}
