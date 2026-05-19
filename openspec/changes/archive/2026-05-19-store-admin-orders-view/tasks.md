# Tasks: Store Admin Orders View

## Review Workload Forecast

| Field                   | Value                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Estimated changed lines | ~570-950 total; PR A ~220-360, PR B ~180-300, PR C ~170-290                              |
| 400-line budget risk    | High                                                                                     |
| Chained PRs recommended | Yes                                                                                      |
| Suggested split         | PR A: list + filters → PR B: detail + snapshots → PR C: status mutation from list/detail |
| Delivery strategy       | ask-on-risk                                                                              |
| Chain strategy          | pending                                                                                  |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

- Pause before apply to confirm chain strategy because the full scope is likely over the configured 400 changed-line review budget.
- Recommended default is three focused slices: list/filtering, detail/snapshot rendering, then status mutation.
- If the user approves chained delivery, keep each slice independently reviewable and keep tests with the behavior they verify.

## Pre-Apply Requirements

- [x] Re-read `openspec/changes/store-admin-orders-view/proposal.md`, `spec.md`, and `design.md` immediately before implementation.
- [ ] Re-read local Next.js 16 docs before route/action work:
  - [x] `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (PR A route/searchParams)
  - [ ] `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
  - [ ] `node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md`
  - [ ] `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
  - [ ] `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`
  - [x] `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md` (PR B detail missing-order behavior)
  - Note: PR C docs were not present in this install; apply recorded the blocker and used existing project Server Action/form/revalidation/redirect patterns as alternate evidence.
- [x] When RED tests import new JS/TS modules, first create minimal stubs exporting expected functions/classes that throw `new Error("Not implemented")`.
- [x] Do not add schema changes unless apply discovers a hard blocker and records a new design decision first.

## PR A — Read-only admin orders list + filters

Scope:

- Add admin-safe list/filter helper and `/admin/tienda/pedidos` list route.
- No detail page and no working status mutation in this slice.
- Expected files: `lib/server/store/admin-orders.js`, `app/admin/tienda/pedidos/page.js`, `scripts/validate-store-admin-orders-view.mjs`, `scripts/test-store-admin-orders-view.ts`, `package.json`; optional `app/admin/tienda/page.js` only if line budget allows.

Tasks:

- [x] RED: Add package scripts in `package.json` for `validate:store-admin-orders-view` and `test:store-admin-orders-view`; wire them into `test:validation` / `test:runtime` only if the slice remains reviewable.
- [x] RED: Create minimal stub `lib/server/store/admin-orders.js` exporting `parseAdminOrderFilters()` and `getAdminOrderSummaries()` with `Not implemented` behavior.
- [x] RED: Add `scripts/validate-store-admin-orders-view.mjs` checks for the list route path, package scripts, server-side admin gate usage, awaited `searchParams`, `status` + `q` filters only, and forbidden token material absence.
- [x] RED: Add `scripts/test-store-admin-orders-view.ts` cases for `parseAdminOrderFilters()` accepting `pending`, `confirmed`, empty status, bounded `q`, and invalid status state; run `pnpm validate:store-admin-orders-view` and `pnpm test:store-admin-orders-view` and record failing RED output.
- [x] GREEN: Implement `parseAdminOrderFilters(input)` in `lib/server/store/admin-orders.js` with only `status` and `q`, max search length 120, and `invalidStatus` handling.
- [x] GREEN: Implement `getAdminOrderSummaries(filters)` using explicit Prisma `select` for `id`, `customerName`, `customerEmail`, `status`, `subtotalMinorUnits`, `totalMinorUnits`, `createdAt`, and `updatedAt`; never select or return `confirmationTokenHash`.
- [x] GREEN: Implement `app/admin/tienda/pedidos/page.js` as a Server Component that enforces `resolvePageAuthContext()` before data reads, awaits `searchParams`, renders safe auth/denied states, renders a GET filter form, and lists persisted order summaries.
- [x] GREEN: Ensure unsupported status filter renders a clear invalid-filter/empty result state without mutating data.
- [x] TRIANGULATE: Extend runtime tests so status filtering includes matching orders and excludes other statuses, and `q` matches both customer name and customer email.
- [x] TRIANGULATE: Add validator assertions that list UI does not include date filters, pagination controls, export, bulk actions, payment, shipping, invoice, fulfillment, or order-content edit controls.
- [x] REFACTOR: Keep list view-model mapping inside `lib/server/store/admin-orders.js`; avoid leaking raw Prisma records into pages.
- [x] VERIFY PR A: Run `pnpm validate:store-admin-orders-view`, `pnpm test:store-admin-orders-view`, `pnpm validate:store-checkout-order-foundation`, `pnpm test:store-checkout-order-foundation`, `pnpm test:store-admin-products`, `pnpm lint`, and `pnpm test` or document exact blockers.
- [x] PAUSE GATE: PR A remained under the 400 changed-line budget after refactor (~375 changed lines for code/test/package; OpenSpec task/progress artifacts excluded from PR slice budget).

## PR B — Admin order detail + snapshot rendering

Scope:

- Add detail helper and `/admin/tienda/pedidos/[id]` route using internal order id.
- Prove detail renders persisted snapshots and no token material.
- Expected files: `lib/server/store/admin-orders.js`, `app/admin/tienda/pedidos/[id]/page.js`, `scripts/validate-store-admin-orders-view.mjs`, `scripts/test-store-admin-orders-view.ts`.

Tasks:

- [x] RED: Extend stub/export in `lib/server/store/admin-orders.js` for `getAdminOrderDetailById(id)` if not already present.
- [x] RED: Extend `scripts/validate-store-admin-orders-view.mjs` checks for detail route path, awaited `params`, server-side admin gate before data access, `notFound()` for missing order, and forbidden token material absence.
- [x] RED: Extend `scripts/test-store-admin-orders-view.ts` with detail lookup cases for existing id, missing/invalid id, item snapshot fields, and absence of `confirmationTokenHash`; run targeted commands and record failing RED output.
- [x] GREEN: Implement `getAdminOrderDetailById(id)` with explicit Prisma `select` for safe order header fields and `OrderItem` snapshot fields only.
- [x] GREEN: Implement `app/admin/tienda/pedidos/[id]/page.js` as a Server Component that awaits `params`, enforces `resolvePageAuthContext()` before querying, calls `notFound()` when no order exists, and renders customer name/email, status, subtotal/total labels, timestamps, and item snapshots.
- [x] GREEN: Include a link back to `/admin/tienda/pedidos`; do not add status mutation controls unless PR C is in scope.
- [x] TRIANGULATE: Add runtime evidence that detail still renders saved item snapshot values after the underlying product is renamed, repriced, archived, or hidden.
- [x] TRIANGULATE: Add static validator coverage that detail route does not call `getOrderByConfirmationToken`, read `store_cart_token`, render `/pedido/confirmacion`, or expose raw confirmation token material.
- [x] REFACTOR: Reuse formatting helpers consistently for S/. integer minor-unit display; avoid duplicating money/date formatting if existing helpers are available.
- [x] VERIFY PR B: Run `pnpm validate:store-admin-orders-view`, `pnpm test:store-admin-orders-view`, `pnpm validate:store-checkout-order-foundation`, `pnpm test:store-checkout-order-foundation`, `pnpm test:store-admin-products`, `pnpm lint`, and `pnpm test` or document exact blockers.
- [x] PAUSE GATE: PR B remained under the 400 changed-line budget (~290 added/changed lines for code/test files over PR A; OpenSpec progress/task artifacts excluded from PR slice budget).

## PR C — Admin status mutation from list and detail

Scope:

- Add protected status update helper/action and forms on both list and detail contexts.
- Only allow `pending` and `confirmed`.
- Expected files: `lib/server/store/admin-orders.js`, `lib/actions/store-admin-orders.js`, `app/admin/tienda/pedidos/page.js`, `app/admin/tienda/pedidos/[id]/page.js`, `scripts/validate-store-admin-orders-view.mjs`, `scripts/test-store-admin-orders-view.ts`, `package.json` if scripts were not added earlier.

Tasks:

- [x] RED: Create minimal stub `lib/actions/store-admin-orders.js` with top-level `"use server"` and exported `updateOrderStatusAction()` throwing `Not implemented`.
- [x] RED: Extend `lib/server/store/admin-orders.js` stub/export for `parseAdminOrderStatus(value)` and `updateAdminOrderStatus(id, status)` if not already present.
- [x] RED: Extend `scripts/validate-store-admin-orders-view.mjs` checks for Server Action conventions, `updateOrderStatusAction`, server-side admin access enforcement, revalidation of `/admin/tienda/pedidos` and detail paths, sanitized `returnTo`, and status forms on list/detail.
- [x] RED: Extend runtime tests for `parseAdminOrderStatus`, `updateAdminOrderStatus` pending→confirmed and confirmed→pending, invalid status rejection, missing/invalid id rejection, and no mutation on invalid inputs; run targeted commands and record failing RED output.
- [x] RED: Add action-level tests or validator assertions proving unauthorized/client-view contexts are rejected before update, using a dependency seam only if existing auth test setup cannot exercise the action safely.
- [x] GREEN: Implement `parseAdminOrderStatus(value)` accepting only `pending` and `confirmed`.
- [x] GREEN: Implement `updateAdminOrderStatus(id, status)` to update only `Order.status`; do not change customer contact, totals, items, stock, product data, or token fields.
- [x] GREEN: Implement `updateOrderStatusAction(_prevState, formData)` in `lib/actions/store-admin-orders.js` with top-level `"use server"`, existing admin action auth pattern, invalid input errors, missing order handling, `revalidatePath()` for list/detail, and redirect/success behavior outside caught `try/catch`.
- [x] GREEN: Add inline status forms to `app/admin/tienda/pedidos/page.js` and `app/admin/tienda/pedidos/[id]/page.js`, with `returnTo` restricted to the admin orders list/detail paths.
- [x] TRIANGULATE: Verify status changes work from both list and detail and preserve current filters/return path where practical.
- [x] TRIANGULATE: Verify unauthorized visitors, `cliente` users, and administrators in `cliente` view cannot mutate order status and persisted status remains unchanged.
- [x] REFACTOR: Keep action response helpers consistent with `lib/actions/store-admin.js`; avoid introducing shared admin action infrastructure unless line-neutral and covered.
- [x] VERIFY PR C: Run `pnpm validate:store-admin-orders-view`, `pnpm test:store-admin-orders-view`, `pnpm validate:store-checkout-order-foundation`, `pnpm test:store-checkout-order-foundation`, `pnpm test:store-admin-products`, `pnpm lint`, and `pnpm test` or document exact blockers.
- [x] PAUSE GATE: PR C remained under the 400 changed-line budget by forecast (~280-340 code/test changed lines over PR B; OpenSpec artifacts excluded), so no split was required.

## Verification Checklist and Commands

- [x] Record strict TDD evidence for PR A/PR B: RED failure before production completion, GREEN pass, TRIANGULATE edge/regression evidence, and REFACTOR notes.
- [x] Run `pnpm validate:store-admin-orders-view`.
- [x] Run `pnpm test:store-admin-orders-view`.
- [x] Run `pnpm validate:store-checkout-order-foundation`.
- [x] Run `pnpm test:store-checkout-order-foundation`.
- [ ] Run `pnpm test:store-cart-foundation` when cart/checkout context or public checkout regressions need direct evidence.
- [x] Run `pnpm test:store-admin-products` to verify admin gate/product regressions.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test` as the required full verification command.
- [ ] Optional only if shared admin page/auth behavior is changed beyond new routes: run `pnpm test:store-admin-products:e2e`.
- [x] Confirm all S/. money display is derived from persisted integer minor units.
- [x] Confirm no admin route/action/helper selects, returns, or renders `confirmationTokenHash`, raw confirmation tokens, `/pedido/confirmacion`, or `store_cart_token`.
- [x] Confirm public checkout remains guest-capable and public confirmation remains private-token based.

