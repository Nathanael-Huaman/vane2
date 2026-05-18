# Design: Store Checkout Order Foundation

## Overview

Build the smallest non-payment checkout/order foundation on top of the existing store cart. The change converts the current cart into a durable order, snapshots product and price data using integer minor units for Peruvian soles (S/.), transactionally decrements stock, clears the cart only on successful checkout, and exposes a minimal private-token confirmation experience.

The design intentionally keeps payment, shipping, taxes, fulfillment, email, and admin order management out of scope. Implementation should be sliced because schema, service, actions, pages, and tests will exceed the 250 changed-line budget if attempted in one PR.

## Relevant existing architecture

- `prisma/schema.prisma`
  - Existing store models are `Category`, `Product`, `Cart`, and `CartItem`.
  - `Product.priceMinorUnits` and `Product.stockQuantity` already use integer fields suitable for checkout totals and stock decrement.
  - `Product.status` uses `ProductStatus` with `active`, `draft`, and `archived`; public cart/product logic treats only `active` products as purchasable.
  - `Usuario` has `carts`; checkout can optionally associate orders to the authenticated user while still supporting anonymous carts.
- `lib/server/store/cart.js`
  - Owns anonymous cart token generation, context normalization, cart lookup/create, cart summary, cart mutations, and `clearCart`.
  - Cart summary already computes live `subtotalMinorUnits`, line totals, product stock, price labels, and unavailable reasons from current product data.
  - Checkout must not trust cart summary as historical order data; it should recompute authoritative snapshots during order creation.
- `lib/server/store/cart-validation.js`
  - Provides `CartDomainError`, `isCartDomainError`, product purchasability checks, quantity parsing, and stock validation.
  - Checkout should either reuse `CartDomainError` for user-correctable domain failures or introduce an `OrderDomainError` with the same response pattern.
- `lib/actions/store-cart.js`
  - Establishes current Server Action patterns: top-level `"use server"`, async `cookies()`, optional session resolution, `successResponse`/`errorResponse`/`serverErrorResponse`, cookie options, and `revalidatePath` after mutations.
  - Checkout actions should share the same cart-context resolution and cookie name rather than inventing a second cart credential.
- `app/carrito/page.js`
  - Reads cookies in a Server Component, resolves authenticated or anonymous cart context, and renders cart lines plus summary.
  - This page is the natural place to add a minimal `/checkout` CTA in a later slice, while keeping current cart behavior intact.

## Next.js 16 docs consulted

Consulted local docs under `node_modules/next/dist/docs/` to avoid API drift before designing route/action/cookie/redirect behavior:

- `01-app/01-getting-started/07-mutating-data.md`
  - Server Functions/Actions must be async, can be invoked from forms, use `POST`, progressively enhance Server Component forms, and must verify auth/authorization because direct POSTs can invoke them.
- `01-app/03-api-reference/04-functions/cookies.md`
  - `cookies()` is async. Reading is valid in Server Components; setting/deleting cookies is only supported in Server Functions or Route Handlers. Cookie writes must happen before streaming, matching the existing cart action pattern.
- `01-app/03-api-reference/04-functions/redirect.md`
  - `redirect()` works in Server Actions and produces a 303 response there. Because it throws, call it outside `try/catch` blocks when actions catch validation errors.
- `01-app/03-api-reference/04-functions/not-found.md`
  - Confirmation lookup should call `notFound()` for missing/invalid tokens to avoid disclosing order details.
- `01-app/03-api-reference/04-functions/revalidatePath.md`
  - `revalidatePath()` is valid in Server Functions; literal paths such as `/carrito` and `/checkout` can be invalidated after checkout.
- `01-app/03-api-reference/03-file-conventions/page.md`
  - In current Next.js app router docs, `params` and `searchParams` are promises and should be awaited in page components.

## Data model design: exact Prisma enum/model fields and relations

Add a minimal order status enum near existing store enums:

```prisma
enum OrderStatus {
  pending
  confirmed
}
```

Extend `Usuario`:

```prisma
model Usuario {
  // existing fields...
  carts  Cart[]
  orders Order[]
}
```

Extend `Product`:

```prisma
model Product {
  // existing fields...
  cartItems  CartItem[]
  orderItems OrderItem[]
}
```

Add `Order`:

