# Apply Progress: Resolve Audit Critical Production Blockers

## Mode

Strict TDD — `openspec/config.yaml` enables `strict_tdd: true`; Phase 5 continued with `pnpm test:production-security-controls` and `pnpm validate:production-security-controls` for verification-script/package integration, plus `pnpm test:store-checkout-order-foundation`, `pnpm test`, `pnpm lint`, and `pnpm build` final verification.

## Completed Tasks

- [x] 1.1 Create `lib/server/security/rate-limit.js` stubs (`checkRateLimit`, actor derivation, throttle helpers) throwing `new Error("Not implemented")`.
- [x] 1.2 RED: add tests in `scripts/test-production-security-controls.ts` for production fail-closed, local/test memory allowance, and hashed actor keys.
- [x] 1.3 GREEN: implement memory + REST adapters, production guard, retry metadata, and neutral denial contract.
- [x] 1.4 REFACTOR: update `.env.example` limiter vars and ensure logs/telemetry redact raw email/token/cart identifiers.
- [x] 2.1 RED: add auth/reset throttle tests in `scripts/test-production-security-controls.ts` proving denial before credential lookup, token consume, or password mutation.
- [x] 2.2 GREEN: modify `app/api/auth/credentials-login/route.js` to run limiter after parsing and before validation/auth/session work.
- [x] 2.3 GREEN: modify `app/api/auth/registro/route.js` to enforce limiter before `registrarUsuario` and return generic 429 JSON.
- [x] 2.4 GREEN: modify `lib/actions/password-reset.js` to pass request context and `lib/server/password/password-reset-security.js` to enforce allow/deny decisions.
- [x] 2.5 GREEN: modify `lib/server/password/password-reset.js` to short-circuit denied request/confirm before user/token reads and password update.
- [x] 2.6 REFACTOR: replace account-enumerating audit fields with hashed/masked fields in reset/login denial logs.
- [x] 3.1 RED: extend `scripts/test-store-checkout-order-foundation.ts` to assert throttled checkout fails with no order create, no stock decrement, and cart retention.
- [x] 3.2 GREEN: modify `lib/actions/store-checkout-dependencies.js` to inject `headers()` and `lib/actions/store-checkout.js` to run limiter before `createOrderFromCart`.
- [x] 3.3 REFACTOR: normalize checkout throttle telemetry (surface/decision/retry only) and keep response non-enumerating.
- [x] 4.1 Create `lib/server/security/security-headers.js` stubs and RED tests in `scripts/test-production-security-controls.ts` for report-only/enforce/off and baseline headers.
- [x] 4.2 GREEN: wire headers in `next.config.mjs`; if build proves incompatible, add `middleware.js` fallback with equivalent headers.
- [x] 4.3 RED: add blog XSS tests in `scripts/test-production-security-controls.ts` for `<script>`, inline handlers, and `javascript:` URLs.
- [x] 4.4 GREEN/REFACTOR: update `lib/server/blog/markdown.js` and `app/blog/[slug]/page.js` to sanitize final HTML before `dangerouslySetInnerHTML` and preserve rendering.
- [x] 5.1 Create `scripts/validate-production-security-controls.mjs` checks for limiter wiring, header wiring (`next.config.mjs` or `middleware.js`), and neutral throttle responses.
- [x] 5.2 Update `package.json` scripts: add `validate:production-security-controls` and `test:production-security-controls`; include in `test:validation` and `test:runtime`.
- [x] 5.3 Verify with `pnpm test:production-security-controls`, `pnpm test:store-checkout-order-foundation`, `pnpm test`, `pnpm lint`, and `pnpm build`.
- [x] 5.4 Confirm no out-of-scope edits.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `lib/server/security/rate-limit.js` | Created (PR1) | Added shared server-side rate-limit foundation with HMAC actor keys, memory and REST stores, production fail-closed guard, retry metadata, neutral throttle response, and privacy-safe log context. |
| `scripts/test-production-security-controls.ts` | Created/Modified | Added PR1 limiter tests, PR2 auth/reset tests, PR4 CSP/header/blog sanitizer tests, and Phase 5 validator/package integration assertions. |
| `scripts/validate-production-security-controls.mjs` | Created | Adds static validation for limiter wiring, header wiring via `next.config.mjs` or proxy/middleware fallback, neutral throttle response contracts, and package-script integration. |
| `package.json` | Modified | Adds `validate:production-security-controls` and `test:production-security-controls`; wires them into `test:validation` and `test:runtime`. |
| `.env.example` | Modified (PR1/PR4) | Documented `RATE_LIMIT_KEY_SECRET`, `RATE_LIMIT_REST_URL`, `RATE_LIMIT_REST_TOKEN`, and `SECURITY_HEADERS_CSP_MODE="report-only"`. |
| `app/api/auth/credentials-login/route.js` | Modified | Enforces shared limiter after form parse and before validation/auth/session work; returns neutral 429 JSON with `Retry-After`; removes raw email from route logs. |
| `app/api/auth/registro/route.js` | Modified | Enforces shared limiter after JSON parse and before `registrarUsuario`; returns generic 429 JSON with `Retry-After`. |
| `lib/actions/password-reset.js` | Modified | Passes request IP/user-agent context from Server Actions into password reset enforcement. |
| `lib/server/password/password-reset-security.js` | Modified | Replaced prepared-only reset checks with real limiter-backed allow/deny decisions and privacy-safe audit metadata. |
| `lib/server/password/password-reset.js` | Modified | Short-circuits denied reset request/confirm attempts before user/token reads and password mutation; removes raw email from touched reset logs. |
| `lib/server/auth/credentials.js` | Modified | Masks emails and removes account-enumerating user IDs from credential-denial log/details. |
| `lib/server/user/registro.js` | Modified | Masks registration email logs while preserving existing registration behavior. |
| `scripts/test-email-brevo-integration.ts` | Modified | Configures a mocked production REST limiter for the production-mode password reset email integration test. |
| `lib/actions/store-checkout-dependencies.js` | Modified | Injects async Next `headers()` alongside cookies/session/order dependencies for testable checkout actor derivation. |
| `lib/actions/store-checkout.js` | Modified | Enforces shared checkout rate limiting before session lookup, input validation, order creation, stock decrement, cart clearing, revalidation, or redirect. |
| `scripts/test-store-checkout-order-foundation.ts` | Modified | Adds strict-TDD checkout denial coverage for fail-closed and REST-store throttles, cart retention, stock/order invariants, hashed actor key payloads, and safe telemetry. |
| `lib/server/security/security-headers.js` | Created | Added pure CSP/security header builder with report-only default, enforce/off modes, baseline headers, and same-origin CSP directives. |
| `next.config.mjs` | Modified | Wires global `headers()` rule using `buildSecurityHeaders()` for app-level security headers; build proved compatible with Next 16.2.6. |
| `lib/server/blog/markdown.js` | Modified | Strengthens final HTML sanitizer to strip executable blocks, inline event handlers, dangerous URL schemes, and non-allowlisted attributes while preserving legitimate markdown HTML. |
| `app/blog/[slug]/page.js` | Modified | Applies final `sanitizeHtml(parseMarkdownToHtml(...))` before `dangerouslySetInnerHTML`. |
| `openspec/changes/resolve-audit-critical-production-blockers/tasks.md` | Modified | Marked Phase 5 verification/package integration tasks complete. |
| `openspec/changes/resolve-audit-critical-production-blockers/apply-progress.md` | Modified | Merged PR1, PR2, PR3, PR4, and Phase 5 cumulative apply progress. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `scripts/test-production-security-controls.ts` | Unit | N/A (new module stub; project rule requires stub before RED import) | ✅ Stub throws `Not implemented` before behavior tests | ✅ RED run failed behaviorally against stubs | ➖ Structural prerequisite | ✅ Stub replaced in 1.3 |
| 1.2 | `scripts/test-production-security-controls.ts` | Unit | N/A (new test file) | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` failed 0/4 with `Not implemented` | ✅ Same command passed 4/4 after 1.3 | ✅ Four behavior cases: production fail-closed, memory deny window, normalized HMAC keys, REST hashed payload denial | ✅ Assertions verify concrete outputs and privacy constraints |
| 1.3 | `scripts/test-production-security-controls.ts` | Unit | N/A (new module) | ✅ Existing RED tests drove implementation | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` passed 4/4 | ✅ Memory and REST paths both covered, allow and deny decisions covered | ✅ Kept pure helper functions for key derivation, store selection, response/log shaping |
| 1.4 | `scripts/test-production-security-controls.ts` | Unit/config | N/A (env docs only; telemetry behavior already covered by tests) | ✅ Safe log context test existed before final refactor/env docs | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` passed 4/4 after `.env.example` update | ✅ Raw email/IP/cart assertions cover multiple sensitive actor types | ✅ `.env.example` documents shared-store production config |
| 2.1 | `scripts/test-production-security-controls.ts` | Unit/integration-style script | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` 4/4; ✅ `pnpm test:ticket-15:runtime` 19/19 | ✅ New auth/reset tests failed 4/7: login returned 307 instead of 429, reset security returned `allow:true`, reset request returned success after DB path | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` passed 7/7 | ✅ Cases cover auth routes, reset security layer, reset request, reset confirmation, and raw-value redaction | ✅ Assertions remain behavioral: status/messages/allow-deny/meta, not implementation-only checks |
| 2.2 | `scripts/test-production-security-controls.ts` | Route handler script | ✅ Route safety included in 2.1 baseline | ✅ Login throttle expectation was written first and failed with 307 redirect before limiter wiring | ✅ Login route returns 429 JSON before validation/auth/session work under fail-closed limiter | ✅ Uses invalid credentials under production fail-closed to prove limiter precedes validation/auth | ✅ Removed raw email from route logs and deferred auth/session imports until after limiter/validation |
| 2.3 | `scripts/test-production-security-controls.ts` | Route handler script | ✅ Route safety included in 2.1 baseline | ✅ Registration throttle expectation was written before implementation in same auth-route RED case | ✅ Registration route returns generic 429 JSON before `registrarUsuario` | ✅ Uses invalid registration payload under production fail-closed to prove limiter precedes registration validation/DB work | ✅ Rate-limited registration logs only surface/decision/retry/store |
| 2.4 | `scripts/test-production-security-controls.ts` | Unit/script | ✅ Password reset runtime baseline 19/19 | ✅ Reset security test failed because prepared-only checks returned `allow:true`/`enforced:false` | ✅ Security layer returns enforced `allow:false` decisions with limiter metadata | ✅ Denied send and token-use surfaces both covered with raw email/IP/user-agent/token redaction | ✅ Shared assessment helper keeps send/token behavior consistent |
| 2.5 | `scripts/test-production-security-controls.ts` | Unit/integration-style script | ✅ Password reset runtime baseline 19/19 | ✅ Reset public-flow test failed because denied actors continued into existing success/DB path | ✅ Request and confirmation return neutral 429 before user/token lookup or password mutation | ✅ Request and confirmation denial paths both covered with fail-closed production config | ✅ Existing runtime reset behavior remains green for allowed local/test flows |
| 2.6 | `scripts/test-production-security-controls.ts`, `scripts/test-ticket-15-runtime.ts` | Unit/script + runtime | ✅ Existing logs showed raw reset/auth emails before refactor | ✅ Redaction assertions were written before implementation and reset security logs exposed raw context | ✅ Redaction assertions pass; runtime logs now mask credential-denial emails and reset rate-limit logs carry surface/decision/retry/store only | ✅ Covers raw email, IP, user-agent, and token values | ✅ Masked login/registration denial details and reset audit sanitization without changing successful user flows |
| 3.1 | `scripts/test-store-checkout-order-foundation.ts` | Runtime/integration script | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` 7/7; ✅ `pnpm test:store-checkout-order-foundation` passed before changes | ✅ New throttled checkout test failed with `NEXT_REDIRECT`, proving existing action still created an order before limiter enforcement | ✅ `pnpm test:store-checkout-order-foundation` passed after checkout limiter wiring | ✅ Fail-closed and REST-store denial cases both assert no order/order item, no stock decrement, no cart clearing, no revalidation, and no redirect | ✅ Assertions verify concrete DB/cart/stock outputs and raw-value redaction |
| 3.2 | `scripts/test-store-checkout-order-foundation.ts` | Server Action integration script | ✅ Checkout baseline included existing invalid/stale/success action paths | ✅ RED test proved `checkoutAction` reached `createOrderFromCart`/redirect under production throttle conditions | ✅ `store-checkout-dependencies.js` injects `headers()` and `checkoutAction` returns neutral 429 before session/order work | ✅ REST-store case asserts expected HMAC actor key from cart/email/IP/user-agent and retry metadata | ✅ Kept actor derivation helpers small and reuses shared limiter/neutral response contracts |
| 3.3 | `scripts/test-store-checkout-order-foundation.ts` | Runtime/logging script | ✅ Existing checkout action tests and PR2 security tests were green | ✅ Telemetry assertion failed while checkout throttle logs included `store`; raw-value checks covered email/IP/user-agent/cart token | ✅ Checkout logs now carry surface/decision/retry only and checkout responses remain non-enumerating | ✅ Covers fail-closed and REST deny telemetry shapes | ✅ Added checkout-specific log-context shaping without changing shared limiter behavior for PR1/PR2 surfaces |
| 4.1 | `scripts/test-production-security-controls.ts` | Unit/script | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` 7/7 baseline; N/A for new stub | ✅ Stubbed `security-headers.js` threw `Not implemented`; RED run failed 7 passed / 3 failed | ✅ Header builder passed report-only/enforce/off/baseline assertions after implementation | ✅ Report-only default, enforce mode, off mode, baseline headers, and no wildcard CSP covered | ✅ Extracted pure CSP serialization and mode normalization helpers |
| 4.2 | `scripts/test-production-security-controls.ts`, `pnpm build` | Config/build | ✅ Read Next 16.2.6 docs for `next.config` `headers()` and CSP/proxy; baseline build known green from PR3 | ✅ `nextConfig.headers` assertion failed while undefined | ✅ `next.config.mjs` global `headers()` rule passed script test; `pnpm build` passed | ✅ Verified config wiring and build compatibility; no `proxy.js` fallback needed | ✅ Kept header wiring in one pure builder imported by config |
| 4.3 | `scripts/test-production-security-controls.ts` | Unit/script | ✅ `pnpm test:blog-content` 75/75 baseline before sanitizer changes | ✅ Blog XSS test failed 11 passed / 1 failed because script content/inline handlers survived sanitizer | ✅ Sanitizer tests passed after stripping executable blocks, event handlers, and dangerous URL schemes | ✅ Covers `<script>` content removal, `on*` attribute removal, `javascript:` URLs, safe `<strong>`, and safe `/tienda` link preservation | ✅ Attribute allowlist keeps only safe `href` on anchors |
| 4.4 | `scripts/test-production-security-controls.ts`, `scripts/test-blog-content.ts` | Unit + page wiring regression | ✅ Blog content baseline 75/75 before modifying markdown/page | ✅ Existing 4.3 RED sanitizer test drove markdown/page final-sanitization update before `dangerouslySetInnerHTML` | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` passed 13/13; `pnpm test:blog-content` passed 75/75 | ✅ Markdown pipeline preserves headings, bold text, and product links while removing script/javascript content | ✅ `parseMarkdownToHtml` now returns sanitized allowlisted HTML and blog page applies final sanitizer defense-in-depth |
| 5.1 | `scripts/test-production-security-controls.ts`, `scripts/validate-production-security-controls.mjs` | Unit/script + static validation | ✅ `pnpm exec tsx scripts/test-production-security-controls.ts` 13/13; ✅ `pnpm test:store-checkout-order-foundation` passed before changes | ✅ Validator output test failed against stubbed `validate-production-security-controls.mjs` with `Not implemented` | ✅ `pnpm test:production-security-controls` passed 15/15 after implementing validator | ✅ Validator asserts limiter wiring for auth/reset/checkout, shared-store production guard, header wiring, and neutral throttle contracts | ✅ Refined static slices to avoid import-order false positives; `pnpm validate:production-security-controls` passed 14/14 |
| 5.2 | `scripts/test-production-security-controls.ts`, `package.json` | Package integration | ✅ Existing package scripts baseline read before edits | ✅ Package integration test failed because `validate:production-security-controls` / `test:production-security-controls` were absent | ✅ `pnpm test:production-security-controls` passed 15/15 after adding scripts and suite wiring | ✅ Exact script commands and inclusion in both `test:validation` and `test:runtime` covered | ✅ Kept script names aligned with existing validation/runtime conventions |
| 5.3 | Package scripts and verification commands | Verification | ✅ Phase 5 GREEN tests established targeted validator/runtime commands before full verification | ✅ Full verification was unavailable to Phase 5 integration until 5.1/5.2 added package scripts | ✅ `pnpm test:production-security-controls`, `pnpm test:store-checkout-order-foundation`, `pnpm test`, `pnpm lint`, and `pnpm build` all passed | ✅ Targeted, runtime, full suite, lint, and build paths all exercised | ➖ None needed — verification-only task |
| 5.4 | `git status --short`, `git diff --name-only`, `git diff --stat` | Scope audit | ✅ Work unit was constrained to Phase 5 before edits | ✅ Scope audit focused on detecting any non-Phase-5 auth/reset/checkout/CSP/blog behavior edits | ✅ Cumulative working tree still includes PR1-PR4 behavior files; Phase 5 session edits are limited to validator/package/test integration and SDD artifacts | ✅ Scope check distinguishes existing PR1-PR4 behavior files from this Phase 5 slice | ➖ None needed — no out-of-scope cleanup performed |

