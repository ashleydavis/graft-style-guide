# install-hooks.sh

Installs the checked-in pre-commit hook, `.githooks/pre-commit`, into this clone. Git runs hooks only from the clone's own hooks directory, so every clone runs this once.

```bash
./scripts/install-hooks.sh
```

It takes no arguments.

- It links `.githooks/pre-commit` into the clone's hooks directory, so later edits to the checked-in hook apply straight away.
- It leaves git configuration as it is.
- The hook runs `scripts/test-everything.sh` and refuses the commit when a check fails.