```prisma
model Order {
  id                    String      @id @default(cuid())
  userId                String?
  customerName          String
  customerEmail         String
  status                OrderStatus @default(pending)
  subtotalMinorUnits    Int
  totalMinorUnits       Int
  confirmationTokenHash String      @unique
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  user  Usuario?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  items OrderItem[]

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@map("store_orders")
}
```

Add `OrderItem`:

```prisma
model OrderItem {
  id                  String   @id @default(cuid())
  orderId             String
  productId           String
  productName         String
  productSlug         String
  unitPriceMinorUnits Int
  quantity            Int
  lineTotalMinorUnits Int
  createdAt           DateTime @default(now())

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([productId])
  @@map("store_order_items")
}
```

Notes:

- `confirmationTokenHash` stores a verifier, not the raw token. The raw token is returned once from successful checkout and used in the confirmation URL.
- `Product -> OrderItem` uses `onDelete: Restrict` instead of cascade so deleting a product cannot erase historical order items. Historical rendering still uses item snapshots, not live product fields.
- `userId` is optional to support anonymous carts and uses `SetNull` so orders survive account deletion.
- `totalMinorUnits` equals `subtotalMinorUnits` in this no-tax/no-shipping/no-discount slice, but both are stored to support future totals without rewriting historical records.

## Service design: checkout/order creation transaction pseudocode, validation/error behavior, stock decrement, cart clearing

Proposed service module: `lib/server/store/orders.js`.

Public functions:

- `createOrderFromCart(context, input)`
  - Validates contact.
  - Converts the current authenticated/anonymous cart into one order.
  - Returns `{ orderId, confirmationToken, confirmationPath }`.
- `getOrderByConfirmationToken(token)`
  - Hashes the provided raw token and returns the order with item snapshots, or `null`.
- Optional `OrderDomainError` and `isOrderDomainError`, or reuse `CartDomainError` if implementation keeps one store-domain error type.

Contact validation:

- `customerName`: trim string, required, recommended max length 120.
- `customerEmail`: trim/lowercase string, required, syntactically valid email, recommended max length 254.
- Reject any missing/invalid field with a domain error and do not open cart-clearing logic.
- Do not require phone, address, tax identity, payment details, or account registration.

Transaction pseudocode:

```js
export async function createOrderFromCart(context, input) {
  const customerName = parseRequiredName(input.customerName);
  const customerEmail = parseRequiredEmail(input.customerEmail);
  const confirmationToken = createOrderConfirmationToken();
  const confirmationTokenHash = hashOrderConfirmationToken(confirmationToken);

  const result = await prisma.$transaction(async (tx) => {
    const cart = await findCartForContext(tx, context, {
      include: {
        items: { include: { product: true }, orderBy: [{ createdAt: "asc" }] },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw orderError("El carrito esta vacio");
    }

    const snapshots = [];

    for (const item of cart.items) {
      const product = item.product;
      assertPurchasableProduct(product);
      assertQuantityWithinStock(item.quantity, product);

      const decrement = await tx.product.updateMany({
        where: {
          id: product.id,
          status: "active",
          stockQuantity: { gte: item.quantity },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });

      if (decrement.count !== 1) {
        throw orderError("La cantidad supera el stock disponible");
      }

      snapshots.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        unitPriceMinorUnits: product.priceMinorUnits,
        quantity: item.quantity,
        lineTotalMinorUnits: product.priceMinorUnits * item.quantity,
      });
    }

    const subtotalMinorUnits = snapshots.reduce(
      (total, item) => total + item.lineTotalMinorUnits,
      0,
    );

    const order = await tx.order.create({
      data: {
        userId: context.userId || null,
        customerName,
        customerEmail,
        status: "pending",
        subtotalMinorUnits,
        totalMinorUnits: subtotalMinorUnits,
        confirmationTokenHash,
        items: { create: snapshots },
      },
      select: { id: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return { orderId: order.id };
  });

  return {
    ...result,
    confirmationToken,
    confirmationPath: `/pedido/confirmacion/${confirmationToken}`,
  };
}
```

Validation/error behavior:

- Empty cart: domain error, no order, no stock decrement, cart retained.
- Missing/invalid contact: domain error, no order, no stock decrement, cart retained.
- Product missing/non-active/out of stock/over-stock: domain error, transaction rollback, no order, cart retained.
- Unexpected persistence error: server error response from action, transaction rollback, cart retained.
- Successful checkout: one order, one order item per cart line, decremented stock, cart items deleted in the same transaction, returned private confirmation URL.

