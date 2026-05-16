# Proposal: Store Cart Foundation

## Status

Proposed

## Change ID

`store-cart-foundation`

## Intent

Add the first cart slice for the Vane2 store so shoppers can stage active, in-stock catalog products before a future checkout/order flow.

This slice builds on the completed public catalog and admin product management slices. It intentionally stops before checkout, payment, order creation, stock reservation, fulfillment, or admin order management.

## Problem

The store now has:

- Prisma-backed categories and products;
- active-only public catalog/detail pages;
- admin product management for create/edit/status/stock;
- soles formatting with integer minor-unit persistence.

But shoppers still cannot express purchase intent. The next smallest useful store capability is a base cart: add an active in-stock product, review it, update quantity, remove it, and see a subtotal.

## Goals

- Add a persisted base cart data model for guest and authenticated shoppers.
- Allow adding products from `/tienda/[slug]` to the cart.
- Add `/carrito` to view cart lines, update quantities, remove items, clear the cart, and show subtotal.
- Validate cart writes server-side:
  - product must exist;
  - product must be `active`;
  - quantity must be a positive integer;
  - requested quantity must not exceed current `stockQuantity`.
- Keep active out-of-stock products visible publicly but not purchasable.
- Use live product price for cart totals until a future checkout/order slice introduces snapshots.
- Preserve integer minor-unit money logic and display totals as Peruvian soles (`S/.`).
- Follow strict TDD with RED/GREEN/TRIANGULATE/REFACTOR evidence.

## Non-goals

This slice MUST NOT implement:

- checkout;
- orders or order items;
- payment providers or payment state;
- shipping, tax, invoices, fulfillment, notifications;
- stock reservation, stock decrement, inventory locks, abandoned-cart recovery;
- discounts, coupons, bundles, variants, multi-currency;
- admin order/cart management;
- merge-on-login semantics beyond keeping the model compatible with a future merge;
- add-to-cart buttons on catalog cards unless explicitly added later;
- broad storefront/navbar redesign.

## Decisions for this proposal

### Cart identity

The first cart SHOULD support both anonymous and authenticated shoppers.

- Anonymous cart identity SHOULD use a server-generated cart token stored in an httpOnly cookie.
- Authenticated cart identity SHOULD link to `Usuario` when available.
- Merge-on-login is out of scope for this slice; the model should avoid blocking a future merge.

### Price policy

The cart SHOULD use live product prices and names while it remains only a staging object.

- `CartItem` SHOULD store `productId` and `quantity`.
- Totals SHOULD be calculated from the current `Product.priceMinorUnits`.
- Future order/checkout slices can introduce immutable line snapshots.

### UI surface

The first UI surface SHOULD be intentionally small:

- add-to-cart on `/tienda/[slug]`;
- `/carrito` page for review/update/remove/clear;
- no catalog-card add buttons in this slice.

## Proposed data model

Add cart persistence to Prisma using names to be finalized in design, likely:

- `Cart`
  - `id`
  - optional `userId` relation to `Usuario`
  - optional anonymous token hash or token identifier
  - timestamps
- `CartItem`
  - `id`
  - `cartId`
  - `productId`
  - `quantity`
  - timestamps
  - unique constraint on `(cartId, productId)`

Design MUST decide exact field names, token storage shape, indexes, and deletion behavior.

## Proposed service/action boundaries

Likely files:

- `lib/server/store/cart.js`
  - find or create current cart;
  - read cart summary;
  - add item;
  - update item quantity;
  - remove item;
  - clear cart;
  - calculate subtotal from integer minor units.
- `lib/server/store/cart-validation.js` or additions to `lib/server/store/validation.js`
  - cart quantity validation;
  - product purchasability validation.
- `lib/actions/store-cart.js`
  - server actions using existing `{ ok, data/error }` response patterns;
  - cookie/session-aware cart resolution;
  - focused revalidation for `/carrito` and product detail where needed.

## Proposed UI

Likely files:

- `app/tienda/[slug]/page.js`
  - render add-to-cart affordance only for active in-stock products;
  - render clear unavailable messaging for out-of-stock products.
- `app/carrito/page.js`
  - show empty cart state;
  - show line items with product name, quantity, live unit price, line total, and subtotal;
  - expose update/remove/clear forms.
- Optional small client component(s) only if server actions/forms need local pending state.

## Testing and validation

Strict TDD is required.

Add failing tests/validators before production implementation:

- `scripts/validate-store-cart-foundation.mjs`
  - asserts schema/model/action/page/script structure.
- `scripts/test-store-cart-foundation.ts`
  - add active in-stock product succeeds;
  - inactive/draft/archived product is rejected;
  - active out-of-stock product is rejected;
  - quantity above stock is rejected;
  - update/remove/clear work;
  - subtotal uses integer minor units and `formatSolesPrice()`.
- `e2e/store-cart-foundation.spec.ts`
  - visitor adds an in-stock product from detail page;
  - cart page displays item/subtotal;
  - update/remove path works;
  - out-of-stock product cannot be added.

Expected verification commands:

- `pnpm validate:store-cart-foundation`
- `pnpm test:store-cart-foundation`
- targeted Playwright through `scripts/run-e2e.mjs`
- `pnpm test:store-foundation`
- `pnpm test:store-admin-products`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Impacted areas

- Prisma schema and migration.
- Store server services and validation helpers.
- Store server actions.
- Public product detail route.
- New cart route.
- Store validators/runtime tests/E2E.
- Package scripts.

## Risks

- Guest cart support can expand into auth merge, cleanup, and cookie-security complexity; design must keep this minimal.
- Cart and checkout concepts can blur; this slice must remain a staging object only.
- Live price policy is correct for a base cart but must not be reused as order snapshot behavior later.
- Existing public contract allows active out-of-stock products to be visible; cart validation must explicitly reject purchasability without hiding those products.
- Prisma migration + services + UI + tests may exceed 400 changed lines. Tasks should forecast review workload and split backend foundation from UI/E2E if needed.
- Next.js 16 server actions/cookies/cache behavior must be checked in `node_modules/next/dist/docs/` before implementation.

## Open questions for spec/design

- Should anonymous cart token be stored raw, hashed, or as an opaque cart id? Prefer not storing raw secrets if avoidable.
- Should authenticated users always get a new cart or reuse the latest open cart?
- What exact response should users see when stock changes after an item is already in the cart?
- Should `/carrito` be public for anonymous visitors or require noindex/metadata? SEO is likely irrelevant but can be decided in design.
- Should navbar include a simple cart link in this slice or remain deferred to keep review scope small?

## References

- Explore report: `reports/sdd-explore-store-cart-foundation.md`
- Current catalog spec: `openspec/specs/store-admin-products/spec.md` for active/public visibility constraints inherited from prior slices.
