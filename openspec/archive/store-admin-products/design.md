# Store Admin Products Technical Design

## Decision summary

Implement `store-admin-products` as the first administrator-facing inventory slice on top of the completed catalog foundation.

This slice adds protected admin product management under `/admin/tienda` with:

- admin-only list view;
- create product flow;
- edit product flow;
- status transitions across `draft`, `active`, and `archived`;
- server-side validation and authorization;
- public/admin path revalidation after successful writes.

The design explicitly requires **real admin role + admin view mode** for both pages and mutation actions.

Category CRUD, image uploads, cart, checkout, orders, and broad dashboard redesign remain out of scope.

## Inputs and constraints

- Framework: Next.js 16.2.4 App Router.
- ORM: Prisma 7.
- Existing public catalog foundation already owns `Category`, `Product`, `ProductStatus`, public `/tienda`, and public `/tienda/[slug]`.
- Prices persist as integer minor units and display as `S/.`.
- Slug is mutable on create only and immutable afterwards.
- Every product must belong to an existing category.
- Strict TDD is mandatory in apply/verify: RED, GREEN, TRIANGULATE, REFACTOR.
- Review budget is 400 changed lines, so delivery should be planned as stacked work units.
- Before editing Next.js route/component code in apply, read relevant docs under `node_modules/next/dist/docs/`.

## Existing implementation patterns to reuse

### Auth and page gating

Current project patterns already provide the needed primitives:

- `resolvePageAuthContext()` returns `isAuthenticated`, `isAdmin`, `isAdminView`, `hasAuthError`.
- `requireAdminAccess()` already validates real admin role.
- Admin pages such as `app/admin/blog/page.js` manually enforce both `isAdmin` and `isAdminView` before rendering.

Implication: page access for store admin pages should mirror the blog-admin route pattern instead of inventing a new auth surface.

### Navigation

`components/navbar.jsx` already exposes admin links only when:

- the user is admin, and
- the current view mode is `administrador`.

Implication: `/admin/tienda` should be added to `adminNavLinks` only, with no extra navbar branching.

### Actions and server modules

Blog admin already uses the project’s preferred separation:

- route/page in `app/admin/...`
- action module in `lib/actions/...`
- domain service in `lib/server/...`
- validation in `lib/server/.../validation.js`

Store admin should follow the same file-level shape.

## File layout

Recommended files for this slice:

```text
app/admin/tienda/page.js
app/admin/tienda/nuevo/page.js
app/admin/tienda/[id]/page.js
lib/actions/store-admin.js
lib/server/store/admin-products.js
lib/server/store/admin-validation.js
scripts/validate-store-admin-products.mjs
scripts/test-store-admin-products.ts
```

Possible touched existing files:

```text
components/navbar.jsx
package.json
lib/server/store/validation.js
```

## Page design

### `app/admin/tienda/page.js`

Purpose: first inventory list for authorized admins in admin view.

Behavior:

1. Call `resolvePageAuthContext()`.
2. Reuse the same three gate branches as admin blog:
   - auth/session error state;
   - unauthenticated restricted state;
   - authenticated but not `isAdminView` denied state.
3. If authorized, fetch all products for admin management through `getAdminProducts()`.
4. Render a simple list or cards with:
   - name;
   - slug;
   - status;
   - category name;
   - price label;
   - stock summary;
   - featured flag if useful;
   - edit link;
   - create entry link.
5. No search, filters, pagination, bulk actions, or table virtualization.

Data shape recommendation:

- keep route lightweight;
- map records in the service into UI-safe fields such as `priceLabel` and `stockLabel`.

### `app/admin/tienda/nuevo/page.js`

Purpose: create form for a new product.

Behavior:

1. Use the same page gating contract as `/admin/tienda`.
2. Load category options from admin service.
3. Render a server form bound to `createProductAction`.
4. Required fields:
   - `name`
   - `slug`
   - `summary`
   - `price`
   - `stockQuantity`
   - `status`
   - `categoryId`
5. Optional fields:
   - `description`
   - `imageUrl`
   - `sku`
   - `featured`
6. Show slug only on create.

UX decision:

- use decimal-input display for price in soles on the form;
- convert it server-side into integer minor units before persistence.

Rationale: this is operator-friendly while preserving the persistence contract.

### `app/admin/tienda/[id]/page.js`

