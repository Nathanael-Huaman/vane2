# Design: Store Customer Order History

## Technical Approach

Add a read-only customer order area under `/perfil/pedidos` using existing App Router server-component patterns. Pages resolve the authenticated user with `resolvePageAuthContext()` before any order lookup, then call customer-scoped helpers in `lib/server/store/orders.js`. Those helpers query by `Order.userId`, use explicit Prisma `select` shapes, map persisted snapshots to safe view models, format money with `formatSolesPrice`, and never select or accept confirmation/cart token material. No schema change is required: `Order.userId`, `Usuario.orders`, and `@@index([userId, createdAt])` already support this.

Next.js assumption: `node_modules/next/dist/docs/` is absent in this install, so implementation should follow observed Next 16 patterns already in the codebase: await `params`/`searchParams`, use server components for protected pages, and use `notFound()` for missing owned details.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add customer read helpers to `lib/server/store/orders.js` | Keeps all order creation/confirmation/customer reads together; file grows slightly. | Use `orders.js` for `getCustomerOrderSummaries` and `getCustomerOrderDetailById`. |
| Enforce ownership in page code only | Simpler page wiring but easy to bypass from another caller. | Enforce `userId` in helper query boundaries and still gate pages before calling helpers. |
| Reuse admin order mapper | Less code, but admin paths/status mutation assumptions can leak into customer UI. | Create customer-specific mapping that shares formatting conventions only. |
| Add schema or token-based claiming | Could include guest orders, but expands scope and risk. | No migration; account history includes only signed-in checkout orders linked by `userId`. |

## Data Flow

```text
UserMenu/Profile ──→ /perfil/pedidos ──→ resolvePageAuthContext()
                                      └──→ getCustomerOrderSummaries(user.id)
                                            └──→ prisma.order.findMany({ where: { userId } })

/perfil/pedidos/[id] ──→ resolvePageAuthContext()
                       └──→ getCustomerOrderDetailById(user.id, id)
                             └──→ prisma.order.findFirst({ where: { id, userId } })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/server/store/orders.js` | Modify | Add customer-owned summary/detail helpers, date/status labels, and safe snapshot view models. |
| `app/perfil/pedidos/page.js` | Create | Protected order-history list with empty state and newest-first summaries. |
| `app/perfil/pedidos/[id]/page.js` | Create | Protected owned-order detail; use `notFound()` for missing/non-owned orders. |
| `components/user-menu.jsx` | Modify | Add “Mis pedidos” account navigation for authenticated users. |
| `app/perfil/page.js` | Modify | Add customer panel link/card to order history. |
| `scripts/test-store-customer-order-history.ts` | Create | Runtime tests for ownership, ordering, snapshots, checkout linkage, and token omission. |
| `scripts/validate-store-customer-order-history.mjs` | Create | Static contract checks for routes, auth-before-data, safe selects, and package wiring. |
| `package.json` | Modify | Add validation/runtime scripts and include them in `pnpm test`. |

## Interfaces / Contracts

```js
getCustomerOrderSummaries(userId) // -> [{ id, status, statusLabel, totalLabel, createdAtLabel, detailPath }]
getCustomerOrderDetailById(userId, orderId) // -> summary + customerName/customerEmail + items[] | null
```

Contract rules: trim and reject empty ids by returning `[]`/`null`; order list by `createdAt desc, id asc`; detail query MUST include `{ id, userId }`; selects MUST omit `confirmationTokenHash` and raw token fields.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit/static | Route existence, auth-before-data, no token material, safe selects, script wiring. | `validate-store-customer-order-history.mjs`. |
| Integration | Owned-only list/detail, newest-first ordering, empty user, non-owner rejection, snapshot stability, checkout `userId` linkage. | Seeded Prisma runtime test with `createRuntimePrismaClient`. |
| E2E | Navigation to “Mis pedidos” if budget allows. | Optional Playwright slice after runtime coverage; not required for first acceptance. |

## Migration / Rollout

No migration required. Roll out as a small chained slice: helpers/tests first, then pages/navigation.

## Open Questions

None.
