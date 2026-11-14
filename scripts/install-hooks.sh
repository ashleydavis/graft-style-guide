#!/usr/bin/env bash
#
# Installs the checked-in pre-commit hook into this clone by linking .githooks/pre-commit into
# the clone's hooks directory. Run it once per clone. The link leaves git configuration as it is.
#
# Usage: ./scripts/install-hooks.sh
#

set -euo pipefail

if [ "$#" -gt 0 ]; then
    echo "Usage: ./scripts/install-hooks.sh" >&2
    echo "Links .githooks/pre-commit into this clone's hooks directory. It takes no arguments." >&2
    exit 1
fi

REPO_DIR="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$(git rev-parse --path-format=absolute --git-common-dir)/hooks"

mkdir -p "$HOOKS_DIR"
ln -sfn "$REPO_DIR/.githooks/pre-commit" "$HOOKS_DIR/pre-commit"
echo "Installed the pre-commit hook: $HOOKS_DIR/pre-commit -> $REPO_DIR/.githooks/pre-commit"
