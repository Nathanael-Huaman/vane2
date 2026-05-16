# Design: Store Cart Foundation

## Overview

`store-cart-foundation` adds a persisted base cart for Vane2 shoppers. The cart is a staging object only: it lets a visitor or signed-in user add active in-stock products, update quantities, remove items, clear the cart, and view a live-price subtotal in Peruvian soles.

This design intentionally avoids checkout, orders, payments, stock reservation/decrement, and merge-on-login behavior.

## Source evidence

- Current store persistence has only `Category` and `Product`; there are no cart/order models yet.
- Public catalog/detail reads are active-only and already expose `stockQuantity`, `isOutOfStock`, `priceLabel`, and category data via `lib/server/store/catalog.js`.
- Active out-of-stock products are intentionally public today; cart validation must reject purchase without hiding them.
- Existing server actions use `"use server"`, standardized `{ ok, data/error }` responses, and `revalidatePath`.
- Next.js 16 docs confirm:
  - Server Actions/forms must validate auth/authorization inside the action.
  - `cookies()` is async; reading cookies in Server Components opts routes into dynamic rendering.
  - cookies can be set only in Server Functions or Route Handlers, not during Server Component render.
  - `revalidatePath()` can be called in Server Functions and currently refreshes affected UI immediately for viewed paths.

## Data model

Add two Prisma models.

```prisma
model Cart {
  id             String     @id @default(cuid())
  userId         String?
  anonymousToken String?    @unique
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  user  Usuario?   @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]

  @@index([userId])
  @@map("store_carts")
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  productId String
  quantity  Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([cartId, productId])
  @@index([productId])
  @@map("store_cart_items")
}
```

Also add relations:

- `Usuario.carts Cart[]`
- `Product.cartItems CartItem[]`

### Token storage decision

Use a random opaque token stored in the `Cart.anonymousToken` field and in an httpOnly cookie named `store_cart_token`.

Rationale:

- It is simple and testable for this first slice.
- The token is never exposed to client JavaScript because the cookie is httpOnly.
- It avoids requiring login for public-store cart use.

Security note: hashing the token before persistence is safer, but increases implementation complexity. This first slice accepts raw opaque token storage because it is equivalent to a bearer session identifier, httpOnly, scoped to cart only, and not reused for auth. A future hardening slice can hash tokens without changing cart behavior.

### Cookie options

Set from Server Actions only:

```js
{
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
}
```

Do not set cookies from `/carrito` Server Component render. Reading cookie state on `/carrito` is acceptable and makes that page dynamic.

## Cart identity resolution

Create `lib/server/store/cart-identity.js` or keep identity helpers private to `lib/server/store/cart.js`.

Resolution rules:

1. If an authenticated `Usuario` is available, use the latest user cart or create one on first mutation.
2. Else read `store_cart_token` from cookies.
3. If a valid anonymous token exists, use the matching cart.
4. If no token exists:
   - read operations return an empty cart summary;
   - write operations create a token/cart and set the cookie.

Merge-on-login is out of scope. If a user has both anonymous and authenticated carts, this slice should simply resolve by authenticated user once signed in and leave anonymous merge for a future change.

## Server service boundary

Create `lib/server/store/cart.js`.

Suggested exports:

- `getCurrentCartSummary(context)`
- `addCartItem(context, input)`
- `updateCartItemQuantity(context, input)`
- `removeCartItem(context, input)`
- `clearCart(context)`

`context` should contain:

- optional `userId`;
- optional `anonymousToken`;
- optional callback or flag for setting a new anonymous token from the action layer.

Keep direct `cookies().set()` in actions, not deep service code, so services remain easy to runtime-test without Next request context.

### Cart summary shape

Return a normalized cart summary:

```js
{
  id,
  items: [
    {
      id,
      productId,
      productName,
      productSlug,
      quantity,
      stockQuantity,
      unitPriceMinorUnits,
      unitPriceLabel,
      lineTotalMinorUnits,
      lineTotalLabel,
      isPurchasable,
      unavailableReason,
    }
  ],
  subtotalMinorUnits,
  subtotalLabel,
  itemCount,
}
```

Use `formatSolesPrice()` for labels. Calculate totals from current `Product.priceMinorUnits`.

## Validation

Create `lib/server/store/cart-validation.js`.

Suggested exports:

- `parseCartProductId(formData)`
- `parseCartQuantity(formData, { defaultQuantity = 1 })`
- `assertPurchasableProduct(product)`
- `assertQuantityWithinStock(quantity, product)`

Rules:

- product id must be non-empty text;
- quantity must be a safe positive integer;
- product must exist;
- product status must be `active`;
- product stock must be greater than zero;
- quantity must be `<= stockQuantity`.

When adding an existing line, validate `existingQuantity + requestedQuantity <= stockQuantity`.

## Server actions

Create `lib/actions/store-cart.js`.

Actions:

- `addToCartAction(_prevState, formData)`
- `updateCartItemAction(_prevState, formData)`
- `removeCartItemAction(_prevState, formData)`
- `clearCartAction(_prevState, formData)`

