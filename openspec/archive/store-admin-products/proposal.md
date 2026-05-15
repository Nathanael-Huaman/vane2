# Store Admin Products

## Intent

Build the next safe store slice by adding administrator-facing product management on top of the completed Prisma-backed public catalog foundation.

This change gives administrators a bounded way to list, create, edit, publish, archive, and maintain product inventory under `/admin/tienda`, while keeping public catalog reads protected by the existing active-only rules.

## Problem

The store now has a public catalog foundation, but product data is still managed through seed scripts and direct database changes. That is not sustainable for real operation: administrators need a controlled UI and server-side mutation path for product inventory.

Without an admin product management slice, later cart and checkout work would depend on catalog data that cannot be safely maintained by non-developer operators. The project also needs clear admin-only protections so product mutations are not exposed to clients, visitors, or administrators currently browsing in client view mode.

## Goals

- Add an admin product management surface under `/admin/tienda`.
- Require both real administrator role and active admin view mode for admin product pages and mutations.
- Provide a simple product list / inventory summary with no search, filters, or pagination in this slice.
- Allow administrators to create products.
- Allow administrators to edit existing mutable product fields.
- Keep product slugs immutable after creation.
- Require every product to choose an existing category.
- Allow status transitions between `draft`, `active`, and `archived`, including archive/unarchive behavior.
- Allow price, stock, category, description, image URL, SKU, featured flag, and status assignment within validation rules.
- Protect all product mutations with admin-only server actions.
- Revalidate affected public and admin catalog paths after writes.
- Preserve public catalog behavior from `store-catalog-foundation`: only active products are publicly visible.
- Record strict TDD evidence during apply/verify: RED, GREEN, TRIANGULATE, REFACTOR.

## Non-goals

- No cart behavior.
- No checkout.
- No order or order-item models.
- No payment provider integration.
- No shipping, taxes, invoices, notifications, or fulfillment.
- No category CRUD.
- No category hierarchy redesign.
- No uncategorized products.
- No image upload pipeline; image remains a URL string.
- No discounts, variants, bundles, or multi-category products.
- No broad admin dashboard redesign.
- No product slug editing after creation.
- No advanced admin list search, filters, or pagination.
- No stock reservation, stock decrement, or purchase workflow.

## Proposed Scope

### Admin access policy

Admin product management MUST require both:

1. the user's real role is administrator; and
2. the user's current session view mode is admin view.

Users without a session, clients, and administrators in client view MUST NOT access admin product management pages or execute product mutation actions.

### Admin routes

Add admin store routes:

- `app/admin/tienda/page.js`
  - simple inventory/product list;
  - product status, price, stock, category, and public visibility summary;
  - links to create/edit products;
  - no search/filter/pagination in this slice.
- `app/admin/tienda/nuevo/page.js`
  - create product form;
  - slug is entered or generated during creation only;
  - category selection uses existing categories.
- `app/admin/tienda/[id]/page.js`
  - edit product form;
  - slug is displayed as immutable/read-only or omitted from editable fields;
  - editable fields include core inventory and publication data.

### Mutation and service layer

Add store admin server-side boundaries following existing project patterns:

- `lib/actions/store-admin.js`
  - server actions for create, edit, and status transitions;
  - every action verifies admin role + admin view before mutation;
  - actions revalidate relevant paths after successful writes.
- `lib/server/store/admin-products.js`
  - admin read/write service methods;
  - admin list/detail queries;
  - create/update/status transition operations.
- `lib/server/store/admin-validation.js`
  - input parsing/validation for product forms;
  - price minor-unit or display-price conversion rules as selected in spec/design;
  - non-negative stock and valid category/status checks;
  - slug validation on create and immutable-slug enforcement on edit.

### Product fields and mutation rules

This proposal assumes the current `Product` model from the catalog foundation remains the data model for this slice.

Create product should support:

- name;
- slug, creation-only;
- summary;
- optional description;
- optional image URL;
- price in Peruvian soles represented safely as integer minor units in persistence;
- stock quantity;
- status: `draft`, `active`, or `archived`;
- existing category assignment;
- optional SKU;
- featured flag if already present in the model.

Edit product should support the same mutable fields except slug.

Status transitions should support:

- draft to active;
- active to draft if needed;
- active/draft to archived;
- archived back to draft or active, subject to validation finalized in spec.

Public reads MUST continue to expose active products only. Draft and archived products can be visible in admin inventory, but not public catalog/detail pages.

### Revalidation

Successful writes should revalidate affected paths, including:

- `/admin/tienda`;
- `/tienda`;
- the concrete public detail path for the product slug when relevant, such as `/tienda/<slug>`.

Because slugs are immutable after creation, edit revalidation can target the existing slug without URL-change handling.

### Navigation

Add an admin navigation entry for `/admin/tienda` only where existing navigation already shows admin links for administrators in admin view. Do not expose admin product links to visitors, clients, or admins in client view.

### Tests and validators

Add or update targeted test coverage:

- structural validator for admin product management, likely `scripts/validate-store-admin-products.mjs`;
- package script for that validator;
- runtime tests for admin services/actions where practical;
- targeted validators/E2E updates only where admin navigation or route access contracts change.

Strict TDD evidence is required in apply/verify.

## Acceptance Criteria

