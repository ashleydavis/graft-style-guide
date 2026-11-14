#!/usr/bin/env bash
#
# Runs every check whose watched files changed since it last passed, as what-changed reports
# them. Each check records its own pass in its package.json script, so this script only
# decides what to run. The pre-commit hook runs it before every commit.
#
# Usage: ./scripts/test-everything.sh
#

set -euo pipefail

if [ "$#" -gt 0 ]; then
    echo "Usage: ./scripts/test-everything.sh" >&2
    echo "Runs the checks whose files changed since they last passed. It takes no arguments." >&2
    exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
mkdir -p tmp

run_target() {
    case "$1" in
        compile)
            bun run compile 2>&1 | tee tmp/compile.log
            ;;
        e2e)
            bun run test:e2e 2>&1 | tee tmp/e2e.log
            ;;
        *)
            echo "Unknown target \"$1\"." >&2
            return 1
            ;;
    esac
}

TARGETS=()
while IFS= read -r LINE; do
    if [ -n "$LINE" ]; then
        TARGETS+=("$LINE")
    fi
done <<< "$(what-changed targets)"

if [ "${#TARGETS[@]}" -eq 0 ]; then
    echo "Nothing to do."
    exit 0
fi

for TARGET_NAME in "${TARGETS[@]}"; do
    echo "Running: $TARGET_NAME"
    run_target "$TARGET_NAME"
done