Purpose: edit mutable fields of an existing product.

Behavior:

1. Use the same page gating contract.
2. Load product by id through admin service.
3. If product is missing, render `notFound()` or project-standard missing state.
4. Render edit form bound to `updateProductAction`.
5. Slug must be displayed read-only or omitted from editable inputs.
6. Include explicit status control in the edit surface to avoid a separate dedicated status page.

Rationale: status is part of the same bounded inventory workflow and does not need a separate route in this slice.

## Action design

Create `lib/actions/store-admin.js` with server actions:

- `createProductAction`
- `updateProductAction`
- optionally `updateProductStatusAction`

Recommended decision: keep status transitions inside `updateProductAction` unless UX clearly requires separate inline status forms on the list page.

### Authorization contract

Every action must enforce both:

1. real admin role; and
2. admin view mode.

Because `requireAdminAccess()` currently checks role only, this slice should add a small store-admin-specific guard in the action layer, e.g.:

```js
async function requireStoreAdminAccess() {
  const auth = await requireAdminAccess();
  if (!auth.ok) return auth;

  const { isAdminView } = await resolvePageAuthContext();
  if (!isAdminView) {
    return forbiddenResponse("Acceso denegado");
  }

  return auth;
}
```

Design intent:

- do not trust page visibility alone;
- enforce the full gate at mutation time;
- keep the rule local and explicit for this slice.

### Revalidation contract

On successful create/edit/status write:

- `revalidatePath("/admin/tienda")`
- `revalidatePath("/tienda")`
- `revalidatePath(`/tienda/${slug}`)`

Because slug is immutable after creation, update paths can safely revalidate using the persisted slug without alias handling.

### Redirect vs in-place state

Recommended first slice approach:

- actions return standard response objects for validation/auth failures;
- after successful create, redirect to `/admin/tienda/<id>` or `/admin/tienda`;
- after successful update, stay on the edit page or redirect back to the same page.

Keep this simple; no toast/event bus architecture should be added in this slice.

## Service design

Create `lib/server/store/admin-products.js`.

### Responsibilities

- admin list query;
- admin detail query by id;
- category option query;
- create product mutation;
- update product mutation;
- optional small mappers for UI-safe fields.

### Suggested API

```js
getAdminProducts();
getAdminProductById(id);
getAdminProductFormOptions();
createAdminProduct(input);
updateAdminProduct(id, input);
```

### Query design

`getAdminProducts()`:

- include category relation;
- order by `updatedAt desc` or `createdAt desc`;
- return all statuses.

`getAdminProductById(id)`:

- fetch by id;
- include category;
- return `null` if missing.

`getAdminProductFormOptions()`:

- load categories ordered by name;
- return only `id`, `name`, `slug`.

### Mutation design

`createAdminProduct(input)`:

- validate normalized payload first;
- ensure category exists;
- ensure slug uniqueness;
- ensure optional SKU uniqueness when provided;
- persist `priceMinorUnits` integer.

`updateAdminProduct(id, input)`:

- fetch existing product;
- reject missing product;
- never accept slug mutation;
- validate category/status/price/stock;
- preserve slug exactly as stored.

Prefer Prisma-level uniqueness handling plus friendly error mapping in the service.

## Validation design

Create `lib/server/store/admin-validation.js`.

### Responsibilities

- parse `FormData` into normalized product input;
- validate required/optional fields;
- convert price display input into integer minor units;
- reject negative stock;
- reject invalid status;
- reject missing/nonexistent category;
- enforce slug rules on create;
- enforce immutable slug rule on update.

### Input model

Internal normalized input shape:

```js
{
  name,
  slug,
  summary,
  description,
  imageUrl,
  priceMinorUnits,
  stockQuantity,
  status,
  categoryId,
  sku,
  featured,
}
```

For update, `slug` should not be part of the mutable input contract.

### Price parsing rule

Recommended parser behavior:

- accept strings such as `120`, `120.5`, `120.50`;
- normalize to integer minor units;
- reject empty, malformed, negative, or more-than-2-decimal values.

Rationale: keeps operator input friendly while preserving deterministic storage.

### Status transition rule

Keep transition logic simple for this slice:

- allow transitions among `draft`, `active`, and `archived`;
- allow archived back to draft or active;
- do not introduce special workflow states.