## Test Summary

- **Total tests written/extended**: PR1/PR2 security coverage, PR3 checkout throttle coverage, PR4 CSP/header/blog tests, and Phase 5 validator/package integration assertions in `scripts/test-production-security-controls.ts` plus `scripts/validate-production-security-controls.mjs` static checks.
- **Total tests passing**: `pnpm test:production-security-controls` 15/15; `pnpm validate:production-security-controls` 14/14; `pnpm test:store-checkout-order-foundation` passed; `pnpm test` completed successfully; `pnpm lint` completed successfully; `pnpm build` completed successfully.
- **Layers used**: Unit/script, static validator, route-handler integration-style script, checkout Server Action/runtime integration script, config/build verification, blog renderer regression tests, full suite, lint, and build.
- **Approval tests**: Existing blog content scenarios preserved markdown rendering; existing store checkout/order scenarios preserved PR3 behavior.
- **Pure functions created**: PR1 limiter helpers; PR2 request actor/log shaping helpers; PR3 checkout actor/log shaping helpers; PR4 CSP/header builder and sanitizer helpers; Phase 5 validator helpers for static source checks.

## Deviations from Design

None — Phase 5 stays inside verification-script/package integration and final scope checking. No new auth/reset/checkout/CSP/blog behavior, archive, PR creation, commits, or unrelated cleanup was included.

