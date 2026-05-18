# Tasks: Store Checkout Order Foundation

## Status

Draft implementation task plan for SDD change `store-checkout-order-foundation`.

## Review Workload Forecast

| Field                   | Value                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~700-1,000 total; PR A ~250-360, PR B ~220-330, PR C ~180-280                               |
| 400-line budget risk    | High                                                                                        |
| Chained PRs recommended | Yes                                                                                         |
| Suggested split         | PR A: schema/service/tests → PR B: checkout action/page/tests → PR C: confirmation UX/tests |
| Delivery strategy       | ask-on-risk                                                                                 |
| Chain strategy          | pending                                                                                     |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

- Use the user-provided 250 changed-line review budget for apply decisions, even though `openspec/config.yaml` currently says 400.
- Pause before implementation if any PR slice is forecast above 250 changed lines after detailed file inspection.
- Pause before implementation to confirm the branch/chain strategy because the forecast requires PR A/B/C chaining and the chain strategy is currently `pending`.

## Chained PR Plan

### PR A — Order schema, domain service, runtime tests

Scope:

- Add durable order persistence and checkout transaction logic without UI routes.
- Expected files: `prisma/schema.prisma`, migration files under `prisma/migrations/` if required, `lib/server/store/orders.js`, `scripts/test-store-checkout-order-foundation.ts`, `scripts/validate-store-checkout-order-foundation.mjs`, `package.json`.

Tasks:

- [ ] RED: Add `scripts/validate-store-checkout-order-foundation.mjs` checks for `OrderStatus`, `Order`, `OrderItem`, mapped table names, snapshot fields, private token hash field, and package scripts; run it and capture failing output.
- [ ] RED: Add `scripts/test-store-checkout-order-foundation.ts` cases for order snapshots/totals, stock decrement, empty cart rejection, invalid contact rejection, stale stock rejection, non-active product rejection, cart clear on success, and cart preservation on failure; run targeted test and capture failing output.
- [ ] GREEN: Update `prisma/schema.prisma` with `OrderStatus`, `Order`, `OrderItem`, `Usuario.orders`, and `Product.orderItems` exactly scoped to the design.
- [ ] GREEN: Add required Prisma migration/generation step for local schema workflow and keep generated artifacts out of the PR unless project workflow already tracks them.
- [ ] GREEN: Implement `lib/server/store/orders.js` with contact parsing, `createOrderFromCart(context, input)`, transactional authoritative price/stock revalidation, conditional stock decrement, immutable snapshots, cart item clearing after order creation, private token generation, and hashed token storage.
- [ ] GREEN: Add `getOrderByConfirmationToken(token)` lookup that rejects missing/malformed tokens and never accepts cart tokens.
- [ ] GREEN: Add package scripts `validate:store-checkout-order-foundation` and `test:store-checkout-order-foundation` if the slice remains under budget.
- [ ] TRIANGULATE: Add or adjust tests proving checkout-time product price is used, product rename/reprice/archive does not alter saved snapshots, and earlier stock decrements roll back when a later cart item fails.
- [ ] REFACTOR: Remove duplication with `lib/server/store/cart-validation.js` only when it reduces line count and preserves existing cart behavior; avoid broad cart refactors.
- [ ] VERIFY PR A: Run `pnpm validate:store-checkout-order-foundation`, `pnpm test:store-checkout-order-foundation`, and `pnpm test` or document exact blockers.
- [ ] PAUSE GATE: If PR A exceeds 250 changed lines, stop and ask whether to split into PR A1 schema/validators and PR A2 service/runtime tests.

### PR B — Checkout action/page and cart lifecycle UI

Scope:

- Wire current cart to the order service through a minimal checkout form.
- Expected files: `lib/actions/store-checkout.js`, `app/checkout/page.js`, optional `app/checkout/checkout-form.js`, optional small edit to `app/carrito/page.js`, `scripts/validate-store-checkout-order-foundation.mjs`, runtime/e2e scripts only if needed.

Tasks:

- [ ] RED: Re-check local Next.js 16 docs under `node_modules/next/dist/docs/` for Server Actions, `cookies()`, `redirect()`, `revalidatePath()`, and page `params/searchParams` before route/action/cookie/redirect changes.
- [ ] RED: Extend validation/runtime tests for `checkoutAction` invalid contact/stale cart responses, success redirect path, and preservation of cart items on action failure; capture failing output before production changes.
- [ ] RED: Add validator checks that `/checkout` exists, renders only `customerName` and `customerEmail` as required contact fields, reads cart context using existing cart cookie/session conventions, and does not request phone/shipping/payment fields.
- [ ] GREEN: Implement `lib/actions/store-checkout.js` with top-level `"use server"`, existing `store_cart_token` context resolution pattern, domain-error responses, `revalidatePath("/carrito")`, `revalidatePath("/checkout")`, and success `redirect()` outside caught `try/catch`.
- [ ] GREEN: Implement `app/checkout/page.js` as a minimal Server Component showing empty-cart guidance or the current cart subtotal and checkout form.
- [ ] GREEN: Add a client form component only if needed for `useActionState` inline errors; otherwise use a simple Server Action form.
- [ ] GREEN: Optionally add a small `/checkout` CTA in `app/carrito/page.js` only if it fits the 250-line slice and does not alter cart mutation forms.
- [ ] TRIANGULATE: Verify failed checkout due to invalid contact, stale stock, unavailable product, or unexpected service error keeps cart contents visible in `/carrito` or `/checkout`.
- [ ] REFACTOR: Keep action response helpers consistent with `lib/actions/store-cart.js`; do not extract shared action infrastructure unless line-neutral and covered by tests.
- [ ] VERIFY PR B: Run targeted checkout validation/runtime scripts, `pnpm test:store-cart-foundation`, and `pnpm test` or document exact blockers.
- [ ] PAUSE GATE: If PR B exceeds 250 changed lines, stop and ask whether to defer the `/carrito` CTA or split checkout page and action into separate PRs.

### PR C — Private-token confirmation UX and regression evidence

Scope:

- Add private confirmation page and prove cart tokens cannot access orders.
- Expected files: `app/pedido/confirmacion/[token]/page.js`, optional `app/not-found.js` only if already appropriate, `scripts/test-store-checkout-order-foundation.ts`, `scripts/validate-store-checkout-order-foundation.mjs`, optional `e2e/store-checkout-order-foundation.spec.ts`.

Tasks:

- [ ] RED: Re-check local Next.js 16 docs for dynamic page `params` promises and `notFound()` before adding confirmation route.
- [ ] RED: Add tests for valid confirmation token lookup/render data, invalid/missing/unrelated token denial, cart token denial, and historical rendering from snapshots after product changes; capture failing output.
- [ ] GREEN: Implement `app/pedido/confirmacion/[token]/page.js` that awaits `params`, calls `getOrderByConfirmationToken(token)`, calls `notFound()` for invalid access, and renders only order snapshot fields/totals.
- [ ] GREEN: Ensure the confirmation page does not read or authorize with `store_cart_token` and does not expose raw `confirmationTokenHash`.
- [ ] TRIANGULATE: Add/keep evidence that `customerName`, `customerEmail`, status, item names/slugs/unit prices/quantities/line totals, subtotal, and total render from the order snapshot after catalog mutation.
- [ ] REFACTOR: Keep markup minimal; avoid admin order views, email, fulfillment, payment, shipping, tax, or broad storefront redesign.
- [ ] VERIFY PR C: Run targeted checkout/order tests, `pnpm test:store-admin-products` if product relation/delete behavior was touched, `pnpm test:store-cart-foundation`, and `pnpm test` or document exact blockers.
- [ ] PAUSE GATE: If PR C exceeds 250 changed lines, stop and ask whether to split confirmation route from e2e/regression evidence.

## Verification Checklist and Commands

- [ ] Confirm strict TDD evidence is recorded for each PR: RED failure before production changes, GREEN pass after implementation, TRIANGULATE edge/regression evidence, and REFACTOR notes.
- [ ] Run `pnpm validate:store-checkout-order-foundation`.
- [ ] Run `pnpm test:store-checkout-order-foundation`.
- [ ] Run `pnpm test:store-cart-foundation` for cart regression coverage.
- [ ] Run `pnpm test:store-admin-products` if schema/product/admin behavior is touched beyond relations.
- [ ] Run `pnpm test` as required full verification.
- [ ] If Next.js route/action/cookie/redirect code changes, record which `node_modules/next/dist/docs/` files were re-read during apply.
- [ ] Verify all persisted monetary values remain integer minor units for Peruvian soles (S/.), with no floating point currency storage.
- [ ] Verify the cart is cleared only after successful order commit and preserved on all validation/stale/persistence failures.
- [ ] Verify the order confirmation credential is a dedicated private token and the anonymous cart token never grants order access.

## Non-goal Guardrails

- [ ] Do not implement payment providers, payment intents, cash/card flows, or payment state modeling.
- [ ] Do not implement shipping, taxes, invoices, fulfillment, notifications, or email.
- [ ] Do not add admin order management.
- [ ] Do not add stock reservations, holds, expiry jobs, abandoned-cart recovery, or cart merge-on-login.
- [ ] Do not add discounts, coupons, bundles, variants, or multi-currency support.
- [ ] Do not require phone, address, tax identity, payment details, or account registration.
- [ ] Do not add navbar cart/order counts or broad storefront redesign.
- [ ] Do not change catalog-card checkout/add-to-cart behavior.
- [ ] Do not reuse or accept the cart anonymous token as an order access credential.
