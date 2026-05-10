use tree_sitter::{Language, Parser, Tree};

pub fn language() -> Language {
    tree_sitter_gram::LANGUAGE.into()
}

pub fn parser() -> Parser {
    let mut p = Parser::new();
    p.set_language(&language()).expect("gram language");
    p
}

pub fn parse(source: &str) -> Tree {
    let mut p = parser();
    p.parse(source, None).expect("parse")
}
