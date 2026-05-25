# Tasks: Add Anonymous Checkout CAPTCHA

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250-380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR: verifier seam, checkout gate, widget, docs, focused runtime tests |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Anonymous checkout CAPTCHA gate | PR 1 | Single reviewable slice; keep under 400 if implementation stays focused. |

## Phase 1: Foundation Stubs

- [x] 1.1 Read available Next.js form/Server Action docs under `node_modules/next/dist/docs/`; if absent, record the absence before editing action/page code.
- [x] 1.2 Create stub `lib/server/security/checkout-captcha.js` exporting `verifyCheckoutCaptcha()` that throws `new Error("Not implemented")`.
- [x] 1.3 Create stub `components/store/checkout-captcha.jsx` rendering only hidden `checkoutCaptchaToken` wiring, enough for imports to resolve.
- [x] 1.4 Add `verifyCheckoutCaptcha` to `lib/actions/store-checkout-dependencies.js` as an injectable dependency stub.

## Phase 2: RED Tests

- [x] 2.1 Add RED runtime tests in `scripts/test-store-checkout-order-foundation.ts` for anonymous missing/invalid/verifier-error CAPTCHA rejecting before order, stock, cart, revalidate, or redirect side effects.
- [x] 2.2 Add RED runtime tests in `scripts/test-store-checkout-order-foundation.ts` proving rate limiting rejects before CAPTCHA verification.
- [x] 2.3 Add RED runtime tests in `scripts/test-store-checkout-order-foundation.ts` for valid anonymous CAPTCHA success and signed-in checkout bypass preserving `Order.userId`.
- [x] 2.4 Add RED checks in `scripts/test-production-security-controls.ts` for documented CAPTCHA env/provider origins and fail-closed verifier behavior without secret exposure.

## Phase 3: GREEN Implementation

- [x] 3.1 Implement `lib/server/security/checkout-captcha.js` with provider-neutral config, `fetch` verification, and fail-closed `{ ok: false }` results for missing config/token, invalid response, or network errors.
- [x] 3.2 Update `lib/actions/store-checkout.js` to keep `checkRateLimit` first, resolve optional session, require CAPTCHA only for anonymous submissions, and stop before `createOrderFromCart` on neutral failure.
- [x] 3.3 Update `app/checkout/page.js` to determine anonymous checkout state and render `components/store/checkout-captcha.jsx` only when CAPTCHA is required.
- [x] 3.4 Implement `components/store/checkout-captcha.jsx` as a narrow client island that writes provider tokens to `checkoutCaptchaToken` without making checkout page client-side.
- [x] 3.5 Update `.env.example` with CAPTCHA site key, secret key, and narrowly scoped provider origin notes.

## Phase 4: Verification / Refactor

- [x] 4.1 Run `pnpm test` and ensure the store/security scenarios pass without real CAPTCHA network calls.
- [x] 4.2 Run `pnpm lint` and `pnpm build`; fix only issues caused by this change.
- [x] 4.3 Refactor duplicated test setup or verifier helpers only if it reduces churn while preserving the anonymous-only scope.
