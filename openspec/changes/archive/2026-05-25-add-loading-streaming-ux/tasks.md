# Tasks: Add Loading Streaming UX

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 shared helpers + store/cart/checkout; PR 2 account/admin route fallbacks; PR 3 specs/archive evidence |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Shared loading helpers plus store/cart/checkout fallbacks | PR 1 | Base `dev`; includes validator foundation and focused checks. |
| 2 | Account/admin order/product fallbacks | PR 2 | Base PR 1 branch; extends validator coverage. |
| 3 | OpenSpec source/archive evidence | PR 3 | Base PR 2 branch; docs-only if implementation verifies. |

## Phase 1: Foundation and Store Fallbacks

- [x] 1.1 Re-check Next.js loading/streaming docs and record doc paths in apply-progress.
- [x] 1.2 Create `components/store/route-loading-skeletons.jsx` with server-only, accessible skeleton helpers and no data/action imports.
- [x] 1.3 Add `app/tienda/loading.js` and `app/tienda/[slug]/loading.js` using catalog/product skeleton helpers.
- [x] 1.4 Add `app/carrito/loading.js` and `app/checkout/loading.js` using cart/checkout skeleton helpers.
- [x] 1.5 Create `scripts/validate-route-loading-streaming-ux.mjs` checking Unit 1 files exist and forbid data/action imports.

## Phase 2: Account/Admin Fallbacks

- [x] 2.1 Add `app/pedido/confirmacion/[token]/loading.js` order-confirmation fallback.
- [x] 2.2 Add `app/perfil/pedidos/loading.js` and `app/perfil/pedidos/[id]/loading.js` customer order fallbacks.
- [x] 2.3 Add `app/admin/tienda/loading.js`, `app/admin/tienda/nuevo/loading.js`, and `app/admin/tienda/[id]/loading.js` admin product fallbacks.
- [x] 2.4 Add `app/admin/tienda/pedidos/loading.js` and `app/admin/tienda/pedidos/[id]/loading.js` admin order fallbacks.
- [x] 2.5 Extend validator required-file list to all in-scope route fallbacks.

## Phase 3: Validation and Specs

- [x] 3.1 Add package script for route loading validation and include it in validation/test flow only if consistent with existing scripts.
- [x] 3.2 Run route-loading validator, `pnpm lint`, focused relevant tests, `pnpm test`, and `pnpm build`.
- [x] 3.3 Update tasks/apply-progress with Strict TDD/static-validation evidence and any design deviations.
- [x] 3.4 After verify passes, archive the SDD change and sync `route-loading-streaming-ux` into main OpenSpec specs.

## Phase 4: Pre-PR Review-Burden Refactor

- [x] 4.1 Update the route-loading validator first so the old single-helper/import shape fails static validation.
- [x] 4.2 Split the 524-line `components/store/route-loading-skeletons.jsx` helper into reviewable route-family modules: primitives, store/cart/checkout, order/customer, and admin.
- [x] 4.3 Update all in-scope `loading.js` files to import from the correct route-family helper module and remove the legacy monolith.
- [x] 4.4 Re-run `pnpm validate:route-loading-streaming-ux`, `pnpm lint`, `pnpm test`, and `pnpm build` after the refactor.
