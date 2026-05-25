# Apply Progress: Document and Validate Server Action CSRF Origin Policy

## Status

Strict TDD — `openspec/config.yaml` and the launch prompt enable strict TDD. Implementation used `pnpm test:production-security-controls` for RED/GREEN/refactor cycles, then `pnpm validate:production-security-controls`, `pnpm lint`, and `pnpm build` for final verification. Pre-PR remediation added targeted RED coverage for `SERVER_ACTION_ALLOWED_ORIGINS="null"`, then rejected null-origin values in the helper and static validator.

Delivery mode: single PR. Review workload forecast was low; actual source diff remained within the 800-line launch budget.

## Completed Tasks

- [x] 1.1 Create `lib/server/security/server-action-origin-policy.js` stub exporting the expected helper(s) with `new Error("Not implemented")`.
- [x] 1.2 RED: extend `scripts/test-production-security-controls.ts` for default first-party Server Action posture when no allow-list env is set.
- [x] 1.3 RED: add tests for exact deployment origins from env, deduping, and rejection of wildcard/scheme/path/query/blank origins.
- [x] 1.4 RED: add validator checks in `scripts/test-production-security-controls.ts` proving unsafe broad origins fail validation.
- [x] 2.1 Implement exact-host origin parsing in `lib/server/security/server-action-origin-policy.js`.
- [x] 2.2 Wire `next.config.mjs` to set `serverActions.allowedOrigins` only when the helper returns non-empty exact origins.
- [x] 2.3 Update `scripts/validate-production-security-controls.mjs` to assert helper wiring and reject broad/wildcard origin posture.
- [x] 2.4 Make `pnpm test:production-security-controls` pass for CSRF/origin scenarios without weakening existing security tests.
- [x] 3.1 Refactor helper/test names so operator errors explain the exact allowed origin format.
- [x] 3.2 Update `.env.example` with the optional Server Action allowed-origin env and examples for Coolify/proxy hosts.
- [x] 3.3 Confirm README/package script references do not imply CAPTCHA, pagination, CI/E2E, coverage, or loading.js are covered by this change.
- [x] 4.1 Run `pnpm test:production-security-controls` and `pnpm validate:production-security-controls`.
- [x] 4.2 Run `pnpm lint` and `pnpm build`.
- [x] 4.3 Update `openspec/changes/document-and-validate-server-action-csrf-origin-policy/apply-progress.md` with strict TDD evidence.

## Pre-PR Remediation

