# Proposal: Store Admin Orders E2E

## Intent

Close the remaining browser-level warning for `store-admin-orders-view` by proving existing admin order list, detail, and status mutation behavior in Playwright. This is quality hardening only; it does not expand product behavior.

## Scope

### In Scope
- Add one targeted Chromium Playwright spec for `/admin/tienda/pedidos` and `/admin/tienda/pedidos/[id]`.
- Seed deterministic orders and admin sessions directly, reusing the existing `sesion` + `authjs.session-token` pattern.
- Verify list rendering, detail navigation, one `pending` → `confirmed` form mutation, and admin-in-client-view denial if cheap.
- Add a targeted npm/pnpm script only if it improves repeatable execution.

### Out of Scope
- Product behavior changes, new statuses, checkout-driven setup, all-browser E2E runs.
- Broad shared E2E helper refactors unless tiny and needed for clarity.
- Visitor/client denial beyond cheap reuse of established gate coverage.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `store-admin-orders-view`: add browser/E2E evidence expectations for existing list, detail, status mutation, and admin-view gate behavior; no requirement behavior changes.

## Approach

Create `e2e/store-admin-orders.spec.ts` using the current isolated SQLite E2E runner. Seed unique test-domain order data via Prisma and an admin session with `viewMode: "administrador"`; add the cookie directly. Prefer stable assertions on visible persisted data and status text after submit/revalidation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `e2e/store-admin-orders.spec.ts` | New | Focused Playwright coverage. |
| `package.json` | Modified | Optional targeted Chromium script. |
| `scripts/run-e2e.mjs` | Reused | Existing DB isolation should remain unchanged. |
| `app/admin/tienda/pedidos/**` | Covered | Existing UI/form behavior asserted, not redesigned. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Server Action revalidation timing | Med | Wait for visible status/URL stability. |
| Seed collisions or cleanup leaks | Med | Use unique emails/tokens; delete items before orders. |
| Scope creep into helper refactor | Med | Keep helpers local unless very small. |
| All-browser flakiness/cost | Low | Run targeted Chromium first. |

## Rollback Plan

Remove the new Playwright spec and optional script. No runtime schema or product behavior should need rollback.

## Dependencies

- Existing Playwright setup, `scripts/run-e2e.mjs`, seeded auth/store data, Prisma runtime test access.

## Success Criteria

- [ ] Targeted Chromium E2E passes for admin list, detail, and status mutation.
- [ ] Optional admin-in-client-view denial passes or is explicitly deferred.
- [ ] No production behavior or broad helper refactor is introduced.
- [ ] Review-budget risk stays low and under 400 changed lines.
