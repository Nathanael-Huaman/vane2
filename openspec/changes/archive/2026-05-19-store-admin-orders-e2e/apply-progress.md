# Apply Progress: Store Admin Orders E2E

## Mode

Strict TDD.

## Completed Tasks

- [x] 1.1 Create `e2e/store-admin-orders.spec.ts` with local stubs for `seedAuthenticatedSession`, `resetOrdersByDomain`, and `seedOrder` that throw `Not implemented`.
- [x] 1.2 Add failing Playwright scenarios in `e2e/store-admin-orders.spec.ts` for seeded list visibility, detail navigation, `pending` → `confirmed`, and admin-in-client-view denial.
- [x] 1.3 Modify `package.json` with `test:store-admin-orders:e2e` using `node scripts/run-e2e.mjs --project=chromium e2e/store-admin-orders.spec.ts --workers=1`.
- [x] 2.1 Implement `seedAuthenticatedSession` in `e2e/store-admin-orders.spec.ts` using Prisma `sesion`, `authjs.session-token`, unique tokens, and `viewMode`.
- [x] 2.2 Implement `resetOrdersByDomain` to delete matching `orderItem` records before `order` records for `admin-orders-e2e.test` emails.
- [x] 2.3 Implement `seedOrder` with deterministic customer data, total, product/item rows, and initial `pending` status.
- [x] 2.4 Make the E2E assert visible list/detail data, submit the existing status control, wait for visible `Confirmado`, and query Prisma for persisted `confirmed`.
- [x] 2.5 Keep denial coverage in `e2e/store-admin-orders.spec.ts` limited to admin session with `viewMode: "cliente"`; assert seeded order data is absent.
- [x] 3.1 Refactor only local helpers in `e2e/store-admin-orders.spec.ts` for readability; do not extract broad shared fixtures.
- [x] 3.2 Confirm no files under `app/admin/tienda/pedidos/**`, `lib/actions/**`, or `lib/server/**` were changed for product behavior.
- [x] 4.1 Run `pnpm test:store-admin-orders:e2e`.
- [x] 4.2 Run relevant existing checks: `pnpm validate:store-admin-orders-view` and `pnpm test:store-admin-orders-view`.
- [x] 4.3 Run `pnpm lint`, then `pnpm test`; `pnpm build` was not run because it was optional and the required apply checks passed.
- [x] 4.4 Check `git diff --stat` and full diff to verify the slice remains under budget and test-only.
- [x] 4.5 During apply, update this `openspec/changes/store-admin-orders-e2e/tasks.md` progress as tasks complete.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `e2e/store-admin-orders.spec.ts` | E2E | N/A (new) | ✅ Stub helpers written to throw `Not implemented` | ✅ RED run failed on `resetOrdersByDomain` as expected | ➖ Structural setup | ✅ Kept stubs local |
| 1.2 | `e2e/store-admin-orders.spec.ts` | E2E | N/A (new) | ✅ Browser scenarios written before helper implementation | ✅ `pnpm test:store-admin-orders:e2e` failed on stubs first, then passed after helpers | ✅ Two scenarios cover admin workflow and client-view denial | ✅ Replaced ambiguous status text assertion with badge locator |
| 1.3 | `package.json` | Config | N/A (script addition) | ✅ Targeted script added before GREEN implementation | ✅ Script executed the RED and GREEN Playwright cycles | ➖ Single script contract | ✅ Restored JSON indentation |
| 2.1 | `e2e/store-admin-orders.spec.ts` | E2E | ✅ Existing auth/session pattern read from `e2e/store-admin-products-admin-routes.spec.ts` | ✅ Authenticated scenarios failed until helper existed | ✅ Session seeding passed through `sesion` + `authjs.session-token` cookie | ✅ Used both `administrador` and `cliente` view modes | ✅ Kept helper local |
| 2.2 | `e2e/store-admin-orders.spec.ts` | Integration/E2E | ✅ Runtime cleanup pattern read from `scripts/test-store-admin-orders-view.ts` | ✅ before/after cleanup failed while stubbed | ✅ Cleanup deletes `orderItem` before `order` by test-domain email | ✅ Runs before each, after each, and after all | ✅ No shared extraction |
| 2.3 | `e2e/store-admin-orders.spec.ts` | Integration/E2E | ✅ Existing Prisma order seeding pattern read | ✅ Order-dependent browser assertions failed while stubbed | ✅ Seeded order/item rows from active seeded product | ✅ Seed supports `pending` and denial scenario data | ✅ Unique confirmation token hash per run |
| 2.4 | `e2e/store-admin-orders.spec.ts` | E2E | ✅ Existing admin orders action/runtime tests passed separately | ✅ Status mutation scenario written first | ✅ Browser submits existing detail form, sees `Confirmado`, and DB poll confirms `confirmed` | ✅ Covers list access, detail URL/data, and persisted mutation | ✅ Stable badge wait plus DB assertion |
| 2.5 | `e2e/store-admin-orders.spec.ts` | E2E | ✅ Existing admin gate pattern read | ✅ Denial scenario written before auth helper | ✅ Client-view admin sees `Acceso denegado` and seeded data absent on list/detail | ✅ Covers list and detail denial | ✅ Scope kept to one cheap gate case |
| 3.1 | `e2e/store-admin-orders.spec.ts` | E2E | ✅ `pnpm test:store-admin-orders:e2e` passed before final artifact updates | ✅ Refactor only after passing tests | ✅ Targeted E2E remained passing | ✅ No broad helper extraction | ✅ Local constants/helpers only |
| 3.2 | Diff review | Review | ✅ `git diff` reviewed | ✅ No product file changes introduced by this slice | ✅ Product behavior untouched | ➖ Verification task | ✅ Test-only boundary confirmed |
| 4.1 | `e2e/store-admin-orders.spec.ts` | E2E | N/A | ✅ Targeted script had RED evidence | ✅ `pnpm test:store-admin-orders:e2e` passed: 2/2 | ✅ Two browser scenarios | ✅ None after pass |
| 4.2 | Existing scripts | Validation/Runtime | N/A | ✅ Existing checks selected before final report | ✅ `pnpm validate:store-admin-orders-view` and `pnpm test:store-admin-orders-view` passed | ➖ Existing coverage | ✅ None |
| 4.3 | Project checks | Validation/Runtime | N/A | ✅ Required checks selected before final report | ✅ `pnpm lint` and `pnpm test` passed | ➖ Full required suite | ✅ None |
| 4.4 | Diff review | Review | N/A | ✅ Diff review planned before final report | ✅ `git diff --check` passed and diff reviewed | ➖ Review task | ✅ Slice remained test-only for this apply |
| 4.5 | `tasks.md`, `apply-progress.md` | SDD artifact | N/A | ✅ Progress artifact planned before persistence | ✅ Tasks and apply progress updated | ➖ Artifact task | ✅ Persisted to OpenSpec and Engram |

## Verification Results

| Command | Result |
|---------|--------|
| `pnpm test:store-admin-orders:e2e` | ✅ Passed after GREEN: 2/2 Playwright tests |
| `pnpm validate:store-admin-orders-view` | ✅ Passed: 40/40 validations |
| `pnpm test:store-admin-orders-view` | ✅ Passed |
| `pnpm lint` | ✅ Passed |
| `pnpm test` | ✅ Passed |
| `git diff --check` | ✅ Passed |

## Deviations

None — implementation matches the design. `pnpm build` was not run because it was optional in the task text and the required apply checks passed.

## Issues Found

- During GREEN, `page.getByText("Pendiente").first()` matched the hidden `<option>` before the visible badge. The assertion was refined to target `span[data-slot="badge"]` for stable visible status evidence.

## Workload / PR Boundary

- Mode: single PR / single work unit.
- Boundary: targeted E2E hardening only; no product behavior changes.
- Review budget impact: low, within the 400 changed-line budget for this slice.

## Status

15/15 tasks complete. Ready for verify / fresh review.
