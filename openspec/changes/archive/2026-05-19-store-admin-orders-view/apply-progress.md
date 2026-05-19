# Apply Progress — store-admin-orders-view

## Current Slice

**PR A — Read-only admin orders list + filters**  
Status: ✅ Complete  
Date: 2026-05-19  
Mode: Strict TDD  
Delivery boundary: chained delivery, PR A only. No detail page, no status mutation/action, no schema changes.

## Completed Tasks

- ✅ Read proposal/spec/design/tasks/config before implementation.
- ✅ Re-read Next.js 16 `page.md` docs for promise-based `searchParams` before route work.
- ✅ Added minimal RED stub for `lib/server/store/admin-orders.js` before importing it from tests.
- ✅ Added `validate:store-admin-orders-view` and `test:store-admin-orders-view` scripts and wired them into `test:validation` / `test:runtime`.
- ✅ Added static validator for PR A route, package scripts, admin gate usage, awaited `searchParams`, approved filters, token non-exposure, and non-goals.
- ✅ Added runtime tests for filter parsing, invalid status safety, status include/exclude behavior, `q` name/email search, money labels, and token-hash non-exposure.
- ✅ Implemented admin-safe order list/filter helper with explicit Prisma `select`.
- ✅ Implemented `/admin/tienda/pedidos` as a protected Server Component list route.
- ✅ Refactored page/test line count to keep PR A under the 400 changed-line budget.

## Files Changed

- `package.json`
- `lib/server/store/admin-orders.js`
- `app/admin/tienda/pedidos/page.js`
- `scripts/validate-store-admin-orders-view.mjs`
- `scripts/test-store-admin-orders-view.ts`
- `openspec/changes/store-admin-orders-view/tasks.md`
- `openspec/changes/store-admin-orders-view/apply-progress.md`

## TDD Cycle Evidence

| Task                                 | Test File                                      | Layer                 | Safety Net                 | RED                                                                                                     | GREEN                                                         | TRIANGULATE                                                                                                                                                    | REFACTOR                                                                                          |
| ------------------------------------ | ---------------------------------------------- | --------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| PR A package + static route contract | `scripts/validate-store-admin-orders-view.mjs` | Static validator      | N/A (new validator)        | ✅ Failed: 9 passed, 7 failed before route/helper implementation                                        | ✅ Passed: 16 passed, 0 failed                                | ✅ Added non-goal checks for date/pagination/export/bulk/payment/shipping/invoice/fulfillment/edit controls                                                    | ✅ Kept validator scoped to PR A only                                                             |
| PR A filter parsing                  | `scripts/test-store-admin-orders-view.ts`      | Runtime/unit          | N/A (new helper with stub) | ✅ Failed on `Not implemented` from stubbed `parseAdminOrderFilters()`                                  | ✅ Passed after parser implementation                         | ✅ Covered `pending`, `confirmed`, empty status, invalid status, URLSearchParams, and 120-char bounded `q`                                                     | ✅ Extracted `assertFilter()` and kept parser pure                                                |
| PR A order summaries                 | `scripts/test-store-admin-orders-view.ts`      | Runtime/integration   | N/A (new helper)           | ✅ Test written before helper implementation; initial run failed before reaching DB assertions due stub | ✅ Passed after explicit Prisma `select` + view-model mapping | ✅ Covered status include/exclude, `q` by name, `q` by email, invalid status returning `[]`, labels, and token-hash absence                                    | ✅ View-model mapping kept in `lib/server/store/admin-orders.js`; raw Prisma records not returned |
| PR A list page                       | `scripts/validate-store-admin-orders-view.mjs` | Static route contract | N/A (new route)            | ✅ Failed while route file was absent                                                                   | ✅ Passed after Server Component route implementation         | ✅ Validator asserts server-side admin gate before order query, awaited `searchParams`, only `status`/`q` fields, invalid-filter state, and token non-exposure | ✅ Page compressed after GREEN to keep review budget under 400 lines; focused tests stayed green  |

