# Apply Progress: Store Cart Foundation — PR B

## Workload / PR boundary

- Applied slice: **PR B — Public cart UI + E2E only**.
- Included: product-detail add-to-cart form, public `/carrito` page, cart mutation client forms, PR B structural validator checks, Playwright E2E coverage, and validation evidence.
- Preserved non-goals: checkout, orders, payments, stock reservation/decrement, merge-on-login, navbar cart counter, and catalog-card add buttons.
- Note: `lib/actions/store-cart.js` changed only to make `STORE_CART_COOKIE_NAME` a private constant. Next.js 16 rejects non-async exports from a `"use server"` module when that module is imported by Client Components for Server Actions.

## Completed tasks

- B0 preflight completed.
- B1 RED UI validator/E2E skeleton completed.
- B2 product-detail add-to-cart UI completed.
- B3 `/carrito` page completed.
- B4 UI edge cases triangulated.
- B5 targeted E2E/regressions completed; full lint timed out, focused eslint passed.
- B6 apply progress updated; fresh review and commit intentionally left to parent/orchestrator.

## Files changed

- `app/tienda/[slug]/page.js` — renders add form for in-stock products and unavailable messaging for out-of-stock active products.
- `app/tienda/[slug]/add-to-cart-form.js` — client `useActionState` form for `addToCartAction`, quantity bounds, pending/error/success UI, and `/carrito` link.
- `app/carrito/page.js` — dynamic cart page that reads cookie/session context without creating carts on page load, renders empty state, line items, subtotal, and no checkout flow.
- `app/carrito/cart-action-forms.js` — client `useActionState` forms for update/remove/clear mutations, quantity max, pending/error states.
- `lib/actions/store-cart.js` — made `STORE_CART_COOKIE_NAME` private to satisfy Next.js 16 `"use server"` export rules for client-imported server actions.
- `scripts/validate-store-cart-foundation.mjs` — extended PR B structural checks.
- `e2e/store-cart-foundation.spec.ts` — added visitor cart flow coverage.
- `openspec/changes/store-cart-foundation/tasks.md` — PR B checklist updated.
- `openspec/changes/store-cart-foundation/apply-progress-pr-b.md` — this progress report.

## TDD Cycle Evidence

| Task                        | Test File                                    | Layer          | Safety Net                                           | RED                                                                                                                                                                 | GREEN                                                             | TRIANGULATE                                                                                                                                                   | REFACTOR                                                                         |
| --------------------------- | -------------------------------------------- | -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| PR B structural UI contract | `scripts/validate-store-cart-foundation.mjs` | Structural     | PR A cart validator/service tests remained available | `pnpm validate:store-cart-foundation` failed with 13 PR B UI checks failing before UI implementation                                                                | `pnpm validate:store-cart-foundation` passed: 36 passed, 0 failed | Added checks for product detail form, cart page read, empty state, subtotal, mutation forms, quantity max, and E2E spec                                       | Validator now uses `readIfExists()` so missing PR B files produce clean failures |
| PR B browser cart flow      | `e2e/store-cart-foundation.spec.ts`          | Playwright/E2E | Seeded store data through `scripts/run-e2e.mjs`      | Targeted E2E failed before UI implementation: add form label/unavailable messaging missing; after initial UI, Next.js exposed `"use server"` non-async export issue | Targeted Chromium E2E passed: 6/6                                 | Covered add, cart display/subtotal, update, remove empty state, clear empty state, out-of-stock visible but not addable, and safe server-action error display | Cart UI split into server-rendered page plus small client action forms           |

## Commands run

