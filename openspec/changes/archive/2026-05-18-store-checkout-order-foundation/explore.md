# Explore: store-checkout-order-foundation

## Status

completed_with_tooling_blocker_recovered_by_parent

## Executive Summary

The smallest useful checkout/order foundation should create a local order from the existing cart without payment integration. It should snapshot product and price data, collect minimal customer contact, revalidate/decrement stock transactionally, clear the cart on successful order creation, and show a confirmation page.

Keep payment, shipping/tax, invoices, fulfillment, notifications, and admin order management out of scope.

## Smallest Useful Scope

- Add `Order` and `OrderItem` persistence models, plus relations from `Usuario`/`Product` as needed.
- Order item rows must snapshot immutable checkout data:
  - product id
  - product name
  - product slug
  - unit price minor units
  - quantity
  - line total minor units
- Order header should snapshot subtotal/total minor units and minimal customer contact.
- Create a server-side order service/action that converts the current cart to an order in one transaction.
- Revalidate product purchasability and stock at order creation; reject stale carts when stock/status changed.
- Clear the cart only after successful order creation.
- Add a minimal checkout page/form and a confirmation page.

## Decisions Needed Before Proposal/Spec

1. **Order status model**
   - Recommendation: minimal non-payment statuses such as `received` and `cancelled`, or `pending_confirmation`/`confirmed`.
   - Avoid payment states in this slice.

2. **Stock policy**
   - Options: decrement-on-order, reservation, or no decrement.
   - Recommendation: transactionally decrement stock on successful order creation.
   - Reservation/expiry is out of scope.

3. **Guest/customer contact**
   - Minimum likely required fields: `customerName`, `customerEmail`.
   - Optional: `customerPhone`.
   - Shipping address should be deferred unless local delivery is required now.

4. **Anonymous token hardening**
   - Current cart stores raw `anonymousToken`.
   - Checkout should not use the cart token as an order access credential.
   - Prefer a separate non-enumerable order confirmation token if order lookup is public.

5. **Cart lifecycle**
   - Preserve cart on failed checkout.
   - Clear cart on successful order.
   - Do not implement merge-on-login in this slice.

6. **Confirmation UX**
   - Decide whether `/pedido/[orderNumber]` is public with a separate lookup token, or confirmation is only immediately after checkout.
   - Prefer non-enumerable order number/token.

## Explicit Out of Scope

To stay under the 250-line review budget, do not include:

- Payment providers, payment intents, card/cash payment states.
- Shipping, taxes, invoices, fulfillment, notifications/email.
- Admin order management.
- Stock reservation/expiry/inventory locks beyond simple decrement-on-order.
- Cart merge-on-login and abandoned-cart recovery.
- Discounts, coupons, bundles, variants, multi-currency.
- Navbar cart/order count and broad storefront redesign.
- Catalog-card checkout/add-to-cart changes.

## Relevant Starting Points

- `prisma/schema.prisma` — currently has `Product`, `Category`, `Cart`, `CartItem`; no order models.
- `lib/server/store/cart.js` — returns live cart summaries with `subtotalMinorUnits` and current product stock/price.
- `lib/server/store/cart-validation.js` — purchasability and quantity checks reusable for checkout.
- `lib/actions/store-cart.js` — Next server action/cookie/revalidation response patterns.
- `app/carrito/page.js` — current cart page, no checkout CTA.
- `app/tienda/[slug]/page.js` — product detail add-to-cart and unavailable state.
- `lib/server/store/catalog.js` — active-only public catalog behavior.
- `scripts/validate-store-cart-foundation.mjs` and `scripts/test-store-cart-foundation.ts` — validation/test pattern.

## PR Slicing Forecast for 250-Line Budget

This is likely too large for one PR under 250 changed lines if schema, migration, services, actions, pages, validators, runtime tests, and E2E are all included.

Recommended forecast:

1. **PR A**: order schema + migration + domain service + runtime tests; no UI beyond structural validation.
2. **PR B**: checkout server action/page and cart lifecycle; targeted validator/runtime tests.
3. **PR C**: confirmation page and targeted E2E.

Token hardening should only be included if very small; otherwise treat it as a separate prerequisite slice.

## Risks

- Scope can easily expand into payments/shipping/admin orders and exceed the 250-line review budget.
- Live cart prices are unsafe as order records; immutable snapshots are mandatory.
- Current raw anonymous cart token should not become an order access credential.
- Concurrent checkout can oversell unless stock is revalidated/decremented transactionally.
- SQLite/Prisma transaction semantics should be verified in tests for stock decrement.

## Next Recommended

Draft the OpenSpec proposal/spec for `store-checkout-order-foundation`, making explicit decisions on:

- status model;
- stock decrement;
- required contact fields;
- order confirmation token/UX.

## Skill Resolution

none
