# Store Admin Products Tasks

## Review Workload Forecast

| Field                   | Value                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- |
| Estimated changed lines | 500-900 changed lines if actions, services, routes, validators, and tests are included |
| 400-line budget risk    | High                                                                                   |
| Chained PRs recommended | Yes                                                                                    |
| Suggested split         | PR A: admin backend foundation → PR B: admin product UI                                |
| Delivery strategy       | ask-on-risk                                                                            |
| Chain strategy          | stacked-to-main                                                                        |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Delivery Gate Before Apply

Do not start implementation until the parent/user approves one of these options:

1. **Recommended: stacked PR split**
   - **PR A:** admin authorization helper, form parsing/validation, admin product services, server actions, structural/runtime tests.
   - **PR B:** `/admin/tienda` list, `/admin/tienda/nuevo` create page, `/admin/tienda/[id]` edit page, navbar admin link, targeted validator/E2E updates.
2. **Size exception**
   - Implement as one larger PR only if the reviewer explicitly accepts a likely >400-line diff.

## Non-goals / Do Not Implement

- No cart, checkout, orders, payments, shipping, tax, invoice, or fulfillment logic.
- No category CRUD or category hierarchy redesign.
- No image upload pipeline.
- No discounts, variants, bundles, bulk operations, or multi-category products.
- No broad admin dashboard redesign.
- No slug editing after product creation.
- No advanced search, filters, or pagination on the admin product list.
- No unrelated auth, navbar, or public catalog refactors.

## PR A: Admin Backend Foundation

### A0. Preflight: Read Next.js 16 docs before admin route work begins

- **Files/discovery targets:** `node_modules/next/dist/docs/**` for App Router pages, forms/server actions, dynamic routes, `notFound()`, revalidation/cache.
- **Task:** Record the doc paths that will govern later route edits, even if PR A itself stays mostly backend.
- **Verification:** Include the doc paths in apply evidence.
- **Finish:** Route-related implementation can proceed with current Next.js 16 guidance.
- **Rollback:** Not applicable.

### A1. RED: Add structural validator for admin-products slice

- **Files:** `scripts/validate-store-admin-products.mjs`, `package.json`.
- **Task:** Add `validate:store-admin-products` script that fails until these exist:
  - `lib/actions/store-admin.js`
  - `lib/server/store/admin-products.js`
  - `lib/server/store/admin-validation.js`
  - `app/admin/tienda/page.js`
  - `app/admin/tienda/nuevo/page.js`
  - `app/admin/tienda/[id]/page.js`
  - navbar admin link for `/admin/tienda`
- **Verification:** Run `pnpm validate:store-admin-products` and record RED failure.
- **Finish:** Failing output proves the admin-products slice is not implemented yet.
- **Rollback:** Remove validator script and package entry.

### A2. RED: Add runtime tests for admin authorization and mutation contracts

- **Files:** `scripts/test-store-admin-products.ts`, `package.json`.
- **Task:** Add `test:store-admin-products` script for runtime checks covering:
  - action/service mutation rejection when user is not a real admin;
  - mutation rejection when admin is in client view;
  - create with existing category succeeds;
  - create with missing/nonexistent category fails;
  - slug is immutable on update;
  - invalid status fails;
  - negative stock fails;
  - public visibility remains active-only.
- **Verification:** Run `pnpm test:store-admin-products` and record RED failure.
- **Finish:** Failing output proves required action/service behavior is absent.
- **Rollback:** Remove runtime test and script.

### A3. GREEN: Add admin validation/parser module

- **Files:** `lib/server/store/admin-validation.js`, possibly `lib/server/store/validation.js` for narrow shared constants reuse.
- **Task:** Implement parsing/validation for create/update payloads:
  - normalize `FormData`;
  - parse decimal soles input into `priceMinorUnits` integer;
  - require `name`, `summary`, `price`, `stockQuantity`, `status`, `categoryId`;
  - validate slug on create;
  - reject slug mutation on update;
  - reject negative price/stock and invalid statuses.
- **Verification:** Run `pnpm test:store-admin-products` and confirm parser/validation assertions move toward GREEN.
- **Finish:** Validation rules exist independently from route components.
- **Rollback:** Remove `lib/server/store/admin-validation.js` and revert small shared-helper changes.

### A4. GREEN: Add admin product service module

- **Files:** `lib/server/store/admin-products.js`.
- **Task:** Implement service methods:
  - `getAdminProducts()`
  - `getAdminProductById(id)`
  - `getAdminProductFormOptions()`
  - `createAdminProduct(input)`
  - `updateAdminProduct(id, input)`
