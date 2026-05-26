# Tasks: Add E2E CI Signal

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 90–180 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add one PR-gated E2E smoke CI job | PR 1 | Workflow-only implementation plus SDD evidence. |

## Phase 1: RED / Baseline Evidence

- [x] 1.1 Inspect `.github/workflows/ci.yml` and record that no PR-gated E2E smoke job currently exists.
- [x] 1.2 Run or dry-check the existing target command `pnpm test:store-admin-orders:e2e` locally where browser dependencies are available; capture current behavior.

## Authorized Scope Expansion: E2E Target Stabilization

- [x] S.1 Stabilize the ambiguous `Acceso denegado` Playwright locator in `e2e/store-admin-orders.spec.ts` before adding the target to CI.
- [x] S.2 Re-run `pnpm test:store-admin-orders:e2e` and confirm the selected smoke target passes locally.

## Phase 2: CI Workflow Implementation

- [x] 2.1 Modify `.github/workflows/ci.yml` to add a separate `e2e-smoke` job guarded by `github.event_name == 'pull_request'`.
- [x] 2.2 Reuse existing checkout, pnpm, Node, and frozen install setup patterns from the current CI workflow.
- [x] 2.3 Add Chromium-only Playwright dependency installation with `pnpm exec playwright install --with-deps chromium`.
- [x] 2.4 Run only `pnpm test:store-admin-orders:e2e`; do not call `pnpm test:e2e`, `pnpm test:e2e:all`, or a browser matrix.

## Phase 3: Scope and Semantics Verification

- [x] 3.1 Confirm `pnpm test`, lint, and build workflow steps remain unchanged and independently readable.
- [x] 3.2 Confirm no product code, Playwright config, E2E specs, or `scripts/run-e2e.mjs` were modified.
- [x] 3.3 Confirm generated E2E outputs remain ignored or runner-local.

## Phase 4: Runtime Verification

- [x] 4.1 Run `pnpm lint` and `pnpm build` after workflow edit.
- [x] 4.2 Run `pnpm test` to prove default tests remain non-E2E.
- [x] 4.3 Run `pnpm test:store-admin-orders:e2e` if local browser dependencies allow; otherwise document the environment blocker and rely on PR CI for final proof.

## Phase 5: SDD Persistence

- [x] 5.1 Update this `tasks.md` with completed checkboxes after apply.
- [x] 5.2 Create `apply-progress.md` with RED/GREEN evidence and save Engram `sdd/add-e2e-ci-signal/apply-progress`.

## Verify Remediation: Permanent Workflow Contract Evidence

- [x] V.1 Add a permanent rerunnable workflow validator for the E2E CI signal.
- [x] V.2 Expose the workflow validator through `package.json` and include it in `test:validation`.
- [x] V.3 Replace temporary `.tmp` workflow contract evidence in `apply-progress.md` with `scripts/validate-e2e-ci-signal.mjs` evidence.
- [x] V.4 Re-run validator, `pnpm test`, `pnpm lint`, `pnpm build`, and `pnpm test:store-admin-orders:e2e`.