## Test Commands Run

| Command                                         | Result    | Notes                                                                                       |
| ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `pnpm validate:store-admin-orders-view`         | ✅ Passed | Final: 16 passed, 0 failed. RED before implementation: 9 passed, 7 failed.                  |
| `pnpm test:store-admin-orders-view`             | ✅ Passed | Final runtime tests passed. RED before implementation failed with `Error: Not implemented`. |
| `pnpm validate:store-checkout-order-foundation` | ✅ Passed | 31 passed, 0 failed.                                                                        |
| `pnpm test:store-checkout-order-foundation`     | ✅ Passed | Checkout/order runtime tests passed.                                                        |
| `pnpm test:store-admin-products`                | ✅ Passed | Admin product runtime tests passed.                                                         |
| `pnpm lint`                                     | ✅ Passed | ESLint exited 0.                                                                            |
| `pnpm test`                                     | ✅ Passed | Full validation/runtime chain passed, including new admin orders validator/runtime script.  |

## Deviations from Design

- PR A intentionally does **not** add a detail link in the list because the detail route is PR B and should not expose a non-implemented navigation target.
- Optional `/admin/tienda` navigation link/card was deferred to keep PR A under budget.
- Only the Next.js page-file docs were re-read for PR A because this slice adds a page route but no Server Action, redirect, revalidation, or `notFound()` behavior.

## Remaining Tasks

- PR B: admin order detail route and snapshot rendering.
- PR C: protected status mutation from list and detail.
- Future slices must re-run relevant verification and update this progress file cumulatively.

## Workload / PR Boundary

- PR A scope remained under budget after refactor: new code/test files total 367 lines plus a small `package.json` script diff (~375 changed lines, excluding OpenSpec task/progress artifacts).
- Chained delivery remains recommended: PR B for detail/snapshots, PR C for status mutation.

## Risks / Notes

- Pi-lens/LSP crashed and recovered while analyzing newly written JS/TS/MJS files (`Invalid string length`). This did not block tests or edits, but future large writes may trigger the same tool instability.
- Engram tools were unavailable in this apply subagent, so discoveries were recorded in OpenSpec only.

---

## PR B Update — Admin order detail + snapshot rendering

**Status**: ✅ Complete  
**Date**: 2026-05-19  
**Mode**: Strict TDD  
**Delivery boundary**: chained delivery, PR B only. Adds detail route/helper and snapshot rendering. No status mutation/action/forms, no schema changes.

## Completed Tasks — PR B

- ✅ Re-read proposal/spec/design/tasks/config before PR B implementation.
- ✅ Re-read Next.js 16 `page.md` docs for promise-based `params` and `not-found.md` docs for `notFound()` before detail route work.
- ✅ Added RED stub export `getAdminOrderDetailById()` throwing `new Error("Not implemented")` before runtime detail tests.
- ✅ Extended static validator for detail route existence, awaited `params`, server-side admin gate before data access, `notFound()`, persisted snapshot rendering, token non-exposure, and absence of status mutation controls.
- ✅ Extended runtime tests for detail lookup by internal id, missing/invalid ids, item snapshot fields, money labels, and token-hash/non-live-product non-exposure.
- ✅ Implemented `getAdminOrderDetailById(id)` with explicit safe Prisma `select` for order header fields and `OrderItem` snapshot fields only.
- ✅ Implemented `/admin/tienda/pedidos/[id]` as a protected Server Component detail route.
- ✅ Added list-to-detail navigation now that the detail route exists.
- ✅ Added triangulation that mutates the underlying product name/slug/price/status after order creation and verifies admin detail still renders saved snapshots.
- ✅ Reused PR A formatting/view-model patterns for S/. labels and date labels.

## Files Changed — PR B

