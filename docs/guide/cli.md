# CLI Reference

## diff-cover

```bash
diff-cover [coverage_files...] [options]
```

Coverage files may be `lcov.info` or XML reports such as Cobertura, Clover, JaCoCo, or generic XML coverage.

| Option                       | Description                                                          |
| ---------------------------- | -------------------------------------------------------------------- |
| `--format <value>`           | Output formats, for example `html:coverage.html,json:coverage.json`. |
| `--show-uncovered`           | Print uncovered changed lines in the console report.                 |
| `--expand-coverage-report`   | Fill missing report lines from previous line hits.                   |
| `--external-css-file <file>` | Write report CSS to a separate file and link it from HTML.           |
| `--src-roots <dirs...>`      | Source roots used for JaCoCo path resolution.                        |

## diff-quality

```bash
diff-quality [reports...] --violations <driver> [options]
```

Supported drivers are `eslint`, `pylint`, `flake8`, `shellcheck`, `cppcheck`, `checkstyle`, and `findbugs`.

| Option                      | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `--violations <driver>`     | Static analysis driver. Default: `eslint`.     |
| `--html-report <file>`      | Write an HTML report.                          |
| `--json-report <file>`      | Write a JSON report.                           |
| `--options <options>`       | Extra options passed to the driver command.    |
| `--report-root-path <path>` | Root path used to normalize report file paths. |

## Shared Options

| Option                          | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `--compare-branch <branch>`     | Branch or ref to compare against. Default: `origin/main`.    |
| `--fail-under <score>`          | Exit with code 1 if the diff score is lower than this value. |
| `--ignore-staged`               | Ignore staged changes.                                       |
| `--ignore-unstaged`             | Ignore unstaged changes.                                     |
| `--include-untracked`           | Include untracked files.                                     |
| `--exclude <patterns...>`       | Exclude files by glob pattern.                               |
| `--include <patterns...>`       | Include files by glob pattern.                               |
| `--diff-range-notation <range>` | Use `...` or `..` Git range notation.                        |
| `--ignore-whitespace`           | Ignore whitespace-only diff changes.                         |
| `--config-file <file>`          | Read TOML configuration.                                     |
| `--diff-file <file>`            | Read a saved diff file instead of running Git.               |
| `--total-percent-float`         | Print total percentages with two decimal places.             |
