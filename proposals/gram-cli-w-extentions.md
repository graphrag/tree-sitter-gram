# `gram` CLI with Extensions

**Status:** Proposal (summary of discussion)
**Scope:** `tools/gram-lint`, `tools/lsp`, and a new unified `gram` binary.

---

## 1. Motivation

Two separate CLI tools currently exist:

| Tool | Purpose | Notable capabilities |
|------|---------|----------------------|
| `gram-lint` | Parse error linter | stdin, `-e` inline expressions, `--tree` s-expression output |
| `gram-lsp` | LSP server + file checker | `check` subcommand, JSON output, directory traversal, full diagnostics |

`gram-lsp check` largely supersedes `gram-lint`, but each tool has unique features the other lacks. Users must know which tool to reach for, and the surface area grows with every new capability added as a separate binary.

A unified `gram` CLI consolidates these and provides a principled home for future sub-commands.

---

## 2. Design

### Base binary

`gram` is a lightweight base binary. It owns a small set of built-in sub-commands and dispatches unknown sub-commands to external binaries on `$PATH`.

Built-in sub-commands (initial):

| Sub-command | Replaces | Notes |
|-------------|---------|-------|
| `gram check` | `gram-lint` + `gram-lsp check` | stdin, `-e`, `--tree`, `--json`, directory traversal |
| `gram extension` | — | install, list, remove extensions |
| `gram skill` | — | install/remove self-describing skill bundle into AI coding agents |

### First-party extensions

Heavier capabilities (LSP server, future language tooling) ship as optional extensions. The LSP server becomes:

```
gram lsp stdio     # start LSP server over JSON-RPC
```

installed via:

```
gram extension install lsp
```

### Sub-command dispatch

Unknown sub-commands fall through to a `gram-*` binary search on `$PATH`, following the same pattern as `cargo` and `git`:

```
gram lsp stdio  →  exec gram-lsp stdio
gram foo bar    →  exec gram-foo bar
```

Built-in sub-commands take priority. This gives third parties a natural extension point without coordination.

---

## 3. Cargo features for compile-time bundling

For users who build from source or want a single self-contained binary, Cargo features allow extensions to be compiled in:

```toml
[features]
default = []
lsp = ["dep:tokio", "dep:tower-lsp", "dep:gram-lsp"]
```

```
cargo install gram --features lsp
```

This is optional — the external binary model works without it.

---

## 4. Extension discovery and installation

### Registry: a curated manifest

A `extensions.toml` manifest (hosted in this repo or a dedicated `gram-data/gram-extensions` repo) lists known extensions:

```toml
[[extension]]
name = "lsp"
description = "Language server protocol support"
github = "gram-data/tree-sitter-gram"
bin = "gram-lsp"
```

`gram extension list` fetches the manifest. No custom server is required.

### Installation: prebuilt binaries from GitHub Releases

Extensions publish platform-specific binaries as GitHub Release artifacts following a standard naming convention:

```
gram-lsp-x86_64-unknown-linux-musl.tar.gz
gram-lsp-aarch64-apple-darwin.tar.gz
gram-lsp-x86_64-pc-windows-msvc.zip
```

`gram extension install lsp`:
1. Reads the manifest to find the GitHub repo
2. Queries the GitHub Releases API for the latest (or pinned) version
3. Detects the current platform target triple
4. Downloads and unpacks the binary to `~/.gram/bin/`

This requires no Rust toolchain — only `gram` itself.

### Release automation: `cargo-dist`

