# Tasks: Store Cart Foundation

## Status

Planned

## Review workload forecast

Estimated size: **large** (>400 changed lines) because this change touches Prisma schema/migration, cart services, server actions, public UI, runtime tests, validators, and Playwright.

Delivery strategy: **stacked work units**.

- **PR A — Cart backend foundation**: data model, migration, validation/service/action layer, package scripts, structural/runtime tests.
- **PR B — Public cart UI + E2E**: product-detail add form, `/carrito` page, Playwright flow, UI validation updates.

Do not implement checkout, orders, payments, stock reservation/decrement, merge-on-login, navbar cart counter, or catalog-card add buttons in either PR.

## Strict TDD mode

Strict TDD is active from `openspec/config.yaml`.

Test runner: `pnpm test`

Every apply handoff MUST record:

- RED evidence before production implementation;
- GREEN evidence after the smallest implementation;
- TRIANGULATE evidence for edge cases;
- REFACTOR notes and verification commands.

## PR A — Cart backend foundation

### A0. Preflight

- [x] Confirm working branch is clean before implementation.
- [x] Read `openspec/config.yaml`.
- [x] Read Next.js 16 docs if touching Server Actions/cookies/revalidation beyond the design already captured.
- [x] Confirm generated artifacts are ignored (`.next-e2e/`, `.tmp/`, Prisma generated client outputs as applicable).

### A1. RED — structural validator and scripts

- [x] Add `validate:store-cart-foundation` script to `package.json`.
- [x] Add `test:store-cart-foundation` script to `package.json`.
- [x] Create `scripts/validate-store-cart-foundation.mjs` expecting at least:
  - `Cart` and `CartItem` Prisma models;
  - cart relations on `Usuario` and `Product`;
  - `lib/server/store/cart.js`;
  - `lib/server/store/cart-validation.js`;
  - `lib/actions/store-cart.js`;
  - `app/carrito/page.js` may be deferred to PR B but validator should distinguish PR A/PR B requirements or use staged checks;
  - runtime test file exists.
- [x] Run `pnpm validate:store-cart-foundation` and record RED failure.

### A2. RED — runtime cart service tests

- [x] Create `scripts/test-store-cart-foundation.ts` with failing assertions for backend behavior:
  - anonymous cart can add active in-stock product;
  - user-linked cart can add active in-stock product;
  - adding the same product increments/updates existing line, not duplicate line;
  - draft product rejected;
  - archived product rejected;
  - active out-of-stock product rejected;
  - quantity above stock rejected;
  - update quantity within stock succeeds;
  - remove line succeeds;
  - clear cart succeeds;
  - subtotal uses current `priceMinorUnits` and `formatSolesPrice()`.
- [x] Run `pnpm test:store-cart-foundation` and record RED failure.

### A3. GREEN — Prisma data model and migration

- [x] Add `Cart` and `CartItem` models to `prisma/schema.prisma`.
- [x] Add relations:
  - `Usuario.carts Cart[]`;
  - `Product.cartItems CartItem[]`.
- [x] Add migration for `store_carts` and `store_cart_items`.
- [x] Run Prisma generate/db sync command required by project conventions.
- [x] Ensure generated client artifacts are not committed unless project convention requires it.

### A4. GREEN — validation helpers

- [x] Implement `lib/server/store/cart-validation.js`.
- [x] Validate product id as required text.
- [x] Validate quantity as safe positive integer.
- [x] Validate product purchasability:
  - exists;
  - `status === active`;
  - `stockQuantity > 0`.
- [x] Validate requested/additive quantity does not exceed stock.

### A5. GREEN — cart service

- [x] Implement `lib/server/store/cart.js`.
- [x] Add cart identity/service methods without direct Next cookie writes.
- [x] Implement current cart summary normalization:
  - items;
  - itemCount;
  - live unit price labels;
  - line totals;
  - subtotal minor units;
  - subtotal label;
  - purchasability metadata for stale cart lines.
- [x] Implement add/update/remove/clear.
- [x] Ensure duplicate add updates existing `(cartId, productId)` line.
- [x] Ensure reads without identity return empty summary without mutating DB.

### A6. GREEN — server actions

- [x] Implement `lib/actions/store-cart.js`.
- [x] Use async `cookies()` from `next/headers`.
- [x] Set anonymous `store_cart_token` cookie only from Server Actions when a new anonymous cart is created.
- [x] Return existing standardized `successResponse` / `errorResponse` shapes.
- [x] Call `revalidatePath("/carrito")` after successful mutations.
- [x] Avoid auth requirement for cart actions, but use authenticated user id when available.

### A7. TRIANGULATE — backend edge cases

