# Route Loading Streaming UX Specification

## Purpose

Define route-segment loading and streaming behavior for selected async App Router pages so users receive immediate, stable feedback during server-render waits without changing business logic, permissions, or data results.

## Requirements

### Requirement: Segment-level loading boundaries for selected async routes

The system MUST provide route-segment loading fallbacks for the async route families in scope: `/tienda`, `/tienda/[slug]`, `/carrito`, `/checkout`, `/pedido/confirmacion/[token]`, `/perfil/pedidos`, `/perfil/pedidos/[id]`, `/admin/tienda`, `/admin/tienda/nuevo`, `/admin/tienda/[id]`, `/admin/tienda/pedidos`, and `/admin/tienda/pedidos/[id]`.

Each fallback MUST be implemented as App Router `loading.js` behavior at the corresponding segment (or nearest in-scope parent segment) so navigation can stream a pending UI immediately.

#### Scenario: Immediate fallback for a scoped async segment

- GIVEN a user navigates to `/checkout` and server rendering is still pending
- WHEN the route transition starts
- THEN a segment loading fallback MUST render before final page content
- AND final checkout content MUST replace that fallback when rendering completes

#### Scenario: Nearest scoped fallback for nested dynamic segment

- GIVEN a user navigates to `/perfil/pedidos/[id]` and detail data is pending
- WHEN nested segment rendering has not completed
- THEN the nearest in-scope segment loading fallback MUST render
- AND the fallback MUST be replaced by the final detail page once ready

### Requirement: Stable and accessible loading placeholders

Loading fallbacks MUST provide stable, non-misleading placeholders that approximate final layout structure.

Fallback UI SHOULD use existing skeleton primitives and MUST preserve accessibility semantics, including visible loading context and no broken landmark structure.

#### Scenario: Placeholder structure remains stable

- GIVEN `/tienda` is loading
- WHEN its fallback is shown
- THEN users MUST see a stable catalog-like placeholder structure
- AND layout shift SHOULD be minimized when final content streams in

#### Scenario: Loading state remains accessible

- GIVEN a screen-reader or keyboard user navigates to an in-scope loading route
- WHEN fallback UI is active
- THEN loading context MUST be perceivable through accessible page semantics
- AND fallback content MUST NOT trap focus or block eventual page interaction

### Requirement: Behavioral and authorization invariants during loading

Loading fallbacks MUST be presentation-only and MUST NOT bypass or alter authentication, authorization, ownership, cart, checkout, catalog, or admin business rules.

Fallbacks MUST NOT perform mutations or reveal protected data while final server content is pending.

#### Scenario: Protected admin route remains protected while loading

- GIVEN an unauthenticated or unauthorized request to `/admin/tienda/pedidos`
- WHEN route loading fallback would otherwise appear
- THEN protected admin data MUST remain undisclosed
- AND final route behavior MUST enforce existing access control outcomes

#### Scenario: Loading introduces no business side effects

- GIVEN a user navigates to `/carrito` or `/checkout`
- WHEN fallback UI renders during pending server work
- THEN no cart/order mutation MUST occur from fallback rendering alone
- AND existing cart/checkout outcomes MUST remain unchanged after load completes

### Requirement: Streaming transition completion behavior

When async rendering resolves, the system SHALL replace loading fallbacks with final route content in the same navigation flow.

If route rendering ends in not-found or denied outcomes, the system MUST resolve to those existing outcomes rather than leaving fallback UI indefinitely.

#### Scenario: Successful stream completion replaces fallback

- GIVEN `/tienda/[slug]` data resolves successfully
- WHEN server rendering completes
- THEN the loading fallback SHALL be replaced by final product detail content
- AND no manual refresh action SHALL be required

#### Scenario: Non-success outcome clears fallback correctly

- GIVEN `/tienda/[slug]` resolves to not-found or `/perfil/pedidos/[id]` resolves to access-denied behavior
- WHEN the pending render completes
- THEN the fallback MUST be replaced by the existing error/access outcome
- AND the loading state MUST NOT persist indefinitely
