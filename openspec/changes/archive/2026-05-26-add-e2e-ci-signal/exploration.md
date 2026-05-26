# Exploration: Add E2E CI Signal

## Current State

The frontend already has Playwright E2E coverage, but CI does not run it. `.github/workflows/ci.yml` currently runs install, Prisma migrate deploy, lint, `pnpm test`, and build on PRs and pushes to `dev`/`main`. `.github/workflows/pr-validation.yml` only validates PR metadata.

`package.json` exposes broad E2E commands (`pnpm test:e2e`, `pnpm test:e2e:all`) plus targeted Chromium scripts such as `pnpm test:store-admin-orders:e2e`. The default `pnpm test` intentionally excludes E2E. The recently archived coverage signal explicitly kept E2E-in-CI out of scope and documents it as a separate audit warning.

Playwright is configured in `playwright.config.ts` with `testDir: ./e2e`, single-worker execution, a `pnpm dev --port` web server, `retries: 0`, and browser projects for Chromium, Firefox, WebKit, and mobile Chromium. `scripts/run-e2e.mjs` is the important stabilizer: it assigns per-project ports, creates a clean SQLite database under `.tmp/e2e-db`, runs `prisma db push`, seeds store data and auth users, clears per-target `.next-e2e` output, and then invokes Playwright.

Existing E2E specs rely on direct Prisma setup through `createRuntimePrismaClient()`, seeded auth users, and direct session-cookie seeding for authenticated paths. The best current smoke candidate is `e2e/store-admin-orders.spec.ts`, because it is already targeted, Chromium-only via `pnpm test:store-admin-orders:e2e`, uses deterministic seed/reset behavior, and previously verified a real browser list/detail/status mutation flow plus an access-denied case.

## Affected Areas

- `.github/workflows/ci.yml` — likely place to add a controlled E2E CI job or step; currently has no Playwright browser install and no E2E command.
- `.github/workflows/pr-validation.yml` — should remain metadata-only unless the proposal intentionally creates a separate workflow instead of expanding CI.
- `package.json` — already has targeted E2E scripts; may only need a stable alias such as `test:e2e:smoke` if the team wants workflow readability.
- `playwright.config.ts` — currently uses the dev server and no retries; changing retries/server mode would affect all E2E and should be avoided unless flakiness is observed.
- `scripts/run-e2e.mjs` — should be reused because it handles isolated DBs, ports, seed setup, and per-target output cleanup.
- `e2e/store-admin-orders.spec.ts` — strongest initial smoke candidate for PR-gated signal; exercises a real server-rendered/admin mutation path with controlled data.
- `e2e/*.spec.ts` — broad full-suite execution is available but too large and variable for the first CI signal.
- `scripts/seed-store.ts` and `scripts/create-test-auth-users.ts` — required by the E2E runner; CI env must allow these scripts to run against SQLite.
- `openspec/config.yaml` and `openspec/specs/test-coverage-signal/spec.md` — current testing metadata and prior audit context; coverage signal is available, but E2E-in-CI remains separate.

## Approaches

1. **Add E2E directly to existing CI checks** — append browser install plus an E2E command to the existing `checks` job.
   - Pros: Simple mental model, one required CI result, fastest path to eliminating the audit warning.
   - Cons: Increases the critical path for every PR/push, couples lint/test/build failures with Playwright/browser/install failures, and makes flakiness block all CI. Running `pnpm test:e2e` would execute every spec in Chromium; running `pnpm test:e2e:all` would multiply that across four browser projects.
   - Effort: Low

2. **Add separate opt-in/manual/scheduled E2E workflow** — create a workflow triggered by `workflow_dispatch` and optionally `schedule`.
   - Pros: Keeps PR CI fast, gives maintainers a repeatable browser signal, and limits surprise failures while browser install/cache behavior stabilizes.
   - Cons: Weak PR protection because regressions can merge without E2E evidence; audit warning may only be partially addressed if the goal is CI signal on changes.
   - Effort: Low/Medium

3. **Add PR-gated narrow smoke E2E job** — add a separate CI job for one focused Chromium smoke command, ideally `pnpm test:store-admin-orders:e2e` or a tiny `test:e2e:smoke` alias that wraps it.
   - Pros: Real PR signal with bounded runtime, isolates E2E failures from lint/test/build logs, reuses the existing runner's DB/seed isolation, avoids all-browser/full-suite cost, and keeps review size small if limited to workflow plus optional script alias.
   - Cons: Does not prove the full E2E suite; still needs browser dependency installation in CI; a dev-server Playwright smoke can still be flaky if app startup or seeded data changes.
   - Effort: Medium

## Recommendation

Use Approach 3: add a separate PR-gated narrow smoke E2E job, not a full-suite step inside the existing `checks` job.

The initial smoke should run Chromium only with one existing deterministic spec, preferably `pnpm test:store-admin-orders:e2e`, because that script already narrows to one high-value admin workflow and uses `scripts/run-e2e.mjs` for clean SQLite setup. The job should install dependencies, install only Chromium browser dependencies with Playwright, and run after or alongside the normal checks without changing `pnpm test` semantics.

Avoid full `pnpm test:e2e` or all-browser CI as the first slice. That is how you turn a useful signal into a noisy tax. Start with a small, real browser path, measure stability/runtime, then expand deliberately.

## Risks

- CI time can grow quickly if the workflow runs the broad E2E command or all Playwright projects instead of a single Chromium smoke.
- Flakiness risk is non-zero because Playwright starts `pnpm dev`; server startup, route compilation, and async Server Action revalidation can fail differently in CI than locally.
- Browser install is currently absent from CI; adding `pnpm exec playwright install --with-deps chromium` or equivalent is required and may dominate first-run time.
- Browser cache strategy is not present today; adding cache too early can expand review surface, but omitting it may make the smoke slower.
- Env/secrets should remain minimal: existing CI already provides `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `APP_URL`, and `DATABASE_URL`; `scripts/run-e2e.mjs` overrides `DATABASE_URL` per target, but inherited auth/app env still matters.
- DB setup is controlled by `scripts/run-e2e.mjs`, but specs run outside that script can fall back to `file:./dev.db`; CI should call the runner-backed script only.
- Review size should stay small: workflow addition plus optional package alias. Refactoring E2E helpers, changing Playwright config, or expanding specs would make this warning-fix slice bigger than needed.
- If the job is required on branch protection immediately, any early Playwright flake blocks merges; consider observing stability before making it mandatory if branch settings are external to the repo.

## Ready for Proposal

Yes. Proposal should scope the change to a controlled CI E2E smoke signal: add a separate PR-gated job in CI, install Chromium for Playwright, run one runner-backed targeted smoke command, preserve `pnpm test`, avoid full-suite/all-browser expansion, and defer retries/cache/full coverage until there is measured need.
