# Proposal: Add Test Coverage Signal

## Intent

Add a lightweight coverage signal for the existing script-based test suite so reviewers can see exercised code paths without migrating test runners or adding E2E coverage to CI.

## Scope

### In Scope
- Add a minimal coverage command for current `node`/`tsx` validation and runtime tests.
- Prefer V8/c8-style instrumentation if design confirms compatibility with ESM and `tsx` scripts.
- Document coverage output location and keep thresholds non-blocking initially.
- Keep implementation within review budget; risk: Low.

### Out of Scope
- E2E coverage or E2E-in-CI changes.
- Test runner migration.
- Route loading, CAPTCHA, pagination, or duplicate cleanup work.
- Enforcing coverage thresholds beyond reporting the signal.

## Capabilities

### New Capabilities
- `test-coverage-signal`: Defines how the project exposes a coverage signal over existing script-based tests.

### Modified Capabilities
- None.

## Approach

Introduce a coverage wrapper around the existing `pnpm test` flow, likely via V8/c8 tooling. Add package/script configuration only after design validates compatibility with current ESM, `tsx`, Prisma seed scripts, and long-running test commands. Coverage should be opt-in/local or CI-safe without changing `pnpm test` semantics.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add coverage script and dev dependency if needed. |
| `pnpm-lock.yaml` | Modified | Reflect coverage tooling dependency if added. |
| `coverage/` or `.gitignore` | New/Modified | Ensure generated coverage artifacts are ignored. |
| `openspec/specs/test-coverage-signal/spec.md` | New | Capture requirements for coverage reporting. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Coverage wrapper breaks seeded scripts | Med | Design and test against existing `pnpm test` before wiring CI usage. |
| Output is noisy or misleading | Med | Start as non-blocking signal with documented limitations. |
| Review scope expands | Low | Restrict to scripts/config/spec; defer test rewrites. |

## Rollback Plan

Remove the coverage script/dependency, generated ignore rule, and `test-coverage-signal` spec/change artifacts. Existing `pnpm test`, lint, build, and E2E commands remain unchanged.

## Dependencies

- Coverage tooling compatible with Node >=20.19, ESM, and `tsx` script execution.

## Success Criteria

- [ ] A coverage command runs over current script-based tests without changing `pnpm test` behavior.
- [ ] Coverage artifacts are generated or reported and ignored from tracked diffs.
- [ ] No E2E-in-CI, runner migration, or unrelated feature cleanup is introduced.
