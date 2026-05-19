# Design: Store Admin Orders E2E

## Technical Approach

Add one focused Playwright spec that reuses the existing isolated E2E runner and direct session seeding pattern. The spec will seed deterministic orders through Prisma, authenticate as the seeded admin with `viewMode: "administrador"`, assert list/detail rendering, submit the existing status Server Action form, and verify both browser-visible and persisted `confirmed` state. This maps directly to the `store-admin-orders-view` delta spec and keeps the slice test-only.

No Next.js route/component code is planned, so no product copy or route behavior changes are needed.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| E2E shape | Create `e2e/store-admin-orders.spec.ts` with local helpers | Extract shared E2E auth/order fixtures | Existing specs duplicate small auth helpers; extraction would broaden a hardening-only slice. |
| Data setup | Direct Prisma seeding of `Order` + `OrderItem` using `createRuntimePrismaClient()` | Browser checkout-created orders | Direct DB seeding is deterministic and matches existing runtime/E2E patterns while avoiding checkout coupling. |
| Browser coverage | Target Chromium via package script | All Playwright projects | Proposal asks for low-cost hardening; all-browser coverage adds flake/cost without new product confidence. |
| Mutation wait | Wait on URL/detail route plus visible `Confirmado`, then query DB | Wait for network idle or implementation internals | Server Actions redirect/revalidate; persisted visible state plus DB read proves the contract stably. |
| Gate coverage | Include admin-in-client-view denial in same spec if cheap | Add visitor/client matrix | Existing product admin routes already cover broad gate shape; this slice only needs the order-page gate. |

## Data Flow

    Playwright test ──seed──> SQLite E2E DB
          │                    │
          ├─cookie sesion─────> Next App Router admin pages
          │                    │
          └─assert UI <── Server Action revalidate/redirect ── Prisma update

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `e2e/store-admin-orders.spec.ts` | Create | Seeds an admin session, deterministic order/item data, asserts list/detail/status mutation and cheap client-view denial. |
| `package.json` | Modify | Add `test:store-admin-orders:e2e` using `node scripts/run-e2e.mjs --project=chromium e2e/store-admin-orders.spec.ts --workers=1`. |
| `scripts/run-e2e.mjs` | Reuse | No changes; already creates isolated SQLite DB, seeds store data and auth users per target. |
| `app/admin/tienda/pedidos/**` | Cover only | Assert existing UI/forms; do not modify product behavior. |

## Interfaces / Contracts

Local test helpers should mirror current E2E conventions:

```ts
seedAuthenticatedSession(page, email, "administrador" | "cliente")
seedOrder({ customerName, customerEmail, status: "pending", product })
resetOrdersByDomain("admin-orders-e2e.test")
```

Order cleanup must delete `orderItem` records before matching `order` records by test-domain customer email. Seeded confirmation token hashes must be unique per run/spec.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | None new | Existing runtime tests already cover parsing/action helpers. |
| Integration | Persisted mutation result | After browser submit, query Prisma for `order.status === "confirmed"`. |
| E2E | Admin list, detail navigation, status update, client-view denial | `pnpm test:store-admin-orders:e2e` targeted Chromium through `scripts/run-e2e.mjs`. |

## Migration / Rollout

No migration required. Rollback removes the spec and optional script only.

## Open Questions

- [ ] None blocking.
