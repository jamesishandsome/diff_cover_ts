# Development

This repository uses Bun for tests and scripts, Rolldown for package bundling, and VitePress for documentation.

## Setup

```bash
bun install
```

## Verification

```bash
bun test
bun run lint
bun run format:check
bun run build
bun run docs:build
```

## Release Builds

Build npm package output:

```bash
bun run build
```

Build standalone binaries:

```bash
bun run build:binary
```

Limit local builds to selected targets:

```bash
BINARY_TARGETS=bun-windows-x64 bun run build:binary
# PowerShell: $env:BINARY_TARGETS="bun-windows-x64"; bun run build:binary
```

Binary builds fail the process if any target fails, so CI catches partial releases.

## Documentation

Start the docs site locally:

```bash
bun run docs:dev
```

Preview the production build:

```bash
bun run docs:preview
```

English pages live at `docs/`. Chinese pages live at `docs/zh/`.
