mod analyze;
mod elements;
mod parse;
mod record_keys;
mod symbols;
mod top_level;
pub mod utf16;

pub use gram_diagnostics::{Diagnostic, FileResult, LintResult, Position, Range, Severity};
pub use parse::parse;
pub use symbols::SymbolIndex;

pub mod lint {
    use std::path::Path;

    pub use gram_diagnostics::{Diagnostic, Severity};

    pub struct LintOptions {
        pub strict: bool,
    }

    pub fn lint_source(source: &str, _opts: &LintOptions) -> Vec<Diagnostic> {
        let (_, raw) = crate::analyze::analyze_source(source);
        raw.iter().map(|d| crate::analyze::to_public(source, d)).collect()
    }

    pub fn lint_file(path: &Path, opts: &LintOptions) -> anyhow::Result<Vec<Diagnostic>> {
        let source = std::fs::read_to_string(path)?;
        Ok(lint_source(&source, opts))
    }
}