- `lib/server/store/admin-orders.js`
- `app/admin/tienda/pedidos/page.js`
- `app/admin/tienda/pedidos/[id]/page.js`
- `scripts/validate-store-admin-orders-view.mjs`
- `scripts/test-store-admin-orders-view.ts`
- `openspec/changes/store-admin-orders-view/tasks.md`
- `openspec/changes/store-admin-orders-view/apply-progress.md`

## TDD Cycle Evidence — PR B

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PR B detail static contract | `scripts/validate-store-admin-orders-view.mjs` | Static validator | ✅ PR A baseline: 16/16 validator + runtime passed before PR B edits | ✅ Failed: 20 passed, 7 failed before detail route implementation | ✅ Passed: 27 passed, 0 failed | ✅ Added checks for awaited `params`, admin gate before detail read, `notFound()`, snapshot fields, token non-exposure, and no status mutation forms/actions | ✅ Kept validator scoped to PR A+B only; no PR C action expectations added |
| PR B detail lookup helper | `scripts/test-store-admin-orders-view.ts` | Runtime/integration | ✅ PR A runtime passed before PR B edits | ✅ Failed on `Error: Not implemented` from stubbed `getAdminOrderDetailById()` | ✅ Passed after explicit order/item `select` and view-model mapping | ✅ Covered existing id, missing id, empty id, header fields, snapshot item fields, labels, and token/non-live-product absence | ✅ Reused `formatSolesPrice` and shared summary/detail mapping instead of raw Prisma records |
| PR B snapshot stability | `scripts/test-store-admin-orders-view.ts` | Runtime/integration | ✅ Existing checkout/order runtime baseline later passed | ✅ Written before detail helper implementation | ✅ Passed after detail helper implementation | ✅ Mutated product name/slug/price/status after order creation; detail still returned saved snapshot values | ✅ Product state restored in `finally`; test data cleanup narrowed to this test domain |
| PR B detail page | `scripts/validate-store-admin-orders-view.mjs` | Static route contract | N/A (new route) | ✅ Failed while route file was absent | ✅ Passed after Server Component route implementation | ✅ Validator asserts access gate precedes data read, missing detail uses `notFound()`, and UI omits forbidden token/status-mutation/out-of-scope controls | ✅ Page remains read-only; status controls deferred to PR C |

