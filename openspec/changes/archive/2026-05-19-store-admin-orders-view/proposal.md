# Store Admin Orders View

## Status

Draft proposal for SDD change `store-admin-orders-view`.

## Intent

Give authorized store administrators an operational view of customer orders at `/admin/tienda/pedidos`, with useful filtering, order detail access, and a controlled way to move orders between the existing `pending` and `confirmed` statuses.

This change builds on the completed checkout/order foundation. Orders and order items already persist customer name/email, order status, totals in integer minor units for Peruvian soles (S/.), and immutable item snapshots. The admin UI must read those durable records rather than live cart or mutable catalog state.

## Problem

The store can now create persisted orders, but administrators do not have a protected back-office screen to inspect them. Without an admin order view, staff cannot answer basic operational questions such as:

- What orders have been placed?
- Which orders are pending or confirmed?
- Who placed an order and what did they buy?
- What are the order totals and item snapshots?
- Can an admin mark an order as `pending` or `confirmed` using the existing status model?

The existing public confirmation route is private-token based and intended for customers. Admins need a separate authorized path that reuses the established admin gate and never exposes private confirmation credentials.

## Goals

- Add an admin orders area at `/admin/tienda/pedidos`.
- Reuse the existing admin authorization gate: real role `administrador` plus session view mode `administrador`.
- Show an admin orders list with filters from the first version.
- Provide enough order detail to make viewing useful: customer contact, status, totals, timestamps if available, and order item snapshots.
- Allow authorized admins to change order status between the existing statuses `pending` and `confirmed`.
- Show full customer name and email to authorized admins.
- Keep monetary display based on persisted integer minor units for Peruvian soles (S/.).
- Prevent admin UI from exposing `confirmationTokenHash` or raw confirmation tokens.
- Preserve existing public checkout, confirmation, cart, catalog, and admin product behavior.

## Non-goals

- Adding new order statuses beyond `pending` and `confirmed`.
- Payment provider integration, payment review, refunds, payment status, cash/card workflows, or payment intents.
- Fulfillment, shipping, delivery tracking, invoices, tax documents, email, notifications, or customer messaging.
- Customer-facing order history or account order pages.
- Requiring auth for customer checkout.
- Reusing customer confirmation tokens as admin credentials.
- Broad admin order management beyond viewing, filtering, detail display, and status changes.
- Bulk actions, export, printing, analytics dashboards, or staff assignment.
- Editing order item snapshots, customer contact, prices, quantities, totals, stock, or catalog products from the order admin screen.

## Proposed Scope

1. **Admin orders list**
   - Add `/admin/tienda/pedidos` as the canonical admin route for order management.
   - Render a list/table/card view of persisted orders.
   - Include customer name, customer email, status, total, and enough timestamp/id information to identify each order.
   - Use persisted order totals and customer fields.
   - Do not expose private confirmation token material.

2. **Filters from the start**
   - Provide focused filters that support operational lookup without broad analytics scope.
   - Candidate filters for spec/design: status, customer email/name text search, and date range or recent ordering if supported cleanly.
   - Keep filter behavior server-side and deterministic so it can be validated with targeted tests.
   - Avoid complex pagination unless design shows it is necessary for reviewability or performance.

3. **Order detail view**
   - Add detail access as needed to make admin viewing useful, likely under `/admin/tienda/pedidos/[id]`.
   - Show full customer name/email, order status, subtotal/total, and item snapshots.
   - Render item snapshot fields from `OrderItem`, not current product name, slug, price, or cart data.
   - Do not render `confirmationTokenHash` or raw confirmation tokens.

4. **Admin status changes**
   - Add a protected admin-only status mutation for existing statuses only: `pending` and `confirmed`.
   - Enforce the same server-side admin gate as admin product mutations.
   - Reject unauthorized users, administrators in client view mode, invalid order ids, and invalid status values.
   - Keep status changes narrow and auditable through updated persisted order status; do not add fulfillment or payment state.

5. **Validation and tests**
   - Follow strict TDD: RED, GREEN, TRIANGULATE, REFACTOR.
   - Use `pnpm test` as the full verification command.
   - Add targeted validator/runtime coverage for authorization, filters, detail snapshot rendering, status mutation, and credential non-exposure.
   - Before route/action implementation in later phases, consult local Next.js 16 docs under `node_modules/next/dist/docs`.
   - If RED tests import new JavaScript/TypeScript modules, create minimal stubs first so failures are behavioral rather than module-resolution failures.

