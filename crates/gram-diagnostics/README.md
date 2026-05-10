# gram-diagnostics

Shared LSP-compatible diagnostic types used by [`gram-data`](https://crates.io/crates/gram-data) and [`cypher-data`](https://crates.io/crates/cypher-data).

## Why it exists

Both `gram-data` and `cypher-data` produce diagnostics from linting `.gram` and `.cypher` files. Tools like [`relate`](https://github.com/relateby/relate-cli) that delegate to multiple linters need a single `Diagnostic` type regardless of which engine ran. Depending on this crate avoids a conversion layer.

## Types

| Type | Description |
|------|-------------|
| `Severity` | `Error`, `Warning`, `Information`, `Hint` |
| `Position` | `line: u32`, `character: u32` (0-based, UTF-16 columns — LSP wire format) |
| `Range` | `start: Position`, `end: Position` |
| `Diagnostic` | `severity`, `rule`, `message`, `range`, optional `code` |
| `FileResult` | `path` + `Vec<Diagnostic>` |
| `LintResult` | Top-level JSON envelope (`schema_version`, `tool`, `files`) |

All types implement `Debug`, `Clone`, `Serialize`, `Deserialize`.

## Usage

```toml
[dependencies]
gram-diagnostics = "0.3"
```

```rust
use gram_diagnostics::{Diagnostic, Severity, Position, Range};
```

This crate contains only types and derives — no parsing logic.