## Test Commands Run — PR B

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm validate:store-admin-orders-view` | ✅ Passed | Final: 27 passed, 0 failed. RED before implementation: 20 passed, 7 failed. |
| `pnpm test:store-admin-orders-view` | ✅ Passed | Final runtime tests passed. RED before implementation failed with `Error: Not implemented`. |
| `pnpm validate:store-checkout-order-foundation` | ✅ Passed | Checkout/order validator passed. |
| `pnpm test:store-checkout-order-foundation` | ✅ Passed | Checkout/order runtime tests passed. |
| `pnpm test:store-admin-products` | ✅ Passed | Admin product runtime tests passed. Expected denied/error log lines were emitted by negative-path tests. |
| `pnpm lint` | ✅ Passed | ESLint exited 0. |
| `pnpm test` | ✅ Passed | Full validation/runtime chain passed, including admin orders validator/runtime script. |
| `git diff --check` | ✅ Passed | No whitespace errors. |

## Deviations from Design — PR B

- PR B intentionally does **not** render the status mutation form on the detail page; status mutation remains PR C to preserve the review boundary.
- PR B added the list `Ver detalle` link that PR A deferred, now that the target route exists.
- No action, redirect, revalidation, pagination, date filters, export, bulk action, payment, shipping, invoice, fulfillment, or order-content editing controls were added.

## Remaining Tasks

- PR C: protected status mutation from list and detail.
- Optional later hardening: runtime/page-level unauthorized-access coverage, as suggested by PR A review.
- Future slices must re-run relevant verification and update this progress file cumulatively.

## Workload / PR Boundary — PR B

- PR B remained under budget: approximately ~290 added/changed code/test lines over PR A, excluding OpenSpec task/progress artifacts.
- Chained delivery remains recommended: PR C for status mutation only.

## Risks / Notes — PR B

- Pi-lens/LSP again crashed and recovered while analyzing newly written JS/TS/MJS files (`Invalid string length`). Tests and edits were not blocked.
- Engram tools were unavailable in this apply subagent, so discoveries were recorded in OpenSpec only.

---

## PR C Update — Admin status mutation from list and detail

**Status**: ✅ Complete  
**Date**: 2026-05-19  
**Mode**: Strict TDD  
**Delivery boundary**: chained delivery, PR C only. Adds protected `pending`/`confirmed` status mutation helper/action and inline list/detail forms. No schema changes, new statuses, payment/shipping/invoice/fulfillment, customer order history, bulk/export/analytics, pagination/date filters, or order-content editing.

## Completed Tasks — PR C

- ✅ Read proposal/spec/design/tasks/config and previous apply-progress before PR C implementation; preserved PR A and PR B history.
- ✅ Checked required local Next.js docs for `use-server.md`, `form.md`, `revalidatePath.md`, and `redirect.md`; those files were missing from `node_modules/next/dist/docs/`, so PR C used existing project Server Action/form/revalidation/redirect patterns as alternate evidence.
- ✅ Created RED stub `lib/actions/store-admin-orders.js` with top-level `"use server"` and `updateOrderStatusAction()` throwing `Not implemented`.
- ✅ Added RED stub exports `parseAdminOrderStatus()` and `updateAdminOrderStatus()` before runtime tests exercised them.
- ✅ Extended static validator for Server Action conventions, admin gate before mutation, list/detail revalidation, redirect outside caught mutation block, sanitized `returnTo`, status forms on list/detail, status allow-list, and token/non-goal guardrails.
- ✅ Extended runtime tests for status parsing, `pending → confirmed`, `confirmed → pending`, invalid status/id/missing-order rejection, no mutation on invalid input, unauthorized visitor rejection, admin-in-client-view rejection, list/detail action return paths, and sanitized external `returnTo`.
- ✅ Implemented `parseAdminOrderStatus(value)` and `updateAdminOrderStatus(id, status)` with explicit id/status validation and a Prisma update that only writes `Order.status`.
- ✅ Implemented `updateOrderStatusAction(_prevState, formData)` with top-level `"use server"`, admin access enforcement, invalid/missing-order errors, list/detail `revalidatePath()`, and sanitized redirect outside `try/catch`.
- ✅ Added inline status forms to `/admin/tienda/pedidos` and `/admin/tienda/pedidos/[id]`, preserving approved list filter return paths where practical.
- ✅ Added a small action dependency seam for tests so unauthorized/client-view action paths can be exercised without importing Next/auth runtime internals.

## Files Changed — PR C

- `lib/server/store/admin-orders.js`
- `lib/actions/store-admin-orders.js`
- `lib/actions/store-admin-orders-dependencies.js`
- `app/admin/tienda/pedidos/page.js`
- `app/admin/tienda/pedidos/[id]/page.js`
- `scripts/validate-store-admin-orders-view.mjs`
- `scripts/test-store-admin-orders-view.ts`
- `openspec/changes/store-admin-orders-view/tasks.md`
- `openspec/changes/store-admin-orders-view/apply-progress.md`

## TDD Cycle Evidence — PR C

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PR C status static contract | `scripts/validate-store-admin-orders-view.mjs` | Static validator | ✅ PR A+B baseline: 27/27 validator + runtime passed before PR C edits | ✅ Failed: 32 passed, 7 failed before action/forms/helper implementation | ✅ Passed: 39 passed, 0 failed | ✅ Added checks for action conventions, admin access, revalidation, redirect placement, sanitized `returnTo`, list/detail forms, allowed statuses, and token guardrails | ✅ Updated PR B read-only mutation check to out-of-scope edit guard now that PR C intentionally adds status forms |
| PR C status helper | `scripts/test-store-admin-orders-view.ts` | Runtime/integration | ✅ PR A+B runtime passed before PR C edits | ✅ Failed on `Error: Not implemented` from stubbed `parseAdminOrderStatus()` | ✅ Passed after parser/update helper implementation | ✅ Covered `pending`, `confirmed`, invalid/missing values, `pending→confirmed`, `confirmed→pending`, missing id, missing order, invalid status, and no mutation of contact/totals | ✅ Kept parsing pure and update helper scoped to `Order.status` only |
| PR C action authorization + redirects | `scripts/test-store-admin-orders-view.ts` | Runtime/action seam | ✅ Targeted runtime baseline passed before action tests | ✅ Written before production action implementation; validator/runtime failed until action behavior existed | ✅ Passed with action dependency seam | ✅ Covered unauthorized visitor, admin in client view, authorized list return with filters, authorized detail return, external return sanitization, and list/detail revalidation | ✅ Dependency seam isolated test-only auth/revalidate/redirect dependencies without broad shared infrastructure |
| PR C list/detail forms | `scripts/validate-store-admin-orders-view.mjs` | Static route contract | ✅ Existing page validator passed before form edits | ✅ Failed until list/detail pages rendered status forms | ✅ Passed after inline forms were added | ✅ Validator confirms both pages include `id`, `status`, `returnTo`, only `pending`/`confirmed`, and no private token material | ✅ Filter-field validator now scopes to the GET filter form so mutation hidden inputs do not weaken PR A filter contract |

## Test Commands Run — PR C

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm validate:store-admin-orders-view` | ✅ Passed | Final: 39 passed, 0 failed. RED before implementation: 32 passed, 7 failed. |
| `pnpm test:store-admin-orders-view` | ✅ Passed | Final runtime tests passed. RED before implementation failed with `Error: Not implemented`. Expected denied/error log lines emitted by negative-path action tests. |
| `pnpm validate:store-checkout-order-foundation` | ✅ Passed | Checkout/order validator passed. |
| `pnpm test:store-checkout-order-foundation` | ✅ Passed | Checkout/order runtime tests passed. |
| `pnpm test:store-admin-products` | ✅ Passed | Admin product runtime tests passed. |
| `pnpm lint` | ✅ Passed | ESLint exited 0. |
| `pnpm test` | ✅ Passed | Full validation/runtime chain passed, including PR C admin orders validator/runtime script. |
| `git diff --check` | ✅ Passed | No whitespace errors. |

