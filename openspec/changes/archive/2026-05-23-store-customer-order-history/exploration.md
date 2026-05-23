## Exploration: store-customer-order-history

### Current State
Orders already exist as durable checkout records in `Order`/`OrderItem`, with immutable item snapshots, integer minor-unit totals, `pending|confirmed` status, optional `userId`, and a private confirmation-token hash. Checkout creates orders from either an authenticated user cart or anonymous cart, stores `userId` when present, clears the cart on success, and redirects to `/pedido/confirmacion/[token]` for private confirmation access.

Admin order foundations already provide reusable query/view-model patterns for list/detail/status display: summary fields, detail item snapshots, S/. formatting, safe omission of token material, and status labels. The customer-facing gap is not the order model itself; it is an authenticated customer read path filtered by `Order.userId`, plus UI/navigation for a customer's own order list and detail.

### Minimum Viable Scope
- Add a signed-in customer order history route, likely `/perfil/pedidos`, that lists the current authenticated user's own persisted orders.
- Add a signed-in customer order detail route, likely `/perfil/pedidos/[id]`, that renders the same saved order/contact/totals/item snapshots for an order owned by the current user.
- Reuse the checkout/admin order view-model ideas but create customer-specific server reads that always scope by `userId` and never expose `confirmationTokenHash` or raw confirmation tokens.
- Add a user-menu/profile navigation affordance to reach order history from the existing account area.
- Add focused TDD/runtime validation for ownership filtering, unauthenticated denial, list ordering, detail snapshot rendering, and token non-exposure.

### Explicit Non-goals
- No guest/anonymous order history by email lookup or cart token.
- No use of public confirmation token as a customer-history credential.
- No admin status mutation, customer status mutation, cancellation, returns, refunds, payment, fulfillment, shipping, invoices, email, notifications, or new order statuses.
- No editing of order item snapshots, customer contact, prices, quantities, totals, or stock from customer pages.
- No pagination, date filters, advanced search, exports, analytics, or broad storefront/navbar redesign unless a later phase explicitly accepts the review cost.

### Affected Areas
- `prisma/schema.prisma` — already has `Order.userId` and `Usuario.orders`; likely no schema change for MVP.
- `lib/server/store/orders.js` — best home for customer-owned read helpers or shared order view-model helpers; current public helper only reads by confirmation token.
- `lib/server/store/admin-orders.js` — source of reusable mapping/formatting patterns, but customer reads should not reuse admin authorization assumptions.
- `app/perfil/page.js` and `app/perfil/sesiones/page.js` — existing authenticated profile route style and likely placement for account navigation.
- `components/user-menu.jsx` — likely add “Mis pedidos” entry under “Mi cuenta” if scope includes navigation.
- `app/pedido/confirmacion/[token]/page.js` and `confirmation-view-model.js` — current private-token confirmation UX; should remain unchanged and can inspire customer detail formatting.
- `scripts/test-store-checkout-order-foundation.ts` and `scripts/test-store-admin-orders-view.ts` — current script-based test style and seeded order patterns to extend with a new customer-history test script.
- `package.json` — next phase may add validation/runtime scripts and wire them into `pnpm test` if the spec requires it.

### Approaches
1. **Authenticated customer history only** — add `/perfil/pedidos` and `/perfil/pedidos/[id]`, both requiring login and querying orders by `userId`.
   - Pros: smallest safe scope, uses existing model, aligns with checkout storing `userId`, avoids email/token ambiguity.
   - Cons: orders created as guests before login are not shown.
   - Effort: Medium

2. **Hybrid account + email history** — show signed-in orders by `userId` plus matching `customerEmail`.
   - Pros: could surface guest orders created with the same email.
   - Cons: account/email verification and ownership semantics become security-sensitive; higher privacy risk.
   - Effort: High

3. **Token-based customer portal** — extend confirmation-token access into broader order history/detail UX.
   - Pros: guest-friendly.
   - Cons: conflicts with the existing private-token-per-order model; not a true account history and increases credential-leak impact.
   - Effort: Medium/High

### Recommendation
Proceed with **Authenticated customer history only**. It is the right first slice because the schema already links orders to users, checkout already persists `userId` for authenticated purchases, and the security model stays simple: authenticated session plus `Order.userId` ownership. Guest order lookup should remain limited to the existing private confirmation link until a separate change defines account-claiming or email-verification semantics.

### Likely Routes, Screens, and Actions
- `GET /perfil/pedidos` — protected account page listing only current-user order summaries: id, status, total, created/updated date, and detail link.
- `GET /perfil/pedidos/[id]` — protected account page showing only an owned order's detail snapshots, totals, status, and customer contact saved at checkout.
- No mutation action for MVP. Customer order history should be read-only.

### Domain / Model Gaps
- No schema gap for MVP: `Order.userId` is already nullable and indexed with `createdAt`.
- Main behavioral gap: customer-owned read helpers are missing. They should filter by authenticated `userId` at the data-access boundary, not only in page code.
- Guest-created orders have `userId: null`; they will not appear in account history. This is acceptable only if called out in proposal/spec.
- Existing `OrderItem.product` relation uses `onDelete: Restrict`; historical display still uses snapshots, but product deletion remains constrained by DB relation. Do not try to solve this in this change.

### Review Workload Forecast
- Expected changed areas: 2 route files, 1 server helper module or extension, 1 test script, `package.json`, and maybe `components/user-menu.jsx`/profile page link.
- 400-line budget risk: **Medium** if list, detail, tests, and navigation land together; **Low** if implementation stays read-only and avoids pagination/filters.
- Chained PRs recommended: **Yes**, because session preflight says `force-chained`. Suggested slice: PR 1 customer-owned server reads + tests; PR 2 pages/navigation + UI tests or runtime validation.
- Decision needed before apply: **No**, current preflight already resolves delivery as force-chained.

### Risks
- Accidentally exposing another user's order if ownership filtering is split between page and helper instead of enforced in server reads.
- Blurring confirmation-token access with authenticated account access.
- Product expectations around guest orders: customers may expect previous guest purchases to appear after login, but MVP should explicitly exclude that.
- Review size can grow if adding filters, pagination, or status/customer actions; keep those out.

### Ready for Proposal
Yes — tell the user the recommended proposal scope is a read-only, authenticated `/perfil/pedidos` customer order history and detail slice, limited to orders created while signed in, reusing existing order snapshots and formatting patterns without adding guest lookup or order mutations.
