# Design: Add Test Coverage Signal

## Technical Approach

Add an opt-in `pnpm test:coverage` command that wraps the existing `pnpm test` flow with `c8`/V8 coverage. This keeps the current script-based `node`/`tsx` validation and runtime tests intact, avoids runner migration, and excludes E2E coverage. The signal is reporting-only: no thresholds, no CI gating in this slice.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `c8` using V8 coverage | Works with ESM and child Node processes via inherited coverage env; less invasive than instrumentation runners. | Use `c8` as a dev dependency. |
| Keep `pnpm test` unchanged | Coverage is opt-in, but baseline CI remains stable. | Add `test:coverage`; do not replace `test`. |
| No CI wiring initially | Reviewers must run/read coverage locally for this slice, but CI avoids duplicate long-running seeded tests and coverage-tool flakiness. | Leave `.github/workflows/ci.yml` unchanged. |
| Non-blocking baseline | Early numbers may be low because many validators read files instead of executing modules. | Report text/HTML/LCOV only; no thresholds. |

## Data Flow

```text
pnpm test:coverage
  └─ c8 pnpm test
       ├─ node scripts/validate-*.mjs
       ├─ tsx scripts/test-*.ts
       └─ seeded Prisma/runtime scripts
            └─ app/components/hooks/lib modules executed by tests
                 └─ coverage/{lcov.info,index.html,text summary}
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.c8rc.json` | Create | Centralize coverage reporters and include/exclude patterns. |
| `package.json` | Modify | Add dev dependency `c8` and script `"test:coverage": "c8 pnpm test"`. Keep `"test"` unchanged. |
| `pnpm-lock.yaml` | Modify | Lock the resolved `c8` dependency. |
| `openspec/config.yaml` | Modify | Set `testing.coverage.available: true` and `command: pnpm test:coverage` after the command exists. |
| `.github/workflows/ci.yml` | No change | CI continues `pnpm lint`, `pnpm test`, `pnpm build`; no E2E or coverage step. |
| `.gitignore` | No change | `/coverage` is already ignored. |

## Interfaces / Contracts

`.c8rc.json` contract:

```json
{
  "all": true,
  "reporter": ["text", "lcov", "html"],
  "extension": [".js", ".jsx", ".mjs", ".ts", ".tsx"],
  "include": ["app/**", "components/**", "hooks/**", "lib/**"],
  "exclude": ["lib/generated/**", "lib/testing/**", "scripts/**", "e2e/**", "coverage/**", ".next/**", "next-env.d.ts", "*.config.*"]
}
```

Generated artifacts live under `coverage/`; `coverage/lcov.info` and `coverage/index.html` are the reviewer-facing outputs.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit/runtime | Existing `tsx` runtime scripts still pass under coverage. | `pnpm test:coverage` |
| Validation | Existing `node` validators still pass under coverage. | Included through wrapped `pnpm test`. |
| Regression | Existing baseline command is unchanged. | `pnpm test` |
| CI safety | CI remains unchanged. | Inspect workflow or run existing `pnpm lint && pnpm test && pnpm build`. |

Verification commands: `pnpm install`, `pnpm test`, `pnpm test:coverage`, then confirm `coverage/lcov.info` and `coverage/index.html` exist and are ignored.

## Migration / Rollout

No data migration required. Roll out as local/reviewer opt-in first; CI coverage can be proposed later after baseline duration and noise are understood.

## Open Questions

None.
