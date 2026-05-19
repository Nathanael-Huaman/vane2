# Design: Store Admin Orders View

## Summary

Implement `store-admin-orders-view` as a protected admin-only order management slice under `/admin/tienda/pedidos`.

The design adds:

- a server-rendered admin orders list with `status` and customer name/email search filters;
- an order detail route by internal order id;
- a protected status mutation available from both list and detail;
- focused query/view-model helpers that return only admin-safe fields;
- targeted validators/runtime tests under strict TDD.

No schema migration is expected. Existing `Order`/`OrderItem` persistence already stores customer contact, `pending|confirmed` status, timestamps, integer S/. minor-unit totals, and immutable item snapshots.

## Decisions

| Topic                     | Decision                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Canonical route           | `/admin/tienda/pedidos`                                                                                           |
| Detail route              | `/admin/tienda/pedidos/[id]`, where `id` is the internal Prisma `Order.id` string                                 |
| Initial filters           | `status` plus free-text `q` over `customerName` and `customerEmail` only                                          |
| Unsupported status filter | Treat as invalid filter state: render a clear message and no filtered results; never mutate data                  |
| Status mutation locations | Both list rows and detail page                                                                                    |
| Mutable statuses          | Existing `pending` and `confirmed` only                                                                           |
| PII                       | Full customer name/email may render for authorized admins only                                                    |
| Token policy              | Never select or render `confirmationTokenHash`, raw confirmation tokens, public confirmation URLs, or cart tokens |
| Pagination/date filters   | Out of scope for this change unless apply discovers an unavoidable performance blocker                            |
| Schema                    | No schema change planned                                                                                          |

## Proposed Files

### New files

- `app/admin/tienda/pedidos/page.js`
  - Server Component for the orders list and filter form.
- `app/admin/tienda/pedidos/[id]/page.js`
  - Server Component for order detail by internal id.
- `lib/server/store/admin-orders.js`
  - Admin-safe order query helpers, filter parsing, status parsing/update, and view-model shaping.
- `lib/actions/store-admin-orders.js`
  - Top-level `"use server"` module for `updateOrderStatusAction`.
- `scripts/validate-store-admin-orders-view.mjs`
  - Static validator for routes/actions/non-exposure/package scripts.
- `scripts/test-store-admin-orders-view.ts`
  - Runtime tests for filters, detail snapshots, status update, invalid inputs, and unauthorized action paths where practical.

### Modified files

- `package.json`
  - Add `validate:store-admin-orders-view` and `test:store-admin-orders-view`.
  - Include the validator/runtime script in `test:validation` / `test:runtime` if the slice remains reviewable.
- Optional, only if line budget allows: `app/admin/tienda/page.js`
  - Add a small link/card to `/admin/tienda/pedidos` from the existing store admin home.

## Route Structure

```txt
app/admin/tienda/pedidos/page.js
app/admin/tienda/pedidos/[id]/page.js
```

### List page behavior

`/admin/tienda/pedidos` accepts search params:

```txt
?status=pending|confirmed&q=<customer-name-or-email-fragment>
```

The page should:

1. call `resolvePageAuthContext()`;
2. render the same kind of `PageStateCard` used by existing admin product pages for auth errors, anonymous visitors, and denied users;
3. await `searchParams` per Next.js 16 page conventions;
4. parse filters through `parseAdminOrderFilters(searchParams)`;
5. call `getAdminOrderSummaries(filters)`;
6. render a simple filter form using `GET` so filtered URLs are shareable;
7. render order summaries with id, customer name, customer email, status, total label, created/updated timestamp labels, a detail link, and an inline status form.

Do not add pagination in this change. Order by newest first, using `createdAt desc` with a deterministic tie-breaker such as `id asc` if needed.

### Detail page behavior

`/admin/tienda/pedidos/[id]` should:

1. await `params` and read `id`;
2. enforce the same page admin gate;
3. call `getAdminOrderDetailById(id)`;
4. call `notFound()` if no matching order exists;
5. render customer name/email, status, subtotal/total labels, timestamps, and item snapshot rows;
6. render a status mutation form for the current order;
7. include a link back to `/admin/tienda/pedidos`.

## Data and Query Helper Design

Add `lib/server/store/admin-orders.js` as the admin-safe order DAL for this feature.

### Constants

