# Strict TDD Verify Support

Use this checklist when strict TDD is active (`openspec/config.yaml`).

## Required evidence

1. **RED**
   - At least one failing test/validator captured before implementation.
2. **GREEN**
   - Minimal implementation made RED checks pass.
3. **TRIANGULATE**
   - Added at least one additional non-happy-path assertion.
4. **REFACTOR**
   - Cleaned implementation without behavior changes and reran checks.

## Verify command baseline

Run, at minimum:

- `pnpm validate:store-admin-products`
- `pnpm test:store-admin-products`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

If full E2E is unstable globally, run focused E2E for the scoped change and record rationale.

## Pass criteria

- Acceptance criteria from spec are covered by tests/validators or direct implementation evidence.
- No known blocker remains for the scoped change.
- Any non-scoped failures are explicitly documented as warnings with rationale.
