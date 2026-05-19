# Delta for Store Admin Orders View

## ADDED Requirements

### Requirement: Admin order pages use the established admin gate

The system MUST expose admin order pages only to users whose real role is `administrador` and whose current session view mode is `administrador`.

Visitors, `cliente` users, and administrators in client view mode MUST be denied access to `/admin/tienda/pedidos` and order detail routes. Admin order page authorization MUST be enforced server-side and MUST NOT rely only on hidden navigation links or client UI state.

#### Scenario: Authorized admin opens the orders list

- **Given** a signed-in user has real role `administrador`
- **And** the user session view mode is `administrador`
- **When** the user opens `/admin/tienda/pedidos`
- **Then** the system MUST render the admin orders list
- **And** the list MAY show full customer name and email values for persisted orders

#### Scenario: Admin in client view is denied order pages

- **Given** a signed-in user has real role `administrador`
- **And** the user session view mode is `cliente`
- **When** the user opens `/admin/tienda/pedidos` or `/admin/tienda/pedidos/123`
- **Then** the system MUST deny access
- **And** admin order data MUST NOT be rendered

#### Scenario: Non-admin is denied order pages

- **Given** a visitor or signed-in user with real role `cliente`
- **When** the user opens `/admin/tienda/pedidos` or an order detail route
- **Then** the system MUST deny access
- **And** customer order data MUST NOT be disclosed

### Requirement: Admin orders list and approved filters

The route `/admin/tienda/pedidos` MUST provide an admin orders list backed by persisted order records.

The list MUST show enough information for operational lookup, including order identifier, customer name, customer email, status, total, and available timestamp information. Monetary display MUST be derived from persisted integer minor units and formatted as Peruvian soles (S/.).

The first version MUST support a status filter for `pending` and `confirmed`, plus free-text search over customer name and customer email. Filter behavior MUST be server-side and deterministic. The system MUST reject or ignore unsupported status values without returning unauthorized or misleading results.

#### Scenario: Admin sees persisted order summaries

- **Given** an authorized administrator in admin view
- **And** persisted orders exist with customer contact, status, totals, and timestamps
- **When** the administrator opens `/admin/tienda/pedidos`
- **Then** the page MUST render persisted order summaries
- **And** each summary MUST include customer name, customer email, status, total formatted as S/., and an identifier usable for detail navigation

#### Scenario: Status filter narrows results

- **Given** an authorized administrator in admin view
- **And** orders exist with statuses `pending` and `confirmed`
- **When** the administrator filters the list by `pending`
- **Then** the list MUST include pending orders
- **And** the list MUST exclude confirmed orders

#### Scenario: Customer search matches name or email

- **Given** an authorized administrator in admin view
- **And** orders exist for customers with different names and email addresses
- **When** the administrator searches with text matching a customer name or customer email
- **Then** the list MUST include matching orders
- **And** non-matching orders SHOULD be excluded from the filtered result

#### Scenario: Unsupported status filter is safe

- **Given** an authorized administrator in admin view
- **When** the administrator requests the list with an unsupported status filter value
- **Then** the system MUST NOT treat the value as a new order status
- **And** the system MUST either reject the filter or return a safe unambiguous result without mutating orders

### Requirement: Admin order detail by internal id

The system MUST provide an admin order detail route using the order internal id, for example `/admin/tienda/pedidos/123`.

The detail view MUST require the established admin gate and MUST render useful persisted order data, including customer name, customer email, status, subtotal, total, and order item snapshots. Detail rendering MUST use saved order and order item fields, not current cart lines or mutable catalog values.

#### Scenario: Authorized admin opens order detail

- **Given** an authorized administrator in admin view
- **And** order `123` exists
- **When** the administrator opens `/admin/tienda/pedidos/123`
- **Then** the detail page MUST render order `123`
- **And** the page MUST show full customer name and email, status, subtotal, total, and item snapshots

#### Scenario: Missing order detail is not disclosed as data

- **Given** an authorized administrator in admin view
- **And** no order exists for id `999999`
- **When** the administrator opens `/admin/tienda/pedidos/999999`
- **Then** the system MUST render a not-found or equivalent safe outcome
- **And** no unrelated order data MUST be shown

#### Scenario: Detail survives catalog changes

