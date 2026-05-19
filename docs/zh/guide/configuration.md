# 配置文件

可以用 TOML 文件把重复的 CLI 参数保存到版本库中。

```toml
[tool.diff_cover]
compare_branch = "origin/main"
fail_under = 90
exclude = ["**/*.test.ts", "dist/**"]
include = ["src/**/*.ts"]

[tool.diff_quality]
violations = "eslint"
compare_branch = "origin/main"
fail_under = 95
exclude = ["dist/**"]
```

运行时指定配置文件：

```bash
diff-cover coverage/lcov.info --config-file pyproject.toml
diff-quality eslint-report.json --config-file pyproject.toml
```

## 命名规则

TOML 使用 snake case，保持和 Python `diff_cover` 配置习惯一致。CLI 内部会把它们转换成 camel case。

示例：

- `compare_branch` 会映射为 `compareBranch`
- `fail_under` 会映射为 `failUnder`
- `ignore_unstaged` 会映射为 `ignoreUnstaged`

## 自动检测

当没有传入覆盖率文件时，`diff-cover` 会依次查找：

1. `vitest.config.ts`
2. `vitest.config.js`
3. `vite.config.ts`
4. `vite.config.js`

它支持 `lcov`、`cobertura`、`clover`、`jacoco` 等常见 reporter，也支持自定义 `reportsDirectory`。