- **Behavior:**
  - include category relation;
  - return all statuses for admin queries;
  - ensure category exists;
  - ensure slug uniqueness on create;
  - ensure SKU uniqueness when provided;
  - preserve slug exactly on update;
  - keep public visibility behavior untouched.
- **Verification:** Run `pnpm test:store-admin-products` after seed/runtime setup.
- **Finish:** Admin data access and mutations are isolated in one store service layer.
- **Rollback:** Remove `lib/server/store/admin-products.js`.

### A5. GREEN: Add store-admin action module with full access gate

- **Files:** `lib/actions/store-admin.js`, possibly narrow imports from `lib/server/authorization.js`, `lib/server/session/resolve-page-auth-context.js`, and response helpers.
- **Task:** Implement server actions:
  - `createProductAction`
  - `updateProductAction`
  - optional dedicated status action only if really needed
- **Authorization:** enforce both:
  - real admin role;
  - admin view mode.
- **Revalidation:** on successful writes revalidate:
  - `/admin/tienda`
  - `/tienda`
  - `/tienda/<slug>`
- **Verification:** Run `pnpm test:store-admin-products` and confirm auth + mutation contract passes.
- **Finish:** UI is no longer the only protection; mutations are server-protected.
- **Rollback:** Remove `lib/actions/store-admin.js` and any narrow helper additions.

### A6. TRIANGULATE: Add edge-case coverage for status transitions and immutability

- **Files:** `scripts/test-store-admin-products.ts`, `lib/server/store/admin-products.js`, `lib/server/store/admin-validation.js`.
- **Task:** Add or confirm extra cases beyond the happy path:
  - archived → active succeeds when data is valid;
  - archived → draft succeeds;
  - active product with `stockQuantity = 0` remains valid and public when status is active;
  - update attempts carrying slug change intent are rejected.
- **Verification:** Run `pnpm test:store-admin-products`.
- **Finish:** Transition and immutability rules are covered, not implied.
- **Rollback:** Revert only the added edge-case logic/assertions.

### A7. REFACTOR: Keep backend slice local and reviewable

- **Files:** `lib/actions/store-admin.js`, `lib/server/store/admin-products.js`, `lib/server/store/admin-validation.js`, `scripts/test-store-admin-products.ts`.
- **Task:** Remove duplication, keep helper scope narrow, avoid broad auth/store refactors.
- **Verification:** Run:
  - `pnpm validate:store-admin-products`
  - `pnpm test:store-admin-products`
  - `pnpm lint`
- **Finish:** PR A is independently reviewable as backend foundation.
- **Rollback:** Revert refactor-only edits.

## PR B: Admin Product UI

### B1. RED: Extend structural validator for page gating and navbar contract

- **Files:** `scripts/validate-store-admin-products.mjs`, possibly targeted validator/E2E files.
- **Task:** Extend validator to fail until:
  - admin pages use the auth/error/denied-state contract;
  - `/admin/tienda` navbar link exists only in admin nav links;
  - create/edit routes exist and reference store-admin actions/services.
- **Verification:** Run `pnpm validate:store-admin-products` and record RED failure before route UI lands.
- **Finish:** Failing output documents missing UI/gating wiring.
- **Rollback:** Revert validator additions.

### B2. GREEN: Add admin product list page

- **Files:** `app/admin/tienda/page.js`.
- **Task:** Implement authorized admin inventory list:
  - gate with `resolvePageAuthContext()` using the same auth/session/access-denied pattern as admin blog;
  - fetch `getAdminProducts()`;
  - show status, category, price, stock, slug, and edit/create entry points;
  - omit search/filter/pagination.
- **Verification:** Run `pnpm validate:store-admin-products` and relevant targeted tests.
- **Finish:** Authorized admin in admin view can open `/admin/tienda`.
- **Rollback:** Remove or revert `app/admin/tienda/page.js`.

### B3. GREEN: Add create product page

- **Files:** `app/admin/tienda/nuevo/page.js`.
- **Task:** Implement authorized create form:
  - same page gating contract;
  - load category options;
  - bind to `createProductAction`;
  - include required and optional product fields from the spec;
  - include slug only on create.
- **Verification:** Run `pnpm validate:store-admin-products` and `pnpm test:store-admin-products`.
- **Finish:** Authorized admin can create products using existing categories only.
- **Rollback:** Remove or revert `app/admin/tienda/nuevo/page.js`.

