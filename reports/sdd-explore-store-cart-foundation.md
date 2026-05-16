# Code Context

## Files Retrieved
1. `prisma/schema.prisma` (lines 21-28, 30-65, 129-164) - current enums, user/session models, and store catalog models; no cart/order models exist yet.
2. `lib/server/store/catalog.js` (lines 1-45) - public store read boundary and active-only visibility contract.
3. `lib/server/store/formatting.js` (lines 1-9) - Peruvian soles formatting from integer minor units.
4. `lib/server/store/validation.js` (lines 1-50) - product status, slug, price, and stock validators reusable by cart rules.
5. `lib/server/store/admin-products.js` (lines 1-136) - admin product service patterns and inventory mutation boundary.
6. `lib/server/store/admin-validation.js` (lines 1-153) - existing FormData parsing/validation style and soles-to-minor-units parsing pattern.
7. `lib/actions/store-admin.js` (lines 1-90) - server action pattern, auth gate, response helpers, and revalidation style.
8. `lib/server/session/resolve-page-auth-context.js` (lines 1-30) - page auth/session view-mode context used by protected routes.
9. `lib/server/auth/auth-session.js` (lines 18-97, 142-187) - Auth.js session cookie names and persisted session lookup/creation used by tests and runtime.
10. `lib/server/response.js` (lines 1-68) - standard `{ ok, data/error }` action/API response contract.
11. `app/tienda/page.js` (lines 1-102) - public catalog route; currently no cart CTA.
12. `app/tienda/[slug]/page.js` (lines 1-72) - public product detail route; likely first place for add-to-cart CTA.
13. `app/admin/tienda/page.js` (lines 1-150) - admin product list route; useful for stock/status expectations but not in cart scope.
14. `components/navbar.jsx` (lines 29-39, 115-119, 158-205) - global nav; likely location for cart link/count if in scope.
15. `scripts/seed-store.ts` (lines 13-151) - deterministic store seed data, including active out-of-stock product.
16. `scripts/test-store-foundation.ts` (lines 1-81) - public catalog runtime tests and active-only visibility assertions.
17. `scripts/test-store-admin-products.ts` (lines 1-223) - runtime test style for service validation and Prisma setup.
18. `e2e/store-admin-products-admin-routes.spec.ts` (lines 1-99) - Playwright session seeding pattern with `authjs.session-token`.
19. `scripts/validate-ticket-11.mjs` (lines 65-82) - existing assertion that `/tienda` intentionally had no `Agregar al carrito` CTA before this slice.
20. `openspec/config.yaml` (lines 1-10) - strict TDD, `pnpm test`, 400-line review budget, Next.js 16 docs requirement, soles minor-unit constraint.
21. `openspec/archive/store-admin-products/proposal.md` (lines 31-47, 167-217, 238-255) - prior slice non-goals, impacted-area style, risks, open-question style.
22. `openspec/archive/store-admin-products/tasks.md` (lines 238-264) - final verification command expectations.
23. `openspec/archive/store-admin-products/specs/store-admin-products/spec.md` (lines 166-191, 223-253) - active-only public contract, TDD expectations, and explicit old non-goals.
24. `package.json` (lines 10-28, 88-90) - targeted store scripts plus project test/e2e scripts.

## Current State

