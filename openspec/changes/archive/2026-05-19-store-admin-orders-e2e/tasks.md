# Tasks: Store Admin Orders E2E

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 170-260 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Add focused admin orders E2E coverage and script | PR 1 | One test-only slice; no product behavior changes. |

## Phase 1: RED

- [x] 1.1 Create `e2e/store-admin-orders.spec.ts` with local stubs for `seedAuthenticatedSession`, `resetOrdersByDomain`, and `seedOrder` that throw `Not implemented`.
- [x] 1.2 Add failing Playwright scenarios in `e2e/store-admin-orders.spec.ts` for seeded list visibility, detail navigation, `pending` → `confirmed`, and admin-in-client-view denial.
- [x] 1.3 Modify `package.json` with `test:store-admin-orders:e2e` using `node scripts/run-e2e.mjs --project=chromium e2e/store-admin-orders.spec.ts --workers=1`.

## Phase 2: GREEN

- [x] 2.1 Implement `seedAuthenticatedSession` in `e2e/store-admin-orders.spec.ts` using Prisma `sesion`, `authjs.session-token`, unique tokens, and `viewMode`.
- [x] 2.2 Implement `resetOrdersByDomain` to delete matching `orderItem` records before `order` records for `admin-orders-e2e.test` emails.
- [x] 2.3 Implement `seedOrder` with deterministic customer data, total, product/item rows, and initial `pending` status.
- [x] 2.4 Make the E2E assert visible list/detail data, submit the existing status control, wait for visible `Confirmado`, and query Prisma for persisted `confirmed`.
- [x] 2.5 Keep denial coverage in `e2e/store-admin-orders.spec.ts` limited to admin session with `viewMode: "cliente"`; assert seeded order data is absent.

## Phase 3: REFACTOR

- [x] 3.1 Refactor only local helpers in `e2e/store-admin-orders.spec.ts` for readability; do not extract broad shared fixtures.
- [x] 3.2 Confirm no files under `app/admin/tienda/pedidos/**`, `lib/actions/**`, or `lib/server/**` were changed for product behavior.

## Phase 4: Verification

- [x] 4.1 Run `pnpm test:store-admin-orders:e2e`.
- [x] 4.2 Run relevant existing checks: `pnpm validate:store-admin-orders-view` and `pnpm test:store-admin-orders-view`.
- [x] 4.3 Run `pnpm lint`, then `pnpm test`; run `pnpm build` if practical for full confidence.
- [x] 4.4 Check `git diff --stat` and full diff to verify the slice remains under budget and test-only.
- [x] 4.5 During apply, update this `openspec/changes/store-admin-orders-e2e/tasks.md` progress as tasks complete.