- [x] Add or confirm runtime assertions for:
  - non-positive quantity rejected;
  - malformed product id rejected;
  - existing line + added quantity above stock rejected;
  - stale cart line for product later made inactive/out-of-stock is represented safely in summary.
- [x] Run `pnpm test:store-cart-foundation` and record GREEN/TRIANGULATE evidence.
- [x] Run `pnpm validate:store-cart-foundation` and record GREEN evidence for PR A scope.

### A8. Regression checks for PR A

- [x] Run `pnpm test:store-foundation`.
- [x] Run `pnpm test:store-admin-products`.
- [x] Run `pnpm lint` or focused lint if full lint is too noisy; record rationale.
- [x] Run `pnpm test` if feasible; otherwise record why deferred.

### A9. PR A completion

- [x] Update apply progress with RED/GREEN/TRIANGULATE/REFACTOR evidence.
- [ ] Commit PR A as a reviewable work unit.
- [x] Do not include PR B UI/E2E files unless intentionally changing split.

## PR B — Public cart UI + E2E

### B0. Preflight

- [x] Start from PR A applied.
- [x] Read Next.js 16 forms/server-action docs before route/component edits.
- [x] Confirm product detail and cart page scope: no navbar count, no catalog-card add buttons.

### B1. RED — UI validator and E2E skeleton

- [x] Extend `scripts/validate-store-cart-foundation.mjs` for PR B expectations:
  - `app/tienda/[slug]/add-to-cart-form.js` or equivalent;
  - `app/carrito/page.js`;
  - cart page actions/forms;
  - `e2e/store-cart-foundation.spec.ts`.
- [x] Add `e2e/store-cart-foundation.spec.ts` with failing scenarios:
  - visitor adds in-stock product from detail page;
  - `/carrito` displays item and subtotal;
  - visitor updates quantity;
  - visitor removes item;
  - out-of-stock product cannot be added.
- [x] Run validator and targeted E2E, record RED failures.

### B2. GREEN — product detail add-to-cart UI

- [x] Update `app/tienda/[slug]/page.js` to render add-to-cart UI for in-stock active products.
- [x] Render unavailable messaging for active out-of-stock products.
- [x] Create small client component only if needed for pending/error state (`useActionState`).
- [x] Ensure form posts `productId` and quantity to `addToCartAction`.

### B3. GREEN — `/carrito` page

- [x] Add `app/carrito/page.js`.
- [x] Read current cart summary without creating a new cart on page load.
- [x] Render empty state with link back to `/tienda`.
- [x] Render cart item rows with:
  - product link/name;
  - unit price;
  - quantity update form;
  - remove form;
  - line total;
  - subtotal;
  - clear cart form.
- [x] Keep checkout CTA out of scope or render explicit future-placeholder text without flow.

### B4. TRIANGULATE — UI edge cases

- [x] Confirm active out-of-stock product detail remains visible but not addable.
- [x] Confirm quantity input max reflects stock.
- [x] Confirm invalid server-action response displays a safe message.
- [x] Confirm empty cart after remove/clear.

### B5. E2E and regression checks for PR B

- [x] Run `node scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1`.
- [x] Run `pnpm validate:store-cart-foundation`.
- [x] Run `pnpm test:store-cart-foundation`.
- [x] Run `pnpm test:store-foundation`.
- [x] Run `pnpm test:store-admin-products`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test` and `pnpm build` if feasible; record any deferred command with rationale.

### B6. PR B completion

- [x] Update apply progress with RED/GREEN/TRIANGULATE/REFACTOR evidence.
- [x] Complete post-verify warning fix pass: quiet optional auth probes for guest cart flows and rerun required checks under Node 22.
- [ ] Run fresh reviewer before commit/PR.
- [ ] Commit PR B as a reviewable work unit.

## Verify phase checklist

- [ ] Read proposal/spec/design/tasks/apply-progress.
- [ ] Confirm no non-goals were implemented.
- [ ] Confirm Cart/CartItem schema matches spec/design.
- [ ] Confirm anonymous cart token is httpOnly and only written from Server Actions.
- [ ] Confirm cart reads without identity do not mutate DB.
- [ ] Confirm live price subtotal is used and no order snapshots exist.
- [ ] Confirm active out-of-stock products remain visible but not purchasable.
- [ ] Confirm admin product management remains protected.
- [ ] Confirm final validation evidence is recorded.

## Archive checklist

- [ ] Promote finalized spec to `openspec/specs/store-cart-foundation/spec.md`.
- [ ] Move change artifacts to `openspec/archive/store-cart-foundation/`.
- [ ] Save final summary to Engram if memory tools are available.
