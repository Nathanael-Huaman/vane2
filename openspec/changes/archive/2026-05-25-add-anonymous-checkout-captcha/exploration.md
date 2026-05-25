## Exploration: add-anonymous-checkout-captcha

### Current State
Checkout is a public Server Action surface implemented by `lib/actions/store-checkout.js` and rendered by `app/checkout/page.js`. It currently collects only `customerName` and `customerEmail`, enforces checkout rate limiting before order creation, then calls `createOrderFromCart` in `lib/server/store/orders.js` to validate contact, re-read cart/product state, create the order transactionally, decrement stock, clear the cart, and redirect to the private confirmation-token route.

No CAPTCHA provider or token verification exists in the repo: searches for `captcha`, `turnstile`, `recaptcha`, and `hcaptcha` returned no application code. `package.json` has no CAPTCHA dependency. Existing checkout tests in `scripts/test-store-checkout-order-foundation.ts` cover contact validation, stale carts, rate-limit fail-closed behavior, privacy-preserving throttling, and successful redirects, but not bot-challenge verification.

### Affected Areas
- `app/checkout/page.js` — checkout form will need to render an anonymous-only CAPTCHA widget/input and preserve signed-in checkout UX without adding extra required contact fields.
- `lib/actions/store-checkout.js` — best insertion point for server-side CAPTCHA verification before `createOrderFromCart`; must preserve existing rate-limit-before-expensive-work posture and avoid leaking cart/contact validity.
- `lib/actions/store-checkout-dependencies.js` — test seam should grow to inject CAPTCHA verifier/config without hard-coding network calls in tests.
- `lib/server/store/orders.js` — likely should remain unchanged; order creation should stay focused on cart/order domain logic after abuse checks pass.
- `scripts/test-store-checkout-order-foundation.ts` or a new focused runtime test — should cover anonymous CAPTCHA missing/invalid/success paths and signed-in bypass if that is the chosen requirement.
- `openspec/specs/store-checkout-order-foundation/spec.md` and/or `openspec/specs/production-security-controls/spec.md` — specs need a security requirement for anonymous checkout CAPTCHA before implementation.

### Approaches
1. **Server-verified CAPTCHA in checkout action for anonymous users** — Add a provider-neutral verifier invoked after rate limiting and before resolving cart/order creation; anonymous submissions require a valid CAPTCHA token, authenticated users bypass it.
   - Pros: Minimal blast radius; keeps order domain pure; preserves existing rate-limit first line; aligns with warning scope: anonymous checkout only.
   - Cons: Requires frontend widget/config and secret management; provider network failures need a fail-closed but user-safe response.
   - Effort: Medium

2. **CAPTCHA enforced inside `createOrderFromCart`** — Pass CAPTCHA data into the domain function and reject before transaction.
   - Pros: Protects all direct callers of order creation.
   - Cons: Pollutes server domain logic with request/widget concerns; current tests call `createOrderFromCart` directly and would need broad churn; signed-in vs anonymous request context becomes less clean.
   - Effort: Medium/High

3. **Rely on existing rate limiting only** — Treat shared checkout throttling as sufficient.
   - Pros: No new dependency or UX complexity.
   - Cons: Does not close the audit warning; rate limiting and CAPTCHA address different abuse modes.
   - Effort: Low, but not acceptable

### Recommendation
Use Approach 1. Keep `checkRateLimit` as the first gate, then require and verify a CAPTCHA token only when `getOptionalAuthenticatedSession()` returns no user. Use a small provider-neutral module/test seam (for example `verifyCheckoutCaptcha`) so future implementation can support Cloudflare Turnstile or another provider without coupling tests to network calls. Return a neutral controlled error on missing/invalid CAPTCHA and on verifier failure; do not reveal whether cart, email, product availability, or account state was valid.

For later Next.js work, the project rule says to read relevant Next.js docs under `node_modules/next/dist/docs/`; this install currently has no matching docs files, so later phases should document that blocker/absence before editing Server Action or form code.

### Risks
- CAPTCHA provider script/CSP requirements may interact with existing or future CSP enforcement and must be explicitly allowed only for the chosen provider.
- Fail-open behavior on verifier outage would leave the audit warning unresolved; fail-closed can affect legitimate anonymous checkout during provider downtime.
- Server Action tests must avoid module-resolution RED failures by adding stubs first if a new verifier module is introduced.
- The checkout form is currently a server component with a plain form action; adding an interactive widget may require a small client component boundary.

### Ready for Proposal
Yes — propose an anonymous-only, server-verified CAPTCHA gate on checkout submissions, sequenced after rate limiting and before order mutation, with focused specs/tests for missing, invalid, provider-failure, valid anonymous, and signed-in bypass behavior.
