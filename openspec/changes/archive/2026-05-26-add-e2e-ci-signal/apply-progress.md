# Apply Progress: Add E2E CI Signal

## Status

Complete and ready for verify rerun.

This resume fixed the Strict TDD audit gap from `sdd-verify`: the workflow contract evidence no longer depends on ignored `.tmp` files. A permanent validator now lives at `scripts/validate-e2e-ci-signal.mjs`, is exposed as `pnpm validate:e2e-ci-signal`, and is included in `pnpm test:validation`.

## Completed Tasks

- [x] 1.1 Inspect `.github/workflows/ci.yml` and record that no PR-gated E2E smoke job currently exists.
- [x] 1.2 Run or dry-check the existing target command `pnpm test:store-admin-orders:e2e` locally where browser dependencies are available; capture current behavior.
- [x] S.1 Stabilize the ambiguous `Acceso denegado` Playwright locator in `e2e/store-admin-orders.spec.ts` before adding the target to CI.
- [x] S.2 Re-run `pnpm test:store-admin-orders:e2e` and confirm the selected smoke target passes locally.
- [x] 2.1 Modify `.github/workflows/ci.yml` to add a separate `e2e-smoke` job guarded by `github.event_name == 'pull_request'`.
- [x] 2.2 Reuse existing checkout, pnpm, Node, and frozen install setup patterns from the current CI workflow.
- [x] 2.3 Add Chromium-only Playwright dependency installation with `pnpm exec playwright install --with-deps chromium`.
- [x] 2.4 Run only `pnpm test:store-admin-orders:e2e`; do not call `pnpm test:e2e`, `pnpm test:e2e:all`, or a browser matrix.
- [x] 3.1 Confirm `pnpm test`, lint, and build workflow steps remain unchanged and independently readable.
- [x] 3.2 Confirm no product code, Playwright config, E2E specs, or `scripts/run-e2e.mjs` were modified.
- [x] 3.3 Confirm generated E2E outputs remain ignored or runner-local.
- [x] 4.1 Run `pnpm lint` and `pnpm build` after workflow edit.
- [x] 4.2 Run `pnpm test` to prove default tests remain non-E2E.
- [x] 4.3 Run `pnpm test:store-admin-orders:e2e` locally.
- [x] 5.1 Update this `tasks.md` with completed checkboxes after apply.
- [x] 5.2 Create `apply-progress.md` with RED/GREEN evidence and save Engram `sdd/add-e2e-ci-signal/apply-progress`.
- [x] V.1 Add a permanent rerunnable workflow validator for the E2E CI signal.
- [x] V.2 Expose the workflow validator through `package.json` and include it in `test:validation`.
- [x] V.3 Replace temporary `.tmp` workflow contract evidence in `apply-progress.md` with `scripts/validate-e2e-ci-signal.mjs` evidence.
- [x] V.4 Re-run validator, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:store-admin-orders:e2e`.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| V.1-V.3 permanent workflow contract validator | `scripts/validate-e2e-ci-signal.mjs` | Workflow contract / validation script | `sdd-verify` FAIL proved prior `.tmp` evidence was not rerunnable | ✅ Stub validator failed with `Error: Not implemented` via `pnpm validate:e2e-ci-signal` | ✅ `pnpm validate:e2e-ci-signal` passed: 7/7 checks | ✅ Validator checks package exposure, `test:validation` wiring, job existence, PR-only guard, Chromium install, targeted command, and no broad E2E command | ✅ Extracted `check`, `extractJobBlock`, and broad-command helper; validator still green |
| S.1/S.2 authorized E2E stabilization | `e2e/store-admin-orders.spec.ts` | E2E | ❌ Existing target was red before prior apply: 1 passed, 1 failed under Playwright strict mode | ✅ Existing RED reproduced: `page.getByText("Acceso denegado")` resolved to 2 elements on detail denied page | ✅ `pnpm test:store-admin-orders:e2e` passed after scoping locator to `getByRole("main")` | ✅ Existing smoke covers list/detail/status happy path plus denied list/detail path | ➖ Minimal locator-only change; no broader rewrite |
| 2.1-2.4 workflow implementation | `scripts/validate-e2e-ci-signal.mjs` | Workflow contract | N/A — validator supersedes ignored `.tmp` contract check | ✅ Prior workflow contract was missing from version control; permanent validator initially failed as not implemented | ✅ Permanent validator passed against `.github/workflows/ci.yml` | ✅ Same validator enforces both positive requirements and negative broad-command requirement | ➖ None beyond validator helper extraction |
| 4.1-4.3 runtime verification | Existing package scripts | Validation / E2E | N/A — post-implementation verification | N/A | ✅ `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:store-admin-orders:e2e` all passed | N/A | N/A |

## Permanent Workflow Validator

Added `scripts/validate-e2e-ci-signal.mjs`. It reads `.github/workflows/ci.yml` and verifies:

- `e2e-smoke:` job exists.
- The job has `if: github.event_name == 'pull_request'`.
- The job installs Chromium deps with `pnpm exec playwright install --with-deps chromium`.
- The job runs `pnpm test:store-admin-orders:e2e`.
- The job does not run `pnpm test:e2e` or `pnpm test:e2e:all`.
- `package.json` exposes `validate:e2e-ci-signal` and includes it in `test:validation`.

## Implementation Details

### E2E stabilization

- Changed the two denied-state assertions in `e2e/store-admin-orders.spec.ts` from `page.getByText("Acceso denegado")` to `page.getByRole("main").getByText("Acceso denegado")`.
- This preserves the user-visible intent and avoids matching a hidden duplicate denied card title.
- No product code, Playwright config, package script, or E2E runner behavior changed.

### CI workflow

- Added `.github/workflows/ci.yml` job `e2e-smoke`.
- Job is guarded with `if: github.event_name == 'pull_request'`.
- Job reuses the existing checkout, pnpm 11.1.1, Node 22 with pnpm cache, and frozen install setup style.
- Job installs Chromium dependencies with `pnpm exec playwright install --with-deps chromium`.
- Job runs only `pnpm test:store-admin-orders:e2e`.

### Package validation wiring

- Added `validate:e2e-ci-signal`: `node scripts/validate-e2e-ci-signal.mjs`.
- Added `pnpm validate:e2e-ci-signal` to `test:validation`, so `pnpm test` now includes the static workflow contract validator.
- `pnpm test` remains non-E2E; it still does not execute Playwright.

## Verification Performed

| Command / Inspection | Result |
|----------------------|--------|
| `pnpm validate:e2e-ci-signal` with stub | ✅ RED failed: `Error: Not implemented` |
| `pnpm validate:e2e-ci-signal` after implementation | ✅ Passed: 7 passed, 0 failed |
| `pnpm test` | ✅ Passed, including `validate:e2e-ci-signal` |
| `pnpm lint` | ✅ Passed |
| `pnpm build` | ✅ Passed |
| `pnpm test:store-admin-orders:e2e` | ✅ Passed: 2/2 Chromium tests |
| `git status --short --ignored` | ✅ Inspected; generated artifacts remain ignored |

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `.github/workflows/ci.yml` | Modified | Added separate PR-only `e2e-smoke` job with Chromium dependency install and targeted smoke command. |
| `e2e/store-admin-orders.spec.ts` | Modified | Scoped access-denied assertions to the `main` landmark to avoid strict-mode ambiguity. |
| `scripts/validate-e2e-ci-signal.mjs` | Created | Permanent rerunnable workflow contract validator replacing ignored `.tmp` evidence. |
| `package.json` | Modified | Added `validate:e2e-ci-signal` and included it in `test:validation`. |
| `openspec/changes/add-e2e-ci-signal/tasks.md` | Modified | Added and completed verify-remediation tasks. |
| `openspec/changes/add-e2e-ci-signal/apply-progress.md` | Updated | Replaced temporary workflow evidence with permanent validator evidence. |

## Scope Confirmation

- Product code was not changed.
- `playwright.config.ts` was not changed.
- `scripts/run-e2e.mjs` was not changed.
- No full E2E suite, browser matrix, retries, or cache tuning were added.
- `pnpm test` now includes one static workflow validator, not Playwright E2E execution.

## Generated / Ignored Artifacts

Final status inspection showed expected ignored local artifacts such as `.next/`, `.next-e2e/`, `.tmp/`, `dev.db`, `lib/generated/`, and `node_modules/`. No generated E2E artifact is intended to be committed.

## Deviations from Design

The original design said `package.json` and `e2e/store-admin-orders.spec.ts` would not change. Both deviations were explicitly driven by later apply/verify findings:

- The E2E locator stabilization was user-authorized after the selected smoke target was red.
- The package script addition is the minimum fix for Strict TDD rerunnable workflow contract evidence and keeps `pnpm test` non-E2E.

## Workload / PR Boundary

- Mode: single focused PR under active 800-line budget.
- Current work unit: Add one PR-gated E2E smoke CI job with permanent static validation evidence.
- Boundary: E2E locator stabilization + CI workflow job + rerunnable workflow validator + SDD evidence only.
- Estimated review budget impact: still small; direct implementation diff is workflow job, two E2E assertion lines, one validator script, and package script wiring.

## Status Summary

20/20 tracked tasks complete, including verify remediation tasks. Ready for `sdd-verify` rerun.