| Command                                                                                                          | Result                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm validate:store-cart-foundation` before PR B UI                                                             | Exit 1 RED: 23 passed, 13 failed.                                                                                                     |
| `node scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1` before PR B UI       | Exit 1 RED: 6 Playwright failures because add form/unavailable UI did not exist.                                                      |
| `node scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1` after first UI pass  | Exit 1: Next.js 16 rejected non-async export `STORE_CART_COOKIE_NAME` from `lib/actions/store-cart.js` when imported by client forms. |
| `pnpm validate:store-cart-foundation` after implementation                                                       | Exit 0: 36 passed, 0 failed.                                                                                                          |
| `node scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1` after implementation | Exit 0: 6 passed.                                                                                                                     |
| `pnpm test:store-cart-foundation`                                                                                | Exit 0.                                                                                                                               |
| `pnpm test:store-foundation`                                                                                     | Exit 0.                                                                                                                               |
| `pnpm test:store-admin-products`                                                                                 | Exit 0.                                                                                                                               |
| Focused eslint on changed PR B files                                                                             | Exit 0.                                                                                                                               |
| `git diff --check`                                                                                               | Exit 0.                                                                                                                               |
| `pnpm lint`                                                                                                      | Timed out after 180s; focused eslint above passed.                                                                                    |
| `pnpm test`                                                                                                      | Exit 0.                                                                                                                               |
| `pnpm build`                                                                                                     | Exit 0.                                                                                                                               |

## Deviations from design

- No navbar cart count/link was added.
- No catalog-card add buttons were added.
- No checkout, order, payment, stock reservation/decrement, or merge-on-login behavior was added.
- Full `pnpm lint` timed out after 180 seconds; focused eslint was used for changed files.

## Remaining tasks

- Run fresh review before commit/PR.
- Commit PR B as a reviewable work unit after review.
- Proceed to verify/archive phase after PR B review/commit.

## Risks / follow-up

- Post-verify warning fix completed: anonymous guest cart flows no longer emit `No hay sesion activa` optional-auth logs in targeted cart E2E.
- Verification was rerun through `npx --yes node@22 ...`, so the prior Node v26 engine warnings were avoided.
- Targeted E2E still emits unrelated Auth.js `debug-enabled` warnings, Next image LCP guidance, and the expected invalid-quantity domain error from the safe server-action error scenario.

## Post-verify warning fix pass

### Scope

- Added `getOptionalAuthenticatedSession()` for optional cart auth probes: no active session returns `null` without `unauthorizedResponse()` logging, while authenticated sessions still resolve through a DB-backed `Usuario` before cart linkage.
- Switched `lib/actions/store-cart.js` and `app/carrito/page.js` to the quiet optional auth helper so guest cart reads/writes stay anonymous without logging expected unauthenticated state.
- Added `getOptionalPersistedSession()` and used it in `app/api/session/view-mode/route.js` because storefront cart pages trigger the navbar view-mode probe during E2E; this was the remaining source of `No hay sesion activa` logs after the cart action/page fix.
- Extended `scripts/validate-store-cart-foundation.mjs` with structural checks for quiet optional auth helpers and cart/storefront usage.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| ---- | --------- | ----- | ---------- | --- | ----- | ----------- | -------- |
| Quiet optional cart auth probes | `scripts/validate-store-cart-foundation.mjs` | Structural | Existing PR B validator passed before new checks | Validator failed on missing `getOptionalAuthenticatedSession()` and cart action/page usage checks | Validator passed after helper + cart action/page changes | Targeted E2E showed remaining `No hay sesion activa` logs from storefront view-mode probe | Kept `unauthorizedResponse()` behavior unchanged for required auth paths |
| Quiet storefront view-mode optional probe | `scripts/validate-store-cart-foundation.mjs` | Structural | Targeted cart E2E still passed while exposing residual warning logs | Validator failed on missing `getOptionalPersistedSession()` and view-mode route usage checks | Validator passed after helper + route change | Targeted E2E passed with no `No hay sesion activa` logs | Preserved `getCurrentPersistedSession()` for required persisted-session callers |

### Commands run under Node 22

| Command | Result |
| ------- | ------ |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:store-cart-foundation` after adding first RED checks | Exit 1: 36 passed, 2 failed for missing quiet optional auth helper/action usage. |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:store-cart-foundation` after cart action fix | Exit 0: 38 passed, 0 failed. |
| `npx --yes node@22 scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1` after cart action/page fix | Exit 0: 6 passed, but remaining `No hay sesion activa` logs came from storefront view-mode probing. |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:store-cart-foundation` after adding view-mode RED checks | Exit 1: 39 passed, 2 failed for missing quiet persisted-session helper/route usage. |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:store-cart-foundation && npx --yes node@22 /opt/homebrew/bin/pnpm test:store-cart-foundation && npx --yes node@22 /opt/homebrew/bin/pnpm lint` | Exit 0: validator 41 passed/0 failed; runtime tests passed; eslint passed. |
| `npx --yes node@22 scripts/run-e2e.mjs --project=chromium e2e/store-cart-foundation.spec.ts --workers=1` final | Exit 0: 6 passed; no `No hay sesion activa` logs observed. |
| `git diff --check` | Exit 0. |

## Final PR B validator reconciliation

### Scope

- Reconciled `scripts/validate-ticket-26.mjs` with the quiet optional persisted-session route contract introduced by the warning fix.
- The Ticket 26 validator still proves `app/api/session/view-mode/route.js` resolves persisted session context safely: it accepts the old required-auth paths (`auth()` / `getCurrentPersistedSession`) or the new narrow optional persisted-session path only when the route awaits `getOptionalPersistedSession()`, handles the missing-session branch, and returns `viewMode: null` for anonymous probes.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
| ---- | --------- | ----- | ---------- | --- | ----- | ----------- | -------- |
| Ticket 26 optional persisted-session validator contract | `scripts/validate-ticket-26.mjs` | Structural | `validate:ticket-26` failed on the stale required-auth-only assertion, matching final verify blocker | `npx --yes node@22 /opt/homebrew/bin/pnpm validate:ticket-26` exited 1 with 42 passed, 1 failed before validator change | Same command exited 0 with 43 passed, 0 failed after narrowing the accepted optional contract | Full `pnpm test` now passes and exercises Ticket 26 within the validation chain; cart validator still passes with 41/0 | Kept the check narrow by requiring awaited `getOptionalPersistedSession()`, missing-session handling, and `viewMode: null` rather than accepting any optional auth string |

### Commands run under Node 22

| Command | Result |
| ------- | ------ |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:ticket-26` before change | Exit 1: 42 passed, 1 failed on stale `API route usa sesion autenticada` check. |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:ticket-26` after change | Exit 0: 43 passed, 0 failed. |
| `npx --yes node@22 /opt/homebrew/bin/pnpm test` | Exit 0. |
| `npx --yes node@22 /opt/homebrew/bin/pnpm validate:store-cart-foundation` | Exit 0: 41 passed, 0 failed. |

## Memory

No callable Engram memory tools were available in this subagent session, so significant findings are recorded in this OpenSpec apply-progress artifact and the worker handoff report.
