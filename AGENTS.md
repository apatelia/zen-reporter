# Agent Rules

## Package Script Invariants

1. **Prefer Package Scripts for Verification**: Always check `package.json` for canonical verification scripts (`npm run typecheck`, `npm run lint`, `npm run build`, `npm test`) before running lower-level tool invocations directly.
2. **Typechecking Standard**: Use `npm run typecheck` (or package manager equivalent) for checking TypeScript types across the project, rather than running sub-config compilation commands (such as `npx tsc -p tsconfig.lib.json`), unless specifically tasked with testing library build output emit.
3. **Dead Code Hygiene**: Enforce clean dependencies and local bindings by running `npm run lint:unused`. Agents must eliminate any and all detected unused imports, variables, or functions to keep the codebase lean and warning-free.
4. **Spell Checking**: Ensure spelling accuracy across code, comments, documentation, and commit messages. Run `npm run spellcheck` (or `npm run lint` if integrated) and resolve all spell checker warnings before committing changes. Add domain-specific terms or valid identifiers to `cspell.json` if needed.
5. **Formatting**: Always check and enforce formatting via package scripts rather than direct tool calls (e.g., avoid invoking `npx prettier` directly). Use `npm run format:check` to verify whether formatting is compliant across the codebase, and run `npm run format` to automatically apply formatting fixes whenever changes are made.

## JSDoc Documentation Requirements

1. **Strict JSDoc for New or Updated Functions**: Every newly added or updated function must have a JSDoc comment block directly above it. The JSDoc must at minimum include:
   - `@param <name> - <description>` for every function parameter (match parameter order; describe type and purpose).
   - `@returns <description>` for the return value (use `@returns {void}` for functions that return nothing).
   - A concise one-line summary of what the function does.
     Apply this to all function styles in the project: function declarations, arrow functions, class methods, and exported helpers. Update existing JSDoc whenever a function's parameters or return type change.

## Test Execution Invariants

1. **Framework Standard**: All automated tests in this repository use Playwright. Do not invoke or attempt to configure other test runners such as `vitest` or `jest`.
2. **Targeted Test Execution Only When Relevant**: When authoring or modifying code/tests, execute only the directly relevant spec or targeted test cases rather than the entire test suite. Run:
   - Specific spec file: `npx playwright test <path/to/spec-file.spec.ts>`
   - Targeted tests by title or tag: `npx playwright test -g "<pattern-or-tag>"`
     Do not execute unrelated test specs (such as `tests/config.spec.ts`) during verification of unrelated features or UI changes.
3. **Intentional Test Failures**: When running the full suite via `npm test` or `npx playwright test`, certain tests are intentionally designed to fail, time out, or flake to generate realistic failure fixtures for the reporter output. Do not attempt to fix or alter intentionally failing tests unless explicitly instructed.
4. **No Full-Suite Verification**: Never run the full test suite (`npm test` or `npx playwright test` without arguments) as a pre-change baseline or post-change verification step. Because intentional failures exist and run times are substantial, always rely on targeted tests (only when modifying relevant tests) and static checks (`npm run typecheck`, `npm run lint:unused`, `npm run format:check`, `npm run spellcheck`).