## Issues Found

- `node_modules/next/dist/docs/` is present in the current install; PR4/Phase 5 read `01-app/03-api-reference/05-config/01-next-config-js/headers.md`, `01-app/02-guides/content-security-policy.md`, and `01-app/03-api-reference/03-file-conventions/proxy.md` before validator/header-scope work.
- Next 16.2.6 supports `next.config.mjs` `async headers()` for global headers. `middleware.js` is deprecated/renamed to `proxy.js`; no proxy fallback was needed because `pnpm build` passed.
- The CSP default is report-only via `SECURITY_HEADERS_CSP_MODE="report-only"`; enforce/off are available without removing baseline headers.
- The existing production-mode Brevo integration test needed a mocked REST limiter config because password reset now correctly fails closed in production without shared limiter config.
- PR1/PR2/PR3/PR4 files are still present in the working tree because this Phase 5 slice is built on top of the established feature-branch-chain state.
- Phase 5 initially found `pnpm build` emitted pre-existing unauthenticated-session log lines while generating static pages; the follow-up remediation section below records the fix and clean build evidence.
- Full `pnpm test` output is long and was truncated by the tool, but the command exited successfully and included the new `validate:production-security-controls` and `test:production-security-controls` package scripts.

## Remaining Tasks

None — all 21 assigned tasks are complete.

