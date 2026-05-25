# Store Customer Order History Specification

## Purpose

Define authenticated, read-only customer order history so users can review their own persisted orders without weakening private confirmation-token access for guest orders.

## Requirements

### Requirement: Protected account routes and navigation

The system MUST expose `/perfil/pedidos` and `/perfil/pedidos/[id]` as authenticated account routes.

The account experience SHOULD provide a “Mis pedidos” navigation affordance that routes authenticated users to `/perfil/pedidos`.

#### Scenario: Signed-in customer reaches order history

- GIVEN an authenticated customer with an active session
- WHEN the customer selects “Mis pedidos” from account navigation
- THEN the customer SHALL be routed to `/perfil/pedidos`
- AND the route SHALL render an order-history view for that customer

#### Scenario: Unauthenticated access is denied

- GIVEN a request without an authenticated session
- WHEN `/perfil/pedidos` or `/perfil/pedidos/[id]` is requested
- THEN the system MUST deny access to customer history content
- AND no order data SHALL be rendered

### Requirement: Customer-owned order list behavior

The system MUST return only orders owned by the authenticated user (`Order.userId = currentUserId`) on `/perfil/pedidos`.

The list MUST be ordered by newest first and MUST show summary data using saved order records and S/. monetary formatting.

#### Scenario: List shows only owned orders in descending recency

- GIVEN authenticated user A has multiple orders and user B also has orders
- WHEN user A opens `/perfil/pedidos`
- THEN the response MUST include only user A orders
- AND results MUST be ordered from most recent to oldest

#### Scenario: No owned orders yields empty state

- GIVEN an authenticated user with zero owned orders
- WHEN the user opens `/perfil/pedidos`
- THEN the system MUST render an empty-history state
- AND the response MUST NOT include orders from other users or guest orders

### Requirement: Customer-owned order detail and credential boundaries

The system MUST allow `/perfil/pedidos/[id]` detail access only when the target order is owned by the authenticated user.

Order detail MUST render persisted order and order-item snapshot values (contact, totals, items, status) and MUST use S/. formatting for monetary fields.

Customer history and detail routes MUST NOT expose `confirmationTokenHash`, raw confirmation tokens, or accept cart/confirmation tokens as account-history credentials.

#### Scenario: Owned order detail renders snapshots

- GIVEN authenticated user A owns order `O1`
- WHEN user A opens `/perfil/pedidos/O1`
- THEN the page MUST render order `O1` snapshot-based detail
- AND the response MUST NOT include any confirmation-token material

#### Scenario: Non-owner or token-based access is rejected

- GIVEN authenticated user A does not own order `O2` or provides token-style credentials
- WHEN `/perfil/pedidos/O2` is requested
- THEN the system MUST return not-found or access-denied behavior
- AND order detail data MUST NOT be disclosed

### Requirement: Customer order history uses bounded owned pagination

The system MUST paginate `/perfil/pedidos` with server-controlled, 1-based offset pagination and a fixed page size.

The system MUST sanitize `page` so missing, zero, negative, fractional, or non-numeric values resolve to page `1`. The system MUST keep ordering as `createdAt` descending then `id` ascending.

Each page response MUST contain only orders owned by the authenticated user and MUST NOT disclose orders owned by other users or guest orders (`userId = null`).

#### Scenario: Owned orders paginate with deterministic ordering

- GIVEN authenticated user A has more than one page of owned orders
- AND user B and guest checkout orders also exist
- WHEN user A requests `/perfil/pedidos?page=1`
- THEN the response MUST include only user A orders up to the fixed page size
- AND results MUST be ordered by `createdAt desc` then `id asc`

#### Scenario: Invalid page input falls back to page one

- GIVEN an authenticated user with owned orders
- WHEN `/perfil/pedidos?page=0` or `/perfil/pedidos?page=foo` is requested
- THEN the system MUST resolve the request to page `1`
- AND ownership filtering MUST remain enforced

#### Scenario: Out-of-range page does not leak cross-user data

- GIVEN an authenticated user has fewer orders than requested page offset
- WHEN the user requests an out-of-range page
- THEN the response MUST return an empty history page or equivalent safe empty state
- AND the response MUST NOT include orders from other users or guest orders
