# diff-cover-ts

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-orange.svg)](https://bun.sh/)
[![Code Style](https://img.shields.io/badge/code%20style-oxlint-green)](https://github.com/oxc-project/oxc)

**高性能 TypeScript 版 [diff_cover](https://github.com/Bachmann1234/diff_cover) 工具**

*自动检测 git diff 中修改过的代码是否缺少测试覆盖率或存在质量问题。*

[English](./README.md) | [简体中文](./README_zh.md)

</div>

---

## 📖 目录

- [简介](#-简介)
- [核心特性](#-核心特性)
- [安装](#-安装)
- [使用方法](#-使用方法)
  - [Diff Cover (增量覆盖率)](#diff-cover-增量覆盖率)
  - [Diff Quality (增量质量检查)](#diff-quality-增量质量检查)
- [开发指南](#-开发指南)
- [许可证](#-许可证)

## 🚀 简介

`diff_cover_ts` 帮助你通过关注**修改过的代码**来保持高质量的代码标准。它不会因为遗留代码的低覆盖率而导致构建失败，而是确保每一次新的提交都符合你的质量要求。

它的工作原理是将当前分支与基础分支（例如 `origin/main`）进行比较，并仅报告修改行的覆盖率或质量缺陷。

## ✨ 核心特性

- **🎯 精准覆盖**: 仅报告 git diff 中修改过的代码行的覆盖率。
- **🛡️ 质量门禁**: 仅对修改过的代码执行 lint 检查。
- **🤖 自动配置**: 无缝检测 `vite.config.ts/js` 或 `vitest.config.ts/js` 以获取覆盖率报告路径。
- **📊 多格式支持**: 兼容 `lcov`、`cobertura`、`clover`、`jacoco` 和通用 XML 报告。
- **⚡ Git 集成**: 内置 git 历史分析功能，精准识别修改行。
- **🚫 阈值检查**: 设置最低分数线，如果覆盖率或质量得分过低，则中断 CI/CD 流程。

## 📦 安装

```bash
# 使用 npm 全局安装 (推荐)
npm install -g diff-cover

# 使用 Bun 全局安装
bun add -g diff-cover

# 项目内安装
npm install diff-cover --save-dev
```

## 🛠 使用方法

### Diff Cover (增量覆盖率)

自动识别 diff 中缺少测试覆盖率的行。

#### ⚡ 自动配置 (推荐)

如果你使用的是 **Vite** 或 **Vitest**，只需运行：

```bash
diff-cover
```

工具会自动解析你的配置文件，定位覆盖率报告并确定格式。

#### 📝 手动使用

你可以显式指定覆盖率报告文件：

```bash
diff-cover coverage/lcov.info
# 或者
diff-cover coverage/cobertura.xml
```

#### ⚙️ 选项

| 选项 | 描述 | 默认值 |
| :--- | :--- | :--- |
| `--compare-branch <branch>` | 用于对比的分支 | `origin/main` |
| `--fail-under <score>` | 如果覆盖率低于此值，则返回非零退出码 | `0` |
| `--show-uncovered` | 在控制台打印未覆盖的行 | `false` |
| `--expand-coverage-report` | 基于上一行的命中情况追加缺失行 | `false` |
| `--ignore-staged` | 忽略 diff 中的已暂存更改 | `false` |
| `--ignore-unstaged` | 忽略 diff 中的未暂存更改 | `false` |
| `--include-untracked` | 在分析中包含未跟踪的文件 | `false` |
| `--exclude <patterns...>` | 排除匹配 glob 模式的文件 | `[]` |
| `--include <patterns...>` | 包含匹配 glob 模式的文件 | `[]` |
| `--html-report <file>` | 在指定路径生成 HTML 报告 | `null` |
| `--json-report <file>` | 在指定路径生成 JSON 报告 | `null` |

---

### Diff Quality (增量质量检查)

运行静态分析工具，并仅报告修改行中的违规项。

```bash
diff-quality report.txt --violations <driver>
```

#### 🔌 支持的驱动程序

- `eslint`
- `pylint`
- `flake8`
- `shellcheck`
- `cppcheck`
- `checkstyle`
- `findbugs`

#### ⚙️ 选项

| 选项 | 描述 | 默认值 |
| :--- | :--- | :--- |
| `--compare-branch <branch>` | 用于对比的分支 | `origin/main` |
| `--fail-under <score>` | 如果质量得分低于此值，则返回非零退出码 | `0` |
| `--include-untracked` | 包含未跟踪的文件 | `false` |
| `--exclude <patterns...>` | 排除匹配 glob 模式的文件 | `[]` |
| `--html-report <file>` | 在指定路径生成 HTML 报告 | `null` |

## 💻 开发指南

### 环境设置

```bash
# 安装依赖
bun install
```

### 测试

```bash
# 运行测试套件
bun test

# 运行带覆盖率的测试
bun test --coverage
```

### 代码质量

我们使用 `oxlint` 进行代码检查，使用 `oxfmt` 进行格式化。通过 `husky` 配置的 Pre-commit 钩子确保代码质量。

```bash
# 代码检查
bun run lint

# 代码格式化
bun run format
```

## 📄 许可证

本项目基于 MIT 许可证开源。