[cargo-dist](https://github.com/axodotdev/cargo-dist) automates building and uploading platform artifacts to GitHub Releases. Adding it to `gram-lsp` (and future extensions) is the primary setup cost per extension.

---

## 5. CI/CD usage

```yaml
- name: Install gram
  run: curl -fsSL https://github.com/gram-data/tree-sitter-gram/releases/latest/download/gram-installer.sh | sh

- name: Install lsp extension
  run: gram extension install lsp

- name: Lint gram files
  run: gram check **/*.gram
```

No Rust or cargo required. The binary download takes seconds.

Version pinning:

```yaml
- run: gram extension install lsp@0.3.6
```

---

## 6. Migration path

1. Create `tools/gram/` — the new base binary with `check` and `extension` sub-commands
2. Migrate `gram-lint` features into `gram check` (stdin, `-e`, `--tree`)
3. Add `gram-lsp` features to `gram check` (`--json`, directory traversal)
4. Wire up subprocess dispatch for `gram lsp` → `gram-lsp`
5. Add `cargo-dist` to `gram-lsp` release workflow
6. Add the manifest and implement `gram extension install`
7. Deprecate standalone `gram-lint` binary

---

## 7. Open questions

- Where should `~/.gram/bin/` be added to `$PATH`? (installer script, shell profile, or documented manual step)
- Should `gram extension install` support a lockfile for reproducible environments?
- Is `gram check` the right name, or `gram lint`? (`check` aligns with `cargo check`; `lint` is more familiar for non-Rust users)

---

## 8. `gram skill` — self-describing agent skill bundle

### Motivation

AI coding agents (Claude Code, Cursor, Windsurf, Copilot, etc.) need accurate CLI reference to drive `gram` correctly. Embedding a SKILL.md in the binary and providing a one-command install keeps every agent in sync with the exact build they're using — no retraining or manual documentation updates required. Inspired by the same mechanism in `neo4j-cli`.

### Standard: Agent Skills (agentskills.io)

This feature follows the [Agent Skills open standard](https://agentskills.io). A skill is a directory containing a `SKILL.md` file. The cross-client convention for skill directories is `.agents/skills/<name>/`, scanned by all compliant agents at both project-level and user-level:

| Scope | Path | Purpose |
|-------|------|---------|
| Project | `.agents/skills/gram/` | Skills checked into a repository |
| User | `~/.agents/skills/gram/` | Skills available across all projects |

All compliant agents scan `.agents/skills/` automatically, so installing to the standard location makes the skill visible to every agent without any per-agent configuration.

### Canonical source and discovery

The skill source lives at the cross-client standard location within the repo:

```
.agents/skills/gram/SKILL.md     ← canonical source, committed to the repo
```

This serves double duty: it is the **project-level skill** for contributors working in this repo (agents pick it up automatically), and it is the **source of truth** embedded in the binary at build time. Skill registries and discovery tools that crawl GitHub for `.agents/skills/` find it here directly — no separate distribution repo is needed.

At build time, `build.rs` reads `.agents/skills/gram/SKILL.md`, substitutes `{{version}}` with `CARGO_PKG_VERSION`, and writes the result to `$OUT_DIR/SKILL.md`. The binary embeds that versioned copy via `include_str!()`.

### Installation paths

Two paths lead to the same result:

| Path | How the skill arrives |
|------|-----------------------|
| **Skill-first** | User discovers via a skill registry → agent installs to `.agents/skills/gram/` → skill content guides them to install `gram` |
| **CLI-first** | User installs `gram` binary → `gram skill install` copies the embedded, version-stamped bundle to `~/.agents/skills/gram/SKILL.md` |

The skill body includes a brief **Installation** section so agents following the skill-first path know how to get the binary:

```markdown
## Installation

If `gram` is not yet installed:

    # macOS / Linux (curl installer)
    curl -fsSL https://github.com/gram-data/tree-sitter-gram/releases/latest/download/gram-installer.sh | sh

    # or via cargo
    cargo install gram-data

After install, run `gram skill install` to get a version-accurate copy of this skill.
```

### Interface

```
gram skill install           # copy embedded bundle to ~/.agents/skills/gram/SKILL.md
gram skill install --project # copy to .agents/skills/gram/SKILL.md in cwd
gram skill remove            # remove ~/.agents/skills/gram/SKILL.md
gram skill remove --project  # remove from cwd
gram skill list              # show installed locations and version state
gram skill list --json       # machine-readable output
```

Examples:

```
$ gram skill list
  scope    path                                installed  version
  user     ~/.agents/skills/gram/SKILL.md     yes        0.3.6
  project  .agents/skills/gram/SKILL.md       no         —

$ gram skill install
✓ installed gram skill to ~/.agents/skills/gram/SKILL.md (v0.3.6)

$ gram skill install --project
✓ installed gram skill to .agents/skills/gram/SKILL.md (v0.3.6)
```

### How it works

1. **Canonical file**: `.agents/skills/gram/SKILL.md` in the repo root is the single source of truth. It is committed, reviewed, and updated alongside code changes.

2. **Build-time embedding**: `build.rs` in `tools/gram/` reads the canonical file (at `../../.agents/skills/gram/SKILL.md` relative to the crate), substitutes `{{version}}` with `CARGO_PKG_VERSION`, and writes to `$OUT_DIR/SKILL.md`. The binary embeds it with `include_str!(concat!(env!("OUT_DIR"), "/SKILL.md"))`.

3. **External discovery**: Skill registries crawl GitHub for `.agents/skills/*/SKILL.md`. The canonical file is indexed directly — no extra registration step needed beyond ensuring the repo is public.

4. **Installation**: `gram skill install` writes the embedded (version-stamped) bundle to `~/.agents/skills/gram/SKILL.md`. All compliant agents running on the user's machine will find it there. `--project` writes to `.agents/skills/gram/SKILL.md` in the current working directory instead.

5. **Version tracking**: The bundle includes a `version` field in its frontmatter. `gram skill list` compares the installed version against the running binary, flagging stale installs.

### Skill bundle content (SKILL.md)

The bundle follows the Agent Skills format — YAML frontmatter with `name` and `description` (loaded at agent startup for progressive disclosure), plus a full markdown body (loaded only when the skill is activated):

```markdown
---
name: gram
description: >
  gram is a graph notation tool. Use it to check .gram files for parse and
  semantic errors. Run `gram check <path>` for files/dirs, `gram check -e
  '<expr>'` for inline expressions. Use --json for machine-readable output.
version: {{version}}
---

## Installation

If `gram` is not yet installed:

    curl -fsSL https://github.com/gram-data/tree-sitter-gram/releases/latest/download/gram-installer.sh | sh
    # or: cargo install gram-data

After install, run `gram skill install` to get a version-accurate copy of this skill.

## Commands

### gram check [OPTIONS] [PATHS]...
Validate .gram files for parse and semantic errors.

Options:
  -e, --expression <EXPR>   Check an inline expression instead of a file
  --json                    Output diagnostics as JSON (schema_version: 1)
  --tree                    Print the parse tree as an s-expression
  --strict                  Treat warnings as errors
  [PATHS]...                Files, directories, or omit for stdin

Exit codes: 0 = no errors, 1 = errors found, 2 = invocation error

### gram extension <SUBCOMMAND>
Manage gram extensions.

  gram extension install <NAME>[@VERSION]   Download and install an extension
  gram extension list [--installed] [--available] [--json]
  gram extension remove <NAME>

Extensions are binaries installed to ~/.gram/bin/. After installation,
`gram <name>` dispatches to the installed binary automatically.

### gram <unknown-subcommand> [ARGS]...
Unknown subcommands are dispatched to `gram-<subcommand>` on $PATH.
Built-in subcommands always take priority.

## Common patterns

# Check all .gram files in a directory tree
gram check src/

# CI/CD: exit non-zero on any error, structured output for tooling
gram check --json --strict **/*.gram

# Validate a quick inline snippet
gram check -e '(a:Person)-[:KNOWS]->(b:Person)'

# Install the LSP server extension
gram extension install lsp
gram lsp stdio    # starts the language server
```

### Implementation notes

- Canonical source: `.agents/skills/gram/SKILL.md` at the repo root; `build.rs` references it at `../../.agents/skills/gram/SKILL.md` relative to `tools/gram/`.
- `{{version}}` placeholder in the source is replaced with `CARGO_PKG_VERSION` by `build.rs` before embedding; the committed file keeps the literal placeholder so it stays diff-clean between releases.
- `gram skill list --json` outputs an array: `[{ "scope": "user", "path": "~/.agents/skills/gram/SKILL.md", "installed": true, "version": "0.3.6" }, ...]`.
- `gram skill install` creates the target directory (`~/.agents/skills/gram/`) if it does not exist.
- No per-agent enumeration is needed: the `.agents/skills/` convention is honored by all compliant agents automatically.

### Migration / relation to `gram extension`

`gram skill` is a built-in, not an extension. The skill bundle describes the base binary's own commands, so it must ship with the binary rather than be fetched from a registry. Extensions may optionally provide their own supplementary skill files under `.agents/skills/<extension-name>/` (a future concern).
