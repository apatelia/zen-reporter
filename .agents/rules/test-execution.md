---
trigger: always_on
---

# Test Execution Invariants

1. **Framework Standard**: All automated tests in this repository use Playwright. Do not invoke or attempt to configure other test runners such as `vitest` or `jest`.
2. **Targeted Test Execution Only When Relevant**: When authoring or modifying code/tests, execute only the directly relevant spec or targeted test cases rather than the entire test suite. Run:
   - Specific spec file: `npx playwright test <path/to/spec-file.spec.ts>`
   - Targeted tests by title or tag: `npx playwright test -g "<pattern-or-tag>"`
   Do not execute unrelated test specs (such as `tests/config.spec.ts`) during verification of unrelated features or UI changes.
3. **Intentional Test Failures**: When running the full suite via `npm test` or `npx playwright test`, certain tests are intentionally designed to fail, time out, or flake to generate realistic failure fixtures for the reporter output. Do not attempt to fix or alter intentionally failing tests unless explicitly instructed.
4. **No Full-Suite Verification**: Never run the full test suite (`npm test` or `npx playwright test` without arguments) as a pre-change baseline or post-change verification step. Because intentional failures exist and run times are substantial, always rely on targeted tests (only when modifying relevant tests) and static checks (`npm run typecheck`, `npm run lint:unused`, `npm run format:check`, `npm run spellcheck`).
