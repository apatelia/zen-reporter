---
trigger: always_on
---

# Package Script Invariants

1. **Prefer Package Scripts for Verification**: Always check `package.json` for canonical verification scripts (`npm run typecheck`, `npm run lint`, `npm run build`, `npm test`) before running lower-level tool invocations directly.
2. **Typechecking Standard**: Use `npm run typecheck` (or package manager equivalent) for checking TypeScript types across the project, rather than running sub-config compilation commands (such as `npx tsc -p tsconfig.lib.json`), unless specifically tasked with testing library build output emit.
