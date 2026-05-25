# Apply Progress: Add Loading Streaming UX

**Change**: `add-loading-streaming-ux`  
**Mode**: Strict TDD  
**Artifact store**: hybrid — OpenSpec + Engram  
**Work unit**: Units 1-3 plus Phase 4 pre-PR review-burden helper split  
**Delivery**: chained/stacked PR preparation; helper organization split by route family before PR creation  
**Status**: 18/18 tasks complete; Phases 1-4 complete; archive recorded and helper split verified.

## Completed Tasks

- [x] 1.1 Re-check Next.js loading/streaming docs and record doc paths in apply-progress.
- [x] 1.2 Create `components/store/route-loading-skeletons.jsx` with server-only, accessible skeleton helpers and no data/action imports.
- [x] 1.3 Add `app/tienda/loading.js` and `app/tienda/[slug]/loading.js` using catalog/product skeleton helpers.
- [x] 1.4 Add `app/carrito/loading.js` and `app/checkout/loading.js` using cart/checkout skeleton helpers.
- [x] 1.5 Create `scripts/validate-route-loading-streaming-ux.mjs` checking Unit 1 files exist and forbid data/action imports.
- [x] 2.1 Add `app/pedido/confirmacion/[token]/loading.js` order-confirmation fallback.
- [x] 2.2 Add `app/perfil/pedidos/loading.js` and `app/perfil/pedidos/[id]/loading.js` customer order fallbacks.
- [x] 2.3 Add `app/admin/tienda/loading.js`, `app/admin/tienda/nuevo/loading.js`, and `app/admin/tienda/[id]/loading.js` admin product fallbacks.
- [x] 2.4 Add `app/admin/tienda/pedidos/loading.js` and `app/admin/tienda/pedidos/[id]/loading.js` admin order fallbacks.
- [x] 2.5 Extend validator required-file list to all in-scope route fallbacks.
- [x] 3.1 Add package script for route loading validation and include it in validation/test flow only if consistent with existing scripts.
- [x] 3.2 Run route-loading validator, `pnpm lint`, focused relevant tests, `pnpm test`, and `pnpm build`.
- [x] 3.3 Update tasks/apply-progress with Strict TDD/static-validation evidence and any design deviations.
- [x] 3.4 Archive the SDD change and sync `route-loading-streaming-ux` into main OpenSpec specs.
- [x] 4.1 Update the route-loading validator first so the old single-helper/import shape fails static validation.
- [x] 4.2 Split the 524-line `components/store/route-loading-skeletons.jsx` helper into reviewable route-family modules: primitives, store/cart/checkout, order/customer, and admin.
- [x] 4.3 Update all in-scope `loading.js` files to import from the correct route-family helper module and remove the legacy monolith.
- [x] 4.4 Re-run `pnpm validate:route-loading-streaming-ux`, `pnpm lint`, `pnpm test`, and `pnpm build` after the refactor.

## Next.js Docs Re-checked

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
  - `loading.js` adds page-level streaming by wrapping same-segment `page.js` in a Suspense boundary.
  - Layouts render immediately as part of the static shell; page content replaces fallback once complete.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
  - `loading.js` is a Server Component by default, accepts no parameters, keeps shared layouts interactive, and does not wrap same-segment `layout.js`/`template.js`/`error.js`.
  - If a layout reads uncached runtime data, that layout can still block before `loading.js` appears.
