# Getting Started

`diff-cover-ts` provides two command line tools:

- `diff-cover` checks coverage on changed lines.
- `diff-quality` checks static analysis violations on changed lines.

## Install

```bash
npm install --save-dev diff-cover
```

or with Bun:

```bash
bun add -d diff-cover
```

## Coverage Gate

Generate a coverage report with your test runner, then run:

```bash
diff-cover coverage/lcov.info --compare-branch origin/main --fail-under 90
```

For Vite or Vitest projects, `diff-cover` can detect common coverage reports from `vite.config.*` or `vitest.config.*`:

```bash
diff-cover
```

## Quality Gate

Run your linter or analyzer first, then pass its report to `diff-quality`:

```bash
diff-quality eslint-report.json --violations eslint --fail-under 95
```

## Reports

Generate HTML and JSON coverage reports:

```bash
diff-cover coverage/lcov.info --format html:coverage.html,json:coverage.json
```

Generate an HTML quality report:

```bash
diff-quality eslint-report.json --violations eslint --html-report quality.html
```