## Workload / PR Boundary

- Mode: chained PR slice (`feature-branch-chain`).
- Current work unit: Phase 5 — verification-script/package integration and final scope check.
- Boundary: starts from PR4 CSP/security headers + blog defense; ends with static validator, package script integration, final verification evidence, and SDD artifact updates.
- Estimated review budget impact: Phase 5 touches `package.json`, one new validator script, one existing production-security test script, and SDD artifacts only; no new auth/reset/checkout/CSP/blog behavior was included.

## Remediation: Verify Warning Follow-up

### Completed Remediation

- [x] Investigated `pnpm build` unauthenticated-session log noise during static generation.
- [x] Added strict-TDD coverage for treating only Next production-build request-scope auth misses as silent unauthenticated responses.
- [x] Added `lib/server/auth/session-error.js` and wired `getAuthenticatedSession()` / `getOptionalAuthenticatedSession()` to suppress expected static-generation auth misses without hiding runtime auth/session failures.
- [x] Strengthened `.env.example` deployment notes: production still requires real `RATE_LIMIT_REST_URL`, `RATE_LIMIT_REST_TOKEN`, and `RATE_LIMIT_KEY_SECRET` values from the maintainer/deploy provider.

### Remediation Files Changed

| File | Action | What Was Done |
|---|---|---|
| `lib/server/auth/session-error.js` | Created | Added a pure classifier for Next production-build request-scope auth misses and a silent 401 response builder. |
| `lib/server/auth/auth-session.js` | Modified | Converts only build-phase request-scope auth misses to unauthenticated results; runtime/non-request-scope failures still log and return server errors. |
| `scripts/test-production-security-controls.ts` | Modified | Added RED/GREEN coverage for static-generation auth miss handling and real production rate-limit env documentation. |
| `.env.example` | Modified | Clarifies that production deploys must use real shared-store values and must not deploy placeholder `RATE_LIMIT_*` values. |