- `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`
  - `unstable_instant` validates instant navigation shells, but it is tied to Cache Components structure.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md`
  - `unstable_instant` only works when `cacheComponents` is enabled; `next.config.mjs` does not enable it, so this slice only adds `loading.js` fallbacks.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `components/store/route-loading-skeletons.jsx` | Created | Added server-compatible catalog, product detail, cart, and checkout skeleton helpers using `Skeleton`/`Card`, accessible loading status, and decorative `aria-hidden` skeleton blocks. |
| `app/tienda/loading.js` | Created | Added parameterless App Router loading fallback using `CatalogLoadingSkeleton`. |
| `app/tienda/[slug]/loading.js` | Created | Added parameterless App Router loading fallback using `ProductDetailLoadingSkeleton`. |
| `app/carrito/loading.js` | Created | Added parameterless App Router loading fallback using `CartLoadingSkeleton`. |
| `app/checkout/loading.js` | Created | Added parameterless App Router loading fallback using `CheckoutLoadingSkeleton`. |
| `scripts/validate-route-loading-streaming-ux.mjs` | Created | Added Unit 1 static validation for required files, server-only boundaries, expected helper usage, accessibility hooks, and forbidden data/action imports. |
| `openspec/changes/add-loading-streaming-ux/tasks.md` | Modified | Marked Phase 1 tasks 1.1-1.5 complete only. |
| `openspec/changes/add-loading-streaming-ux/apply-progress.md` | Created | Persisted cumulative apply progress and Strict TDD/static validation evidence. |
| `app/pedido/confirmacion/[token]/loading.js` | Created | Added order confirmation loading fallback. |
| `app/perfil/pedidos/loading.js` | Created | Added customer order history loading fallback. |
| `app/perfil/pedidos/[id]/loading.js` | Created | Added customer order detail loading fallback. |
| `app/admin/tienda/loading.js` | Created | Added admin product inventory loading fallback. |
| `app/admin/tienda/nuevo/loading.js` | Created | Added admin new-product form loading fallback. |
| `app/admin/tienda/[id]/loading.js` | Created | Added admin edit-product form loading fallback. |
| `app/admin/tienda/pedidos/loading.js` | Created | Added admin order list loading fallback. |
| `app/admin/tienda/pedidos/[id]/loading.js` | Created | Added admin order detail loading fallback. |
| `scripts/validate-route-loading-streaming-ux.mjs` | Modified | Extended required file/helper checks to all 12 in-scope loading files. |
| `scripts/validate-route-loading-streaming-ux.mjs` | Modified | Added package-script and `test:validation` integration checks for Phase 3 wiring. |
| `package.json` | Modified | Added `validate:route-loading-streaming-ux` and included it in `test:validation`, which keeps `pnpm test` coverage consistent with existing validation scripts. |
| `openspec/changes/add-loading-streaming-ux/tasks.md` | Modified | Marked Phase 3 tasks 3.1-3.3 complete only; left archive task 3.4 unchecked. |
| `openspec/changes/add-loading-streaming-ux/apply-progress.md` | Modified | Merged Phase 3 Strict TDD/static-validation evidence with prior Phase 1-2 progress. |

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | Docs + this apply-progress artifact | Static evidence | N/A (docs-only gate) | ✅ Re-read required docs before loading-file implementation | ✅ Doc paths and implications recorded here | ➖ Triangulation skipped: documentation/evidence task with no production branch | ✅ Cross-checked `next.config.mjs` for `cacheComponents` before deferring `unstable_instant` |
| 1.2 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | N/A (new helper) | ✅ Validator failed before helper existed: helper existence/export/accessibility checks red | ✅ `node scripts/validate-route-loading-streaming-ux.mjs` passed 26/26 after helper + route files | ✅ Checks cover server-only boundary, forbidden imports, named helper exports, `role="status"`, `aria-busy`, `aria-live`, and decorative `aria-hidden` skeletons | ✅ `pnpm lint`, `pnpm build`, and `pnpm test` passed after implementation |
| 1.3 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | N/A (new route files) | ✅ Validator failed before `/tienda` loading files existed | ✅ Validator passed after `app/tienda/loading.js` and `app/tienda/[slug]/loading.js` used the expected helpers | ✅ Separate checks cover catalog and product detail route files, parameterless default export, helper import, server-only status, and forbidden imports | ✅ Thin route files kept to helper import + parameterless `Loading` export |
| 1.4 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | N/A (new route files) | ✅ Validator failed before `/carrito` and `/checkout` loading files existed | ✅ Validator passed after cart/checkout route files used the expected helpers | ✅ Separate checks cover cart and checkout route files, parameterless default export, helper import, server-only status, and forbidden imports | ✅ Kept fallback UI presentation-only: no forms, links, cookies, auth, or actions |
| 1.5 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | N/A (new validator) | ✅ Wrote validator expectations first; initial run failed 0/26 because Unit 1 production files were missing | ✅ Final validator run passed 26/26 | ✅ Validator asserts both positive structure and negative forbidden-import constraints across helper plus four route loading files | ✅ Reused existing script-validator style and root-relative file reads |
| 2.1 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | Unit 1 validator passed before extension | ✅ Extended validator expected order-confirmation fallback before file existed | ✅ Validator passed after `app/pedido/confirmacion/[token]/loading.js` used `OrderConfirmationLoadingSkeleton` | ✅ Checks cover parameterless export, helper usage, server-only status, and forbidden imports | ✅ Fallback remains presentation-only with no token/order data reads |
| 2.2 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | Unit 1 validator passed before extension | ✅ Extended validator expected customer order list/detail fallbacks before files existed | ✅ Validator passed after customer order loading files used expected helpers | ✅ Checks cover both list and detail route fallbacks plus no auth/server imports | ✅ Protected data stays in final pages, not loading UI |
| 2.3 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | Unit 1 validator passed before extension | ✅ Extended validator expected admin product loading fallbacks before files existed | ✅ Validator passed after admin product list/new/edit fallbacks used expected helpers | ✅ Checks cover inventory and product form route families | ✅ Reused one admin product form skeleton for new/edit routes |
| 2.4 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | Unit 1 validator passed before extension | ✅ Extended validator expected admin order loading fallbacks before files existed | ✅ Validator passed after admin order list/detail fallbacks used expected helpers | ✅ Checks cover filter/list and status/detail skeleton routes | ✅ Admin skeletons reveal no customer/order data |
| 2.5 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | Unit 1 validator had 26 checks | ✅ Validator extension failed until all Phase 2 files/helpers were present | ✅ `node scripts/validate-route-loading-streaming-ux.mjs` passed 66/66 | ✅ Validator now covers helper exports and all 12 in-scope loading files | ✅ Kept package-script wiring deferred to Phase 3 |
| 3.1 | `scripts/validate-route-loading-streaming-ux.mjs` + `package.json` | Static validation | ✅ Existing route validator safety net passed 66/66 before edits | ✅ Added package wiring checks first; validator failed with 66 passed, 2 failed before `package.json` wiring | ✅ Added `validate:route-loading-streaming-ux` and included it in `test:validation`; validator passed 68/68 | ✅ Separate checks prove direct script exposure and full validation flow inclusion | ✅ Kept integration limited to existing `validate:*`/`test:validation` pattern |
| 3.2 | Command suite | Static/runtime validation | ✅ `pnpm validate:route-loading-streaming-ux` passed 68/68 after wiring | ✅ Required command evidence defined in this apply-progress before final artifact update | ✅ `pnpm lint`, `pnpm test:validation`, `pnpm test`, and `pnpm build` all passed | ✅ `pnpm test:validation` and `pnpm test` both exercised the new route-loading validator in the configured flow | ➖ None needed — validation-only task |
| 3.3 | `openspec/changes/add-loading-streaming-ux/tasks.md` + `apply-progress.md` | Static evidence | ✅ Prior OpenSpec apply-progress was read and merged before update | ✅ Tasks/apply-progress were still incomplete for Phase 3 before artifact update | ✅ Tasks 3.1-3.3 marked complete; archive task 3.4 remains unchecked | ➖ Triangulation skipped: artifact persistence/update task with one expected state | ✅ Prior Phase 1-2 evidence preserved while adding Phase 3 evidence |

## Test Summary

- **Total validator checks after Phase 3**: 68.
- **Phase 3 safety net**: `node scripts/validate-route-loading-streaming-ux.mjs` → 66 passed, 0 failed before package wiring edits.
- **Phase 3 focused RED run**: `node scripts/validate-route-loading-streaming-ux.mjs` → 66 passed, 2 failed after adding package-script checks before `package.json` wiring.
- **Phase 3 focused GREEN run**: `node scripts/validate-route-loading-streaming-ux.mjs` → 68 passed, 0 failed after `package.json` wiring.
- **Quality gates run**:
  - `pnpm validate:route-loading-streaming-ux` → passed, 68/68.
  - `pnpm lint` → passed.
  - `pnpm test:validation` → passed; includes `validate:route-loading-streaming-ux` in the configured validation flow.
  - `pnpm test` → passed; validation + runtime suite completed.
  - `pnpm build` → passed; Prisma generated and Next.js production build completed.
- **Layers used**: Static validation (68 checks), lint, configured validation/runtime suite, production build.
- **Approval tests**: None — no existing runtime code was refactored.
- **Pure helpers created**: 11 exported presentation helpers plus internal structural helper components.

## Command Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `node scripts/validate-route-loading-streaming-ux.mjs` | ✅ Passed before edits | Safety net: 66 passed, 0 failed. |
| `node scripts/validate-route-loading-streaming-ux.mjs` | ✅ Failed as RED | After adding package checks before wiring: 66 passed, 2 failed. |
| `node scripts/validate-route-loading-streaming-ux.mjs` | ✅ Passed after wiring | 68 passed, 0 failed. |
| `pnpm validate:route-loading-streaming-ux` | ✅ Passed | 68 passed, 0 failed through the new package script. |
| `pnpm lint` | ✅ Passed | ESLint completed with no reported errors. |
| `pnpm test:validation` | ✅ Passed | Full validation flow completed and ran `validate:route-loading-streaming-ux`. |
| `pnpm test` | ✅ Passed | Configured validation and runtime suites completed. |
| `pnpm build` | ✅ Passed | Prisma generated and Next.js 16.2.6 production build completed successfully. |

## Deviations from Design

- None for Phase 3 — `package.json` was wired exactly through the existing `validate:*` / `test:validation` pattern described by the design.
- `unstable_instant` remains intentionally deferred because the reviewed Next.js docs require `cacheComponents`, and `next.config.mjs` does not enable it.

## Issues Found

- Resolved in prior verify: `openspec/config.yaml` now states that local Next.js docs exist under `node_modules/next/dist/docs/...`; this implementation used the actual local docs listed above.

## Remaining Tasks

- None.

## Workload / PR Boundary

- **Mode**: stacked PR slice.
- **Current work unit**: Unit 3 — validation/package wiring and SDD evidence update.
- **Boundary**: starts from completed Phase 1-2 route fallbacks and 66/66 validator baseline; ends with package-script wiring, 68/68 route validator coverage, full quality gates passing, and OpenSpec/Engram artifacts updated. Archive remains excluded.
- **Branch strategy**: orchestrator delivery path says `stacked-to-dev`; tasks artifact originally said `stacked-to-main`, so this final apply evidence records the resolved `dev` stack base.
- **Estimated review budget impact**: small Phase 3 delta limited to `package.json`, validator checks, and OpenSpec evidence; no route UI files changed.

## Phase 4 Review-Burden Refactor Addendum

**Reason**: pre-PR review found `components/store/route-loading-skeletons.jsx` was 524 lines, which made the intended PR slice exceed the 400-line review guard. The user chose chained PRs, so the helper code was split by route family while preserving existing loading behavior and scope.

### Files Changed in Phase 4

| File | Action | What Was Done |
|------|--------|---------------|
| `components/store/route-loading-primitives.jsx` | Created | Extracted shared Server Component shell, skeleton block primitive, shared arrays, summary/order-card primitives, and `Card` re-exports. |
| `components/store/route-loading-store-skeletons.jsx` | Created | Moved catalog, product detail, cart, and checkout exported loading helpers into a store/cart/checkout family module. |
| `components/store/route-loading-order-skeletons.jsx` | Created | Moved order confirmation and customer order list/detail loading helpers into an order/customer family module. |
| `components/store/route-loading-admin-skeletons.jsx` | Created | Moved admin product and admin order loading helpers into an admin family module. |
| `components/store/route-loading-skeletons.jsx` | Removed | Deleted the 524-line monolith after routes and validator moved to route-family modules. |
| `app/**/loading.js` | Modified | Updated all 12 in-scope route loading files to import from the correct family helper module. |
| `scripts/validate-route-loading-streaming-ux.mjs` | Modified | Added validator coverage for the helper split, family imports, primitive imports, and legacy monolith removal. |
| `openspec/changes/archive/2026-05-25-add-loading-streaming-ux/tasks.md` | Modified | Added Phase 4 review-burden refactor tasks. |
| `openspec/changes/archive/2026-05-25-add-loading-streaming-ux/apply-progress.md` | Modified | Recorded Phase 4 Strict TDD/static-validation evidence and reviewable file-size results. |
| `openspec/changes/archive/2026-05-25-add-loading-streaming-ux/verify-report.md` | Modified | Added post-refactor verification evidence. |

### TDD Cycle Evidence — Phase 4

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | ✅ Baseline validator passed 68/68 before refactor edits | ✅ Validator expectations were updated first; old single-helper shape failed with 50 passed, 34 failed | ✅ Split modules and route imports satisfied the new validator with 84/84 passing | ✅ Checks now cover package wiring, legacy monolith removal, 4 helper modules, primitive imports, expected exports, accessibility hooks, forbidden imports, and all 12 route imports | ✅ Validator remains root-relative and follows existing check/report style |
| 4.2 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | ✅ RED validator blocked the old monolith shape | ✅ New helper module existence/export checks failed before files existed | ✅ Created `route-loading-primitives`, `route-loading-store-skeletons`, `route-loading-order-skeletons`, and `route-loading-admin-skeletons`; validator passed 84/84 | ✅ Separate module checks prove each family exports only its route helpers and imports shared primitives | ✅ Extracted shared primitives instead of duplicating cross-family order/detail/card skeleton structures |
| 4.3 | `scripts/validate-route-loading-streaming-ux.mjs` | Static validation | ✅ Existing 12 route files exported parameterless `Loading` before import edits | ✅ New route import expectations failed while routes still imported `route-loading-skeletons` | ✅ All 12 route files now import from the matching family helper module; validator passed 84/84 | ✅ Validator covers store/cart/checkout, order/customer, and admin route families independently | ✅ Removed legacy helper after route imports moved; runtime behavior remains presentation-only |
| 4.4 | Command suite | Static/runtime validation | ✅ `pnpm validate:route-loading-streaming-ux` passed 84/84 after the split | ✅ Required command evidence was recorded before final artifact handoff | ✅ `pnpm lint`, `pnpm test`, and `pnpm build` all passed after the split | ✅ `pnpm test` exercised the route-loading validator inside the configured validation flow | ➖ None needed — verification task |

### Phase 4 Test Summary

- **Focused validator checks after refactor**: 84 passed, 0 failed.
- **RED evidence**: `pnpm validate:route-loading-streaming-ux` failed with 50 passed, 34 failed after validator expectations changed but before helper split/import refactor.
- **GREEN evidence**: `pnpm validate:route-loading-streaming-ux` passed with 84 passed, 0 failed after helper split/import refactor.
- **Final quality gates**:
  - `pnpm validate:route-loading-streaming-ux` → passed, 84/84.
  - `pnpm lint` → passed.
  - `pnpm test` → passed; route-loading validator ran inside `test:validation` and reported 84/84.
  - `pnpm build` → passed; Prisma generated and Next.js 16.2.6 production build completed.
- **Layers used**: Static validation, lint, configured validation/runtime suite, production build.
- **Approval tests**: Static approval via existing validator baseline; no runtime behavior changes were intended.

### Reviewable Helper File Sizes

| File | Lines | Reviewability |
|------|-------|---------------|
| `components/store/route-loading-primitives.jsx` | 149 | ✅ Under 400-line guard |
| `components/store/route-loading-store-skeletons.jsx` | 163 | ✅ Under 400-line guard |
| `components/store/route-loading-order-skeletons.jsx` | 89 | ✅ Under 400-line guard |
| `components/store/route-loading-admin-skeletons.jsx` | 156 | ✅ Under 400-line guard |
| `scripts/validate-route-loading-streaming-ux.mjs` | 257 | ✅ Under 400-line guard |

### Phase 4 Deviations from Design

- Intentional organization deviation: the archived design originally named one helper file, `components/store/route-loading-skeletons.jsx`. Pre-PR review found that file too large for the review guard, so the same helper behavior is now split into route-family modules plus shared primitives.
- No runtime, route scope, E2E, coverage, or CI behavior was changed.

### Phase 4 Issues Found

- None.
