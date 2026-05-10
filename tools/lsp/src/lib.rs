pub mod lsp;

pub use gram_data::{parse, SymbolIndex};
pub use gram_data::lint::{LintOptions, lint_source};
pub use gram_data::utf16;

/// Run the language server on stdio (JSON-RPC over stdin/stdout).
pub async fn run_stdio() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    lsp::run_stdio().await
}
