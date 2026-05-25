# Design: Paginate Order List Queries

## Technical Approach

Add fixed-size, 1-based offset pagination to the two persisted order summary helpers and pass sanitized `page` from App Router `searchParams`. The spec artifact is not present yet, so this design follows the proposal plus current code. Next docs under `node_modules/next/dist/docs/` were requested but are absent in this install; use the existing Next 16.2.6 pattern already in routes: `await searchParams` / `await params` in async server pages.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Shared `lib/server/store/order-pagination.js` vs duplicate parsing | One small new module, but one source for page size/math across admin and customer paths | Use shared helper because both lists need identical sanitization and metadata |
| Offset + `take(pageSize + 1)` vs total counts | No total pages/count, but bounded query and cheap `hasNext` | Use extra-row fetch; no `count()` |
| Preserve `page` during status mutation vs reset | User stays on current page; stale empty page can happen after filters/status changes | Preserve page for mutation return; filter form omits page to reset to 1 |

## Data Flow

    searchParams ──→ parseOrderListPage ──→ get*OrderSummaries
          │                    │                    │
          └── URL links ← pagination metadata ← Prisma findMany(skip,take+1)

Admin filters still come from `parseAdminOrderFilters`; invalid status returns an empty paginated result without querying. Customer summaries remain scoped by `userId` before pagination.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/server/store/order-pagination.js` | Create | Export fixed `ORDER_LIST_PAGE_SIZE`, page parser, offset/metadata helpers. |
| `lib/server/store/admin-orders.js` | Modify | Accept `{ page }`, apply `skip`/`take`, return `{ orders, pagination }`, preserve filters and order. |
| `lib/server/store/orders.js` | Modify | Same contract for owned customer summaries; keep `where: { userId }`. |
| `app/admin/tienda/pedidos/page.js` | Modify | Await `searchParams`, parse page, render Prev/Next links preserving `status`, `q`, and page for `returnTo`; filter submits reset page. |
| `app/perfil/pedidos/page.js` | Modify | Accept/await `searchParams`, parse page, render Prev/Next links for owned history. |
| `scripts/validate-store-admin-orders-view.mjs` | Modify | Replace “no pagination” assertion with bounded query/search-param/link checks. |
| `scripts/test-store-admin-orders-view.ts` | Modify | Assert page sanitization, `skip`/`take` behavior, metadata, filters, ordering, invalid status. |
| `scripts/validate-store-customer-order-history.mjs` | Modify | Assert customer route page handling, bounded helper, and no token/guest exposure. |
| `scripts/test-store-customer-order-history.ts` | Modify | Seed `pageSize + 2` owned orders; assert page 1/2 metadata and ownership. |

## Interfaces / Contracts

```js
getAdminOrderSummaries(filters, { page })
getCustomerOrderSummaries(userId, { page })
// => { orders: Summary[], pagination: { page, pageSize, hasPrevious, hasNext } }
```

`page` is sanitized to integer `>= 1`; missing, non-numeric, fractional, and negative values become `1`. Ordering remains `createdAt desc`, then `id asc`. Page size is fixed and not user-configurable.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Validation | Source contracts and route wiring | Existing `.mjs` validators updated for parser exports, `skip`, `take`, links, token omissions. |
| Runtime | Pagination math, filters, ownership, deterministic order | Existing tsx tests seed enough orders and call helpers with page inputs. |
| E2E | Not in scope | No Playwright/CI expansion for this change. |

## Migration / Rollout

No migration required. Code-only rollback restores full-list queries.

## Open Questions

- [ ] None.
