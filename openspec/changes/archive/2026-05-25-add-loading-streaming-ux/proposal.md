# Proposal: Add Loading Streaming UX

## Intent

Add route-level loading and streaming affordances for async App Router segments so shoppers and admins get immediate, stable feedback while server-rendered order/cart/store pages resolve.

## Scope

### In Scope
- Add `loading.js` boundaries for selected async route segments.
- Use existing UI primitives/skeletons for stable, accessible placeholders.
- Preserve existing authorization, checkout, cart, order, and catalog behavior.
- Document focused test plan and review-budget risk.

### Out of Scope
- Coverage expansion, E2E-in-CI changes, duplicate artifact cleanup.
- CAPTCHA, order pagination, or unrelated route redesign.
- Data-fetching rewrites, persistence changes, or new business rules.

## Capabilities

### New Capabilities
- `route-loading-streaming-ux`: Route-level loading states and streaming behavior for async App Router store/account/admin segments.

### Modified Capabilities
- None.

## Approach

Introduce colocated `loading.js` files beside async route segments with meaningful skeletons matching page layout. Prefer small shared loading components only if duplication becomes risky. Keep all placeholders presentation-only: no auth bypass, no data mutation, no query behavior changes. Before implementation, consult local Next.js docs if present; if docs remain absent, record that blocker/evidence in design/apply.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/checkout/loading.js` | New | Checkout page pending state. |
| `app/carrito/loading.js` | New | Cart page pending state. |
| `app/tienda/loading.js`, `app/tienda/[slug]/loading.js` | New | Store list/detail pending states. |
| `app/perfil/pedidos/**/loading.js` | New | Customer order history/detail pending states. |
| `app/admin/tienda/**/loading.js` | New | Admin store/order route pending states. |
| `components/ui/skeleton.jsx` | Modified? | Reuse existing primitive; modify only if an accessibility gap is found. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Skeletons imply wrong data or permissions | Med | Keep placeholders generic; protected pages still rely on server gates. |
| Review diff grows across many routes | Med | Split by route family if forecast exceeds budget. |
| Next.js 16 loading semantics differ | Med | Read local docs before coding; document absence if unavailable. |

## Rollback Plan

Remove the added `loading.js` files and any shared loading-only component changes. Because this is presentation-only, rollback restores previous route rendering without data migration.

## Dependencies

- Existing Next.js App Router route segments and `components/ui/skeleton.jsx`.
- Existing Next.js 16 streaming/loading docs reviewed during exploration.

## Success Criteria

- [ ] Target async route segments show stable loading UI during navigation/render wait.
- [ ] Existing behavior specs for cart, checkout, admin orders/products, and customer order history remain unchanged.
- [ ] Test plan records focused route/component checks plus `pnpm lint`, `pnpm test`, and `pnpm build` expectations.
- [ ] Review-budget risk is assessed before apply.
