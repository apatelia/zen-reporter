#!/usr/bin/env node
/**
 * Copies the built zen-ui report template (index.html and hashed favicon
 * assets) into the reporter's dist/ folder so the published bundle stays
 * self-contained. Resolves the template from the @arpanp/zen-ui workspace
 * dependency instead of a hard-coded relative path or hashed asset name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Resolves the dist directory of a workspace package by its package.json.
 * @param {string} specifier - Package name to resolve (e.g. '@arpanp/zen-ui').
 * @returns {string} Absolute path to the resolved package's dist directory.
 */
function resolveUiDistDir(specifier) {
  const pkgJsonPath = require.resolve(`${specifier}/package.json`);
  return path.join(path.dirname(pkgJsonPath), 'dist');
}

/**
 * Copies the UI template assets into the reporter dist directory.
 * @param {string} uiDistDir - Absolute path to packages/ui/dist.
 * @param {string} reporterDistDir - Absolute path to packages/reporter/dist.
 * @returns {void} Copies index.html and all favicon-*.svg assets.
 */
function copyTemplate(uiDistDir, reporterDistDir) {
  fs.mkdirSync(reporterDistDir, { recursive: true });

  const indexHtml = path.join(uiDistDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    throw new Error(
      'zen-ui dist/index.html not found — run `npm run build -w @arpanp/zen-ui` before building the reporter.'
    );
  }
  fs.copyFileSync(indexHtml, path.join(reporterDistDir, 'index.html'));

  const favicons = fs
    .readdirSync(uiDistDir)
    .filter((name) => name.startsWith('favicon-') && name.endsWith('.svg'));
  for (const name of favicons) {
    fs.copyFileSync(path.join(uiDistDir, name), path.join(reporterDistDir, name));
  }
}

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
copyTemplate(resolveUiDistDir('@arpanp/zen-ui'), path.resolve(scriptsDir, '..', 'dist'));