- [x] RED: Added parser coverage proving `SERVER_ACTION_ALLOWED_ORIGINS="null"` was incorrectly accepted.
- [x] RED: Added static validator coverage proving `serverActions.allowedOrigins: ["null"]` was not flagged.
- [x] GREEN: Updated the helper and validator to reject null-origin values explicitly.
- [x] Artifact consistency: Updated active source spec and archived delta wording from “explicit HTTPS origin” to exact `host[:port]` entries derived from HTTPS deployment origins.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `lib/server/security/server-action-origin-policy.js` | Created | Adds pure parser/config helper for optional `SERVER_ACTION_ALLOWED_ORIGINS`, accepting exact `host[:port]` values and rejecting wildcards, URLs, paths, queries, fragments, null-origin values, blanks, and malformed ports. |
| `next.config.mjs` | Modified | Spreads `buildServerActionConfig()` so `serverActions.allowedOrigins` is absent by default and configured only from exact env entries. |
| `scripts/test-production-security-controls.ts` | Modified | Adds Server Action origin policy runtime/config tests, docs assertion, and validator-behavior tests. |
| `scripts/validate-production-security-controls.mjs` | Modified | Exports validator helpers, adds Server Action origin policy checks including null-origin rejection, and keeps CLI validation behavior intact. |
| `.env.example` | Modified | Documents optional exact host allow-list for proxy/Coolify Server Action deployments and excludes null-origin values. |
| `openspec/specs/production-security-controls/spec.md` | Modified | Clarifies accepted values as exact `host[:port]` entries derived from HTTPS deployment origins. |
| `openspec/changes/archive/2026-05-24-document-and-validate-server-action-csrf-origin-policy/specs/production-security-controls/spec.md` | Modified | Mirrors the source spec wording and null-origin rejection scenario in the archived delta. |
| `openspec/changes/document-and-validate-server-action-csrf-origin-policy/tasks.md` | Modified | Marks completed apply tasks. |
| `openspec/changes/document-and-validate-server-action-csrf-origin-policy/apply-progress.md` | Created | Records strict TDD and verification evidence. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `lib/server/security/server-action-origin-policy.js` | Structural | N/A (new stub; project rule requires stub before RED import) | ✅ Stub exported helpers throwing `Not implemented` before behavior tests imported them | ✅ Stub replaced by implementation in 2.1 | ➖ Structural prerequisite | ✅ Removed stub once behavior tests were green |
| 1.2 | `scripts/test-production-security-controls.ts` | Unit/config | ✅ Baseline `pnpm test:production-security-controls`: 19 passed, 0 failed | ✅ Default same-host posture test failed with `Not implemented` | ✅ `pnpm test:production-security-controls`: 25 passed, 0 failed | ✅ Empty/absent env plus non-empty exact env companion case | ✅ Assertions target concrete config outputs |
| 1.3 | `scripts/test-production-security-controls.ts` | Unit | ✅ Baseline 19/19 | ✅ Exact/dedupe and invalid-origin tests failed against stub/error contract | ✅ `pnpm test:production-security-controls`: 25/25 | ✅ Exact host, host:port, duplicate case normalization, wildcard, URL, path, query, blank, and bad port cases | ✅ Parser kept pure and deterministic |
| 1.4 | `scripts/test-production-security-controls.ts` | Unit/static validator | ✅ Baseline 19/19 | ✅ Validator output lacked Server Action section and pure validator export was missing | ✅ `pnpm test:production-security-controls`: 25/25 | ✅ Unsafe literal sample fails; helper-wired safe sample passes | ✅ Validator checks are exported for direct behavior tests and CLI reuse |
| 2.1 | `scripts/test-production-security-controls.ts` | Unit | ✅ RED tests existed before implementation | ✅ Helper tests failed with `Not implemented` | ✅ Helper/config tests passed in `pnpm test:production-security-controls` run with 22 passed / 3 pending failures before docs/validator completion | ✅ Default empty result, exact non-empty result, dedupe, broad rejection, malformed rejection | ✅ Extracted exact-host parsing helpers and actionable shared error text |
| 2.2 | `scripts/test-production-security-controls.ts` | Config | ✅ Next config header test already green | ✅ Dynamic next-config assertion was written before config wiring | ✅ `pnpm test:production-security-controls`: 25/25 | ✅ Unset env keeps `serverActions` absent; exact env produces `allowedOrigins` | ✅ Config remains a small spread with existing header behavior unchanged |
| 2.3 | `scripts/test-production-security-controls.ts`, `scripts/validate-production-security-controls.mjs` | Static validator | ✅ Existing validator test green before RED | ✅ CLI output and pure validator tests failed before Server Action policy checks existed | ✅ `pnpm validate:production-security-controls`: 18 passed, 0 failed | ✅ Safe helper-wired sample and unsafe wildcard/URL literal sample | ✅ Main guard avoids import side effects while keeping CLI behavior |
| 2.4 | `scripts/test-production-security-controls.ts` | Runtime/unit suite | ✅ 19/19 baseline | ✅ RED suite failed 18 passed / 7 failed | ✅ `pnpm test:production-security-controls`: 25 passed, 0 failed | ✅ Existing limiter/header/blog/auth/reset tests still pass with new origin policy tests | ✅ Lint-safe variable naming after refactor |
| 3.1 | `scripts/test-production-security-controls.ts` | Unit | ✅ Helper tests covered operator error contract | ✅ Invalid-origin assertions expected `SERVER_ACTION_ALLOWED_ORIGINS` and `exact host[:port]` guidance | ✅ `pnpm test:production-security-controls`: 25/25 | ✅ Wildcard and malformed categories both assert actionable format guidance | ✅ Helper/test names describe policy behavior rather than implementation details |
| 3.2 | `scripts/test-production-security-controls.ts` | Docs assertion | ✅ Existing env docs tests green | ✅ Env docs test failed because `SERVER_ACTION_ALLOWED_ORIGINS` was absent | ✅ `pnpm test:production-security-controls`: 25/25 | ✅ Documentation asserts env name, exact format, Coolify/proxy use case, wildcard ban, and no scheme | ✅ Kept optional env commented so default deployments remain unset |
| Remediation | `scripts/test-production-security-controls.ts`, `scripts/validate-production-security-controls.mjs` | Unit/static validator | ✅ Baseline `pnpm test:production-security-controls`: 25 passed, 0 failed | ✅ `null` parser and `allowedOrigins: ["null"]` validator assertions failed before code changes | ✅ `pnpm test:production-security-controls`: 25 passed, 0 failed | ✅ Parser rejects null-origin entries while exact host and host:port cases remain accepted; validator rejects a null-only unsafe config | ✅ Shared error/remediation text and validator label now name null-origin values |
| 3.3 | `README.md`, `package.json` | Review | ✅ Read README/package scripts during implementation | ➖ Structural review task; no production behavior added | ✅ Confirmed no README/package text claims CAPTCHA, pagination, CI/E2E, coverage, or `loading.js` is covered by this change | ➖ Not applicable | ➖ No file change needed |
| 4.1 | `scripts/test-production-security-controls.ts`, `scripts/validate-production-security-controls.mjs` | Verification | ✅ Targeted suite was green before final validator run | ➖ Verification task | ✅ `pnpm test:production-security-controls`: 25/25; `pnpm validate:production-security-controls`: 18/18 | ✅ Runtime and static validator both exercised | ➖ None needed |
| 4.2 | Project lint/build | Verification | ✅ Targeted suite and validator green | ➖ Verification task | ✅ `pnpm lint` passed after fixing lint variable name; `pnpm build` passed | ✅ Lint plus Next production build | ✅ Renamed dynamic import binding from `module` to `importedConfig` |
| 4.3 | `apply-progress.md` | Artifact | N/A | ➖ Structural artifact | ✅ This file records cumulative progress and evidence | ➖ Not applicable | ➖ None needed |

