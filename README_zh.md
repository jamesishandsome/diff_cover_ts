# diff-cover-ts

`diff-cover` 的 TypeScript 实现，用于只检查 Git diff 中变更行的覆盖率和代码质量。

[English](./README.md) | [简体中文](./README_zh.md)

## 作用

`diff-cover` 适合在已有项目中做增量质量门禁：它不会因为历史代码覆盖率低而阻塞构建，而是比较当前分支和基准分支，只报告本次变更行上的覆盖率缺口或质量问题。

当前发布两个 CLI：

- `diff-cover`：基于覆盖率报告检查变更行。
- `diff-quality`：基于静态分析报告检查变更行。

## 安装

```bash
npm install --save-dev diff-cover
# 或
bun add -d diff-cover
```

也可以全局安装：

```bash
npm install -g diff-cover
```

## 快速开始

如果项目使用 Vite 或 Vitest，并且已经生成覆盖率报告：

```bash
diff-cover
```

手动指定覆盖率报告：

```bash
diff-cover coverage/lcov.info --compare-branch origin/main --fail-under 90
diff-cover coverage/cobertura.xml --format html:coverage.html,json:coverage.json
```

检查质量报告：

```bash
diff-quality eslint-report.json --violations eslint --fail-under 95
diff-quality pylint_report.txt --violations pylint --html-report quality.html
```

## 支持的报告

覆盖率格式：

- `lcov.info`
- Cobertura XML
- Clover XML
- JaCoCo XML
- 通用 XML 覆盖率报告

质量检查驱动：

- `eslint`
- `pylint`
- `flake8`
- `shellcheck`
- `cppcheck`
- `checkstyle`
- `findbugs`

## 常用选项

| 选项                        | 说明                                     |
| --------------------------- | ---------------------------------------- |
| `--compare-branch <branch>` | 用于对比的基准分支，默认 `origin/main`。 |
| `--fail-under <score>`      | diff 得分低于阈值时返回非零退出码。      |
| `--ignore-staged`           | 不分析已暂存变更。                       |
| `--ignore-unstaged`         | 不分析未暂存变更。                       |
| `--include-untracked`       | 将未跟踪文件纳入分析。                   |
| `--include <patterns...>`   | 只分析匹配 glob 的文件。                 |
| `--exclude <patterns...>`   | 排除匹配 glob 的文件。                   |
| `--diff-file <file>`        | 从保存的 diff 文件读取，而不是执行 Git。 |
| `--total-percent-float`     | 总分保留两位小数。                       |

## 配置文件

可以使用 TOML 配置工具参数：

```toml
[tool.diff_cover]
compare_branch = "origin/main"
fail_under = 90
exclude = ["**/*.test.ts"]

[tool.diff_quality]
violations = "eslint"
fail_under = 95
```

运行时指定配置文件：

```bash
diff-cover coverage/lcov.info --config-file pyproject.toml
diff-quality eslint-report.json --config-file pyproject.toml
```

## Roadmap

后续更新会重点放在 CI 接入体验、大型仓库的准确性，以及作为 TypeScript 工具库复用这几个方向。

近期优先级：

- 改进 CI 集成，自动识别 GitHub Actions、GitLab CI、Azure DevOps 等环境中的基准分支。
- 增加更适合 PR 审查的输出格式，例如 GitHub annotations、SARIF 报告和精简 Markdown 评论摘要。
- 优化常见配置问题的错误提示，包括覆盖率文件缺失、CI shallow checkout、diff 为空、报告格式不支持等场景。
- 补充实战文档，覆盖 Vitest、Jest/Istanbul、Python coverage.py、ESLint 和常见 CI 工作流。

中期优先级：

- 增加更多质量报告驱动，例如 Biome、Ruff、mypy、TypeScript 编译器输出、stylelint 和 golangci-lint。
- 改进 monorepo 和路径映射支持，处理 Git diff 路径与覆盖率报告路径不一致的项目。
- 增强 HTML 报告，支持过滤、排序、搜索、折叠已通过文件，以及更清晰的文件级摘要。
- 增加配置便利性，例如 `.diff-cover.toml`、`package.json` 配置、配置模板生成和 JSON schema 支持。

长期方向：

- 暴露稳定的库 API，让其他工具可以直接解析报告、计算 diff 覆盖率并生成报告，而不必调用 CLI。
- 增加 baseline 支持，只阻止新引入的覆盖率缺口或质量问题。
- 面向大型报告优化性能，例如缓存、流式 XML 解析和可选的耗时诊断。
- 探索本地开发工作流，例如 watch 模式和更适合编辑器集成的输出。

## 开发

```bash
bun install
bun test
bun run lint
bun run format:check
bun run build
```

构建发布用二进制文件：

```bash
bun run build:binary
```

本地可以限定二进制构建目标：

```bash
BINARY_TARGETS=bun-windows-x64 bun run build:binary
# PowerShell: $env:BINARY_TARGETS="bun-windows-x64"; bun run build:binary
```

本地运行文档站：

```bash
bun run docs:dev
```

构建文档站：

```bash
bun run docs:build
```

## 维护者发布说明

- `bun run build` 会重新生成模板并打包 npm 文件。
- `bun run build:binary` 会在 `dist/` 下生成多平台二进制文件。
- `prepublishOnly` 会在 `npm publish` 前执行包构建。
- CI 会执行测试、lint、格式检查、包构建、文档构建和二进制构建。
- `Deploy Docs` workflow 会在推送到 `main` 或 `master` 时，将 VitePress 构建结果发布到 `docs` 分支。

## 许可证

MIT
