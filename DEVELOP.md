# Development

## Install `tree-sitter` CLI

Follow [tree-sitter installation](https://tree-sitter.github.io/tree-sitter/creating-parsers#installation) instructions

## Build testable grammar

```
npx tree-sitter generate
```

## Test

```
npx tree-sitter test
```

Run tests matching a specific filter:
```
npx tree-sitter test -f 'Node'
```

# Publish

## Python

Publish locally.

```
python -m pip install .
```

Publish to pypi with a tagged github commit.