- Store data model has `Category` and `Product` only. `Product` stores `priceMinorUnits Int`, `stockQuantity Int`, `status ProductStatus`, optional `sku`, and `featured`; there are no cart, cart item, order, checkout, payment, shipment, invoice, or reservation models yet (`prisma/schema.prisma` lines 129-164).
- Public catalog reads expose only `active` products and include category, price label, out-of-stock flags, image fallback, and availability label (`lib/server/store/catalog.js` lines 7-45).
- Active out-of-stock products are intentionally public today: seed has `manta-andina-sin-stock` with stock `0`, and tests assert active out-of-stock products remain public (`scripts/seed-store.ts` lines 40-52; `scripts/test-store-foundation.ts` lines 56-61).
- Public pages render catalog and detail but no purchase/cart behavior. Prior validator explicitly asserted the store did not show `Agregar al carrito` (`scripts/validate-ticket-11.mjs` lines 65-82).
- Admin product management is complete and protected. It includes admin routes, product services, validators, server actions, and a nav link visible only in admin view (`app/admin/tienda/page.js` lines 29-77; `lib/actions/store-admin.js` lines 27-90; `components/navbar.jsx` lines 35-39 and 115-119).
- Strict TDD is active with `test_command: pnpm test`; store work must preserve integer minor units in soles and consult Next.js 16 docs before route/component changes (`openspec/config.yaml` lines 1-10).

## Likely Cart Scope

Recommended bounded slice: **base cart only**.

Include:
- Prisma models for a persisted cart and cart items, linked to `Usuario` when authenticated and optionally to a server-generated anonymous cart token if guest carts are desired.
- Add-to-cart from `/tienda/[slug]` and maybe product cards on `/tienda` only if review budget allows.
- Cart read/update service under `lib/server/store/`, e.g. `cart.js`, that validates product exists, is `active`, and quantity is positive.
- Cart server actions under `lib/actions/`, e.g. `store-cart.js`, following `{ ok, data/error }` response pattern and narrow `revalidatePath` use.
- `/carrito` page to view items, update quantities, remove items, and see subtotal in soles minor units.
- Navbar cart entry/count if accepted as part of base UX.
- Stock-aware validation at add/update time: likely prevent adding inactive products and prevent quantity greater than current `stockQuantity`; decide behavior for existing cart lines when product stock/status changes.

## Non-goals

Keep explicitly out of scope unless the proposal chooses otherwise:
- Checkout, payments, payment providers, orders/order items, shipping, taxes, invoices, fulfillment, notifications.
- Stock reservation/decrement, inventory locks, abandoned-cart recovery.
- Discounts, coupons, bundles, variants, multi-currency.
- Admin cart/order management.
- Category/product admin changes except minimal tests/fixtures needed for cart.
- Large storefront redesign.

## Impacted Files

Likely new/changed:
- `prisma/schema.prisma` - add cart/cart-item model(s), indexes, relations; migration required.
- `lib/server/store/cart.js` - cart service/read/write boundary.
- `lib/server/store/cart-validation.js` or shared additions to `lib/server/store/validation.js` - quantity/product/cart token validation.
- `lib/actions/store-cart.js` - add/update/remove/clear cart actions.
- `app/tienda/[slug]/page.js` - add CTA/component for active in-stock products.
- `app/tienda/page.js` - optional add CTA on cards; safer to defer if scope tight.
- `app/carrito/page.js` and possibly client form component(s) - cart page/update forms.
- `components/navbar.jsx` - optional cart link/count.
- `scripts/seed-store.ts` - likely no change unless cart-specific seed products are needed; current active/out-of-stock fixtures are useful.
- `scripts/test-store-cart-foundation.ts`, `scripts/validate-store-cart-foundation.mjs`, `package.json` - targeted runtime/structural scripts.
- `e2e/store-cart-foundation.spec.ts` - Playwright flow for add/update/remove; can reuse session seeding from admin e2e if authenticated cart is included.
- `openspec/specs/store-cart-foundation/spec.md` and `openspec/archive/store-cart-foundation/*` - new SDD artifacts.

## Open Decisions

