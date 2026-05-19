# Repository Guidelines

## Project Structure & Module Organization

This is a Bun-powered TypeScript package for reporting coverage and quality issues on changed lines. Source files live in `src/`, with CLI entry points such as `src/diff_cover_tool.ts` and `src/diff_quality_tool.ts`. Tests live in `tests/` and mirror the main modules with `*.test.ts` files. Report templates are stored in `templates/`; `scripts/generate_templates.ts` converts them into `src/generated_templates.ts` before builds. Build artifacts are written to `dist/` and should not be edited by hand.

## Build, Test, and Development Commands

- `bun test`: run the Bun test suite in `tests/`.
- `bun run lint`: run type-aware `oxlint` checks.
- `bun run lint:fix`: apply automatic lint fixes where possible.
- `bun run format`: format the repository with `oxfmt`.
- `bun run format:check`: verify formatting without writing changes.
- `bun run build`: regenerate templates and bundle with Rolldown.
- `bun run build:binary`: regenerate templates and create release binaries via `scripts/build_release.ts`.

Run `bun install` after dependency changes. The lockfile is `bun.lock`.

## Coding Style & Naming Conventions

Use TypeScript ES modules and keep imports explicit. The compiler is configured with strict checks, `moduleResolution: "bundler"`, and `allowImportingTsExtensions`, so follow the existing import style. Prefer `camelCase` for functions and variables, `PascalCase` for classes and types, and descriptive module names like `report_generator.ts`. Let `oxfmt` decide indentation and spacing; do not manually reformat unrelated code.

## Testing Guidelines

Tests use Bun's built-in test runner. Add tests under `tests/` using the `<module>.test.ts` pattern, for example `tests/git_diff.test.ts`. Keep fixtures small and local to the test unless they are reusable. When touching parsing, reporting, git diff handling, or CLI behavior, cover both normal output and failure cases. Run `bun test` before submitting changes.

## Commit & Pull Request Guidelines

Recent history uses version commits such as `2.0.5` and conventional prefixes such as `chore:`, `docs:`, `build:`, and `refactor:`. Use short imperative commit messages, and prefer a conventional prefix when the change is not a version bump. Pull requests should include a clear summary, linked issue when applicable, test results (`bun test`, lint/build as relevant), and screenshots or sample report output for user-visible formatting changes.

## Security & Configuration Tips

Do not commit private coverage reports, tokens, or local environment files. Keep generated files in sync by running the build command after editing `templates/`. Avoid editing `dist/` directly; update source or scripts instead.
