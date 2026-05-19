# CLI 参考

## diff-cover

```bash
diff-cover [coverage_files...] [options]
```

覆盖率文件可以是 `lcov.info`，也可以是 Cobertura、Clover、JaCoCo 或通用 XML 报告。

| 选项                         | 说明                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `--format <value>`           | 输出格式，例如 `html:coverage.html,json:coverage.json`。 |
| `--show-uncovered`           | 在控制台报告中显示未覆盖的变更行。                       |
| `--expand-coverage-report`   | 根据上一行命中情况补全报告缺失行。                       |
| `--external-css-file <file>` | 将报告 CSS 写入独立文件，并从 HTML 中引用。              |
| `--src-roots <dirs...>`      | JaCoCo 路径解析使用的源码根目录。                        |

## diff-quality

```bash
diff-quality [reports...] --violations <driver> [options]
```

支持的驱动包括 `eslint`、`pylint`、`flake8`、`shellcheck`、`cppcheck`、`checkstyle` 和 `findbugs`。

| 选项                        | 说明                             |
| --------------------------- | -------------------------------- |
| `--violations <driver>`     | 静态分析驱动，默认 `eslint`。    |
| `--html-report <file>`      | 输出 HTML 报告。                 |
| `--json-report <file>`      | 输出 JSON 报告。                 |
| `--options <options>`       | 传给驱动命令的额外选项。         |
| `--report-root-path <path>` | 用于规范化报告文件路径的根目录。 |

## 共享选项

| 选项                            | 说明                                       |
| ------------------------------- | ------------------------------------------ |
| `--compare-branch <branch>`     | 用于对比的分支或引用，默认 `origin/main`。 |
| `--fail-under <score>`          | diff 得分低于该值时以退出码 1 结束。       |
| `--ignore-staged`               | 忽略已暂存变更。                           |
| `--ignore-unstaged`             | 忽略未暂存变更。                           |
| `--include-untracked`           | 包含未跟踪文件。                           |
| `--exclude <patterns...>`       | 按 glob 排除文件。                         |
| `--include <patterns...>`       | 按 glob 包含文件。                         |
| `--diff-range-notation <range>` | 使用 `...` 或 `..` Git diff 范围。         |
| `--ignore-whitespace`           | 忽略纯空白变更。                           |
| `--config-file <file>`          | 读取 TOML 配置。                           |
| `--diff-file <file>`            | 从保存的 diff 文件读取，而不是执行 Git。   |
| `--total-percent-float`         | 总分保留两位小数。                         |
