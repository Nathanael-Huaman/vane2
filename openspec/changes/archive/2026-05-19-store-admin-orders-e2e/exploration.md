## Exploration: Store admin orders browser/E2E coverage

### Current State
The archived `store-admin-orders-view` change is functionally verified but has one remaining browser-level warning: no admin-orders-specific Playwright coverage exists. Playwright is configured in `playwright.config.ts` with `testDir: ./e2e`, single worker execution, a dev web server, and per-project browser profiles. `scripts/run-e2e.mjs` creates an isolated SQLite database per project/target, runs `prisma db push`, then runs `scripts/seed-store.ts` and `scripts/create-test-auth-users.ts` before invoking Playwright.

Existing admin E2E specs seed sessions directly by inserting `sesion` records and adding the `authjs.session-token` cookie. `e2e/store-admin-products-admin-routes.spec.ts` already covers visitor/client/admin-view route access patterns for `/admin/tienda`; order E2E should reuse that direct-session pattern rather than exercising login UI.

Admin orders currently live at `/admin/tienda/pedidos` and `/admin/tienda/pedidos/[id]`. Runtime tests in `scripts/test-store-admin-orders-view.ts` seed order data manually, prove list/detail helpers, status mutation, auth rejection, return-path sanitization, and token non-exposure. The E2E gap is real browser proof that the route renders persisted orders, navigates to detail, submits the Server Action form, and reflects persisted status.

### Affected Areas
- `e2e/store-admin-orders.spec.ts` — likely new Playwright spec for the minimal browser slice.
- `package.json` — likely new targeted script such as `test:store-admin-orders:e2e`; optionally not wired into full `pnpm test` if CI cost is a concern.
- `scripts/run-e2e.mjs` — existing E2E runner should be reused unchanged if possible; it already isolates DB and seeds store/auth users.
- `lib/testing/prisma-runtime.ts` — existing helper supports Playwright specs seeding DB state against the E2E `DATABASE_URL`.
- `app/admin/tienda/pedidos/page.js` — browser assertions will target list text, detail links, and list status form labels/buttons.
- `app/admin/tienda/pedidos/[id]/page.js` — browser assertions will target detail heading, customer/item snapshot text, and detail status form.

### Approaches
1. **Single targeted Playwright spec with local order seeding** — Create one admin-orders E2E file that seeds an admin session plus one or two deterministic orders using Prisma inside the spec.
   - Pros: Minimal scope, deterministic data, exercises the real browser/server-action flow, aligns with existing admin product E2E auth pattern.
   - Cons: Duplicates small auth/session helper already copied across E2E specs; must clean order data carefully to avoid cross-test contamination within a spec run.
   - Effort: Low

2. **Shared E2E fixtures/helpers first** — Extract session seeding and order seeding into reusable helpers, then write the admin-orders spec.
   - Pros: Reduces duplication and improves future E2E ergonomics.
   - Cons: Larger review surface, more TDD/stub overhead, higher chance of destabilizing existing E2E tests for a warning-only slice.
   - Effort: Medium

3. **End-to-end checkout-created order flow before admin assertions** — Use the public storefront/cart/checkout in the browser to create the order, then switch to admin session and verify list/detail/status.
   - Pros: Most realistic user journey.
   - Cons: Slower and more fragile; couples admin-orders coverage to cart/checkout UI stability and email/token behavior; unnecessary because checkout/order persistence already has runtime coverage.
   - Effort: Medium/High

### Recommendation
Use Approach 1. Add a focused Playwright spec that seeds deterministic order records through Prisma, seeds an admin session with `viewMode: "administrador"`, verifies list access, opens detail, changes status once through the real form, and optionally verifies denial for an admin session in `cliente` view if it remains cheap.

Recommended minimal scenarios:
- Authorized admin in admin view opens `/admin/tienda/pedidos` and sees a seeded order summary with customer name/email and status.
- Admin opens the seeded order detail from the list and sees the detail heading plus saved item snapshot text.
- Admin changes the order status once, preferably `pending` → `confirmed` from the detail page or list page, and the UI reflects `Confirmado` after redirect/revalidation.
- Cheap denial coverage: admin real role with session `viewMode: "cliente"` opens `/admin/tienda/pedidos` and sees `Acceso denegado` with no seeded customer data.

Keep visitor/client denial out unless implementation is still tiny, because `store-admin-products-admin-routes.spec.ts` already covers the established gate shape and runtime tests cover mutation denial. Avoid full checkout-created orders in this slice.

### Risks
- Server Action form submission may redirect/revalidate asynchronously; assertions should wait on visible status text or URL stability rather than relying on immediate DOM state.
- Seeded orders must use unique customer emails/tokens per spec and cleanup `orderItem` before `order` to avoid collisions when specs are rerun locally outside the isolated runner.
- Existing E2E auth helpers are duplicated; extracting them now would expand the warning-fix slice beyond the minimum.
- The E2E runner creates a clean DB per target, but local runs that bypass `scripts/run-e2e.mjs` can hit `dev.db`; the spec should isolate its own test-domain order records.
- The route copy currently includes some non-neutral wording such as `Tienda Admin`; product preference says future UI/product copy should use neutral Latin American Spanish. This E2E slice should avoid introducing new Argentine wording and can assert existing copy only where necessary.
- Running all browser projects is expensive; a targeted chromium script with `--workers=1` matches existing store-admin-products precedent and is the safest CI candidate.

### Ready for Proposal
Yes — propose a small SDD change for a single Playwright coverage slice plus a targeted package script. The proposal should explicitly keep implementation limited to E2E test/support code and avoid refactoring shared helpers unless duplication blocks clarity.
