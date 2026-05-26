# Apply Progress: Add Test Coverage Signal

## Status

success — all assigned coverage signal tasks are complete.

## Mode

Strict TDD mode was active. Because this change is tooling/configuration, RED/GREEN command evidence was used instead of behavioral test files.

## Completed Tasks

- [x] 1.1 Capture RED coverage command evidence before configuration.
- [x] 1.2 Add `c8`/V8 coverage dependency and configuration for current script-based tests.
- [x] 1.3 Add opt-in `pnpm test:coverage` script without changing `pnpm test` semantics.
- [x] 1.4 Keep generated coverage artifacts ignored and confirm `coverage/` output remains untracked.
- [x] 1.5 Update OpenSpec testing coverage availability after the script works.
- [x] 1.6 Persist apply progress in OpenSpec and Engram.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `.c8rc.json` | Created | Added c8/V8 coverage reporters, source include paths, and exclusions for generated/test/plumbing files. |
| `package.json` | Modified | Added `c8` dev dependency and opt-in `test:coverage` script while keeping `test` unchanged. |
| `pnpm-lock.yaml` | Modified | Locked only the `c8` dependency graph added by `pnpm add -D c8`. |
| `openspec/config.yaml` | Modified | Set `testing.coverage.available: true` and `command: pnpm test:coverage` after the command passed. |
| `eslint.config.mjs` | Modified | Added `coverage/**` to global ignores so generated reports do not pollute `pnpm lint`. |
| `openspec/changes/add-test-coverage-signal/tasks.md` | Created/Updated | Recreated the missing task artifact from the launch scope and marked all tasks complete. |
| `openspec/changes/add-test-coverage-signal/apply-progress.md` | Created | Persisted apply evidence and cumulative completion state. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | Command evidence | Tooling/config | ✅ `pnpm test` passed before modifications | ✅ `pnpm test:coverage` failed with `Command "test:coverage" not found` | ✅ Coverage task established by later passing command | ➖ Single command-availability gate | ➖ None needed |
| 1.2 | Command evidence | Tooling/config | ✅ Baseline `pnpm test` passed | ✅ Coverage command absent before dependency/config | ✅ `pnpm add -D c8` then `pnpm test:coverage` passed | ✅ c8 emitted text, LCOV, and HTML coverage reports | ✅ `.c8rc.json` centralizes include/exclude/reporters |
| 1.3 | Command evidence | Tooling/config | ✅ Baseline `pnpm test` passed | ✅ `pnpm test:coverage` unavailable before script | ✅ `pnpm test:coverage` passed through `c8 pnpm test` | ✅ `pnpm test` passed separately after adding script, proving default semantics unchanged | ➖ None needed |
| 1.4 | Command evidence | Tooling/config | ✅ `.gitignore` already had `/coverage` | ✅ No coverage artifacts before command | ✅ `coverage/lcov.info` and `coverage/index.html` generated | ✅ `git check-ignore -v coverage coverage/lcov.info coverage/index.html` confirmed `/coverage`; `git status --ignored --short coverage` showed `!! coverage/` | ✅ Added `coverage/**` to ESLint ignores after lint surfaced generated-report warnings |
| 1.5 | Command evidence | OpenSpec config | ✅ Coverage command passed before config availability flip | ✅ `openspec/config.yaml` had `available: false`, empty command | ✅ Config now reports `available: true`, `command: pnpm test:coverage` | ✅ `pnpm lint` and `pnpm build` passed after final config state | ➖ None needed |
| 1.6 | Artifact evidence | SDD persistence | ✅ Existing proposal/spec/design read; no prior apply-progress found | ✅ `tasks.md` artifact was missing before apply | ✅ OpenSpec tasks/apply-progress written and Engram artifacts saved | ✅ Final status: 6/6 tasks complete | ➖ None needed |

## Test Summary

- **Total behavioral tests written**: 0 — tooling/config change used required command evidence.
- **Command gates used**: `pnpm test:coverage` RED/GREEN, `pnpm test`, `pnpm lint`, `pnpm build`, coverage ignore check.
- **Layers used**: Tooling/config and existing script-based validation/runtime tests.
- **Approval tests**: None — no behavior refactor tasks.
- **Pure functions created**: 0.

## Command Evidence

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm test` | ✅ Passed | Baseline safety net before modifications. |
| `pnpm test:coverage` | ✅ RED failed before implementation | Failed with `Command "test:coverage" not found`. |
| `pnpm add -D c8` | ✅ Passed | Added only the coverage dev dependency. |
| `pnpm test:coverage` | ✅ Passed | Generated text summary plus `coverage/lcov.info` and `coverage/index.html`; initial all-files signal reported 21.45% statements / 62.24% branches / 54.11% functions / 21.45% lines. |
| `pnpm test` | ✅ Passed | Confirms default test semantics remain unchanged. |
| `git check-ignore -v coverage coverage/lcov.info coverage/index.html && git status --ignored --short coverage` | ✅ Passed | `/coverage` ignore rule applies; status showed `!! coverage/`. |
| `pnpm lint` | ✅ Passed | Passed clean after adding `coverage/**` to ESLint global ignores. |
| `pnpm build` | ✅ Passed | Next.js production build succeeded after final config changes. |

## Deviations from Design

- Added `coverage/**` to `eslint.config.mjs`. The design expected `.gitignore` to be enough, but running coverage before lint generated report files that ESLint would otherwise scan and warn on. This keeps generated artifacts ignored by both Git and lint tooling.
- Recreated `openspec/changes/add-test-coverage-signal/tasks.md` because the required task artifact was missing on disk and no Engram task observation existed.

## Issues Found

- `tasks.md` was missing before apply despite being listed as required.
- `pnpm lint` initially reported warnings from generated coverage report JavaScript files until `coverage/**` was added to ESLint global ignores.

## Remaining Tasks

None.

## Workload / PR Boundary

- Mode: single focused PR, no size exception required, no chaining.
- Current work unit: non-blocking coverage signal.
- Boundary: adds opt-in c8 coverage script/config and SDD persistence only; leaves CI and E2E unchanged.
- Estimated review budget impact: within the resolved 800-line session budget; package lockfile accounts for most line churn.

## Risks

- Coverage baseline is intentionally noisy/low because `all: true` includes source files not executed by the current script-based suite.
- Coverage is local/reviewer opt-in only; no CI gate or threshold enforcement was added.

## Skill Resolution

paths-injected — read exact injected `sdd-apply/SKILL.md` and `sdd-apply/strict-tdd.md`, plus shared SDD/OpenSpec protocol files.

## Status Summary

6/6 tasks complete. Ready for verify.
