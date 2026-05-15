# Store Admin Products Specification

## ADDED Requirements

### Requirement: Admin access gate for pages

The system MUST restrict store admin product pages to users who satisfy both conditions:

1. real user role is `administrador`; and
2. current session view mode is `administrador`.

Visitors, `cliente` users, and administrators in client view mode MUST NOT access admin product management pages.

#### Scenario: Admin in admin view accesses admin list

- **Given** a signed-in user with real role `administrador`
- **And** the user session view mode is `administrador`
- **When** the user opens `/admin/tienda`
- **Then** the page MUST render the admin product management list

#### Scenario: Admin in client view is blocked from admin pages

- **Given** a signed-in user with real role `administrador`
- **And** the user session view mode is `cliente`
- **When** the user opens `/admin/tienda`
- **Then** the user MUST be denied access
- **And** admin product management content MUST NOT be rendered

#### Scenario: Non-admin is blocked from admin pages

- **Given** a signed-in user with real role `cliente`
- **When** the user opens `/admin/tienda`
- **Then** the user MUST be denied access

### Requirement: Admin-only server action authorization

All product mutation server actions for this slice MUST enforce the same gate as admin pages: real admin role plus admin view mode.

Server actions MUST NOT rely on UI visibility alone.

#### Scenario: Mutation action rejects admin in client view

- **Given** a signed-in user with real role `administrador`
- **And** the user session view mode is `cliente`
- **When** the user submits create, edit, or status mutation actions
- **Then** the action MUST reject the request
- **And** no product data mutation MUST be persisted

#### Scenario: Mutation action rejects non-admin user

- **Given** a signed-in user with real role `cliente`
- **When** the user submits a product mutation action
- **Then** the action MUST reject the request
- **And** no product data mutation MUST be persisted

### Requirement: Admin product listing behavior

The route `/admin/tienda` MUST provide a simple first inventory list with no search, filters, or pagination in this slice.

The list MUST show enough information to manage products, including status, price, stock, category, and edit/create entry points.

#### Scenario: Admin list renders simple inventory summary

- **Given** an authorized administrator in admin view
- **When** the user opens `/admin/tienda`
- **Then** the route MUST render product rows/cards with status, price, stock, and category
- **And** the route MUST provide links or actions for create and edit
- **And** the route MUST NOT require search/filter/pagination controls in this slice

### Requirement: Product creation flow

The route `/admin/tienda/nuevo` MUST allow authorized administrators to create a product using existing categories only.

Create input MUST include:

- required: `name`, `slug`, `summary`, `price`, `stockQuantity`, `status`, `categoryId`
- optional: `description`, `imageUrl`, `sku`, `featured`

Price persistence MUST use integer minor units and MUST NOT use persisted floating-point values.

#### Scenario: Create product with existing category succeeds

- **Given** an authorized administrator in admin view
- **And** at least one category exists
- **When** the user submits a valid create form with an existing category id
- **Then** a new product MUST be persisted
- **And** the product price MUST be stored as integer minor units
- **And** the product slug MUST be saved as its permanent slug

#### Scenario: Create product with missing category is rejected

- **Given** an authorized administrator in admin view
- **When** the user submits create form data without category or with a non-existing category
- **Then** creation MUST be rejected
- **And** no product MUST be persisted

### Requirement: Product edit flow and slug immutability

The route `/admin/tienda/[id]` MUST allow authorized administrators to edit mutable product fields but MUST NOT allow slug mutation after creation.

On edit, slug MUST be immutable (read-only display or omitted from editable payload).

#### Scenario: Edit mutable fields succeeds

- **Given** an authorized administrator in admin view
- **And** an existing product
- **When** the user updates mutable fields such as summary, description, imageUrl, price, stockQuantity, status, category, sku, or featured
- **Then** the product MUST be updated
- **And** the existing slug MUST remain unchanged

#### Scenario: Attempted slug edit is rejected

- **Given** an authorized administrator in admin view
- **And** an existing product with slug `producto-a`
- **When** an edit mutation includes slug change intent
- **Then** the mutation MUST reject slug change
- **And** persisted slug MUST remain `producto-a`

### Requirement: Status transitions

The system MUST support status transitions among `draft`, `active`, and `archived` for admin-managed products.

Status transitions MUST be validated by server-side rules.

