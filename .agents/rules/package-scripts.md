---
trigger: always_on
---

# Package Script Invariants

1. **Prefer Package Scripts for Verification**: Always check `package.json` for canonical verification scripts (`npm run typecheck`, `npm run lint`, `npm run build`, `npm test`) before running lower-level tool invocations directly.
2. **Typechecking Standard**: Use `npm run typecheck` (or package manager equivalent) for checking TypeScript types across the project, rather than running sub-config compilation commands (such as `npx tsc -p tsconfig.lib.json`), unless specifically tasked with testing library build output emit.
3. **Dead Code Hygiene**: Enforce clean dependencies and local bindings by running `npm run lint:unused`. Agents must eliminate any and all detected unused imports, variables, or functions to keep the codebase lean and warning-free.
4. **Spell Checking**: Ensure spelling accuracy across code, comments, documentation, and commit messages. Run `npm run spellcheck` (or `npm run lint` if integrated) and resolve all spell checker warnings before committing changes. Add domain-specific terms or valid identifiers to `cspell.json` if needed.
5. **Formatting**: Always check and enforce formatting via package scripts rather than direct tool calls (e.g., avoid invoking `npx prettier` directly). Use `npm run format:check` to verify whether formatting is compliant across the codebase, and run `npm run format` to automatically apply formatting fixes whenever changes are made.
