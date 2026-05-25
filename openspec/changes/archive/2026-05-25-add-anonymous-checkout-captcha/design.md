# Design: Add Anonymous Checkout CAPTCHA

## Technical Approach

Add an anonymous-only CAPTCHA gate to the checkout Server Action. `checkRateLimit` remains the first gate in `lib/actions/store-checkout.js`; after the optional session is resolved, anonymous users must provide a server-verified CAPTCHA token before `createOrderFromCart` runs. Signed-in users bypass CAPTCHA and keep the existing `Order.userId` linkage. `lib/server/store/orders.js` stays unchanged because cart/order mutation should not know about request abuse controls.

No change-specific spec file is present yet. Current design maps to the proposal and existing `store-checkout-order-foundation` / `production-security-controls` specs. Next.js docs under `node_modules/next/dist/docs/` are not available in this install; apply must re-check before editing Server Action/form code and document the absence if still missing.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Gate location | Enforce in `lib/actions/store-checkout.js` after rate limit and before order creation | Put CAPTCHA in `createOrderFromCart`; rely only on rate limiting | Keeps abuse checks at the request/action boundary, preserves rate-limit-first posture, and avoids polluting domain order logic. |
| Provider seam | Add `lib/server/security/checkout-captcha.js` plus dependency injection in `store-checkout-dependencies.js` | Inline `fetch` in action; add provider SDK | Small provider-neutral seam keeps tests deterministic and avoids adding a package for a simple verification POST. |
| UI boundary | Render widget only for anonymous checkout through a small client component with a hidden `checkoutCaptchaToken` form field | Make whole checkout page client-side; render for all users | Existing page is a Server Component with a plain form action; a narrow client island limits churn and signed-in friction. |
| Failure behavior | Return one neutral 400 response for missing, invalid, or verifier-error CAPTCHA | Expose provider reason; fail open on verifier outage | Neutral fail-closed behavior resolves the audit warning without leaking cart/contact/account validity. |

## Data Flow

```text
app/checkout/page.js resolves session
  -> anonymous form renders CheckoutCaptcha widget + hidden token
  -> checkoutAction receives FormData
  -> checkRateLimit(actor) first
  -> resolve optional session/cart context
  -> anonymous only: verifyCheckoutCaptcha(token, request context)
  -> createOrderFromCart(context, contact)
  -> revalidate cart/checkout and redirect
```

## File Changes

| File | Action | Description |
|---|---|---|
| `app/checkout/page.js` | Modify | Resolve session once for page/cart context and pass `requiresCaptcha` to the form; render CAPTCHA client island only for anonymous carts. |
| `components/store/checkout-captcha.jsx` | Create | Client component that loads the selected provider widget, writes token to hidden `checkoutCaptchaToken`, and displays minimal retry guidance. |
| `lib/server/security/checkout-captcha.js` | Create | Provider-neutral verifier/config helper using env site/secret keys and `fetch`; fail closed on missing config, invalid response, or network error. |
| `lib/actions/store-checkout-dependencies.js` | Modify | Add injectable `verifyCheckoutCaptcha` dependency for runtime tests. |
| `lib/actions/store-checkout.js` | Modify | Parse CAPTCHA token, preserve rate limit first, verify anonymous submissions before `createOrderFromCart`, and return neutral controlled errors. |
| `.env.example` | Modify | Document CAPTCHA site key, secret key, and provider origins. |
| `scripts/test-store-checkout-order-foundation.ts` | Modify | Add missing/invalid/verifier-failure/valid anonymous and signed-in bypass runtime coverage. |
| `scripts/test-production-security-controls.ts` | Modify | Add focused checks that CAPTCHA config is documented and verifier fails closed without secrets. |

## Interfaces / Contracts

```js
verifyCheckoutCaptcha({ token, ip, userAgent })
// -> { ok: true } | { ok: false, reason: "missing" | "invalid" | "unavailable" }
```

Form field contract: anonymous checkout submits `checkoutCaptchaToken`; signed-in checkout may omit it. The shopper-facing failure message should be a single neutral retry message, for example `No se pudo validar el checkout. Intentá nuevamente.`

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/runtime | Verifier missing token, invalid provider response, provider failure, valid token | Add deterministic tests with injected `fetch`/env and no real network. |
| Action/runtime | Anonymous missing/invalid/verifier-error does not create order, decrement stock, clear cart, revalidate, or redirect | Extend `scripts/test-store-checkout-order-foundation.ts` with injected verifier. |
| Action/runtime | Valid anonymous CAPTCHA permits existing success path; signed-in session bypasses verifier and persists `userId` | Extend same runtime test; keep RED tests behavioral by stubbing new modules first. |
| E2E | Manual/local widget smoke only | No CI E2E scope for this change. |

## Migration / Rollout

No data migration required. Roll out by setting provider site/secret keys and provider-specific CSP allowances, then deploy. Rollback removes widget rendering and the action verifier gate; existing checkout rate limiting remains.

## Open Questions

- [ ] Confirm the CAPTCHA provider. Design assumes Cloudflare Turnstile-compatible site/secret verification because it needs no app dependency, but the verifier seam keeps this replaceable.
