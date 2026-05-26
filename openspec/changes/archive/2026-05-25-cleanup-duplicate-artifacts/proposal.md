# Proposal: Cleanup Duplicate Artifacts

## Intent

Remove one proven tracked duplicate report artifact while preserving canonical reports and immutable SDD/OpenSpec archive history.

## Scope

### In Scope
- Validate duplicate cleanup by byte hash and repository reference checks.
- Remove tracked duplicate `reports/sdd-explore-store-cart-foundation-scout.md`.
- Keep canonical `reports/sdd-explore-store-cart-foundation.md`.
- Document optional local cleanup for ignored `reports/ticket-18-functional-validation 2.json` and stale `.git/index 2` without adding them to the tracked application diff.

### Out of Scope
- Any changes under `openspec/changes/archive/*` or `openspec/archive/*`.
- Coverage, E2E-in-CI, route loading, CAPTCHA, pagination, or application behavior changes.
- Rewriting historical report/spec artifacts for normalization.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

Use conservative canonical cleanup: delete only the duplicate that is byte-identical, tracked, unreferenced as canonical, and outside archive history. Treat local ignored duplicates as developer-worktree cleanup only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `reports/sdd-explore-store-cart-foundation-scout.md` | Removed | Tracked duplicate of canonical store cart foundation exploration report. |
| `reports/sdd-explore-store-cart-foundation.md` | Unchanged | Canonical report retained. |
| `reports/ticket-18-functional-validation 2.json` | Unchanged/Local only | Ignored duplicate may be cleaned locally, not tracked. |
| `.git/index 2` | Unchanged/Local only | Stale Git-side file may be cleaned locally, not tracked. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing a canonical artifact by mistake | Low | Require matching SHA-1 and reference validation before deletion. |
| Damaging audit trail | Low | Explicitly exclude `openspec/changes/archive/*` and `openspec/archive/*`. |

## Test Plan

- Confirm SHA-1 identity before deletion.
- Confirm tracked diff only removes `reports/sdd-explore-store-cart-foundation-scout.md` plus SDD proposal artifacts.
- No application test run required unless implementation touches app code.

## Review-Budget Risk

Low — expected tracked diff is a small artifact deletion plus SDD docs, well under 800 changed lines.

## Rollback Plan

Restore `reports/sdd-explore-store-cart-foundation-scout.md` from Git history if any downstream reference unexpectedly depends on it.

## Dependencies

- Existing exploration artifact and hash/reference validation.

## Success Criteria

- [ ] Duplicate tracked scout report is removed after validation.
- [ ] Canonical report remains unchanged.
- [ ] No archive or application code files are modified.
