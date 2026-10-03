#!/usr/bin/env node
import { handleEnv } from './commands/env.js';
import { printHelp } from './commands/help.js';
import { handleHistory } from './commands/history.js';
import { handleShow } from './commands/show.js';
import { handleSummary } from './commands/summary.js';

const cwd = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || 'show';

if (command === 'show') {
  handleShow(cwd);
} else if (command === 'summary') {
  handleSummary(cwd);
} else if (command === 'env') {
  handleEnv(cwd);
} else if (command === 'history') {
  handleHistory(args.slice(1), cwd).catch((e) => {
    console.error('✗ history command failed:', e?.message || e);
    process.exit(1);
  });
} else {
  printHelp();
}