### B4. GREEN: Add edit product page

- **Files:** `app/admin/tienda/[id]/page.js`.
- **Task:** Implement authorized edit form:
  - same page gating contract;
  - fetch existing product by id;
  - use `notFound()` or project-standard missing-state handling when absent;
  - bind to `updateProductAction`;
  - keep slug read-only or omitted from mutable payload.
- **Verification:** Run targeted validator/runtime checks and manual spot check if needed.
- **Finish:** Authorized admin can edit mutable fields without changing slug.
- **Rollback:** Remove or revert `app/admin/tienda/[id]/page.js`.

### B5. GREEN: Add navbar admin-store entry

- **Files:** `components/navbar.jsx`.
- **Task:** Add `/admin/tienda` to `adminNavLinks` only.
- **Verification:** Confirm visitors, clients, and admins in client view do not see it; admins in admin view do.
- **Finish:** Navigation exposes the admin store slice only to the intended audience.
- **Rollback:** Revert navbar link addition.

### B6. TRIANGULATE: Add focused UI/route assertions

- **Files:** targeted validator and/or E2E files under `scripts/` and `e2e/`.
- **Task:** Add at least one extra browser/route-level scenario beyond the happy path:
  - admin in client view is denied on `/admin/tienda`;
  - client user is denied on create/edit pages;
  - active product edits preserve public `/tienda/<slug>` visibility after revalidation intent.
- **Verification:** Run targeted Playwright spec(s) if budget allows, or explicitly defer with rationale.
- **Finish:** The UI route contract is covered beyond static structure.
- **Rollback:** Revert focused UI assertions.

### B7. REFACTOR: Keep route UI local and avoid component sprawl

- **Files:** `app/admin/tienda/page.js`, `app/admin/tienda/nuevo/page.js`, `app/admin/tienda/[id]/page.js`.
- **Task:** Keep form/list helpers local unless extraction is clearly warranted; avoid building a broad component tree in this slice.
- **Verification:** Run:
  - `pnpm validate:store-admin-products`
  - `pnpm test:store-admin-products`
  - `pnpm lint`
- **Finish:** Admin product UI remains readable and reviewable.
- **Rollback:** Revert refactor-only UI changes.

## Final Verification Checklist

Run after the approved PR slice(s):

- `pnpm validate:store-admin-products`
- `pnpm test:store-admin-products`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e` where relevant, or targeted Playwright specs with explicit rationale for any deferral

## Definition of Done

- Admin product pages require real admin role plus admin view mode.
- Product mutation actions enforce the same gate server-side.
- `/admin/tienda` shows a simple inventory list with create/edit entry points.
- `/admin/tienda/nuevo` creates products using existing categories only.
- `/admin/tienda/[id]` edits mutable fields while preserving slug immutability.
- Price input is normalized into integer minor units before persistence.
- Negative stock and invalid statuses are rejected server-side.
- Status transitions across `draft`, `active`, and `archived` are supported.
- Public catalog behavior remains active-only.
- Successful writes revalidate admin and public store paths.
- Navbar exposes `/admin/tienda` only to admins in admin view.
- Strict TDD evidence is recorded for RED, GREEN, TRIANGULATE, and REFACTOR.
- No non-goals were implemented.
- Review split/size gate was honored before apply.

## Apply Status

### PR A: Admin Backend Foundation

- [x] A0 Next.js 16 docs preflight recorded.
- [x] A1 RED structural validator and package script added.
- [x] A2 RED runtime admin-product tests and package script added.
- [x] A3 GREEN admin validation/parser added.
- [x] A4 GREEN admin product service added.
- [x] A5 GREEN store-admin actions with full access gate and revalidation added.
- [x] A6 TRIANGULATE edge cases covered for transitions, stock-zero active products, and slug immutability.
- [x] A7 REFACTOR backend helpers kept narrow and targeted checks rerun.

### PR B: Admin Product UI

- [x] B1 Structural validator extended for page gating and navbar contract.
- [x] B2 `app/admin/tienda/page.js` added with admin-view gating and inventory list.
- [x] B3 `app/admin/tienda/nuevo/page.js` added with authorized create form.
- [x] B4 `app/admin/tienda/[id]/page.js` added with authorized edit form and immutable slug behavior.
- [x] B5 Navbar admin-store link added only for admin view.
- [x] B6 Focused route-level denial assertions added in validator (non-admin and admin-in-client-view branches).
- [x] B7 Route UI kept local/reviewable and targeted checks rerun.
