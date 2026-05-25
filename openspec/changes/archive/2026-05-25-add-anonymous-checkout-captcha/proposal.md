# Proposal: Add Anonymous Checkout CAPTCHA

## Intent

Resolve the audit warning that anonymous checkout can submit orders without a bot challenge while preserving existing checkout rate limiting, signed-in checkout behavior, and the current cart-to-order domain flow.

## Scope

### In Scope
- Require server-verified CAPTCHA for anonymous checkout submissions.
- Bypass CAPTCHA for authenticated checkout submissions.
- Keep checkout rate limiting before CAPTCHA verification and before order mutation.
- Return neutral, retry-safe failures for missing, invalid, or verifier-failed CAPTCHA.
- Add focused runtime tests/spec deltas for anonymous CAPTCHA and signed-in bypass behavior.

### Out of Scope
- Loading/streaming UX changes, E2E-in-CI changes, coverage work, duplicate artifact cleanup, or checkout redesign.
- Payment, shipping, account registration, cart lifecycle redesign, or order domain rewrites.
- Choosing broad CSP/header policy beyond provider-specific allowances needed by the widget.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `store-checkout-order-foundation`: Add anonymous-only CAPTCHA gating before order creation while preserving signed-in checkout and cart/order guarantees.
- `production-security-controls`: Add bot-challenge expectations for anonymous checkout as a public abuse-prone mutation, including privacy-preserving denial and fail-closed verifier behavior.

## Approach

Use the exploration recommendation: keep `checkRateLimit` as the first checkout gate, then verify a CAPTCHA token only when `getOptionalAuthenticatedSession()` has no user. Add a provider-neutral verifier/config seam so tests avoid real network calls and implementation can use Turnstile or another provider. Perform CAPTCHA validation in the Server Action before `createOrderFromCart`; keep `lib/server/store/orders.js` focused on cart/order mutation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/checkout/page.js` | Modified | Render anonymous-only CAPTCHA input/widget without adding contact fields. |
| `lib/actions/store-checkout.js` | Modified | Enforce CAPTCHA after rate limit and before order creation. |
| `lib/actions/store-checkout-dependencies.js` | Modified | Add injectable verifier/config seam. |
| `scripts/test-store-checkout-order-foundation.ts` | Modified | Cover missing, invalid, verifier-failure, valid anonymous, and signed-in bypass paths. |
| `openspec/specs/*` | Modified | Delta specs for checkout and production security behavior. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Provider outage blocks anonymous checkout | Medium | Fail closed with neutral retry-safe message; document operational dependency. |
| CAPTCHA widget conflicts with CSP | Medium | Allow only chosen provider origins and test page load manually. |
| Error wording leaks validity of cart/contact/account | Low | Reuse neutral controlled checkout failure response. |

## Rollback Plan

Revert the CAPTCHA widget, verifier seam, Server Action gate, tests, and spec deltas. Existing rate limiting and `createOrderFromCart` behavior remain the fallback protection.

## Dependencies

- CAPTCHA provider site key/secret and allowed origins.
- Next.js Server Action/form docs check before implementation; current install reports no matching docs files.

## Success Criteria

- [ ] Anonymous checkout without valid CAPTCHA cannot create an order, decrement stock, or clear cart.
- [ ] Valid anonymous CAPTCHA permits checkout when existing cart/contact rules pass.
- [ ] Authenticated checkout bypasses CAPTCHA and still links `Order.userId`.
- [ ] CAPTCHA failures are fail-closed and privacy-preserving.
- [ ] Review-budget risk stays low; expected implementation remains under 800 changed lines.
