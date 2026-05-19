# 快速开始

`diff-cover-ts` 提供两个命令行工具：

- `diff-cover`：检查变更行的测试覆盖率。
- `diff-quality`：检查变更行的静态分析问题。

## 安装

```bash
npm install --save-dev diff-cover
```

或使用 Bun：

```bash
bun add -d diff-cover
```

## 覆盖率门禁

先用测试框架生成覆盖率报告，再执行：

```bash
diff-cover coverage/lcov.info --compare-branch origin/main --fail-under 90
```

如果项目使用 Vite 或 Vitest，`diff-cover` 可以从 `vite.config.*` 或 `vitest.config.*` 自动查找常见覆盖率报告：

```bash
diff-cover
```

## 质量门禁

先运行 linter 或静态分析工具，再把报告传给 `diff-quality`：

```bash
diff-quality eslint-report.json --violations eslint --fail-under 95
```

## 输出报告

生成 HTML 和 JSON 覆盖率报告：

```bash
diff-cover coverage/lcov.info --format html:coverage.html,json:coverage.json
```

生成 HTML 质量报告：

```bash
diff-quality eslint-report.json --violations eslint --html-report quality.html
```
