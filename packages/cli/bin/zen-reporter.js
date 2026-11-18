#!/usr/bin/env node
import { handleEnv } from './commands/env.js';
import { printHelp } from './commands/help.js';
import { handleHistory } from './commands/history.js';
import { runInteractiveMenu } from './commands/menu.js';
import { handleShow } from './commands/show.js';
import { handleSummary } from './commands/summary.js';

const cwd = process.cwd();
const args = process.argv.slice(2);
const isInteractive = args.length === 0 && Boolean(process.stdin.isTTY && process.stdout.isTTY);
const command = args[0] || (isInteractive ? null : 'show');

/**
 * Central CLI entrypoint dispatching commands and handling top-level errors.
 *
 * @returns {Promise<void>} Resolves when command execution completes.
 */
async function main() {
  try {
    if (isInteractive) {
      await runInteractiveMenu(cwd);
    } else if (command === 'show') {
      await handleShow(cwd);
    } else if (command === 'summary') {
      await handleSummary(cwd);
    } else if (command === 'env') {
      await handleEnv(cwd);
    } else if (command === 'history') {
      await handleHistory(args.slice(1), cwd);
    } else if (command === 'help' || command === '--help' || command === '-h') {
      printHelp();
    } else {
      console.error(`✗ Unknown command: "${command}"\n`);
      printHelp();
      process.exitCode = 1;
    }
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.startsWith('✗')) {
      console.error(msg);
    } else {
      console.error(`✗ ${msg}`);
    }
    process.exitCode = 1;
  }
}

main();
