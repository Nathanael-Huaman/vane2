# Proposal: Add E2E CI Signal

## Intent

Add a PR-gated browser smoke signal so CI catches obvious E2E regressions without turning the full Playwright suite into a noisy merge tax.

## Scope

### In Scope
- Add a separate CI smoke E2E job for pull requests.
- Run one runner-backed Chromium smoke command, preferably `pnpm test:store-admin-orders:e2e`.
- Install only required Chromium Playwright dependencies in CI.

### Out of Scope
- Full `pnpm test:e2e` or `pnpm test:e2e:all` in CI.
- Browser matrix, retries/cache tuning, broad E2E rewrites, or Playwright config changes.
- Product behavior changes to admin orders, auth, checkout, or coverage.

## Capabilities

### New Capabilities
- `e2e-ci-signal`: PR-gated narrow Playwright/Chromium smoke signal for existing E2E coverage.

### Modified Capabilities
- None.

## Approach

Add an isolated E2E smoke job to `.github/workflows/ci.yml` that reuses existing install/env setup, installs Chromium via Playwright, and runs the existing runner-backed store admin orders smoke. Preserve `pnpm test` semantics and keep `pr-validation.yml` metadata-only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modified | Add separate PR-gated E2E smoke job. |
| `package.json` | Optional | Add `test:e2e:smoke` alias only if it improves workflow readability. |
| `scripts/run-e2e.mjs` | Reused | Keep DB, port, seed, and output isolation unchanged. |
| `e2e/store-admin-orders.spec.ts` | Reused | Initial high-value Chromium smoke target. |

## Test Plan

Verify CI command composition locally where possible with the targeted smoke script; final proof is the GitHub Actions E2E smoke job passing on PR.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CI runtime increases | Med | Run one Chromium target only; defer cache/matrix. |
| Playwright flake blocks PRs | Med | Reuse deterministic runner/seed setup; observe before expanding. |
| Wrong command hits `dev.db` | Low | Use only runner-backed package script. |
| Review budget creep | Low | Limit diff to workflow plus optional alias. |

## Rollback Plan

Revert the CI job and optional package alias. No product code, database schema, or persisted data should require rollback.

## Dependencies

- Existing Playwright setup, `scripts/run-e2e.mjs`, seeded SQLite E2E flow, and CI pnpm/Node environment.

## Success Criteria

- [ ] Pull requests run a separate Chromium smoke E2E CI signal.
- [ ] `pnpm test` remains non-E2E and unchanged.
- [ ] Full suite, all-browser matrix, retries/cache tuning, and E2E rewrites remain deferred.
