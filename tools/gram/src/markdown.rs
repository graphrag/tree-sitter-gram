use crate::analyze;
use crate::lint::LintOptions;
use gram_diagnostics::Diagnostic;

pub struct Snippet {
    /// The extracted gram source text (fence delimiters excluded).
    pub source: String,
    /// 0-based line number of the opening fence (` ```gram `) in the host document.
    pub fence_start_line: usize,
}

/// Extract all ` ```gram ` fenced blocks from a Markdown document.
pub fn extract_snippets(doc_source: &str) -> Vec<Snippet> {
    let mut snippets = Vec::new();
    let mut in_fence = false;
    let mut fence_start = 0usize;
    let mut buf = String::new();

    for (line_no, line) in doc_source.lines().enumerate() {
        let trimmed = line.trim();
        if !in_fence {
            // Opening fence: ```gram or ```gram followed by optional whitespace
            if is_gram_fence_open(trimmed) {
                in_fence = true;
                fence_start = line_no;
                buf.clear();
            }
        } else {
            // Closing fence: a line of only backticks (3+)
            if is_fence_close(trimmed) {
                snippets.push(Snippet { source: buf.clone(), fence_start_line: fence_start });
                in_fence = false;
            } else {
                buf.push_str(line);
                buf.push('\n');
            }
        }
    }
    snippets
}

/// Lint all ` ```gram ` snippets in a Markdown document.
///
/// Returns one `(Snippet, diagnostics)` pair per fenced block. Diagnostic ranges
/// are relative to the snippet source. To map back to host-document line numbers
/// add `snippet.fence_start_line + 1` to each diagnostic's line values.
pub fn lint_markdown(doc_source: &str, _opts: &LintOptions) -> Vec<(Snippet, Vec<Diagnostic>)> {
    extract_snippets(doc_source)
        .into_iter()
        .map(|snippet| {
            let (_, raw) = analyze::analyze_source(&snippet.source);
            let diags = raw.iter().map(|d| analyze::to_public(&snippet.source, d)).collect();
            (snippet, diags)
        })
        .collect()
}

fn is_gram_fence_open(trimmed: &str) -> bool {
    // Match ```gram or ~~~gram (with optional trailing whitespace)
    for prefix in ["```", "~~~"] {
        if let Some(rest) = trimmed.strip_prefix(prefix) {
            let lang = rest.trim();
            if lang.eq_ignore_ascii_case("gram") {
                return true;
            }
        }
    }
    false
}

fn is_fence_close(trimmed: &str) -> bool {
    (trimmed.starts_with("```") || trimmed.starts_with("~~~"))
        && trimmed.chars().all(|c| c == '`' || c == '~')
        && trimmed.len() >= 3
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_gram_fence() {
        let md = "# Hello\n\n```gram\n(a)-[:KNOWS]->(b)\n```\n";
        let snippets = extract_snippets(md);
        assert_eq!(snippets.len(), 1);
        assert_eq!(snippets[0].source.trim(), "(a)-[:KNOWS]->(b)");
        assert_eq!(snippets[0].fence_start_line, 2);
    }

    #[test]
    fn ignores_non_gram_fences() {
        let md = "```cypher\nMATCH (n) RETURN n\n```\n\n```gram\n(a)\n```\n";
        let snippets = extract_snippets(md);
        assert_eq!(snippets.len(), 1);
        assert_eq!(snippets[0].source.trim(), "(a)");
    }

    #[test]
    fn multiple_fences() {
        let md = "```gram\n(a)\n```\n\nSome text.\n\n```gram\n(b)\n```\n";
        let snippets = extract_snippets(md);
        assert_eq!(snippets.len(), 2);
        assert_eq!(snippets[0].source.trim(), "(a)");
        assert_eq!(snippets[1].source.trim(), "(b)");
    }

    #[test]
    fn lint_valid_snippet_no_diagnostics() {
        let md = "```gram\n(alice)-[:KNOWS]->(bob)\n```\n";
        let results = lint_markdown(md, &LintOptions { strict: false });
        assert_eq!(results.len(), 1);
        assert!(results[0].1.is_empty());
    }

    #[test]
    fn lint_invalid_snippet_has_diagnostics() {
        let md = "```gram\n(((\n```\n";
        let results = lint_markdown(md, &LintOptions { strict: false });
        assert_eq!(results.len(), 1);
        assert!(!results[0].1.is_empty());
    }
}