```js
const ADMIN_ORDER_STATUSES = ["pending", "confirmed"];
const MAX_ADMIN_ORDER_SEARCH_LENGTH = 120;
```

### Filter parsing

Proposed export:

```js
export function parseAdminOrderFilters(input = {})
```

Input may be a plain object produced from awaited `searchParams` or `URLSearchParams`-like values normalized by the page.

Return shape:

```js
{
  status: "pending" | "confirmed" | null,
  q: string,
  invalidStatus: boolean,
}
```

Rules:

- `status` is accepted only when exactly `pending` or `confirmed`.
- missing/empty `status` becomes `null`.
- unsupported non-empty `status` sets `invalidStatus: true` and returns no status predicate.
- `q` is trimmed, collapsed to a bounded string, and limited to `MAX_ADMIN_ORDER_SEARCH_LENGTH`.
- no date, pagination, sort, export, or advanced search params are accepted.

### List query

Proposed export:

```js
export async function getAdminOrderSummaries(filters = {})
```

Behavior:

- If `filters.invalidStatus` is true, return an empty list plus filter metadata; do not query misleading data.
- Build a Prisma `where` with:
  - `status` equality when valid;
  - `OR` on `customerName contains q` and `customerEmail contains q` when `q` exists.
- Select only these fields:
  - `id`, `customerName`, `customerEmail`, `status`, `subtotalMinorUnits`, `totalMinorUnits`, `createdAt`, `updatedAt`.
- Exclude `confirmationTokenHash` by using explicit `select`, never spreading full records.
- Map monetary values with existing `formatSolesPrice`.

Suggested view-model shape:

```js
{
  id,
  customerName,
  customerEmail,
  status,
  statusLabel,
  subtotalLabel,
  totalLabel,
  createdAtLabel,
  updatedAtLabel,
  detailPath: `/admin/tienda/pedidos/${id}`,
}
```

### Detail query

Proposed export:

```js
export async function getAdminOrderDetailById(id)
```

Behavior:

- Reject empty/non-string ids by returning `null`.
- Query by `id` using explicit `select`.
- Select order header fields plus item snapshots only:
  - order: `id`, `customerName`, `customerEmail`, `status`, `subtotalMinorUnits`, `totalMinorUnits`, `createdAt`, `updatedAt`;
  - items: `id`, `productId`, `productName`, `productSlug`, `unitPriceMinorUnits`, `quantity`, `lineTotalMinorUnits`, `createdAt`.
- Do not include live `product`, cart data, `confirmationTokenHash`, or customer confirmation URL material.
- Order items by creation order.
- Map to an admin detail view model using persisted snapshot values.

### Status update helper

Proposed exports:

```js
export function parseAdminOrderStatus(value)
export async function updateAdminOrderStatus(id, status)
```

Rules:

- Only `pending` and `confirmed` are accepted.
- Invalid status throws/returns a domain error that maps to HTTP 400 in the action.
- Missing/invalid order id maps to HTTP 400.
- Existing but missing order maps to HTTP 404.
- The update only changes `Order.status`; it must not alter customer contact, totals, items, stock, product data, or token fields.

Implementation can use `prisma.order.update` after `findUnique` or `updateMany` with `count` checking. Keep it simple because there is no cross-record invariant for `pending|confirmed` transitions in this slice.

## Authorization Strategy

### Pages

Follow the existing admin product pages:

- call `resolvePageAuthContext()` in each route;
- if `hasAuthError`, render a safe error `PageStateCard`;
- if unauthenticated, render restricted/login CTA;
- if `!isAdmin || !isAdminView`, render denied `PageStateCard`;
- only after passing the gate, query order data.

This guarantees visitors, clients, and admins in client view mode never trigger order data reads from these pages.

### Status Server Action

Add `lib/actions/store-admin-orders.js` with top-level `"use server"`.

Proposed action:

```js
export async function updateOrderStatusAction(_prevState, formData)
```

Behavior:

1. enforce server-side admin access using the same pattern as `lib/actions/store-admin.js`:
   - `requireAdminAccess()`;
   - `resolvePageAuthContext()`;
   - `enforceStoreAdminAccess()`.
