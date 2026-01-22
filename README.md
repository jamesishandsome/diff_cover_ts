# diff_cover_ts

A TypeScript port of the [diff_cover](https://github.com/Bachmann1234/diff_cover) tool.

## Installation

```bash
bun install
```

## Usage

### Diff Cover

Automatically find diff lines that need test coverage.

```bash
bun src/diff_cover_tool.ts coverage.xml
```

Options:

- `--compare-branch <branch>`: Branch to compare (default: origin/main)
- `--fail-under <score>`: Returns an error code if coverage is below this value
- `--html-report <file>`: Write HTML report to this file
- `--json-report <file>`: Write JSON report to this file

### Diff Quality

Automatically find diff lines that need quality checks.

```bash
bun src/diff_quality_tool.ts report.txt --violations <driver>
```

Supported drivers:

- `eslint`
- `pylint`
- `flake8`
- `shellcheck`
- `cppcheck`
- `checkstyle`
- `findbugs`

Options:

- `--compare-branch <branch>`: Branch to compare (default: origin/main)
- `--fail-under <score>`: Returns an error code if quality score is below this value
- `--include-untracked`: Include untracked files in the check

## Development

Run tests:

```bash
bun test
```