Stock decrement approach:

- Use `updateMany` with `id`, `status: "active"`, and `stockQuantity: { gte: quantity }` so decrement is conditional and atomic at the product row level.
- Check `count === 1`; otherwise throw a domain stale-stock error.
- The enclosing Prisma transaction rolls back any earlier decrements if a later item fails.

Cart clearing:

- Delete `CartItem` rows for the cart inside the transaction after order creation.
- Keep the `Cart` row and anonymous cart cookie; clearing means the cart has no items, matching existing empty-cart behavior.
- Do not delete or reuse the cart anonymous token for order access.

## Server actions/routes design: proposed paths and responsibilities

Proposed files/paths:

- `lib/actions/store-checkout.js`
  - Top-level `"use server"` action module.
  - Reuse the existing `STORE_CART_COOKIE_NAME = "store_cart_token"` and cart-context resolution pattern from `store-cart.js`.
  - Export `checkoutAction(_prevState, formData)`.
  - Parse `customerName` and `customerEmail` from `FormData` and call `createOrderFromCart`.
  - On domain errors, return `errorResponse(message, 400, { action: "checkoutAction" })` so the form can render errors and preserve the cart.
  - On unexpected errors, return `serverErrorResponse("No se pudo crear el pedido", details)`.
  - On success, call `revalidatePath("/carrito")`, `revalidatePath("/checkout")`, and optionally `revalidatePath("/tienda")` or affected product paths if the implementation cheaply has item slugs.
  - Redirect to `confirmationPath` after the `try/catch` block, not inside it, per Next.js redirect docs.

Action control-flow sketch:

```js
export async function checkoutAction(_prevState, formData) {
  let redirectTo = null;

  try {
    const { context } = await resolveCartActionContext();
    const result = await createOrderFromCart(context, {
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
    });
    revalidatePath("/carrito");
    revalidatePath("/checkout");
    redirectTo = result.confirmationPath;
  } catch (error) {
    return checkoutActionErrorResponse(error);
  }

  redirect(redirectTo);
}
```

- `app/checkout/page.js`
  - Server Component route for minimal checkout form.
  - Reads `cookies()` and session like `app/carrito/page.js`.
  - Fetches current cart summary; if empty, render an empty-cart prompt linking to `/tienda` or `/carrito`.
  - If non-empty, render cart subtotal and a form requiring only `customerName` and `customerEmail`.
  - Use a small client form component only if `useActionState` is needed for inline error display; otherwise a plain Server Action form is acceptable.

- `app/pedido/confirmacion/[token]/page.js`
  - Server Component route for private confirmation.
  - Await `params` per Next.js page docs.
  - Call `getOrderByConfirmationToken(token)`.
  - If missing/invalid, call `notFound()`.
  - Render order snapshot fields: customer name/email, status, item snapshot name/slug/unit price/quantity/line total, subtotal, total.
  - Do not read or accept the cart anonymous cookie as an order credential.

Optional cart page addition in a later slice:

- Add a `/checkout` button to `app/carrito/page.js` summary when `cart.items.length > 0`.
- Existing cart update/remove/clear forms must remain unchanged.

## Confirmation token design

- Generate a cryptographically random raw token with `randomBytes(32).toString("hex")` or equivalent, separate from `createAnonymousCartToken()`.
- Store only `sha256(rawToken)` in `Order.confirmationTokenHash` with a unique constraint.
- Return the raw token once from `createOrderFromCart`; use `/pedido/confirmacion/${rawToken}` as the post-checkout URL.
- Lookup hashes the token and queries by `confirmationTokenHash`.
- Invalid, missing, malformed, or unrelated tokens return `null` from the service and `notFound()` from the page.
- The cart anonymous token is never accepted by order lookup, never copied into order records, and never used in confirmation URLs.
- Token format validation should be conservative: trim, require expected hex length if hex tokens are used, and reject anything else before hashing/querying.

## TDD/verification strategy with RED/GREEN evidence plan

Strict TDD applies to every implementation slice. Use `pnpm test` for full verification and record RED/GREEN evidence in phase reports.

Suggested targeted tests/validators:

1. **Schema/service RED**
   - Add tests expecting `createOrderFromCart` to create an order with item snapshots and totals.
   - Add tests expecting successful checkout to decrement product stock and clear cart items.
   - Add tests expecting empty cart and invalid contact to reject without order creation.
   - RED evidence: tests fail because order models/service do not exist yet.
