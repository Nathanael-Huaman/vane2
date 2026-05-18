# Store Checkout Order Foundation

## Status

Draft proposal for SDD change `store-checkout-order-foundation`.

## Problem

The storefront currently has cart infrastructure but no durable checkout/order foundation. A customer can add products to a cart, but the system cannot convert that cart into a persisted order, snapshot product/price data at purchase time, decrement inventory safely, clear the cart after success, or show a private confirmation experience.

Without this foundation, future payment, fulfillment, and admin workflows would lack a reliable local order record and could accidentally depend on mutable catalog/cart state.

## Goals

- Create the smallest useful non-payment checkout flow for the store.
- Persist orders and order items with immutable product, price, quantity, and total snapshots using integer minor units for Peruvian soles (S/.).
- Collect only required customer contact fields: `customerName` and `customerEmail`.
- Convert the current cart into an order through server-side logic in one transaction.
- Revalidate product purchasability, live price, and stock at order creation time.
- Transactionally decrement stock when the order is created.
- Preserve the cart on failed checkout and clear it only after successful order creation.
- Provide a minimal checkout page/form and private confirmation UX using a dedicated order confirmation token.
- Keep the change small enough to slice into reviewable PRs under the 250 changed-line budget.

## Non-goals

- Payment provider integration, payment intents, cash/card payment flows, or payment state modeling.
- Shipping, taxes, invoices, fulfillment, notifications, or email.
- Admin order management.
- Stock reservation/expiry workflows or inventory holds beyond decrement-on-order.
- Cart merge-on-login, abandoned-cart recovery, or broader cart lifecycle improvements.
- Discounts, coupons, bundles, variants, or multi-currency support.
- Navbar cart/order counts or broad storefront redesign.
- Catalog-card checkout/add-to-cart behavior changes.
- Using the cart anonymous token as an order access credential.

## Proposed Scope

1. **Persistence foundation**
   - Add `Order` and `OrderItem` persistence models.
   - Add relations from `Usuario` and `Product` as needed.
   - Store order subtotal/total as integer minor units.
   - Store minimal customer contact on the order header.
   - Store a private, non-enumerable confirmation/access token for confirmation UX.
   - Use the approved minimal order statuses: `pending` and `confirmed`.

2. **Order item snapshots**
   - Persist immutable item snapshot fields:
     - product id
     - product name
     - product slug
     - unit price minor units
     - quantity
     - line total minor units
   - Do not rely on live product/cart state to render historical order details.

3. **Checkout domain/service logic**
   - Add server-side logic that converts the current cart to an order in a single transaction.
   - Revalidate each cart item for purchasability and available stock at checkout time.
   - Recompute totals from authoritative product data during order creation.
   - Decrement product stock transactionally as part of successful order creation.
   - Reject empty, stale, unavailable, or over-stock carts with clear validation failures.
   - Clear the cart only after the order commit succeeds.

4. **Checkout and confirmation UX**
   - Add a minimal checkout form requesting only `customerName` and `customerEmail`.
   - Add a confirmation page/experience that uses a dedicated private order token, not the cart token.
   - Keep UI minimal and defer broader design work.

5. **Validation and tests**
   - Follow strict TDD; implementation slices must add failing tests before production changes.
   - Use `pnpm test` as the test command.
   - Verify stock decrement, stale-cart rejection, snapshot persistence, cart clearing on success, cart preservation on failure, and private confirmation-token behavior.
   - Consult Next.js 16 docs before implementation work that changes routes or server actions.

## User Decisions

- Order statuses are `pending` and `confirmed`.
- Stock is decremented transactionally when creating the order.
- Required checkout contact fields are `customerName` and `customerEmail` only.
- Confirmation UX must use a private token.
- The existing cart token must not be used as an order access credential.
- Currency is Peruvian soles (S/.) represented with integer minor units in persistence and business logic.

## Review/PR Strategy Forecast

This change is likely too large for one PR under the 250 changed-line review budget if it includes schema, migration, domain services, server actions, pages, validators, and tests together.

Recommended chained PR forecast:

1. **PR A: Order persistence and domain service**
   - Add order schema/migration.
   - Add order creation service with transactional stock decrement and immutable snapshots.
   - Add targeted runtime/unit tests.
   - Avoid UI except where necessary for structural integration.

2. **PR B: Checkout action/page and cart lifecycle**
   - Add minimal checkout route/form and server action.
   - Wire current cart conversion to the service.
   - Preserve cart on failures and clear cart on success.
   - Add targeted validation/runtime tests.

3. **PR C: Confirmation UX**
   - Add private-token confirmation lookup/page.
   - Verify token behavior and avoid cart-token credential reuse.
   - Add targeted confirmation tests/E2E if feasible within budget.

If any slice forecasts materially exceed the 250 changed-line budget, pause before apply work and ask for a delivery decision.

## Risks and Mitigations

- **Scope creep into payments/shipping/admin features**: Keep this slice non-payment and explicitly defer fulfillment, invoices, notifications, and admin workflows.
- **Overselling under concurrent checkout**: Revalidate stock and decrement inventory inside the same transaction that creates the order; cover with focused tests where practical for the project database setup.
- **Mutable catalog data corrupting historical orders**: Snapshot product name, slug, unit price, quantity, and line total into order items.
- **Unsafe public access through cart token reuse**: Generate and use a separate non-enumerable private confirmation token for order access.
- **Cart data loss on checkout failure**: Only clear cart after the order transaction succeeds.
- **Review budget pressure**: Use chained PRs and keep UI minimal.
- **Next.js 16 API drift**: Consult local Next.js 16 docs before implementation changes involving routes, server actions, cookies, or redirects.
- **SQLite/Prisma transaction details**: Verify transactional stock decrement behavior with targeted tests during implementation.

## Acceptance Criteria

- `proposal.md` is accepted as the scope baseline for `store-checkout-order-foundation`.
- The resulting implementation can create a persisted order from the current cart without payment integration.
- Orders contain immutable item snapshots and total amounts in integer minor units.
- Checkout requires `customerName` and `customerEmail` only.
- Checkout rejects empty, stale, unavailable, or over-stock carts without clearing the cart.
- Successful order creation decrements stock transactionally and clears the cart afterward.
- Confirmation UX uses a private order token and never treats the cart token as an order credential.
- Tests are planned and implemented under strict TDD with `pnpm test`.
- Work is sliced to respect the 250 changed-line review budget or paused for a delivery decision if that budget cannot be met.

## Open Questions

None for the proposal phase. Implementation details such as exact model field names, token generation helper placement, and route paths can be finalized in the spec/design phases while preserving the decisions above.