1. Guest cart support: authenticated-only cart, guest-only cookie cart, or both with later merge-on-login? Auth/session helpers exist, but public store is currently usable without login.
2. Cart identity: if guest support is included, should the cart token be an httpOnly cookie and persisted in DB, or should this slice use client/local storage? Server-persisted is more consistent with strict TDD/Prisma but larger.
3. Product snapshot: should cart items store only `productId` + quantity and calculate price live, or snapshot `unitPriceMinorUnits`/name at add time? Base cart without orders can use live price, but UI should disclose changes if required.
4. Stock policy: reject adding `stockQuantity <= 0`; cap line quantity to current stock; decide what happens if stock drops after item is in cart.
5. Anonymous-to-authenticated merge: non-goal for base slice unless guest+login continuity is required.
6. Revalidation/cache: which paths must update after cart mutations (`/carrito`, `/tienda`, product detail, navbar)? Need Next.js 16 docs before implementation.
7. Review budget: cart DB/service/actions/page/tests/nav may exceed 400 changed lines; decide split if the design forecasts a large diff.

## Testing Strategy

Strict TDD should add failing tests before implementation:

- Structural validator: `scripts/validate-store-cart-foundation.mjs` fails until cart schema/service/action/page and scripts exist.
- Runtime tests: `scripts/test-store-cart-foundation.ts`, using `createRuntimePrismaClient()` (`lib/testing/prisma-runtime.ts` lines 31-35), seed with `pnpm seed:store`, then assert:
  - add active in-stock product succeeds;
  - inactive/draft/archived product cannot be added;
  - out-of-stock active product cannot be added or quantity > stock is rejected;
  - quantity updates/removes/clear calculate subtotal from integer minor units;
  - price formatting remains `S/.` via `formatSolesPrice()`.
- E2E: add product from `/tienda/[slug]`, see `/carrito`, update/remove. If auth-only cart is chosen, reuse session cookie seeding pattern from `e2e/store-admin-products-admin-routes.spec.ts` lines 19-54.
- Regression: run `pnpm test:store-foundation`, `pnpm test:store-admin-products`, new cart script, `pnpm lint`, `pnpm test`, `pnpm build`; targeted Playwright first, full `pnpm test:e2e` if feasible.

## Risks

- Scope creep into checkout/orders/payments is the largest risk; keep base cart as an intent/staging object only.
- Guest cart design can expand significantly because it requires cookie/token security, merge semantics, and cleanup strategy.
- Live price/stock vs snapshot decisions affect later order correctness; avoid irreversible assumptions without a design note.
- Existing active out-of-stock public contract means display and add-to-cart rules must diverge: visible does not mean purchasable.
- Prisma migration and generated client changes can make the diff large; review budget may require a backend/UI split.
- Next.js 16 behavior for server actions, cookies, cache/revalidation, and dynamic routes must be checked in `node_modules/next/dist/docs/` before edits.

## Recommended Next SDD Proposal Outline

1. Intent: add a base persisted cart for store shoppers, without checkout/payments/orders.
2. Problem: catalog/admin slices exist, but users cannot stage products for purchase.
3. Goals: add/update/remove/clear cart items; cart page; active/in-stock validation; soles minor-unit subtotal; optional nav cart entry.
4. Non-goals: checkout, orders, payments, shipping/tax/invoices, stock reservation/decrement, discounts/variants, admin order tools.
5. Scope options: decide authenticated-only vs guest+authenticated cart, cart token strategy, and product price snapshot policy.
6. Data model: propose `Cart` and `CartItem` with user/token ownership, product relation, quantity, timestamps, unique cart/product line.
7. Service/action boundaries: `lib/server/store/cart.js`, `lib/actions/store-cart.js`, validation helpers, response/revalidation contract.
8. UI: add-to-cart on detail page first, `/carrito` page, optional navbar link/count.
9. Tests/TDD: structural validator, runtime service tests, targeted Playwright, full verification commands.
10. Risks/review plan: forecast changed lines and recommend split if over 400.

## Start Here

Start with `prisma/schema.prisma` and `lib/server/store/catalog.js`: they define the current store persistence and the active-only product contract that cart validation must build on. Then open `lib/actions/store-admin.js` for action/response/revalidation patterns before designing cart actions.

## Supervisor coordination

No supervisor decision was required. Engram memory tools were not available in this subagent session, so no memory save was performed.
