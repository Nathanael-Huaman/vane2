# Delta for Store Admin Orders View

## ADDED Requirements

### Requirement: Admin order list uses bounded offset pagination

The system MUST paginate `/admin/tienda/pedidos` with server-controlled, 1-based offset pagination and a fixed page size.

The system MUST sanitize `page` from route/search params so missing, zero, negative, fractional, or non-numeric values resolve to page `1`. The system MUST keep deterministic ordering as `createdAt` descending then `id` ascending and MUST apply approved status/search filters before pagination.

Pagination links and status-mutation return navigation MUST preserve `status`, `q`, and current `page`, except when a new filter submission intentionally resets to page `1`.

#### Scenario: Admin opens a filtered page beyond page one

- GIVEN an authorized admin in `administrador` view
- AND persisted orders match mixed `status` and customer search values
- WHEN the admin requests `/admin/tienda/pedidos?page=2&status=pending&q=ana`
- THEN the response MUST contain at most one fixed page of summaries for that filtered set
- AND summaries MUST remain ordered by `createdAt desc` then `id asc`

#### Scenario: Invalid page input is sanitized safely

- GIVEN an authorized admin in `administrador` view
- WHEN the admin requests `/admin/tienda/pedidos?page=-3` or `/admin/tienda/pedidos?page=abc`
- THEN the system MUST treat the request as page `1`
- AND the response MUST preserve existing filter/search safety behavior

#### Scenario: Status mutation returns to the same filtered page context

- GIVEN an authorized admin is viewing `/admin/tienda/pedidos?page=3&status=confirmed&q=luis`
- WHEN the admin updates an order status from the list
- THEN return navigation MUST keep `page=3`, `status=confirmed`, and `q=luis`
- AND any resulting list render MUST still enforce bounded pagination and deterministic ordering
