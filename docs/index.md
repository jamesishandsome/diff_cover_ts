---
layout: home

hero:
  name: diff-cover-ts
  text: Diff-based coverage and quality gates
  tagline: Check only the lines changed by your branch, not the entire legacy codebase.
  image:
    src: /diff-cover-mark.svg
    alt: diff-cover-ts mark
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: CLI Reference
      link: /guide/cli

features:
  - title: Incremental coverage
    details: Use lcov or XML coverage reports to identify uncovered lines only in the current diff.
  - title: Quality gates
    details: Report ESLint, Pylint, Flake8, ShellCheck, Cppcheck, Checkstyle, or FindBugs violations on changed lines.
  - title: CI ready
    details: Fail builds with --fail-under while ignoring unrelated legacy debt.
---