2. parse `id`, `status`, and optional `returnTo` from `formData`;
3. reject unauthorized requests before parsing/updating order data;
4. reject invalid ids/statuses with `errorResponse(..., 400)`;
5. reject missing orders with `errorResponse(..., 404)`;
6. update only the persisted order status;
7. call `revalidatePath("/admin/tienda/pedidos")` and `revalidatePath(`/admin/tienda/pedidos/${id}`)`;
8. on success, redirect to a sanitized `returnTo` target or return `successResponse` if using `useActionState`.

If using `redirect()`, follow Next.js guidance and call it outside a `try/catch`. Sanitize `returnTo` to only:

- `/admin/tienda/pedidos` plus safe query string generated by the UI, or
- `/admin/tienda/pedidos/${id}`.

Do not accept arbitrary absolute URLs or unrelated paths.

## No-Token-Exposure Strategy

Use defense in depth:

1. Query helpers use explicit Prisma `select` and never select `confirmationTokenHash`.
2. View models do not include raw database records or token fields.
3. Pages do not call `getOrderByConfirmationToken`, do not read cookies, and do not render public confirmation links.
4. Status action authorizes through admin role/view mode, not customer confirmation tokens or cart tokens.
5. Static validator checks that new admin pages/actions do not mention:
   - `confirmationTokenHash`;
   - `getOrderByConfirmationToken`;
   - `store_cart_token`;
   - `/pedido/confirmacion`.
6. Runtime tests assert returned admin view models do not have `confirmationTokenHash`.

## UI Design

Keep UI intentionally small and consistent with existing admin product screens.

### List

- Header: `Pedidos — Tienda Admin`.
- Secondary text: current admin email if available.
- Filter form:
  - `select name="status"` with options all, pending, confirmed;
  - `input name="q"` for customer name/email;
  - submit button and clear link.
- Empty states:
  - no orders yet;
  - no results for current filters;
  - invalid status filter message.
- Order row/card:
  - id, customer name/email, status badge, total, created date;
  - detail link;
  - status select/form.

### Detail

- Header with order id and status badge.
- Customer card with full name/email.
- Totals card with subtotal/total labels.
- Status form.
- Item snapshot list/table with product name, slug, quantity, unit price label, and line total label.
- No controls for editing customer data, items, totals, stock, or product catalog data.

## Next.js 16 Docs to Consult During Apply

Before implementing route/action code, re-read these local docs:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
  - `params` and `searchParams` are promise-based in current Next.js; pages should `await params` / `await searchParams`.
- `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
  - top-level `"use server"`, Server Function security, and return-value constraints.
- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md`
  - forms with Server Actions.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`
  - cache invalidation after status mutation.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`
  - redirect behavior in Server Actions and calling outside `try/catch`.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
  - safe handling for missing detail ids.

## Test and Validator Plan

Strict TDD applies: RED, GREEN, TRIANGULATE, REFACTOR.

### RED setup rule

If RED tests import new modules (`lib/server/store/admin-orders.js`, `lib/actions/store-admin-orders.js`, new view helpers), create minimal stubs first that export the expected functions and throw `new Error("Not implemented")`. Tests should fail on behavior, not module resolution.

### Static validator: `scripts/validate-store-admin-orders-view.mjs`

Checks should include:

- package scripts exist;
- list route exists at `app/admin/tienda/pedidos/page.js`;
- detail route exists at `app/admin/tienda/pedidos/[id]/page.js`;
- pages use `resolvePageAuthContext` and deny non-admin/admin-client-view access textually;
- list page awaits `searchParams` and detail page awaits `params`;
- list page exposes only `status` and `q` filters;
- detail route uses `notFound()`;
- status action module starts with `"use server"` and exports `updateOrderStatusAction`;
- status action uses `enforceStoreAdminAccess` or `isStoreAdminViewAllowed` pattern;
- status action revalidates list and detail paths;
- no admin route/action references forbidden token material (`confirmationTokenHash`, `store_cart_token`, `/pedido/confirmacion`, `getOrderByConfirmationToken`);
- no UI controls for payment, shipping, invoice, fulfillment, exports, bulk actions, or editing order contents.

### Runtime tests: `scripts/test-store-admin-orders-view.ts`

Seed through existing store scripts and/or create orders with `createOrderFromCart` so tests use real checkout-created orders.

Core cases:

