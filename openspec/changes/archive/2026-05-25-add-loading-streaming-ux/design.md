# Design: Add Loading Streaming UX

## Technical Approach

Add colocated App Router `loading.js` fallbacks for async store, cart, checkout, order, and admin store segments. Reuse `components/ui/skeleton.jsx` through small server-compatible helper components in `components/store/route-loading-skeletons.jsx`. Each fallback mirrors the final page's outer container, card/list/form shape, but contains no links, forms, server actions, auth/session/cookie reads, Prisma calls, or data-derived text. No spec artifact was present at design time; this design derives from the proposal and exploration.

Next.js 16.2.6 docs reviewed: `loading.js` is a Server Component by default, wraps same-segment `page.js` in Suspense, leaves shared layouts interactive, and does not wrap `layout.js`. `unstable_instant` requires `cacheComponents`; `next.config.mjs` does not enable it, so instant validation is out of this slice.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| One root `app/loading.js` | Small diff, weak context for checkout/admin/order flows | Reject; use segment fallbacks. |
| Inline skeleton JSX in every route | Simple, but duplicates card/list/form structures across 12 files | Use small shared helpers plus thin route files. |
| Add `unstable_instant` | Stronger validation, but requires Cache Components and route/data refactors | Defer; this change is only `loading.js` UX. |

## Data Flow

User navigation -> shared `app/layout.js`/Navbar remain mounted -> nearest segment `loading.js` renders static fallback -> async `page.js` resolves params/searchParams/cookies/session/store queries -> final page replaces fallback, including existing access, empty, or `notFound()` states.

Loading components never read Prisma/session/cart/order data:

    loading.js -> shared skeleton helpers -> Skeleton/Card only
    page.js    -> auth/cookies/Prisma/actions -> real UI

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `components/store/route-loading-skeletons.jsx` | Create | Shared Server Component helpers for page headers, catalog cards, form shells, order lists, and detail cards using `Skeleton`/`Card`. |
| `app/tienda/loading.js` | Create | Catalog grid fallback matching `/tienda`. |
| `app/tienda/[slug]/loading.js` | Create | Product detail fallback matching image, metadata, price, and add-to-cart area. |
| `app/carrito/loading.js` | Create | Cart item list plus summary fallback. |
| `app/checkout/loading.js` | Create | Checkout contact form plus summary fallback. |
| `app/pedido/confirmacion/[token]/loading.js` | Create | Order confirmation summary/detail fallback. |
| `app/perfil/pedidos/loading.js` | Create | Customer order list fallback. |
| `app/perfil/pedidos/[id]/loading.js` | Create | Customer order detail fallback. |
| `app/admin/tienda/loading.js` | Create | Admin product inventory fallback. |
| `app/admin/tienda/nuevo/loading.js` | Create | New product form fallback. |
| `app/admin/tienda/[id]/loading.js` | Create | Edit product form fallback. |
| `app/admin/tienda/pedidos/loading.js` | Create | Admin order filters/list fallback. |
| `app/admin/tienda/pedidos/[id]/loading.js` | Create | Admin order detail/status-card fallback. |
| `scripts/validate-route-loading-streaming-ux.mjs` | Create | Static validation for required loading files and forbidden data/action imports. |
| `package.json` | Modify | Add validation script and include it in `test:validation`. |

## Interfaces / Contracts

- Every `loading.js` exports `default function Loading()` and accepts no params.
- Shared helpers are presentation-only Server Components; no `"use client"`, `next/headers`, `next/navigation`, `@/lib/server`, or `@/lib/actions` imports.
- Fallback roots should expose a non-blocking loading announcement (`role="status"`, `aria-busy="true"`, concise label); decorative skeleton blocks should be `aria-hidden="true"` via props, not by modifying `Skeleton`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Static validation | Required `loading.js` files exist, use shared skeleton helpers, and avoid data/action imports | Add `scripts/validate-route-loading-streaming-ux.mjs`; include in `pnpm test`. |
| Build/integration | Next file conventions and Server Component boundaries compile | Run `pnpm lint`, `pnpm test`, `pnpm build`. |
| E2E/manual | Visual smoke for key navigations only | Optional local Playwright/manual check; no E2E-in-CI change. |

## Migration / Rollout

No data migration required. Rollback removes the new `loading.js` files, shared helper, validation script, and package script entry.

## Open Questions

None.

## Post-Archive Review-Burden Refactor

Pre-PR review found the original single helper file grew to 524 lines, exceeding the 400-line review guard for the intended PR slice. The runtime design remains the same, but helper organization is superseded by smaller route-family modules:

- `components/store/route-loading-primitives.jsx` — shared loading shell, skeleton block, shared arrays, and cross-family primitives.
- `components/store/route-loading-store-skeletons.jsx` — store, cart, and checkout route helpers.
- `components/store/route-loading-order-skeletons.jsx` — order confirmation and customer order route helpers.
- `components/store/route-loading-admin-skeletons.jsx` — admin product and admin order route helpers.

The legacy `components/store/route-loading-skeletons.jsx` monolith was removed; all `loading.js` files import from their route-family helper module.