### Remediation TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Build auth-log remediation | `scripts/test-production-security-controls.ts` | Unit/script + build | ✅ `pnpm test:production-security-controls` 15/15 and `pnpm test:ticket-10:runtime` 10/10 before changes | ✅ Test failed against `session-error.js` stub with `Not implemented`; env-doc assertion also failed before `.env.example` update | ✅ `pnpm test:production-security-controls` passed 17/17 and `pnpm build` passed with no `No se pudo obtener la sesion autenticada` static-generation log lines | ✅ Covers build phase request-scope error, runtime phase same error, unrelated production-build error, and silent 401 response shape | ✅ Kept classifier side-effect-free and left real runtime/server errors on existing logging path |

### Remediation Command Evidence

| Command | Result | Evidence |
|---|---|---|
| `pnpm test:production-security-controls` | ✅ Passed | 17 passed, 0 failed after RED/GREEN remediation. |
| `pnpm validate:production-security-controls` | ✅ Passed | 14 passed, 0 failed. |
| `pnpm test:ticket-10:runtime` | ✅ Passed | 10 passed, 0 failed for auth/session role-resolution safety. |
| `pnpm lint` | ✅ Passed | `eslint` exited 0. |
| `pnpm test` | ✅ Passed | Full validation/runtime suite exited 0; output was truncated by the tool. |
| `pnpm build` | ✅ Passed | Next.js 16.2.6 generated 28 static pages with no unauthenticated-session log noise. |

