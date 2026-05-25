# Delta for Store Customer Order History

## ADDED Requirements

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
