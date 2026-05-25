# Proposal: Paginate Order List Queries

## Intent

Prevent unbounded admin and customer order list queries from growing with order volume while preserving existing filters, ownership boundaries, and newest-first UX.

## Scope

### In Scope
- Add server-controlled offset pagination to admin order summaries and customer order history summaries.
- Sanitize 1-based `page` route/search params and use a fixed page size.
- Preserve admin status/search filters and customer ownership scoping.
- Add pagination metadata and UI navigation for admin and customer lists.
- Keep deterministic ordering: `createdAt desc`, then `id asc`.

### Out of Scope
- Cursor pagination, infinite scrolling, or user-configurable page size.
- Detail routes, checkout/status model/token/CAPTCHA/loading.js changes.
- CI/E2E expansion, duplicate cleanup, coverage changes, exports, analytics, or bulk actions.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `store-admin-orders-view`: admin orders list MUST paginate persisted summaries while preserving approved filters/search and safe status mutation return navigation.
- `store-customer-order-history`: customer order history list MUST paginate owned orders without disclosing other users’ or guest orders.

## Approach

Use offset pagination (`skip`, `take`) in `lib/server/store/admin-orders.js` and `lib/server/store/orders.js`, fetching one extra row to compute `hasNext` without requiring total counts. Add shared validation/helpers only if existing patterns justify it. Parse `page` in `app/admin/tienda/pedidos/page.js` and `app/perfil/pedidos/page.js`; reset or preserve page intentionally when filters/status mutations navigate.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/server/store/admin-orders.js` | Modified | Paginated query, metadata, deterministic order. |
| `lib/server/store/orders.js` | Modified | Paginated customer-owned summaries. |
| `app/admin/tienda/pedidos/page.js` | Modified | Page param handling and pagination controls. |
| `app/perfil/pedidos/page.js` | Modified | Page param handling and pagination controls. |
| `tests/` / validators | Modified | Update full-list expectations to page-bounded behavior. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Off-by-one page math | Med | Unit/validator coverage for page 1, invalid page, next/prev. |
| Filter navigation drops page/search | Med | Preserve query params explicitly in links/actions. |
| Review budget overrun | Med | Split store contract/tests from UI wiring if forecast exceeds 400 lines. |

## Test Plan

- Add RED tests/validators for bounded `take/skip`, metadata, deterministic order, invalid page sanitization, filters, ownership boundaries, and UI links.
- Run `pnpm test`; later verify with `pnpm lint`/`pnpm build` if implementation touches routes/components.

## Rollback Plan

Revert this change folder and implementation commits to restore full-list queries. No schema/data migration is planned, so rollback is code-only.

## Dependencies

- Existing Prisma indexes on `(status, createdAt)` and `(userId, createdAt)`.

## Success Criteria

- [ ] Admin and customer order lists no longer issue unbounded `findMany` queries.
- [ ] Pagination metadata and controls work with filters, ownership, and invalid page input.
- [ ] Existing auth, token privacy, checkout, detail, and status behavior remains unchanged.
