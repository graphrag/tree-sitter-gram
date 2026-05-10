#!/usr/bin/env bash
# Bump all package versions and prepare release artifacts.
#
# Usage:
#   ./scripts/prepare-release.sh --bump patch|minor|major
#   ./scripts/prepare-release.sh 0.4.0
#
# Covers:
#   tree-sitter version  →  package.json, package-lock.json, Cargo.toml (workspace),
#                           pyproject.toml, tree-sitter.json
#   prepare-zed-extension.sh  →  editors/zed/extension.toml version (dev mode)
#   cargo check --workspace   →  validate all Rust crates compile at new version
#
# Note on Zed extension rev:
#   extension.toml needs rev = <release commit SHA> for the Zed extension registry.
#   This script runs prepare-zed-extension.sh in dev mode (correct version, local
#   symlinks). After committing, run the amend step printed below to fix the rev.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 --bump patch|minor|major"
    echo "       $0 <version>"
    exit 1
fi

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
for cmd in tree-sitter cargo node git; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "error: '$cmd' not found on PATH"
        exit 1
    fi
done

if [[ ! -f "$ROOT/grammar.js" ]]; then
    echo "error: run from the tree-sitter-gram repository root"
    exit 1
fi

# ---------------------------------------------------------------------------
# 1. Bump tree-sitter-managed versions
#    Updates: package.json, package-lock.json, Cargo.toml ([workspace.package]),
#             pyproject.toml, tree-sitter.json
# ---------------------------------------------------------------------------
echo "→ Bumping versions..."
cd "$ROOT"
tree-sitter version "$@"

NEW_VERSION=$(node -p "require('./package.json').version")
echo "  version: $NEW_VERSION"

# ---------------------------------------------------------------------------
# 2. Prepare Zed extension (dev mode — version only, symlinks preserved)
#    Run ZED_REPO_MODE=pub after committing (see next steps below) so
#    extension.toml gets the correct release commit SHA in its rev field.
# ---------------------------------------------------------------------------
echo "→ Preparing Zed extension (dev mode)..."
"$SCRIPT_DIR/prepare-zed-extension.sh"

# ---------------------------------------------------------------------------
# 3. Validate the full workspace compiles
# ---------------------------------------------------------------------------
echo "→ Checking workspace..."
cargo check --workspace --quiet
echo "  ok"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "Version $NEW_VERSION ready. Changed files:"
git diff --name-only | sed 's/^/  /'
echo ""
echo "Next steps:"
echo ""
echo "  # 1. Commit the version bump"
echo "  git commit -am \"Release $NEW_VERSION\""
echo ""
echo "  # 2. Fix extension.toml rev to the release commit SHA"
echo "  ZED_REPO_MODE=pub $SCRIPT_DIR/prepare-zed-extension.sh"
echo "  git commit --amend --no-edit"
echo ""
echo "  # 3. Tag and push (CI publishes to crates.io and npm)"
echo "  git tag -a v$NEW_VERSION -m \"Release $NEW_VERSION\""
echo "  git push --follow-tags"
