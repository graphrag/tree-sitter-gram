# Publishing to crates.io

This project publishes four crates to crates.io (in dependency order):
- `tree-sitter-gram` — The main grammar crate
- `gram-diagnostics` — Shared LSP-compatible diagnostic types
- `gram-data` — Unified CLI and library (`gram` binary)
- `gram-lsp` — Language server library and binary

## Prerequisites

### 1. Create a crates.io account

1. Go to [crates.io](https://crates.io)
2. Sign in with your GitHub account
3. Complete your profile

### 2. Generate an API token

1. Go to [Account Settings > API Tokens](https://crates.io/me)
2. Click "New Token"
3. Give it a name (e.g., "GitHub Actions Publishing")
4. Copy the token (you'll only see it once!)

### 3. Add the token to GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings > Secrets and variables > Actions**
3. Click "New repository secret"
4. Name: `CARGO_REGISTRY_TOKEN`
5. Value: Paste your crates.io API token
6. Click "Add secret"

## Publishing Process

Publishing is automated via GitHub Actions when you push a git tag:

1. **Prepare the release**:
   ```bash
   ./scripts/prepare-release.sh --bump patch   # or minor / major
   git commit -am "Release X.Y.Z"
   git tag -a vX.Y.Z -m "Release X.Y.Z"
   git push --follow-tags
   ```

2. **GitHub Actions will automatically** (in order):
   - Publish `tree-sitter-gram`
   - Publish `gram-diagnostics` (no path deps to swap)
   - Swap path deps and publish `gram-data`
   - Swap path deps and publish `gram-lsp`

## Manual Publishing (if needed)

```bash
VERSION="0.3.9"

# 1. Publish tree-sitter-gram
cargo publish --package tree-sitter-gram

# 2. Publish gram-diagnostics (no path deps)
cargo publish --package gram-diagnostics

# 3. Swap path deps → version deps in gram-data, publish, restore
sed -i "s|tree-sitter-gram = { path = \"../..\" }|tree-sitter-gram = \"$VERSION\"|" tools/gram/Cargo.toml
sed -i "s|gram-diagnostics = { path = \"../../crates/gram-diagnostics\" }|gram-diagnostics = \"$VERSION\"|" tools/gram/Cargo.toml
cargo publish --package gram-data --allow-dirty
sed -i "s|tree-sitter-gram = \"$VERSION\"|tree-sitter-gram = { path = \"../..\" }|" tools/gram/Cargo.toml
sed -i "s|gram-diagnostics = \"$VERSION\"|gram-diagnostics = { path = \"../../crates/gram-diagnostics\" }|" tools/gram/Cargo.toml

# 4. Swap path deps → version deps in gram-lsp, publish, restore
sed -i "s|gram-data = { path = \"../gram\" }|gram-data = \"$VERSION\"|" tools/lsp/Cargo.toml
sed -i "s|gram-diagnostics = { path = \"../../crates/gram-diagnostics\" }|gram-diagnostics = \"$VERSION\"|" tools/lsp/Cargo.toml
cargo publish --package gram-lsp --allow-dirty
sed -i "s|gram-data = \"$VERSION\"|gram-data = { path = \"../gram\" }|" tools/lsp/Cargo.toml
sed -i "s|gram-diagnostics = \"$VERSION\"|gram-diagnostics = { path = \"../../crates/gram-diagnostics\" }|" tools/lsp/Cargo.toml
```

## Important Notes

- **Publish order matters**: `tree-sitter-gram` → `gram-diagnostics` → `gram-data` → `gram-lsp`
- **Path dependencies**: The workflow automatically swaps path deps for version deps before publishing and restores them after
- **Dry run**: Use `cargo publish --dry-run` to verify before publishing
- **Yanking**: `cargo yank --vers <version> <package-name>`
