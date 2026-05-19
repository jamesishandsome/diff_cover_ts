# diff-cover-ts

TypeScript implementation of `diff-cover` for checking coverage and quality only on lines changed in a Git diff.

[English](./README.md) | [简体中文](./README_zh.md)

## What It Does

`diff-cover` helps teams enforce standards on new code without failing builds because of old uncovered code. It compares the current work against a base branch, finds changed lines, and reports only the missing coverage or quality violations in that diff.

Two CLI tools are published:

- `diff-cover`: checks changed lines against coverage reports.
- `diff-quality`: checks changed lines against static analysis reports.

## Installation

```bash
npm install --save-dev diff-cover
# or
bun add -d diff-cover
```

Global installation is also supported:

```bash
npm install -g diff-cover
```

## Quick Start

For Vite or Vitest projects with an existing coverage report:

```bash
diff-cover
```

Manual coverage report input:

```bash
diff-cover coverage/lcov.info --compare-branch origin/main --fail-under 90
diff-cover coverage/cobertura.xml --format html:coverage.html,json:coverage.json
```

Quality report input:

```bash
diff-quality eslint-report.json --violations eslint --fail-under 95
diff-quality pylint_report.txt --violations pylint --html-report quality.html
```

## Supported Reports

Coverage formats:

- `lcov.info`
- Cobertura XML
- Clover XML
- JaCoCo XML
- generic XML coverage reports

Quality drivers:

- `eslint`
- `pylint`
- `flake8`
- `shellcheck`
- `cppcheck`
- `checkstyle`
- `findbugs`

## Common Options

| Option                      | Description                                                |
| --------------------------- | ---------------------------------------------------------- |
| `--compare-branch <branch>` | Base branch for diff comparison. Default: `origin/main`.   |
| `--fail-under <score>`      | Exit with code 1 if the diff score is below the threshold. |
| `--ignore-staged`           | Exclude staged changes from the diff.                      |
| `--ignore-unstaged`         | Exclude unstaged changes from the diff.                    |
| `--include-untracked`       | Include untracked files in the diff.                       |
| `--include <patterns...>`   | Only analyze files matching glob patterns.                 |
| `--exclude <patterns...>`   | Exclude files matching glob patterns.                      |
| `--diff-file <file>`        | Read a saved diff instead of running Git.                  |
| `--total-percent-float`     | Print totals with two decimal places.                      |

## Configuration

Use a TOML config file with tool-specific sections:

```toml
[tool.diff_cover]
compare_branch = "origin/main"
fail_under = 90
exclude = ["**/*.test.ts"]

[tool.diff_quality]
violations = "eslint"
fail_under = 95
```

Then run:

```bash
diff-cover coverage/lcov.info --config-file pyproject.toml
diff-quality eslint-report.json --config-file pyproject.toml
```

## Roadmap

Planned updates focus on making the tool easier to adopt in CI, more accurate in large repositories, and more useful as a reusable TypeScript package.

Near-term priorities:

- Improve CI integration with automatic base branch detection for GitHub Actions, GitLab CI, Azure DevOps, and other common environments.
- Add PR-friendly outputs such as GitHub annotations, SARIF reports, and compact Markdown summaries for review comments.
- Improve diagnostics for common setup problems, including missing coverage files, shallow CI checkouts, empty diffs, and unsupported report formats.
- Expand documentation with practical recipes for Vitest, Jest/Istanbul, Python coverage.py, ESLint, and common CI workflows.

Mid-term priorities:

- Add more quality report drivers, including Biome, Ruff, mypy, TypeScript compiler output, stylelint, and golangci-lint.
- Improve monorepo and path mapping support for projects where source paths differ between Git diffs and coverage reports.
- Enhance HTML reports with filtering, sorting, search, collapsible passing files, and clearer per-file summaries.
- Add configuration conveniences such as `.diff-cover.toml`, `package.json` config, generated config templates, and JSON schema support.

Longer-term ideas:

- Expose a stable library API so other tools can parse reports, compute diff coverage, and generate reports without shelling out to the CLI.
- Add baseline support to block only newly introduced coverage gaps or quality violations.
- Improve performance for large reports with caching, streaming XML parsing, and optional timing diagnostics.
- Explore local development workflows such as watch mode and editor-friendly output.

## Development

```bash
bun install
bun test
bun run lint
bun run format:check
bun run build
```

Build release binaries:

```bash
bun run build:binary
```

Limit local binary builds to selected targets:

```bash
BINARY_TARGETS=bun-windows-x64 bun run build:binary
# PowerShell: $env:BINARY_TARGETS="bun-windows-x64"; bun run build:binary
```

Run the documentation site locally:

```bash
bun run docs:dev
```

Build documentation:

```bash
bun run docs:build
```

## Release Notes for Maintainers

- `bun run build` regenerates templates and bundles the npm package.
- `bun run build:binary` creates platform binaries in `dist/`.
- `prepublishOnly` runs the package build before `npm publish`.
- CI runs tests, lint, formatting checks, package build, documentation build, and binary build.
- The `Deploy Docs` workflow publishes the VitePress build to the `docs` branch on pushes to `main` or `master`.

## License

MIT