## Deviations from Design — PR C

- The required local Next.js docs for PR C were missing under `node_modules/next/dist/docs/`; implementation proceeded using existing project patterns from `lib/actions/store-admin.js`, `lib/actions/store-checkout.js`, and current app forms, with the blocker recorded here and in `tasks.md`.
- A small `lib/actions/store-admin-orders-dependencies.js` seam was added to test action authorization, revalidation, and redirect behavior without importing Next/auth runtime internals directly from the runtime script.
- Action success uses sanitized `redirect(returnTo)` after revalidation, as recommended by design; no `useActionState` UI was introduced.

## Remaining Tasks

- No PR C implementation tasks remain.
- Next recommended phase: fresh review/verify for the cumulative `store-admin-orders-view` implementation.
- Optional later hardening remains outside this slice: page-level E2E coverage for admin orders if the team wants browser-level proof.

## Workload / PR Boundary — PR C

- PR C stayed within the 400 changed-line review budget by forecast: approximately ~280-340 changed code/test lines over PR B, excluding OpenSpec task/progress artifacts.
- The new dependency seam added a small file but avoided a broader shared admin action refactor.
- Chained delivery is complete: PR A list/filters, PR B detail/snapshots, PR C status mutation.

## Risks / Notes — PR C

- The local Next.js docs required by the project rule are absent in this install; future work should restore or vendor those docs if the rule remains mandatory.
- `pnpm test:store-admin-orders-view` emits expected `Acceso denegado` log output from negative authorization tests; the command exits successfully.

