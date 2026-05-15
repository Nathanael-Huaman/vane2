# Apply Progress — store-admin-products

## Scope

Approved delivery path: **stacked-to-main (recommended)**.
Current implementation: **PR A + PR B completed**.
PR boundary respected:

- PR A: backend foundation only.
- PR B: admin UI routes/navbar + validator route checks.

## Completed tasks

- A0 Next.js docs preflight recorded.
- A1 Added structural validator script + package script.
- A2 Added runtime admin-products test script + package script.
- A3 Implemented `lib/server/store/admin-validation.js`.
- A4 Implemented `lib/server/store/admin-products.js`.
- A5 Implemented `lib/actions/store-admin.js` with admin role + admin view gate and revalidation.
- A6 Added/verified edge cases (archived→active/draft, stock=0 support, slug immutability rejection, invalid status/stock/category rejection).
- A7 Refined backend helpers and reran targeted checks.
- B1 Extended `validate-store-admin-products` with PR B route/navbar and denial-branch checks.
- B2 Added `app/admin/tienda/page.js` with admin-view gating and inventory list.
- B3 Added `app/admin/tienda/nuevo/page.js` plus client form wired to `createProductAction` and existing category options.
- B4 Added `app/admin/tienda/[id]/page.js` plus client form wired to `updateProductAction`, with `notFound()` and immutable slug display.
- B5 Added `/admin/tienda` entry to `adminNavLinks` in `components/navbar.jsx`.
- B6 Added focused route-level denial coverage via validator checks for unauthenticated/non-admin/admin-client-view branches.
- B7 Kept UI helpers local to route folders and reran targeted checks.

## Files changed

- `app/admin/tienda/page.js`
- `app/admin/tienda/nuevo/page.js`
- `app/admin/tienda/nuevo/product-form-client.js`
- `app/admin/tienda/[id]/page.js`
- `app/admin/tienda/[id]/product-form-client.js`
- `components/navbar.jsx`
- `scripts/validate-store-admin-products.mjs`
- `openspec/changes/store-admin-products/tasks.md`
- `openspec/changes/store-admin-products/apply-progress.md`

## Next.js docs preflight

Read docs paths before route/component edits:

- `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`

(Existing A0 docs from PR A were already recorded in prior progress.)

## TDD Cycle Evidence

| Cycle       | Action                                                              | Evidence                                                                                                                  |
| ----------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| RED         | Extended PR B validator requirements before UI implementation       | `pnpm validate:store-admin-products` failed: missing `app/admin/tienda/*` routes and missing navbar `/admin/tienda` link. |
| GREEN       | Implemented minimal PR B admin routes/forms/navbar/validator wiring | `pnpm validate:store-admin-products` passed after route + navbar + validator updates.                                     |
| TRIANGULATE | Added focused denial-branch route coverage in validator             | Validator now asserts denial branches on list/new/edit pages and action wiring through client forms.                      |
| REFACTOR    | Kept components local and reran full targeted checks                | `pnpm validate:store-admin-products && pnpm test:store-admin-products && pnpm lint` passed.                               |

## Test commands run

1. `pnpm validate:store-admin-products` (RED, expected fail for missing PR B files)
2. `pnpm validate:store-admin-products` (GREEN)
3. `pnpm test:store-admin-products && pnpm lint`
4. `pnpm validate:store-admin-products && pnpm test:store-admin-products && pnpm lint`
5. `pnpm test` (additional strict-runner verification)

## Deviations from design

- Added two local client form files under route folders:
  - `app/admin/tienda/nuevo/product-form-client.js`
  - `app/admin/tienda/[id]/product-form-client.js`

  This keeps `useActionState` UI logic local without broad component extraction.

- Focused denial coverage was added through structural validator assertions rather than new Playwright specs in this slice.

## Remaining tasks

- None for `store-admin-products` apply scope (PR A + PR B complete).
- Follow-up completed: added dedicated Playwright coverage for `/admin/tienda` denial/access branches (`e2e/store-admin-products-admin-routes.spec.ts`).

## Risks / notes

- Focused browser E2E now covers `/admin/tienda` denial/access contract via `pnpm test:store-admin-products:e2e`.
- Full project `pnpm test:e2e` remains broadly unstable outside this slice.
- Existing repo dirty state was preserved; no unrelated cleanup/reset performed.
