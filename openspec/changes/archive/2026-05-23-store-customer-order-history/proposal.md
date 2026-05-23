# Proposal: Store Customer Order History

## Intent

Give signed-in customers a safe, read-only account area to review their own persisted orders without weakening the existing private confirmation-token model or exposing guest orders by email.

## Scope

### In Scope
- Add protected `/perfil/pedidos` order history for the current authenticated user.
- Add protected `/perfil/pedidos/[id]` detail for an order owned by the current user.
- Add customer-owned server read helpers scoped by `Order.userId`, using saved order/item snapshots and S/. formatting.
- Add profile/user-menu navigation to the order history.
- Add strict TDD/runtime evidence for auth, ownership filtering, ordering, detail snapshots, and token non-exposure.

### Out of Scope
- Guest/email-based history, cart-token history, or broader order-claiming flows.
- Customer order mutation, cancellation, returns, refunds, fulfillment, payment, invoices, notifications, or new statuses.
- Pagination, filters, exports, analytics, or broad profile/storefront redesign.

## Capabilities

### New Capabilities
- `store-customer-order-history`: Authenticated customer order list/detail behavior, ownership rules, snapshot rendering, navigation, and evidence expectations.

### Modified Capabilities
- `store-checkout-order-foundation`: Clarify that signed-in checkout-created orders MUST be linkable to the authenticated user for account history, while guest orders remain accessible only through private confirmation flow.

## Approach

Follow the exploration recommendation: account-only history. Add customer-specific data access in `lib/server/store/orders.js` or adjacent helpers that enforces `userId` ownership at the query boundary. Build App Router pages under `app/perfil/pedidos`, reusing existing profile auth style and order snapshot/view-model patterns from checkout/admin code without reusing admin authorization assumptions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/perfil/pedidos/**` | New | Protected list/detail pages. |
| `lib/server/store/orders.js` | Modified | Customer-owned read helpers and safe view models. |
| `components/user-menu.jsx`, `app/perfil/page.js` | Modified | Account navigation affordance. |
| `scripts/*customer-order-history*`, `package.json` | Modified | Targeted test script and `pnpm test` wiring if needed. |
| `prisma/schema.prisma` | Unchanged | Existing `Order.userId` is sufficient. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cross-user order disclosure | Med | Enforce `userId` in server helper queries, not only page code. |
| Guest-order expectation mismatch | Med | Spec and UI copy state only signed-in checkout orders appear. |
| Review budget over 400 lines | Med | Prefer chained slices: server/tests first, pages/navigation second. |

## Rollback Plan

Remove `/perfil/pedidos` routes, customer read helpers, navigation link, and customer-history tests/package wiring. Existing checkout, confirmation-token access, admin orders, and schema remain unchanged.

## Dependencies

- Existing `Order.userId`, `Usuario.orders`, checkout order persistence, session auth, and profile route gate.

## Success Criteria

- [ ] Signed-in users see only their own orders, newest first, with S/. totals and saved snapshots.
- [ ] Unauthenticated users and other owners cannot access customer history/detail data.
- [ ] No confirmation token/hash/cart token is rendered or accepted as customer-history credential.
- [ ] `pnpm test` includes targeted RED/GREEN evidence or documents a blocker.