- Administrator in admin view can open `/admin/tienda`.
- Visitor, client, and administrator in client view cannot access `/admin/tienda`, create, edit, or mutation flows.
- `/admin/tienda` shows a simple product list/inventory summary using Prisma-backed products.
- Admin can create a product with an existing category.
- Creating a product stores price as integer minor units and never requires persisted floating-point prices.
- Admin can edit mutable product fields without changing the slug.
- Product slug remains immutable after creation.
- Admin can transition product status among `draft`, `active`, and `archived` according to spec-defined validation rules.
- Archived products can be managed in admin but remain hidden from public catalog/detail pages.
- Draft products can be managed in admin but remain hidden from public catalog/detail pages.
- Active products appear publicly after successful create/update/revalidation when otherwise valid.
- Product mutations revalidate admin and public catalog paths.
- Admin store navigation is visible only to real administrators in admin view.
- No category CRUD, image upload, cart, checkout, orders, or payment behavior is introduced.
- Verification includes targeted admin-product checks plus relevant configured project checks.

## Affected Areas

| Area                                        | Expected impact                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `app/admin/tienda/page.js`                  | New simple admin inventory list.                                             |
| `app/admin/tienda/nuevo/page.js`            | New create product page/form.                                                |
| `app/admin/tienda/[id]/page.js`             | New edit product page/form.                                                  |
| `lib/actions/store-admin.js`                | New protected server actions for product mutations.                          |
| `lib/server/store/admin-products.js`        | New admin product read/write service boundary.                               |
| `lib/server/store/admin-validation.js`      | New admin input validation and parsing.                                      |
| `lib/server/store/validation.js`            | Possible reuse or small extension of existing store constants/helpers.       |
| `components/navbar.jsx`                     | Add admin store link only for admin view if not already present.             |
| `package.json`                              | Add targeted admin-store validation/test scripts if needed.                  |
| `scripts/validate-store-admin-products.mjs` | New structural validator for admin product management.                       |
| `scripts/*` runtime tests                   | Possible focused admin product mutation tests.                               |
| `e2e/*`                                     | Targeted admin route/access tests if review budget allows.                   |
| Existing ticket validators                  | Update only if admin navigation/view-mode expectations intentionally change. |

## Delivery Strategy / Review Workload Forecast

Review workload risk is **high**.

A single implementation of admin services, actions, validation, list/create/edit pages, navigation, validators, and E2E is forecast around **500-900 changed lines**, exceeding the configured 400-line review budget.

Recommended delivery: stacked split.

1. **PR A: Admin product backend foundation**
   - admin validation;
   - admin services;
   - protected server actions;
   - structural/runtime tests;
   - no full route/form UI beyond what is necessary for validation.
2. **PR B: Admin product UI**
   - `/admin/tienda` list;
   - `/admin/tienda/nuevo` create form;
   - `/admin/tienda/[id]` edit form;
   - admin navigation link;
   - targeted route/validator/E2E updates.

Keep work-unit commits aligned to these deliverable boundaries. If tasks/design forecast a smaller diff than expected, the team may keep this in one PR only if it remains close to the 400-line review budget.

## Risks

- Admin role + admin view mode gating must be applied consistently to both pages and actions; protecting only UI would be insufficient.
- Server action validation and form handling can expand quickly if UX requirements are not constrained.
- Slug immutability simplifies public URLs but must be enforced explicitly on edit paths.
- Category CRUD is out of scope, so empty or missing category data can block product creation unless seed/setup expectations are clear.
- Public catalog revalidation must include both list and detail routes so admin writes become visible predictably.
- Existing string-based validators may be brittle and should be updated narrowly.
- Next.js route/form changes must follow project guidance: read relevant `node_modules/next/dist/docs/` docs before implementation.

## Rollback Plan

- Revert admin routes under `app/admin/tienda/*`.
- Revert `lib/actions/store-admin.js` and admin product service/validation modules.
- Revert admin navigation link changes.
- Revert admin-specific validators/tests/package scripts.
- Existing public catalog foundation remains intact; this slice should not require rolling back catalog data models.
- Because this slice excludes orders/payments, rollback has no customer order, payment, or fulfillment implications.

## Success Criteria

- Administrators in admin view can manage products without developer seed/database edits.
- Non-admin users and admins in client view are blocked from product management pages and actions.
- Product create/edit/status flows preserve public catalog visibility rules.
- Slugs remain stable after creation.
- Products always use existing categories.
- Price/stock/status/category validation prevents invalid inventory state.
- Public catalog pages reflect admin writes after revalidation.
- Implementation remains reviewable through stacked delivery or an explicit size decision.

## Open Questions

These should be resolved in spec/design before implementation:

1. Should SKU be optional or required in admin create/edit? Current recommendation: optional.
2. Should active products require price greater than zero, or is `S/. 0.00` valid? Current recommendation: allow zero only if explicitly intended; otherwise require active products to have non-negative price and validate business rule in spec.
3. Should active products require stock greater than zero, or can active out-of-stock products remain visible as in catalog foundation?
4. Should archived products unarchive directly to active, or always return to draft first?
5. Should product create auto-generate slug from name, require manual slug entry, or support both?
6. Should admin forms show price in soles decimal input while storing integer minor units?
7. What error UX should be used for slug/category/SKU uniqueness and validation failures?
8. Should E2E be included in the first UI PR, or deferred if the diff exceeds the review budget after runtime/structural coverage?

## Next Phase Recommendation

Proceed to `spec` for `store-admin-products`.

The spec should define exact route access behavior, server action authorization, product form fields, validation rules, status transition rules, slug creation/immutability behavior, revalidation requirements, and required tests before technical design or implementation.