- **Given** an order item snapshot was saved with product name, slug, unit price minor units, quantity, and line total minor units
- **And** the corresponding product is later renamed, repriced, archived, or hidden from public catalog visibility
- **When** an authorized administrator opens the order detail
- **Then** the detail MUST render the saved order item snapshot values
- **And** the detail MUST NOT depend on current product name, slug, price, status, or cart data to render historical order contents

### Requirement: Private order credential material is never exposed in admin UI

Admin order pages and status actions MUST NOT expose `confirmationTokenHash`, raw confirmation tokens, customer confirmation URLs, or cart tokens as order credentials.

Admin access MUST be based on the admin gate, not possession of a customer confirmation token or anonymous cart token. The existing public confirmation-token behavior MUST remain unchanged.

#### Scenario: List and detail omit private token material

- **Given** an authorized administrator in admin view
- **When** the administrator opens the orders list or an order detail page
- **Then** the rendered admin UI MUST NOT include `confirmationTokenHash`
- **And** the rendered admin UI MUST NOT include raw confirmation tokens or cart-token values

#### Scenario: Admin access does not use customer tokens

- **Given** an order has a private confirmation token for customer confirmation
- **When** an administrator accesses the order through `/admin/tienda/pedidos` or `/admin/tienda/pedidos/<id>`
- **Then** authorization MUST be decided by the admin gate
- **And** the customer confirmation token MUST NOT be required or accepted as an admin credential

### Requirement: Admin status changes from list and detail

The system MUST allow authorized administrators in admin view to change an order status between the existing values `pending` and `confirmed` from both the orders list and order detail contexts.

Status mutation MUST be protected server-side by the established admin gate. The system MUST reject visitors, `cliente` users, administrators in client view mode, invalid order ids, and unsupported status values without changing persisted order data. This change MUST NOT introduce additional statuses or payment, fulfillment, shipping, invoice, email, refund, or delivery state.

#### Scenario: Authorized admin changes status from list

- **Given** an authorized administrator in admin view
- **And** order `123` exists with status `pending`
- **When** the administrator changes order `123` to `confirmed` from the orders list
- **Then** order `123` MUST be persisted with status `confirmed`
- **And** the updated list MUST reflect the new status

#### Scenario: Authorized admin changes status from detail

- **Given** an authorized administrator in admin view
- **And** order `123` exists with status `confirmed`
- **When** the administrator changes order `123` to `pending` from the order detail page
- **Then** order `123` MUST be persisted with status `pending`
- **And** the detail view MUST reflect the new status

#### Scenario: Unauthorized status mutation is rejected

- **Given** a visitor, `cliente` user, or administrator in client view mode
- **When** the user submits an order status change for any order
- **Then** the mutation MUST be rejected
- **And** no order status MUST be changed

#### Scenario: Invalid status mutation is rejected

- **Given** an authorized administrator in admin view
- **And** order `123` exists
- **When** the administrator submits a status value outside `pending|confirmed`
- **Then** the mutation MUST be rejected
- **And** the system MUST NOT create or persist any new order status
- **And** order `123` MUST retain its previous status

#### Scenario: Invalid order id mutation is rejected

- **Given** an authorized administrator in admin view
- **When** the administrator submits a status change for a missing or invalid order id
- **Then** the mutation MUST be rejected
- **And** no existing order MUST be changed

### Requirement: Existing checkout, cart, catalog, and admin product behavior is preserved

The admin orders view MUST preserve existing checkout/order, cart, public catalog, and admin product behavior unless explicitly changed by this spec.

Customer checkout MUST remain available without requiring account authentication. Public order confirmation MUST continue to require the private confirmation credential. Public catalog visibility MUST remain active-only. Admin product pages and product mutation actions MUST continue to use their established authorization and validation contracts.

#### Scenario: Public checkout remains guest-capable

- **Given** a shopper has a valid cart and provides valid `customerName` and `customerEmail`
- **When** the admin orders view has been implemented
- **Then** checkout MUST still be able to create an order without requiring account registration or login

#### Scenario: Public confirmation still uses private token

- **Given** an order exists with a private confirmation token
- **When** a shopper opens the public confirmation route
- **Then** existing private-token confirmation behavior MUST remain intact
- **And** admin order changes MUST NOT make the anonymous cart token an order credential

