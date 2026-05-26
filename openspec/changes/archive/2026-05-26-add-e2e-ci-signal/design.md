# Design: Add E2E CI Signal

## Technical Approach

Add a separate PR-only `e2e-smoke` job to `.github/workflows/ci.yml`. The job should reuse the repository's existing GitHub Actions setup pattern (checkout, pnpm 11.1.1, Node 22 with pnpm cache, frozen install), install only Chromium Playwright dependencies, then run the existing runner-backed command: `pnpm test:store-admin-orders:e2e`.

Do not fold E2E into `pnpm test`, do not run `pnpm test:e2e`/`pnpm test:e2e:all`, and do not change `playwright.config.ts`, `scripts/run-e2e.mjs`, or the E2E specs. The existing runner already owns isolated SQLite DB files, ports, store/auth seeding, and `.next-e2e` output directories. No Next.js route/component, server/client boundary, or Prisma data-access behavior changes are part of this design.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Separate CI job vs append to `checks` | Separate logs/status isolate browser flake; duplicate install cost is acceptable for one smoke. | Add `e2e-smoke` in `.github/workflows/ci.yml`. |
| PR-only job vs push + PR | Push coverage costs more minutes; the requested signal is PR-gated. | Use job-level `if: github.event_name == 'pull_request'`. |
| Existing targeted command vs full suite | Full/all-browser suites increase runtime and flake surface. | Run only `pnpm test:store-admin-orders:e2e`. |
| Runner-managed DB/seed vs inline CI setup | Inline setup risks diverging from local E2E behavior. | Reuse `scripts/run-e2e.mjs` unchanged. |
| Add cache/retries/config tuning now | Useful later, but expands review and changes global E2E semantics. | Defer until measured need. |

## Data Flow

```text
pull_request -> CI workflow -> e2e-smoke job
  -> install deps -> playwright install chromium
  -> pnpm test:store-admin-orders:e2e
  -> scripts/run-e2e.mjs
  -> prisma db push + seed store + seed auth users
  -> Playwright chromium -> e2e/store-admin-orders.spec.ts
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Modify | Add separate PR-only E2E smoke job with Chromium install and targeted script run. |
| `package.json` | No change | Existing `test:store-admin-orders:e2e` command is explicit enough; no alias needed. |
| `scripts/run-e2e.mjs` | No change | Continue using per-target DB, port, seed, and output isolation. |
| `playwright.config.ts` | No change | Keep one worker, zero retries, dev-server behavior, and existing projects. |
| `e2e/store-admin-orders.spec.ts` | No change | Reuse current admin list/detail/status mutation/access-denied smoke. |

## Interfaces / Contracts

The workflow job contract should be equivalent to:

```yaml
e2e-smoke:
  name: E2E smoke
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  env:
    DATABASE_URL: file:./dev.db
    AUTH_SECRET: ci-auth-secret-at-least-32-characters
    AUTH_URL: http://localhost:3000
    NEXT_PUBLIC_APP_URL: http://localhost:3000
    APP_URL: http://localhost:3000
  steps:
    - checkout
    - setup pnpm 11.1.1
    - setup node 22 with pnpm cache
    - pnpm install --frozen-lockfile
    - pnpm exec playwright install --with-deps chromium
    - pnpm test:store-admin-orders:e2e
```

`DATABASE_URL` is only a fallback at workflow level; `scripts/run-e2e.mjs` replaces it with `.tmp/e2e-db/<project>-<target>.sqlite` before Prisma and Playwright run.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Workflow | YAML/job composition | Review `.github/workflows/ci.yml` diff for PR-only guard, setup parity, Chromium install, and targeted command. |
| Local E2E | Existing smoke command | Run `pnpm test:store-admin-orders:e2e` where browser deps are available. |
| CI | PR-gated signal | Open/update a PR and require the `E2E smoke` job to pass. |

## Migration / Rollout

No migration required. Roll out as a small workflow-only slice, observe runtime/flakiness before making branch protection stricter if that setting is external. Rollback is reverting the `e2e-smoke` job; no product code or data changes are involved.

## Open Questions

- [ ] Non-blocking: should repository branch protection require `E2E smoke` immediately, or after observing a few PR runs?
