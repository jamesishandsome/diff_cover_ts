# Configuration

Use a TOML file to keep repeated CLI options in version control.

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

Run with:

```bash
diff-cover coverage/lcov.info --config-file pyproject.toml
diff-quality eslint-report.json --config-file pyproject.toml
```

## Naming Rules

TOML keys use snake case, matching the Python `diff_cover` convention. The CLI normalizes them to camel case internally.

Examples:

- `compare_branch` maps to `compareBranch`
- `fail_under` maps to `failUnder`
- `ignore_unstaged` maps to `ignoreUnstaged`

## Auto Detection

When no coverage file is passed, `diff-cover` looks for coverage settings in:

1. `vitest.config.ts`
2. `vitest.config.js`
3. `vite.config.ts`
4. `vite.config.js`

It supports common reporter values such as `lcov`, `cobertura`, `clover`, and `jacoco`, plus custom `reportsDirectory` values.