### Remediation Remaining External Confirmation

- Production deploy still needs maintainer/provider-supplied shared-store values and `RATE_LIMIT_KEY_SECRET`. This was later clarified below to prefer Coolify/VPS `REDIS_URL`, with REST values remaining fallback/alternative only.

## Remediation: Coolify Redis TCP Rate-Limit Store

### Completed Remediation

- [x] Adapted production store selection to prefer `REDIS_URL` Redis TCP, fall back to `RATE_LIMIT_REST_URL` + `RATE_LIMIT_REST_TOKEN`, and fail closed when neither shared store is configured.
- [x] Kept `RATE_LIMIT_KEY_SECRET` mandatory in production for HMAC actor keys; `AUTH_SECRET` no longer satisfies production rate-limit keying.
- [x] Added official `@redis/client` dependency for TCP Redis and preserved existing REST/Upstash-compatible behavior.
- [x] Updated env/docs and validation coverage for Coolify/VPS Redis TCP primary deployment.

### Remediation Files Changed

| File | Action | What Was Done |
|---|---|---|
| `lib/server/security/rate-limit.js` | Modified | Added Redis TCP store using `REDIS_URL`, primary-before-REST env selection, cached Redis store creation, and production-only `RATE_LIMIT_KEY_SECRET` enforcement. |
| `scripts/test-production-security-controls.ts` | Modified | Added RED/GREEN coverage for Redis-over-REST precedence, REST fallback, fail-closed/no-store behavior, production key-secret enforcement, and hashed/redacted actor material. |
| `scripts/validate-production-security-controls.mjs` | Modified | Validates `REDIS_URL`, `@redis/client`, Redis store implementation, and Redis-before-REST ordering. |
| `.env.example` | Modified | Documents Coolify/VPS `REDIS_URL` as primary and REST-compatible variables as fallback/alternative. |
| `package.json`, `pnpm-lock.yaml` | Modified | Added `@redis/client` `^5.12.1` as the maintained production TCP Redis client. |
| `scripts/test-store-checkout-order-foundation.ts`, `scripts/test-email-brevo-integration.ts` | Modified | Explicitly clear `REDIS_URL` in REST/fail-closed regression tests so they keep exercising the intended path. |