#### Scenario: Draft to active transition

- **Given** an authorized administrator in admin view
- **And** a product in `draft`
- **When** the user changes status to `active`
- **Then** the product status MUST update to `active` if validation passes

#### Scenario: Archive and unarchive transitions

- **Given** an authorized administrator in admin view
- **And** a product in `active` or `draft`
- **When** the user sets status to `archived`
- **Then** the product MUST become `archived`
- **When** the user later sets a valid non-archived status
- **Then** the product MUST transition according to validation rules

### Requirement: Field validation rules

Server-side validation MUST enforce at least:

- required field presence for create;
- valid existing category assignment;
- valid status value in `draft|active|archived`;
- `price` stored as integer minor units and non-negative;
- `stockQuantity` integer and non-negative;
- slug format/uniqueness checks on create;
- immutable slug rule on edit.

#### Scenario: Negative stock is rejected

- **Given** an authorized administrator in admin view
- **When** the user submits stockQuantity less than zero
- **Then** mutation MUST be rejected
- **And** product data MUST NOT be updated

#### Scenario: Invalid status value is rejected

- **Given** an authorized administrator in admin view
- **When** the user submits a status outside `draft|active|archived`
- **Then** mutation MUST be rejected

### Requirement: Public visibility contract remains unchanged

Public catalog behavior from `store-catalog-foundation` MUST remain intact:

- only `active` products are visible publicly;
- `draft` and `archived` are hidden from public catalog and detail.

#### Scenario: Admin updates draft product

- **Given** a product is in `draft`
- **When** admin updates non-status fields
- **Then** product MUST remain hidden from public catalog/detail

#### Scenario: Admin activates product

- **Given** a product transitions to `active`
- **When** public catalog is revalidated
- **Then** product MAY appear on `/tienda` and its public detail route

### Requirement: Revalidation after writes

Successful create/edit/status actions MUST trigger revalidation for:

- `/admin/tienda`;
- `/tienda`;
- concrete public detail path `/tienda/<slug>` for affected product.

#### Scenario: Revalidation on create

- **Given** an authorized create action succeeds
- **When** write completes
- **Then** `/admin/tienda` and `/tienda` MUST be revalidated
- **And** `/tienda/<slug>` MUST be revalidated for the created product slug

#### Scenario: Revalidation on edit/status change

- **Given** an authorized edit or status action succeeds
- **When** write completes
- **Then** `/admin/tienda`, `/tienda`, and `/tienda/<slug>` for that product MUST be revalidated

### Requirement: Admin navigation visibility

Admin navigation entry to `/admin/tienda` MUST be visible only for real administrators in admin view mode.

#### Scenario: Client user does not see admin store nav

- **Given** a signed-in user with role `cliente`
- **When** navigation is rendered
- **Then** `/admin/tienda` entry MUST NOT be shown

#### Scenario: Admin in client view does not see admin store nav

- **Given** a signed-in user with role `administrador`
- **And** session view mode is `cliente`
- **When** navigation is rendered
- **Then** `/admin/tienda` entry MUST NOT be shown

### Requirement: Tests and strict TDD evidence

Implementation and verification MUST follow strict TDD protocol: RED, GREEN, TRIANGULATE, REFACTOR.

Coverage MUST include route access, action authorization, create/edit/status behaviors, slug immutability, category rule, validation failures, and revalidation intent.

#### Scenario: RED evidence exists before implementation

- **Given** apply phase starts
- **When** tests/validators are added for admin products
- **Then** phase report MUST include failing RED evidence before production code changes complete

#### Scenario: Verification commands are recorded

- **Given** implementation is complete
- **When** verify runs
- **Then** verification SHOULD include targeted admin-store validators/tests
- **And** SHOULD include `pnpm lint`, `pnpm test`, and `pnpm build`
- **And** `pnpm test:e2e` SHOULD run where relevant or be explicitly deferred with rationale

## Non-goals

The following are explicitly out of scope for `store-admin-products` and MUST NOT be implemented in this change:

- cart, checkout, orders, payments, shipping/tax/invoices;
- category CRUD or category hierarchy redesign;
- image upload pipeline;
- discounts, variants, bundles;
- broad dashboard redesign;
- slug editing after creation;
- advanced search/filter/pagination in admin list.
