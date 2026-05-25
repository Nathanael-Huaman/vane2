# Tasks: Paginate Order List Queries

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 360-480 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single focused PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Add bounded order-list pagination for admin and customer lists | Single PR | Keep tests, validators, UI links, and specs together |

## Phase 1: RED Tests and Stubs

- [x] 1.1 Create `lib/server/store/order-pagination.js` stub exports with `new Error("Not implemented")`.
- [x] 1.2 RED: update `scripts/test-store-admin-orders-view.ts` for paginated admin summaries, invalid page sanitization, filters/search, and return-to page preservation.
- [x] 1.3 RED: update `scripts/test-store-customer-order-history.ts` for owned-only page windows, invalid/out-of-range pages, and pagination metadata.
- [x] 1.4 RED: update `scripts/validate-store-admin-orders-view.mjs` and `scripts/validate-store-customer-order-history.mjs` to require page parsing, bounded queries, and next/prev links.

## Phase 2: GREEN Server Pagination

- [x] 2.1 Implement `lib/server/store/order-pagination.js` with fixed page size, sanitized 1-based pages, `skip`, `take + 1`, and metadata helpers.
- [x] 2.2 Modify `lib/server/store/admin-orders.js` to accept `page`, preserve status/search filters, use deterministic ordering, and return `{ orders, pagination }`.
- [x] 2.3 Modify `lib/server/store/orders.js` to accept `page`, apply `userId` ownership before pagination, and return `{ orders, pagination }`.

## Phase 3: GREEN Route/UI Wiring

- [x] 3.1 Modify `app/admin/tienda/pedidos/page.js` to read sanitized `page`, render bounded results, preserve `status`/`q`, and add prev/next links.
- [x] 3.2 Keep admin filter submissions safe by resetting to page 1 while status mutations preserve the current page when valid.
- [x] 3.3 Modify `app/perfil/pedidos/page.js` to read `page`, render owned paginated results, and add prev/next links without exposing other users' orders.

## Phase 4: REFACTOR and Verification

- [x] 4.1 Refactor duplicated page-link/query construction only if it reduces complexity without broadening scope.
- [x] 4.2 Run `pnpm validate:store-admin-orders-view`, `pnpm validate:store-customer-order-history`, `pnpm test:store-admin-orders-view`, and `pnpm test:store-customer-order-history`.
- [x] 4.3 Run `pnpm lint`, `pnpm build`, and `pnpm test`; update `apply-progress.md` with strict TDD evidence.