### Remediation TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Coolify Redis TCP store support | `scripts/test-production-security-controls.ts` | Unit/script + static validation | ✅ `pnpm test:production-security-controls` 17/17 and `pnpm validate:production-security-controls` 14/14 before changes | ✅ RED run failed 16 passed / 3 failed: `AUTH_SECRET` fallback was accepted, `REDIS_URL` did not select Redis TCP, and `.env.example` lacked `REDIS_URL` | ✅ `pnpm test:production-security-controls` passed 19/19 and `pnpm validate:production-security-controls` passed 15/15 after implementation | ✅ Covers Redis preferred over REST, REST fallback when `REDIS_URL` absent, production fail-closed without shared store, production `RATE_LIMIT_KEY_SECRET` requirement, and raw email/IP/cart/user-agent redaction | ✅ Kept store selection centralized in `createRateLimitStoreFromEnv`; used `@redis/client` `sendCommand` for minimal INCR/EXPIRE/TTL behavior without changing caller contracts |

### Remediation Command Evidence

| Command | Result | Evidence |
|---|---|---|
| `pnpm exec tsx scripts/test-production-security-controls.ts` (RED) | ✅ Failed as expected | 16 passed, 3 failed before implementation for key-secret enforcement, Redis precedence, and env docs. |
| `pnpm add @redis/client` | ✅ Passed | Added `@redis/client` `5.12.1` to `package.json`/`pnpm-lock.yaml`. |
| `pnpm exec tsx scripts/test-production-security-controls.ts` | ✅ Passed | 19 passed, 0 failed after GREEN implementation. |
| `pnpm validate:production-security-controls` | ✅ Passed | 15 passed, 0 failed. |
| `pnpm test:production-security-controls` | ✅ Passed | 19 passed, 0 failed via package script. |
| `pnpm test:store-checkout-order-foundation` | ✅ Passed | Store checkout order foundation runtime tests passed. |
| `pnpm lint` | ✅ Passed | `eslint` exited 0. |
| `pnpm test` | ✅ Passed | Full validation/runtime suite exited 0; output was truncated by the tool. |
| `pnpm build` | ✅ Passed | Next.js 16.2.6 production build completed successfully and generated 28 static pages. |

### Remediation Remaining External Confirmation

- Production deploy now needs maintainer/provider-supplied `REDIS_URL` from the Coolify-managed Redis TCP service plus `RATE_LIMIT_KEY_SECRET`; REST values are only needed if choosing the REST/Upstash-compatible fallback.

## Status

21/21 tasks complete plus verify-warning and Coolify Redis TCP remediations complete. Ready for sdd-verify re-run before archive.