## Non-Goal Guardrails

- [x] Do not add order statuses beyond `pending` and `confirmed`.
- [x] Do not add payment providers, payment review, refunds, payment status, cash/card workflows, or payment intents.
- [x] Do not add fulfillment, shipping, delivery tracking, invoices, tax documents, email, notifications, or customer messaging.
- [x] Do not add customer-facing order history or account order pages.
- [x] Do not require authentication for customer checkout.
- [x] Do not expose or reuse customer confirmation tokens, confirmation token hashes, or anonymous cart tokens as admin credentials.
- [x] Do not add bulk actions, export, printing, analytics dashboards, or staff assignment.
- [x] Do not add controls to edit order item snapshots, customer contact, prices, quantities, totals, stock, or catalog products from admin order pages.
- [x] Do not add date filters, pagination, or advanced search unless a later design decision explicitly keeps them within the review budget.
- [x] Do not add schema changes unless a blocker is documented and approved before implementation continues.

## Rollback Notes

- Remove `app/admin/tienda/pedidos/page.js` and `app/admin/tienda/pedidos/[id]/page.js` to disable the admin UI.
- Remove `lib/actions/store-admin-orders.js` to disable status mutation.
- Remove `lib/server/store/admin-orders.js` if no remaining route/action depends on it.
- Remove `scripts/validate-store-admin-orders-view.mjs`, `scripts/test-store-admin-orders-view.ts`, and related `package.json` scripts.
- If status mutation causes issues, rollback only PR C by removing forms/action while keeping read-only PR A/B if authorization and token non-exposure remain verified.
- Existing order schema, checkout, public confirmation, cart, catalog, and admin product behavior should remain intact because no schema migration is planned.