Action responsibilities:

1. Resolve optional signed-in user using existing session helpers if available.
2. Read anonymous cart cookie using async `cookies()`.
3. Parse/validate FormData.
4. Call cart service.
5. Set `store_cart_token` cookie when a new anonymous cart is created.
6. Call `revalidatePath("/carrito")`.
7. For add/update from detail pages, also revalidate concrete `/tienda/<slug>` when the service returns a slug.
8. Return standardized `successResponse` / `errorResponse`.

Do not require auth for cart actions. Do validate all mutation inputs server-side.

## UI design

### Product detail: `app/tienda/[slug]/page.js`

- Keep detail page as a Server Component.
- Add a server-action form for in-stock products:
  - hidden `productId`;
  - quantity input default `1`, min `1`, max current `stockQuantity`;
  - submit button: `Agregar al carrito`.
- For out-of-stock products, render text like `Producto sin stock para carrito` and no successful add submit.
- Use a small client component only if pending/error state requires `useActionState`; otherwise start with progressive-enhancement forms.

Recommended: create `app/tienda/[slug]/add-to-cart-form.js` as a small client component using `useActionState` so action errors can render inline.

### Cart page: `app/carrito/page.js`

- Server Component reads current cart summary.
- Empty state: show a card and link back to `/tienda`.
- Non-empty state:
  - list product name linked to `/tienda/<slug>`;
  - unit price;
  - quantity update form;
  - remove form;
  - line total;
  - subtotal;
  - clear cart form.

Recommended: use small form client components only where pending/error state improves UX. Keep page layout server-rendered.

### Navbar

Defer navbar cart count/link in this slice unless review budget after implementation is clearly low.

Rationale:

- Existing navbar is client-side auth/view-mode aware.
- Accurate cart counts for anonymous and authenticated users would require another data bridge/API or server-rendered layout changes.
- Proposal selected detail + `/carrito` only.

## Revalidation and caching

- `/carrito` reads cookies and is dynamic.
- Cart actions call `revalidatePath("/carrito")`.
- Add-to-cart action can also revalidate the concrete product detail path to refresh action state if needed.
- Do not use broad `revalidatePath("/", "layout")` for cart mutations.

## File plan

Expected new/changed files:

- `prisma/schema.prisma`
- migration under `prisma/migrations/*_add_store_cart/`
- `lib/server/store/cart.js`
- `lib/server/store/cart-validation.js`
- `lib/actions/store-cart.js`
- `app/tienda/[slug]/page.js`
- `app/tienda/[slug]/add-to-cart-form.js`
- `app/carrito/page.js`
- optional `app/carrito/cart-line-actions.js`
- `scripts/validate-store-cart-foundation.mjs`
- `scripts/test-store-cart-foundation.ts`
- `e2e/store-cart-foundation.spec.ts`
- `package.json`

## TDD plan

Strict TDD is active.

### RED

1. Add `validate:store-cart-foundation` and `test:store-cart-foundation` scripts.
2. Add `scripts/validate-store-cart-foundation.mjs` expecting schema/actions/routes/tests.
3. Add `scripts/test-store-cart-foundation.ts` expecting cart service behavior.
4. Add targeted E2E spec skeleton for product detail → cart flow.
5. Run targeted commands and record failures.

### GREEN

1. Add Prisma models/migration and generate client.
2. Implement cart validation/service/actions.
3. Implement product detail add form and `/carrito` page.
4. Make targeted structural/runtime tests pass.
5. Make targeted Playwright pass in Chromium through `scripts/run-e2e.mjs`.

### TRIANGULATE

Add cases for:

- active out-of-stock product rejected;
- inactive product rejected;
- quantity above stock rejected;
- remove and clear cart;
- live price subtotal formatting.

### REFACTOR

Clean duplication between actions/service/tests, keep cart identity isolated, and ensure no checkout/order concepts leaked into the slice.

## Verification commands

Expected minimum:

```bash
pnpm validate:store-cart-foundation
pnpm test:store-cart-foundation
node scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1
pnpm test:store-foundation
pnpm test:store-admin-products
pnpm lint
pnpm test
pnpm build
```

If runtime cost is high, record any deferred command with rationale in apply/verify artifacts.

## Review workload forecast

Likely exceeds 400 changed lines because it touches schema, services, actions, pages, validators, runtime tests, and E2E.

Recommended split:

### PR A: Cart backend foundation

- Prisma models/migration.
- Cart validation/service/actions.
- Runtime and structural tests.
- No public UI beyond action-level coverage.

### PR B: Public cart UI and E2E

- Product detail add form.
- `/carrito` page.
- E2E spec.
- Any targeted validator updates.

This split keeps review scope lower and preserves rollback boundaries.

## Open risks

- Anonymous token raw persistence is accepted for the base slice but should be revisited before sensitive checkout flows.
- Merge-on-login is deferred; users may see separate anonymous/authenticated carts.
- Live price behavior is correct pre-order but must be changed when orders are introduced.
- Existing generated Prisma client/Next build artifacts must stay out of commits.
