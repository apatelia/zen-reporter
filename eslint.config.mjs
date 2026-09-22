import eslintReact from '@eslint-react/eslint-plugin';
import js from '@eslint/js';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: [
      'dist',
      'node_modules',
      'test-results',
      '.playwright',
      'playwright-report',
      'zen-report',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    extends: [
      js.configs.recommended,
      eslintReact.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    plugins: {
      json,
    },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.md'],
    ignores: ['.agents/**/*.md'],
    plugins: {
      markdown,
    },
    language: 'markdown/gfm',
    languageOptions: {
      frontmatter: 'yaml',
    },
    extends: ['markdown/recommended'],
  },
  eslintConfigPrettier,
]);