1. `parseAdminOrderFilters` accepts `pending`, `confirmed`, empty status, and bounded `q`.
2. Invalid status returns invalid filter state and does not mutate orders.
3. `getAdminOrderSummaries` returns persisted orders with total labels and no token hash.
4. Status filter includes matching orders and excludes the other status.
5. `q` search matches customer name and customer email.
6. `getAdminOrderDetailById` returns item snapshots from `OrderItem`.
7. Detail view remains stable after the underlying product is renamed/repriced/archived.
8. `updateAdminOrderStatus` changes `pending -> confirmed` and `confirmed -> pending`.
9. Invalid status and missing order id do not change persisted statuses.
10. Action-level tests, via dependency seams or direct invocation, prove unauthorized/client-view contexts are rejected before update.

### Regression commands

Targeted verification:

```txt
pnpm validate:store-admin-orders-view
pnpm test:store-admin-orders-view
pnpm validate:store-checkout-order-foundation
pnpm test:store-checkout-order-foundation
pnpm test:store-admin-products
pnpm lint
pnpm test
```

`pnpm test:store-admin-products:e2e` is optional unless apply changes shared admin auth/page behavior beyond the new orders routes.

## Rollout Plan

1. Add RED validator/runtime tests and minimal stubs where necessary.
2. Implement read-only query helpers and list route.
3. Implement detail query/helper and detail route.
4. Implement status update helper/action and forms on list/detail.
5. Run targeted tests after each slice.
6. Run full `pnpm test` before verify/archive.

No data migration, feature flag, or backfill is expected.

## Rollback Plan

- Remove `app/admin/tienda/pedidos/**` routes.
- Remove `lib/actions/store-admin-orders.js`.
- Remove `lib/server/store/admin-orders.js` if no other code depends on it.
- Remove `scripts/validate-store-admin-orders-view.mjs`, `scripts/test-store-admin-orders-view.ts`, and package scripts.
- Keep existing order schema, checkout, public confirmation, cart, catalog, and admin product code unchanged.
- If status mutation is problematic, disable only the action/forms while keeping read-only list/detail if authorization and token non-exposure remain verified.

## Review Workload Forecast

| Area                                    | Estimated changed lines |
| --------------------------------------- | ----------------------: |
| Query helpers/view models               |                  90-150 |
| List page + filter/status form          |                 140-220 |
| Detail page                             |                 100-170 |
| Status action                           |                  60-110 |
| Validator/runtime tests/package scripts |                 180-300 |
| Total forecast                          |                 570-950 |

The full change is likely above the configured 400 changed-line review budget.

Recommended delivery strategy: **chained PRs**.

1. **PR A: Read-only list + filters**
   - `lib/server/store/admin-orders.js` filter/list helpers, list route, validator/runtime tests for auth/filter/token non-exposure.
2. **PR B: Detail + snapshot rendering**
   - detail helper/route, snapshot regression tests, `notFound()` behavior, token non-exposure checks.
3. **PR C: Status mutation from list and detail**
   - status update helper/action, forms in list/detail, mutation/authorization/invalid-input tests.

Pause before apply if the parent/user wants a single oversized PR despite the forecast, or if any individual slice forecasts above 400 changed lines.

## Risks

| Risk                        | Mitigation                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Unauthorized PII exposure   | Enforce page and action admin gate before data reads/mutations; use existing real-role + view-mode checks.     |
| Token leakage               | Explicit `select`, view-model mapping, static validator forbidden-token checks.                                |
| Status mutation scope creep | Accept only `pending                                                                                           | confirmed`; do not add payment/fulfillment semantics. |
| Filter complexity           | Keep only `status` and `q`; no date filters/pagination/advanced search.                                        |
| Snapshot regression         | Detail helper selects `OrderItem` snapshot fields only and runtime test mutates products after order creation. |
| Review overload             | Use PR A/B/C slices with tests colocated by behavior.                                                          |
| Next.js API drift           | Re-read listed Next.js 16 docs before apply and record evidence in apply-progress.                             |

## Open Items for Tasks Phase

- Decide whether to include the optional `/admin/tienda` navigation link in PR A or defer it.
- Decide whether action success uses `redirect(returnTo)` or `successResponse` + `useActionState`; default recommendation is sanitized redirect for simple server-rendered forms.
- Decide whether action-level auth tests need a dependency seam similar to checkout action dependencies, or whether existing auth test environment is sufficient.