## Verification Commands

| Command | Result | Notes |
|---|---|---|
| `pnpm test:production-security-controls` | ✅ Passed | 25 passed, 0 failed. |
| `pnpm validate:production-security-controls` | ✅ Passed | 18 passed, 0 failed. |
| `pnpm lint` | ✅ Passed | Initial run found `@next/next/no-assign-module-variable`; fixed by renaming the local dynamic-import binding, then reran successfully. |
| `pnpm build` | ✅ Passed | Next.js 16.2.6 production build completed successfully. |

## Deviations from Design

None — implementation matches design. The helper accepts exact `host[:port]` entries because Next compares the request `Origin` host against `serverActions.allowedOrigins`; full URL/scheme and `null` origin values are rejected by tests and docs.

## Issues Found

- `pnpm lint` rejects a local variable named `module` in Next projects via `@next/next/no-assign-module-variable`; the test helper now uses `importedConfig`.
- Pre-PR review found `Origin: null` is special-cased by Next.js into `originHost = "null"`; the helper and static validator now explicitly reject null-origin allow-list entries.

## Remaining Tasks

None — all assigned tasks are complete.

## Workload / PR Boundary

- Mode: single PR
- Current work unit: Unit 1 — exact-origin helper, config wiring, validator/tests, docs
- Boundary: starts from existing production security controls and ends with documented/validated Server Action origin policy only
- Estimated review budget impact: within the 800-line launch budget; no chained PR needed