Spec leaves validation open; design chooses the least surprising rule set and keeps business logic bounded.

### Active-state validation rule

Recommended rule:

- `priceMinorUnits >= 0`
- `stockQuantity >= 0`
- active products may remain visible even when stock is `0`

Rationale: this matches the current public catalog foundation, which already allows active out-of-stock products.

## UI component strategy

To protect review size, avoid a large new component tree.

Recommended approach:

- keep list and form markup local to the admin routes initially;
- extract only tiny helpers if duplication becomes noisy.

Acceptable small helpers later if needed:

- `ProductStatusBadge`
- `ProductPriceField`
- `ProductForm`

But these should not be the default if they inflate the diff.

## Error-state design

Follow current admin page conventions:

- auth/session issues use `PageStateCard`;
- access denied uses `PageStateCard`;
- missing product uses `notFound()` or small project-standard fallback;
- validation failures return structured action errors near the form.

Do not add bespoke modal flows for this slice.

## Navigation change

Add one admin-only link in `components/navbar.jsx`:

```js
{ href: "/admin/tienda", label: "Tienda Admin", icon: ShoppingBag? }
```

Rules:

- include it only in `adminNavLinks`;
- preserve existing `isAdminView` navbar gate;
- do not expose it to visitors, clients, or admins in client view.

## Testing design

Apply/verify must use strict TDD evidence.

### RED

Add failing checks before production implementation, for example:

- validator expecting admin store files/modules;
- runtime test expecting action/service gating and slug immutability;
- targeted route/access assertions.

### GREEN

Implement minimum service/actions/pages to satisfy the failing checks.

### TRIANGULATE

Add at least one extra scenario beyond the happy path:

- negative stock rejection;
- archived-to-active transition;
- admin-in-client-view action rejection;
- product remains hidden publicly until active.

### REFACTOR

Simplify parsing/helpers/forms without changing contracts; rerun targeted checks.

### Targeted tests

Recommended additions:

```text
scripts/validate-store-admin-products.mjs
scripts/test-store-admin-products.ts
```

`validate-store-admin-products.mjs` should structurally assert:

- admin store routes exist;
- admin service/action/validation modules exist;
- navbar includes `/admin/tienda` only in admin links;
- page gating strings/contracts are present;
- package scripts exist if added.

`scripts/test-store-admin-products.ts` should runtime-check:

- unauthorized access is rejected at action/service boundary;
- create with valid category succeeds;
- create with invalid category fails;
- slug is immutable on update;
- invalid status fails;
- negative stock fails;
- public visibility remains active-only.

E2E can be deferred if the diff exceeds review budget, but verify must state that explicitly.

## Review workload and delivery split

This slice is likely too large for one reviewable diff if implemented end-to-end.

### Recommended split

**PR A — backend/admin foundation**

- `lib/server/store/admin-products.js`
- `lib/server/store/admin-validation.js`
- `lib/actions/store-admin.js`
- runtime/structural tests
- no or minimal route UI

**PR B — admin UI**

- `app/admin/tienda/page.js`
- `app/admin/tienda/nuevo/page.js`
- `app/admin/tienda/[id]/page.js`
- navbar admin link
- targeted validator/e2e updates

This split matches the project’s review budget and keeps write risk controlled.

## Risks

- `requireAdminAccess()` alone is insufficient because it does not encode admin-view mode.
- Form parsing can sprawl if validation is mixed into routes instead of isolated in `admin-validation.js`.
- Prisma uniqueness errors for slug/SKU need explicit error mapping or UX will be opaque.
- Route/form/UI work plus tests can exceed the 400-line review budget quickly.
- Existing brittle validators may need narrow updates once `/admin/tienda` is added.

## Apply-phase instructions

When implementation starts:

1. Read the relevant Next.js 16 docs under `node_modules/next/dist/docs/` before editing admin route files.
2. Follow strict TDD in this order: RED → GREEN → TRIANGULATE → REFACTOR.
3. Keep writes single-threaded.
4. Pause and confirm delivery strategy if the diff clearly exceeds the 400-line review budget.

## Next phase recommendation

Proceed to `tasks` for `store-admin-products`.

Tasks should preserve the stacked delivery split and make TDD checkpoints explicit for:

- auth gate;
- validation/parser;
- service mutations;
- route UI;
- validators/runtime tests;
- final verification.