2. **Service GREEN**
   - Implement schema/migration and service until snapshot, totals, stock decrement, stale rejection, and cart clearing tests pass.
   - Include over-stock/non-active product tests proving rollback preserves cart and stock.
3. **Action/page RED**
   - Add tests/validators for `checkoutAction` response behavior on invalid contact/stale cart and redirect path on success.
   - Add tests/validators for checkout page requiring only name/email.
4. **Action/page GREEN**
   - Implement action and minimal checkout page.
   - Verify cart page/cart mutation regressions still pass.
5. **Confirmation RED**
   - Add tests for valid token lookup, invalid token denial, and cart token denial.
6. **Confirmation GREEN**
   - Implement confirmation page/service lookup.
   - Verify historical rendering uses order item snapshots after product rename/reprice/archive.
7. **Full verification**
   - Run `pnpm test`.
   - If test runner is blocked, document exact blocker and run the narrowest available validator/test command.

Core evidence to capture:

- RED before production behavior exists.
- GREEN for order snapshots, integer minor-unit totals, stock decrement, stale-cart rejection, cart clear on success, cart preservation on failure, private-token access, and cart-token denial.
- Regression evidence for public active-only catalog behavior, admin product protections if touched, and existing cart add/update/remove/clear behavior.

## PR slicing forecast under 250 changed lines

One PR is not recommended under the 250 changed-line review budget. Use chained PRs:

1. **PR A: Order schema + domain service + tests**
   - Add `OrderStatus`, `Order`, `OrderItem`, and relations.
   - Add migration if the project migration workflow requires it.
   - Add `lib/server/store/orders.js` with token helpers, contact validation, transaction, and confirmation lookup.
   - Add targeted service/runtime tests.
   - Avoid UI changes.
2. **PR B: Checkout action/page + cart lifecycle tests**
   - Add `lib/actions/store-checkout.js`.
   - Add `app/checkout/page.js` and minimal form component if needed.
   - Add `/checkout` CTA from cart only if it fits the slice.
   - Verify action error behavior and successful redirect.
3. **PR C: Confirmation page + private token tests**
   - Add `app/pedido/confirmacion/[token]/page.js`.
   - Verify valid token rendering, invalid token not-found, and cart token denial.
   - Add snapshot rendering regression after catalog changes if not already covered.

If any slice forecasts above 250 changed lines during apply, pause before continuing and ask for a delivery decision.

## Risks/tradeoffs

- **Concurrent checkout / oversell:** Mitigated with conditional `updateMany` stock decrement inside a transaction. SQLite/Prisma behavior still needs focused tests.
- **Historical product deletion:** `onDelete: Restrict` protects order history from product deletion. This trades off easy product hard-deletion for safer order records; archive should remain the normal product removal path.
- **Token in URL:** A raw private token in the path is simple and works without accounts, but URLs can appear in browser history/logs. Hashing the token at rest reduces database leakage risk.
- **Line budget pressure:** Schema, migration, service, UI, and tests are too broad for one 250-line PR. Slicing is necessary.
- **Action redirect ergonomics:** Returning inline errors and redirecting on success requires careful Server Action flow because `redirect()` must be outside caught `try/catch` blocks.
- **Cart clearing timing:** Clearing cart items inside the transaction makes checkout atomic and rollback-safe. It means the cart row/cookie remains for future shopping, which matches current anonymous cart behavior.
- **No payment state:** Orders default to `pending`; later payment/fulfillment work may need additional statuses or related models, but this slice intentionally avoids premature payment modeling.

## Rejected alternatives

- **Use cart anonymous token for confirmation:** Rejected because the fixed decision requires a private order token and the cart token must not grant order access.
- **Store only live product references in order items:** Rejected because historical orders must survive product rename/reprice/archive and render immutable checkout snapshots.
- **Do not decrement stock on order creation:** Rejected by fixed decision; stock must be decremented transactionally when the order is created.
- **Reservation/expiry model:** Rejected as out of scope and too large for the foundation slice.
- **Require phone, shipping address, payment, or registration:** Rejected because checkout requires only `customerName` and `customerEmail`.
- **Single all-in-one PR:** Rejected because it is likely to exceed the 250 changed-line review budget.
- **Store raw confirmation tokens:** Rejected in favor of storing `confirmationTokenHash`, preserving simple private-link UX while reducing credential exposure at rest.
