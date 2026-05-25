## Exploration: add-loading-streaming-ux

### Current State
The codebase uses Next.js App Router with multiple async `page.js` routes that await params, cookies, session, and database queries before rendering, but there are currently no `loading.js` route-segment files in `app/`.

This means there is no explicit App Router streaming fallback UI for these server routes. Client-side pending states exist for some actions/forms, but not route-level loading for server page fetches.

Relevant Next.js 16 docs were reviewed locally:
- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`

Key doc implications: `loading.js` gives immediate fallback and automatic Suspense wrapping per segment; `unstable_instant` can validate instant shell structure, but docs state it requires `cacheComponents` support.

### Affected Areas
- `app/tienda/page.js` — async catalog fetch via `getPublicCatalogProducts()`.
- `app/tienda/[slug]/page.js` — async params + product lookup + `notFound` path.
- `app/carrito/page.js` — async cookies/session/cart summary read.
- `app/checkout/page.js` — async cart context + checkout summary load.
- `app/pedido/confirmacion/[token]/page.js` — async token lookup for order confirmation.
- `app/perfil/pedidos/page.js` — async auth context + paginated order query.
- `app/perfil/pedidos/[id]/page.js` — async auth context + owned-order detail query.
- `app/admin/tienda/pedidos/page.js` — async admin auth + filters + paginated queries.
- `app/admin/tienda/pedidos/[id]/page.js` — async admin auth + order detail query.
- `components/ui/skeleton.jsx` — existing UI primitive suitable for lightweight fallback composition.

### Approaches
1. **Root-only loading fallback** — add a single `app/loading.js`.
   - Pros: Smallest footprint; immediate fallback for all routes under root layout.
   - Cons: Generic UX; less contextual skeletons; less control for high-value flows.
   - Effort: Low

2. **Segment-targeted loading fallbacks** — add focused `loading.js` files to store + account/admin order segments.
   - Pros: Better perceived UX with contextual skeletons; aligns to audit scope; limits blast radius.
   - Cons: More files to maintain; requires consistency across segments.
   - Effort: Medium

3. **Segment loading + instant-navigation validation hardening** — add `loading.js` and evaluate `unstable_instant` for critical routes.
   - Pros: Stronger long-term guard; catches navigation-shell regressions earlier.
   - Cons: Depends on project readiness for instant validation/caching structure; higher complexity.
   - Effort: Medium/High

### Recommendation
Use approach 2 for this change: implement route-segment `loading.js` in high-impact async flows first (`/tienda`, `/tienda/[slug]`, `/carrito`, `/checkout`, `/perfil/pedidos`, `/admin/tienda/pedidos`). Keep fallbacks lightweight and semantically close to existing card/list layouts. Defer `unstable_instant` to a follow-up hardening slice unless config/docs validation confirms immediate compatibility.

### Risks
- Overly heavy skeletons can reduce performance and feel janky.
- Fallback copy/structure may conflict with existing E2E selectors if tests assume immediate final content.
- If later adding `unstable_instant`, route/data boundaries may require refactor.

### Ready for Proposal
Yes — proceed with a proposal scoped strictly to loading/streaming UX for async route segments, excluding coverage, E2E-in-CI, duplicate cleanup, pagination, and CAPTCHA.
