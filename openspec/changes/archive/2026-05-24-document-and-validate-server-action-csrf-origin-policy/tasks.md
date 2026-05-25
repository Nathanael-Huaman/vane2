# Tasks: Document and Validate Server Action CSRF Origin Policy

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 180-260 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Add exact-origin helper, config wiring, validator/tests, docs | Single PR | Keep CAPTCHA, pagination, CI/E2E, coverage, and loading.js out of scope |

## Phase 1: RED Tests and Stub

- [x] 1.1 Create `lib/server/security/server-action-origin-policy.js` stub exporting the expected helper(s) with `new Error("Not implemented")`.
- [x] 1.2 RED: extend `scripts/test-production-security-controls.ts` for default first-party Server Action posture when no allow-list env is set.
- [x] 1.3 RED: add tests for exact deployment origins from env, deduping, and rejection of wildcard/scheme/path/query/blank origins.
- [x] 1.4 RED: add validator checks in `scripts/test-production-security-controls.ts` proving unsafe broad origins fail validation.

## Phase 2: GREEN Implementation

- [x] 2.1 Implement exact-host origin parsing in `lib/server/security/server-action-origin-policy.js`.
- [x] 2.2 Wire `next.config.mjs` to set `serverActions.allowedOrigins` only when the helper returns non-empty exact origins.
- [x] 2.3 Update `scripts/validate-production-security-controls.mjs` to assert helper wiring and reject broad/wildcard origin posture.
- [x] 2.4 Make `pnpm test:production-security-controls` pass for CSRF/origin scenarios without weakening existing security tests.

## Phase 3: REFACTOR and Documentation

- [x] 3.1 Refactor helper/test names so operator errors explain the exact allowed origin format.
- [x] 3.2 Update `.env.example` with the optional Server Action allowed-origin env and examples for Coolify/proxy hosts.
- [x] 3.3 Confirm README/package script references do not imply CAPTCHA, pagination, CI/E2E, coverage, or loading.js are covered by this change.

## Phase 4: Verification

- [x] 4.1 Run `pnpm test:production-security-controls` and `pnpm validate:production-security-controls`.
- [x] 4.2 Run `pnpm lint` and `pnpm build`.
- [x] 4.3 Update `openspec/changes/document-and-validate-server-action-csrf-origin-policy/apply-progress.md` with strict TDD evidence.
