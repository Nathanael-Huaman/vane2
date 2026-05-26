# Tasks: Cleanup Duplicate Artifacts

## Review Workload Forecast

- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: Low
- Delivery decision: single PR
- Chain strategy: N/A

## Phase 1: Conservative Duplicate Validation and Cleanup

- [x] 1.1 Validate `reports/sdd-explore-store-cart-foundation.md` and `reports/sdd-explore-store-cart-foundation-scout.md` are byte-identical before deletion.
- [x] 1.2 Validate canonical references resolve to canonical artifact paths and the scout duplicate is unreferenced outside this active change.
- [x] 1.3 Delete tracked duplicate `reports/sdd-explore-store-cart-foundation-scout.md` only after validation passes.
- [x] 1.4 Remove optional ignored/local stale duplicates `reports/ticket-18-functional-validation 2.json` and `.git/index 2` if present, keeping them out of tracked diff.
- [x] 1.5 Run final status/diff validation and persist cleanup progress.

## Notes

- `tasks.md` was absent at apply start, so this active-change task artifact was created from the assigned apply scope and marked complete after validation.