#### Scenario: Admin product gate remains intact

- **Given** a visitor, client user, or administrator in client view mode attempts to access admin product management
- **When** admin orders view has been implemented
- **Then** existing admin product access restrictions MUST still deny unauthorized access
- **And** product mutation actions MUST remain protected by the existing admin gate

#### Scenario: Public catalog visibility remains active-only

- **Given** products exist in `active`, `draft`, and `archived` states
- **When** a shopper opens public store catalog or product detail routes
- **Then** public visibility MUST continue to show only active products according to the existing catalog contract

### Requirement: Scope and reviewability guardrails

The implementation MUST stay within admin order viewing, approved filters, order detail, and existing-status mutation. The system MUST NOT add new statuses, payment workflows, fulfillment, shipping, invoices, email, customer order history, exports, bulk actions, analytics dashboards, staff assignment, or editing of order content in this change.

If design or apply forecasts the implementation above the configured 400 changed-line review budget, the work SHOULD be split into reviewable slices: list and filters, detail and snapshot rendering, then status mutation.

#### Scenario: Out-of-scope order content editing is not added

- **Given** an authorized administrator is using admin order pages
- **When** the administrator views or changes order status
- **Then** the system MUST NOT provide controls to edit order item snapshots, customer contact, prices, quantities, totals, stock, or catalog products from the order admin screen

#### Scenario: Review budget forecast triggers slicing

- **Given** design or apply estimates the full admin orders change will exceed 400 changed lines
- **When** delivery planning is recorded
- **Then** the change SHOULD be split into focused slices for list/filtering, detail rendering, and status mutation
- **And** each slice SHOULD preserve tests with the behavior it verifies

### Requirement: Strict TDD evidence expectations

Implementation and verification MUST follow strict TDD protocol: RED, GREEN, TRIANGULATE, REFACTOR.

Admin order work MUST include failing test or validator evidence before production implementation, then passing evidence after implementation. Verification MUST include `pnpm test` or a documented blocker. Targeted evidence SHOULD cover admin authorization, list filters, detail snapshot rendering, token non-exposure, status mutation from list and detail, invalid/unauthorized mutations, and preserved checkout/cart/catalog/admin-product regressions.

Before implementing Next.js pages, route params/search params, Server Actions, redirects, or revalidation, implementers MUST consult local Next.js 16 docs under `node_modules/next/dist/docs`. RED tests that import new TypeScript or JavaScript modules MUST use minimal stubs first so failures are behavioral rather than module-resolution failures.

#### Scenario: RED evidence precedes production changes

- **Given** apply phase starts for this change
- **When** admin order tests or validators are introduced
- **Then** phase reporting MUST record failing RED evidence before the corresponding production behavior is completed

#### Scenario: GREEN evidence verifies admin order behavior

- **Given** implementation is complete
- **When** verification runs
- **Then** `pnpm test` MUST be run or a blocker MUST be documented
- **And** passing evidence SHOULD include targeted checks for authorization, filters, detail snapshots, token non-exposure, and status mutation from both list and detail

#### Scenario: Regression evidence is recorded

- **Given** admin order implementation changes shared auth, route, action, order, product, cart, or persistence code
- **When** verification completes
- **Then** phase reporting SHOULD include evidence that checkout, public confirmation, cart foundation, public catalog, and admin product behavior remain intact

## Non-goals

The following are explicitly out of scope for `store-admin-orders-view` and MUST NOT be implemented in this change:

- new order statuses beyond `pending` and `confirmed`;
- payment providers, payment review, refunds, payment status, cash/card workflows, or payment intents;
- fulfillment, shipping, delivery tracking, invoices, tax documents, email, notifications, or customer messaging;
- customer-facing order history or account order pages;
- requiring authentication for customer checkout;
- exposing or reusing customer confirmation tokens, confirmation token hashes, or anonymous cart tokens as admin credentials;
- bulk actions, export, printing, analytics dashboards, or staff assignment;
- editing order item snapshots, customer contact, prices, quantities, totals, stock, or catalog products from the order admin screen;
- date filters, pagination, or advanced search unless a later design decision explicitly keeps them within review budget.
