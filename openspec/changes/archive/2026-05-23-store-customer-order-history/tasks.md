# Tasks: Store Customer Order History

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 480-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Server customer-order read contracts + RED tests | PR 1 | Base: main; include `scripts/test-store-customer-order-history.ts` + `scripts/validate-store-customer-order-history.mjs` failing then passing for server scope. |
| 2 | Protected list route + account navigation | PR 2 | Base: PR 1; add `/perfil/pedidos` page and menu/profile links; keep list scenarios and auth gate passing. |
| 3 | Protected detail route + final verification/refactor | PR 3 | Base: PR 2; add `/perfil/pedidos/[id]`, ownership/notFound flow, token-boundary checks, and full `pnpm test` pass. |

## Phase 1: Foundation (RED)

- [x] 1.1 Create `scripts/test-store-customer-order-history.ts` with failing scenarios for owned-only list/detail, newest-first order, empty state, and non-owner denial.
- [x] 1.2 Create `scripts/validate-store-customer-order-history.mjs` with failing static checks for protected routes, auth-before-data, and token-field omission contract.
- [x] 1.3 Update `package.json` test scripts so `pnpm test` executes both customer-history scripts.

## Phase 2: Core Server Implementation (GREEN)

- [x] 2.1 Modify `lib/server/store/orders.js` to add `getCustomerOrderSummaries(userId)` with `{ userId }` scoping and `createdAt desc, id asc` ordering.
- [x] 2.2 Modify `lib/server/store/orders.js` to add `getCustomerOrderDetailById(userId, orderId)` with `{ id, userId }` ownership enforcement and snapshot-based mapping.
- [x] 2.3 In `lib/server/store/orders.js`, return `[]`/`null` for blank ids, format monetary values with S/., and keep selects free of `confirmationTokenHash`/raw token fields.

## Phase 3: Route Wiring and UI

- [x] 3.1 Create `app/perfil/pedidos/page.js` that calls `resolvePageAuthContext()` before queries and renders customer list + empty-history state.
- [x] 3.2 Create `app/perfil/pedidos/[id]/page.js` that calls `resolvePageAuthContext()`, loads owned detail, and uses `notFound()` for missing/non-owned orders.
- [x] 3.3 Modify `components/user-menu.jsx` to add authenticated “Mis pedidos” navigation to `/perfil/pedidos`.
- [x] 3.4 Modify `app/perfil/page.js` to add a profile entry point linking to `/perfil/pedidos`.

## Phase 4: Verification and Refactor

- [x] 4.1 Make `scripts/validate-store-customer-order-history.mjs` pass for route existence, auth-first flow, safe query/select contracts, and package wiring.
- [x] 4.2 Make `scripts/test-store-customer-order-history.ts` pass for spec scenarios, including checkout `Order.userId` linkage and token non-exposure.
- [x] 4.3 Refactor duplicated customer-order mapping in `lib/server/store/orders.js` without changing outputs; rerun `pnpm test`.
