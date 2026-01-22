# diff-cover-ts

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/diff-cover.svg)](https://www.npmjs.com/package/diff-cover)
[![npm downloads](https://img.shields.io/npm/dm/diff-cover.svg)](https://www.npmjs.com/package/diff-cover)
[![CI](https://github.com/jamesishandsome/diff_cover_ts/actions/workflows/ci.yml/badge.svg)](https://github.com/jamesishandsome/diff_cover_ts/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-orange.svg)](https://bun.sh/)
[![Code Style](https://img.shields.io/badge/code%20style-oxlint-green)](https://github.com/oxc-project/oxc)

**A high-performance TypeScript port of the [diff_cover](https://github.com/Bachmann1234/diff_cover) tool.**

_Automatically find lines of code in your git diff that are missing test coverage or quality checks._

[English](./README.md) | [简体中文](./README_zh.md)

</div>

---

## 📖 Table of Contents

- [Introduction](#-introduction)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
  - [Diff Cover](#diff-cover)
  - [Diff Quality](#diff-quality)
- [Configuration](#-configuration)
- [Development](#-development)
- [License](#-license)

## 🚀 Introduction

`diff_cover_ts` helps you maintain high code quality by focusing on what matters most: **the code you just changed**. Instead of failing builds because of low legacy coverage, this tool ensures that every new commit meets your quality standards.

It works by comparing your current branch with a base branch (e.g., `origin/main`) and reporting coverage/quality gaps only for the modified lines.

## ✨ Features

- **🎯 Precision Coverage**: Report code coverage only for modified lines in your git diff.
- **🛡️ Quality Gate**: Enforce linting checks only on changed code.
- **🤖 Auto-Configuration**: Seamlessly detects `vite.config.ts/js` or `vitest.config.ts/js` to find coverage reports.
- **📊 Multi-Format Support**: Compatible with `lcov`, `cobertura`, `clover`, `jacoco`, and generic XML reports.
- **⚡ Git Integration**: Built-in git history analysis to identify modified lines accurately.
- **🚫 Fail-Under Checks**: Set thresholds to fail CI/CD pipelines if coverage/quality is too low.

## 📦 Installation

```bash
# Using npm (Global)
npm install -g diff-cover

# Using Bun (Global)
bun add -g diff-cover

# Using npm (Dev Dependency)
npm install diff-cover --save-dev
```

## 🛠 Usage

### Diff Cover

Automatically identify lines in your diff that lack test coverage.

#### ⚡ Auto Configuration (Recommended)

If you are using **Vite** or **Vitest**, simply run:

```bash
diff-cover
```

The tool will intelligently parse your configuration files to locate the coverage report and determine the format.

#### 📝 Manual Usage

You can explicitly specify the coverage report files:

```bash
diff-cover coverage/lcov.info
# OR
diff-cover coverage/cobertura.xml
```

#### ⚙️ Options

| Option                      | Description                                                  | Default       |
| :-------------------------- | :----------------------------------------------------------- | :------------ |
| `--compare-branch <branch>` | Branch to compare against                                    | `origin/main` |
| `--fail-under <score>`      | Returns a non-zero exit code if coverage is below this value | `0`           |
| `--show-uncovered`          | Print uncovered lines to the console                         | `false`       |
| `--expand-coverage-report`  | Append missing lines based on previous line hits             | `false`       |
| `--ignore-staged`           | Ignore staged changes in the diff                            | `false`       |
| `--ignore-unstaged`         | Ignore unstaged changes in the diff                          | `false`       |
| `--include-untracked`       | Include untracked files in the analysis                      | `false`       |
| `--exclude <patterns...>`   | Exclude files matching glob patterns                         | `[]`          |
| `--include <patterns...>`   | Include files matching glob patterns                         | `[]`          |
| `--html-report <file>`      | Generate an HTML report at the specified path                | `null`        |
| `--json-report <file>`      | Generate a JSON report at the specified path                 | `null`        |

---

### Diff Quality

Run static analysis tools and report violations only on modified lines.

```bash
diff-quality report.txt --violations <driver>
```

#### 🔌 Supported Drivers

- `eslint`
- `pylint`
- `flake8`
- `shellcheck`
- `cppcheck`
- `checkstyle`
- `findbugs`

#### ⚙️ Options

| Option                      | Description                                                  | Default       |
| :-------------------------- | :----------------------------------------------------------- | :------------ |
| `--compare-branch <branch>` | Branch to compare against                                    | `origin/main` |
| `--fail-under <score>`      | Returns a non-zero exit code if quality score is below value | `0`           |
| `--include-untracked`       | Include untracked files                                      | `false`       |
| `--exclude <patterns...>`   | Exclude files matching glob patterns                         | `[]`          |
| `--html-report <file>`      | Generate an HTML report at the specified path                | `null`        |

## 💻 Development

### Setup

```bash
# Install dependencies
bun install
```

### Testing

```bash
# Run test suite
bun test

# Run tests with coverage
bun test --coverage
```

### Code Quality

We use `oxlint` for linting and `oxfmt` for formatting. Pre-commit hooks via `husky` ensure code quality.

```bash
# Lint code
bun run lint

# Format code
bun run format
```

## 📄 License

This project is licensed under the MIT License.
