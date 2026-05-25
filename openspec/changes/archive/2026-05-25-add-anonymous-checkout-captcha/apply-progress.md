# Apply Progress: Add Anonymous Checkout CAPTCHA

## Status

Completed all assigned tasks for the single work unit.

## Notes

- Next.js docs check: `node_modules/next/dist/docs/**/*` returned no files before editing Server Action/form code.
- Delivery path: single focused PR under the 800-line review budget; chained PRs not recommended.
- No previous apply-progress artifact was found in OpenSpec or Engram, so this is the initial cumulative progress artifact.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1-1.4 | N/A | Structural | `pnpm test:store-checkout-order-foundation` and `pnpm test:production-security-controls` passed before edits | N/A stubs/docs check | Stubs created | Triangulation skipped: structural stubs/docs check | None needed |
| 2.1 | `scripts/test-store-checkout-order-foundation.ts` | Runtime integration | Baseline passed before edits | Anonymous missing/invalid/unavailable CAPTCHA tests failed on pre-gate redirect/order mutation | `pnpm test:store-checkout-order-foundation` passed | 3 rejection paths plus no order/item/stock/cart/revalidate/redirect side effects | Helper extracted for shared mutation assertions |
| 2.2 | `scripts/test-store-checkout-order-foundation.ts` | Runtime integration | Baseline passed before edits | Added rate-limit-before-CAPTCHA assertion | `pnpm test:store-checkout-order-foundation` passed | Verifier call counter proves zero calls under fail-closed rate limit | None needed |
| 2.3 | `scripts/test-store-checkout-order-foundation.ts` | Runtime integration | Baseline passed before edits | Valid anonymous and signed-in bypass expectations added | `pnpm test:store-checkout-order-foundation` passed | Anonymous verifier call/token capture plus signed-in zero verifier calls and `Order.userId` persistence | None needed |
| 2.4 | `scripts/test-production-security-controls.ts` | Runtime/security | Baseline passed before edits | Env documentation and fail-closed verifier tests failed against stub/missing env docs | `pnpm test:production-security-controls` passed | Documentation checks plus missing-secret fail-closed path | None needed |
| 3.1-3.5 | Same focused tests | Runtime/component | N/A after RED | RED tests already in place | Focused tests, full `pnpm test`, `pnpm lint`, and `pnpm build` passed | Missing token, invalid response, unavailable verifier, valid anonymous, signed-in bypass, and docs paths covered | Minimal helper extraction only |
| 4.1-4.3 | Full suite/lint/build | Verification | N/A | N/A | `pnpm test`, `pnpm lint`, `pnpm build` passed | N/A | Duplicated test mutation checks reduced via helper |

## Completed Tasks

- [x] 1.1 Next.js docs checked; docs absent and recorded.
- [x] 1.2 CAPTCHA verifier stub created before RED tests.
- [x] 1.3 CAPTCHA component stub created before RED tests.
- [x] 1.4 Checkout dependency injection seam added.
- [x] 2.1 Anonymous CAPTCHA rejection tests added.
- [x] 2.2 Rate-limit-before-CAPTCHA test added.
- [x] 2.3 Valid anonymous and signed-in bypass tests added.
- [x] 2.4 Security/env fail-closed tests added.
- [x] 3.1 CAPTCHA verifier implemented.
- [x] 3.2 Checkout Server Action anonymous gate implemented.
- [x] 3.3 Checkout page renders CAPTCHA only for anonymous checkout.
- [x] 3.4 CAPTCHA client island implemented.
- [x] 3.5 `.env.example` documented.
- [x] 4.1 `pnpm test` passed.
- [x] 4.2 `pnpm lint` and `pnpm build` passed.
- [x] 4.3 Test helper refactor completed where it reduced duplication.

## Verification

- `pnpm test:store-checkout-order-foundation` passed.
- `pnpm test:production-security-controls` passed.
- `pnpm test` passed.
- `pnpm lint` passed.
- `pnpm build` passed.

## Deviations

- None. Implementation matches the design. The selected provider is Cloudflare Turnstile-compatible through the provider-neutral verifier seam.

## Remaining Tasks

- None for this change.
