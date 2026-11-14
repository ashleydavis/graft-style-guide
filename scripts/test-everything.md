# test-everything.sh

Runs every check whose watched files changed since it last passed, so a run costs only the checks a change affects. The pre-commit hook runs it before every commit.

```bash
./scripts/test-everything.sh
```

It takes no arguments.

- It asks `what-changed targets` which checks to run. `what-changed.yaml` lists the checks and the files each one watches.
- `compile` runs `bun run compile`, the TypeScript type check. Its output goes to `tmp/compile.log`.
- `e2e` runs `bun run test:e2e`, the Playwright end-to-end tests. Its output goes to `tmp/e2e.log`.
- Each check's `package.json` script records its pass with `what-changed baseline capture` after it succeeds, so a check started any other way records its pass too.
- It prints "Nothing to do." when every check is up to date, and exits with a non-zero code when a check fails.
