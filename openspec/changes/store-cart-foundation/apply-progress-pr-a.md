# Apply Progress: Store Cart Foundation — PR A

## Workload / PR boundary

- Applied slice: **PR A — Cart backend foundation only**.
- Included: Prisma `Cart`/`CartItem` models and migration, cart validation helpers, cart service, cart server actions, package scripts, structural validator, runtime tests, and task checkbox updates.
- Deferred to PR B: public `/tienda/[slug]` add-to-cart UI, `/carrito` page, Playwright E2E, navbar/cart counter, catalog-card add buttons.
- Explicit non-goals preserved: checkout, orders, payments, stock reservation/decrement, merge-on-login, admin cart/order management.

## Completed tasks

- A0 preflight completed.
- A1 RED structural validator/scripts completed.
- A2 RED runtime service tests completed.
- A3 Prisma data model/migration completed.
- A4 validation helpers completed.
- A5 cart service completed.
- A6 cart server actions completed.
- A7 backend edge-case triangulation completed.
- A8 PR A regressions completed.
- A9 apply progress updated; commit intentionally left to parent/orchestrator.

## Files changed

- `package.json` — added `validate:store-cart-foundation` and `test:store-cart-foundation` scripts.
- `prisma/schema.prisma` — added `Cart`/`CartItem`, `Usuario.carts`, and `Product.cartItems`.
- `prisma/migrations/20260516022000_add_store_cart/migration.sql` — creates `store_carts` and `store_cart_items` tables/indexes/FKs.
- `lib/server/store/cart-validation.js` — product id, quantity, purchasability, stock, and unavailable-reason helpers.
- `lib/server/store/cart.js` — cart identity/service functions, live-price summary, add/update/remove/clear.
- `lib/actions/store-cart.js` — server actions using async `cookies()`, `store_cart_token`, response helpers, and `revalidatePath("/carrito")`.
- `scripts/validate-store-cart-foundation.mjs` — structural PR A validator.
- `scripts/test-store-cart-foundation.ts` — runtime backend cart tests.
- `openspec/changes/store-cart-foundation/tasks.md` — PR A task checkboxes updated.
- `openspec/changes/store-cart-foundation/apply-progress-pr-a.md` — this progress report.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| PR A structural contract | `scripts/validate-store-cart-foundation.mjs` | Structural | ✅ `pnpm test:store-foundation` passed after rerun; ✅ `pnpm test:store-admin-products` passed after rerun | ✅ `pnpm validate:store-cart-foundation` failed: 3 passed, 11 failed before schema/service/action implementation | ✅ `pnpm validate:store-cart-foundation` passed: 21 passed, 0 failed | ✅ Added action contract checks for cookie name, async `cookies`, revalidation, and four action exports | ✅ Validator split into sections and reused `check/read/exists` helpers |
| PR A runtime cart behavior | `scripts/test-store-cart-foundation.ts` | Runtime/service | ✅ Existing store/admin regressions passed after rerun | ✅ `pnpm test:store-cart-foundation` failed before implementation with missing `lib/server/store/cart.js` | ✅ `pnpm test:store-cart-foundation` passed after schema/service/action implementation and after final token regression | ✅ Covered anonymous cart, user cart, no-cookie anonymous token issuance, duplicate line increment, draft/archived/out-of-stock rejects, stock cap, zero quantity, malformed id, update/remove/clear, live subtotal, stale unavailable line | ✅ Service kept pure from Next cookie writes; action layer owns cookies/revalidation |

## Test Summary

- **Total tests/validator assertions written**: 21 structural checks plus runtime assertions for 16+ backend scenarios.
- **Total targeted tests passing**: `pnpm validate:store-cart-foundation` (21/21), `pnpm test:store-cart-foundation` passed after final token regression.
- **Layers used**: Structural validator, runtime/service tests.
- **Approval tests**: Existing `pnpm test:store-foundation`, `pnpm test:store-admin-products`, full `pnpm test`, and `pnpm build` used as regressions.
- **Pure functions created**: validation helpers and cart summary normalization helpers.

## Commands run

| Command | Result |
|---------|--------|
| `pnpm test:store-foundation` | Initial parallel run failed due SQLite timeout while another seed was running; rerun passed. |
| `pnpm test:store-admin-products` | Initial parallel run passed; later parallel regression failed due SQLite timeout while another seed was running; rerun passed. |
| `pnpm validate:store-cart-foundation` before implementation | Exit 1 RED: 3 passed, 11 failed. |
| `pnpm test:store-cart-foundation` before implementation | Exit 1 RED: missing `lib/server/store/cart.js`. |
| `pnpm exec prisma generate && pnpm exec prisma db push` | Exit 0. |
| `pnpm validate:store-cart-foundation` after implementation | Exit 0: 21 passed, 0 failed. |
| `pnpm test:store-cart-foundation` after implementation | Exit 0. |
| `pnpm test:store-foundation` | Exit 0 on rerun. |
| `pnpm test:store-admin-products` | Exit 0 on rerun. |
| `pnpm exec eslint lib/server/store/cart.js lib/server/store/cart-validation.js lib/actions/store-cart.js scripts/validate-store-cart-foundation.mjs scripts/test-store-cart-foundation.ts` | Exit 0. |
| `pnpm lint` | Timed out after 180s; focused lint above passed. |
| `pnpm test` | Exit 0. |
| `pnpm build` | Exit 0. |
| `git diff --check` | Exit 0. |
| Fresh focused PR A review | Exit 0 equivalent: no blockers found; prior blockers confirmed fixed. |
| `pnpm test:store-cart-foundation` after no-cookie token regression | Exit 0. |
| `pnpm validate:store-cart-foundation` after no-cookie token regression | Exit 0: 21 passed, 0 failed. |
| Focused eslint after no-cookie token regression | Exit 0. |
| `git diff --check` after no-cookie token regression | Exit 0. |

## Deviations from design

- No public UI files were implemented in PR A by design/assignment.
- `app/carrito/page.js` remains deferred to PR B; the structural validator intentionally checks PR A backend artifacts only.
- Full `pnpm lint` timed out after 180s, so focused lint was used for changed files; full `pnpm test` and `pnpm build` passed.

## Remaining tasks

- PR B: add product-detail add-to-cart UI, `/carrito` page, cart UI forms, and Playwright flow.
- Verify/fresh review before commit/PR.
- Fresh focused reviewer found no PR A blockers after reviewer fixes.
- Added a final runtime regression for no-cookie anonymous token issuance before PR A commit.
- Parent/orchestrator may commit PR A as a reviewable work unit.

## Risks / follow-up

- Anonymous token is stored as a raw opaque bearer token per approved design. Consider hashing before checkout/payment flows.
- Merge-on-login remains intentionally deferred; authenticated users resolve to user carts and anonymous carts are not merged.
- Service reads and writes are backend-complete, but no user-facing cart UI exists until PR B.
- Current environment uses Node v26.0.0 while package engines request `>=20.19 <23`; commands still passed except noted lint timeout.

## Memory

No callable Engram memory tools were available in this subagent session, so significant findings are recorded in this OpenSpec apply-progress artifact instead.
