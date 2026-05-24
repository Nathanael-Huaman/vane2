# Tasks: Resolve Audit Critical Production Blockers

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 780-980 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 |
| Delivery strategy | auto-forecast |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Shared limiter + guard + tests | PR 1 | Base=tracker. |
| 2 | Login/registration/reset enforcement | PR 2 | Base=PR1. |
| 3 | Checkout enforcement before mutation | PR 3 | Base=PR2. |
| 4 | CSP/headers + blog defense + verification | PR 4 | Base=PR3. |

## Phase 1: Foundation

- [x] 1.1 Create `lib/server/security/rate-limit.js` stubs (`checkRateLimit`, actor derivation, throttle helpers) throwing `new Error("Not implemented")`.
- [x] 1.2 RED: add tests in `scripts/test-production-security-controls.ts` for production fail-closed, local/test memory allowance, and hashed actor keys.
- [x] 1.3 GREEN: implement memory + REST adapters, production guard, retry metadata, and neutral denial contract.
- [x] 1.4 REFACTOR: update `.env.example` limiter vars and ensure logs/telemetry redact raw email/token/cart identifiers.

## Phase 2: Auth + Password Reset

- [x] 2.1 RED: add auth/reset throttle tests in `scripts/test-production-security-controls.ts` proving denial before credential lookup, token consume, or password mutation.
- [x] 2.2 GREEN: modify `app/api/auth/credentials-login/route.js` to run limiter after parsing and before validation/auth/session work.
- [x] 2.3 GREEN: modify `app/api/auth/registro/route.js` to enforce limiter before `registrarUsuario` and return generic 429 JSON.
- [x] 2.4 GREEN: modify `lib/actions/password-reset.js` to pass request context and `lib/server/password/password-reset-security.js` to enforce allow/deny decisions.
- [x] 2.5 GREEN: modify `lib/server/password/password-reset.js` to short-circuit denied request/confirm before user/token reads and password update.
- [x] 2.6 REFACTOR: replace account-enumerating audit fields with hashed/masked fields in reset/login denial logs.

## Phase 3: Checkout Enforcement

- [x] 3.1 RED: extend `scripts/test-store-checkout-order-foundation.ts` to assert throttled checkout fails with no order create, no stock decrement, and cart retention.
- [x] 3.2 GREEN: modify `lib/actions/store-checkout-dependencies.js` to inject `headers()` and `lib/actions/store-checkout.js` to run limiter before `createOrderFromCart`.
- [x] 3.3 REFACTOR: normalize checkout throttle telemetry (surface/decision/retry only) and keep response non-enumerating.

## Phase 4: CSP/Headers + Blog Defense

- [x] 4.1 Create `lib/server/security/security-headers.js` stubs and RED tests in `scripts/test-production-security-controls.ts` for report-only/enforce/off and baseline headers.
- [x] 4.2 GREEN: wire headers in `next.config.mjs`; if build proves incompatible, add `middleware.js` fallback with equivalent headers.
- [x] 4.3 RED: add blog XSS tests in `scripts/test-production-security-controls.ts` for `<script>`, inline handlers, and `javascript:` URLs.
- [x] 4.4 GREEN/REFACTOR: update `lib/server/blog/markdown.js` and `app/blog/[slug]/page.js` to sanitize final HTML before `dangerouslySetInnerHTML` and preserve rendering.

## Phase 5: Verification

- [x] 5.1 Create `scripts/validate-production-security-controls.mjs` checks for limiter wiring, header wiring (`next.config.mjs` or `middleware.js`), and neutral throttle responses.
- [x] 5.2 Update `package.json` scripts: add `validate:production-security-controls` and `test:production-security-controls`; include in `test:validation` and `test:runtime`.
- [x] 5.3 Verify with `pnpm test:production-security-controls`, `pnpm test:store-checkout-order-foundation`, `pnpm test`, `pnpm lint`, and `pnpm build`.
- [x] 5.4 Confirm no out-of-scope edits.