---

## PR C Review Fix — Direct Server Action form invocation

**Status**: ✅ Complete  
**Date**: 2026-05-19  
**Mode**: Strict TDD  
**Delivery boundary**: Fresh-review fix for PR C only. No route, auth, status model, return path, schema, or out-of-scope admin feature changes.

## Completed Tasks — PR C Review Fix

- ✅ Read proposal/spec/design/tasks/config, previous apply-progress, and affected action/test/validator files before implementation.
- ✅ Confirmed the review finding: list/detail pages pass `updateOrderStatusAction` directly to `<form action={updateOrderStatusAction}>`, but the action only accepted the `useActionState` shape `(_prevState, formData)`.
- ✅ Added a RED regression that calls `updateOrderStatusAction(formData)` to match direct Next/React form invocation.
- ✅ Updated `updateOrderStatusAction(prevStateOrFormData, maybeFormData)` to normalize both supported call shapes with `maybeFormData ?? prevStateOrFormData`, preserving existing `updateOrderStatusAction(null, formData)` tests.
- ✅ Strengthened the static validator so future changes must keep direct form action normalization in place.

## Files Changed — PR C Review Fix

- `lib/actions/store-admin-orders.js`
- `scripts/test-store-admin-orders-view.ts`
- `scripts/validate-store-admin-orders-view.mjs`
- `openspec/changes/store-admin-orders-view/apply-progress.md`

## TDD Cycle Evidence — PR C Review Fix

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Direct form Server Action invocation | `scripts/test-store-admin-orders-view.ts` | Runtime/action seam | ✅ Baseline `pnpm test:store-admin-orders-view` passed before edits | ✅ Failed with `TypeError: Cannot read properties of undefined (reading 'get')` when calling `updateOrderStatusAction(formData)` | ✅ Passed after action argument normalization | ✅ Existing tests still cover `updateOrderStatusAction(null, formData)`, unauthorized/client-view rejection, list/detail return paths, external return sanitization, and list/detail revalidation | ✅ Minimal normalization only; no auth/status/redirect behavior changed |
| Static convention guard | `scripts/validate-store-admin-orders-view.mjs` | Static validator | ✅ Targeted runtime GREEN before validator hardening | ✅ Runtime RED already captured the convention bug; validator strengthened after fix to prevent recurrence | ✅ `pnpm validate:store-admin-orders-view` passed with 40/40 checks | ✅ Validator now checks both the normalized signature and `maybeFormData ?? prevStateOrFormData` convention | ✅ Kept check narrow to PR C action convention |

## Test Commands Run — PR C Review Fix

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm test:store-admin-orders-view` | ✅ Baseline passed | Safety net before changing existing action/test files. |
| `pnpm test:store-admin-orders-view` | ✅ RED failed as expected | Failed before production fix with `TypeError: Cannot read properties of undefined (reading 'get')`. |
| `pnpm test:store-admin-orders-view` | ✅ Passed | GREEN after normalizing action arguments. |
| `pnpm validate:store-admin-orders-view` | ✅ Passed | 40 passed, 0 failed after static validator hardening. |
| `pnpm test` | ✅ Passed | Full validation/runtime suite passed, including the direct form invocation regression. |
| `git diff --check` | ✅ Passed | No whitespace errors. |

## Deviations from Design — PR C Review Fix

- The original design showed `updateOrderStatusAction(_prevState, formData)`, but the implemented UI uses direct `<form action={updateOrderStatusAction}>`; the action now supports both direct form invocation and the previous `useActionState`-style shape for compatibility.

## Remaining Tasks — PR C Review Fix

- No PR C review-fix implementation tasks remain.
- Ready for fresh re-review.