## Affected Areas

- `app/admin/tienda/...`: new admin orders list and likely detail route.
- `lib/actions/...`: protected admin status mutation action, if implemented as a Server Action.
- `lib/server/store/...`: admin order query helpers, filter parsing, detail lookup, and status update logic.
- Existing admin authorization helpers, especially the real-role plus view-mode gate.
- Existing order persistence from `store-checkout-order-foundation`.
- Validation/test scripts for store admin orders, checkout/order regressions, and possibly admin product gate regressions.
- OpenSpec specs for admin orders and related checkout/admin product regression expectations.

## User Decisions

- Route: `/admin/tienda/pedidos`.
- MVP scope: admin orders list with filters and order detail as needed for useful viewing.
- Status changes: authorized admins may change order status between `pending` and `confirmed`.
- PII display: authorized admins may see full customer name and email.
- Review budget: 400 changed lines.
- Artifact mode: OpenSpec + Engram for the session; this proposal is persisted in OpenSpec.

## Review/PR Strategy Forecast

This change is likely close to or above the 400 changed-line review budget if list, filters, detail page, status mutation, validators, runtime tests, and regressions are implemented together.

Recommended auto-forecast split if design confirms the diff is large:

1. **PR A: Read-only admin orders list + filters**
   - Admin route, query helper, filter parsing, authorization checks, and targeted tests.
   - No status mutation yet unless the slice remains clearly under budget.

2. **PR B: Order detail + snapshot rendering**
   - Detail route and tests proving snapshots render from order data and token material is not exposed.

3. **PR C: Admin status mutation**
   - Protected server action for `pending`/`confirmed`, validation, revalidation/redirect behavior, and authorization regression tests.

If detailed design forecasts the full change under 400 changed lines with focused tests, a single PR may be acceptable. If any slice exceeds 400 changed lines, pause before apply and ask for a delivery decision.

## Risks and Mitigations

- **Scope creep into fulfillment/payment/admin operations**: Keep this change limited to list, filters, detail, and existing-status mutation.
- **Unauthorized order access**: Reuse the established admin gate on every page and mutation, not only UI links.
- **PII exposure**: Full customer name/email is allowed only inside authorized admin pages; do not surface it in public/customer routes.
- **Private token leakage**: Never render `confirmationTokenHash`, raw confirmation tokens, or customer confirmation URLs in admin UI unless a later explicit SDD approves that behavior.
- **Mutable catalog confusion**: Admin detail must render saved order item snapshots for historical correctness.
- **Status semantics ambiguity**: Status mutation is limited to `pending` and `confirmed`; payment/fulfillment meaning is out of scope.
- **Filter complexity and review size**: Keep filters minimal and server-side; defer analytics, export, and bulk operations.
- **Next.js 16 API drift**: Re-read local docs before implementing pages, params/searchParams, Server Actions, redirects, and revalidation.

## Rollback Plan

- Remove or disable the new `/admin/tienda/pedidos` routes.
- Remove the admin order query/status action helpers introduced by this change.
- Remove package scripts or validators added only for admin orders.
- Preserve existing order persistence and checkout behavior; this change should not require schema changes or destructive migrations.
- If status mutation causes issues, disable only the mutation path while retaining read-only list/detail access if safe.

## Success Criteria

- Authorized admins in admin view can open `/admin/tienda/pedidos` and see persisted orders.
- Visitors, client users, and administrators in client view mode cannot access admin order pages or status actions.
- Admin list supports the approved initial filters and returns deterministic results.
- Admin detail shows useful order data, including customer name/email, status, totals, and item snapshots.
- Admins can change an order status only between `pending` and `confirmed`.
- Invalid status changes, invalid order ids, and unauthorized mutations are rejected without changing persisted data.
- No admin page exposes `confirmationTokenHash` or raw confirmation tokens.
- Public checkout, public confirmation, cart behavior, catalog visibility, and admin product management remain intact.
- Strict TDD evidence is recorded, and `pnpm test` passes or any blocker is documented.

## Open Questions for Spec/Design

- Which exact filters ship first: status, free-text name/email, date range, or a smaller subset?
- Should order list use pagination immediately, or defer until order volume requires it?
- What identifier should appear in the URL and UI: database id, short display id, or another existing field?
- Should status changes happen from list, detail, or both?
- Should the status mutation redirect, revalidate in place, or return inline action errors?
