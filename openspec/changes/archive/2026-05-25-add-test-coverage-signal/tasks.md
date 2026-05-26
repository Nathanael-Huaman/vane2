# Tasks: Add Test Coverage Signal

## Review Workload Forecast

- Decision needed before apply: No
- Chained PRs recommended: No
- 400-line budget risk: Medium
- Delivery decision: single focused PR, no size exception required
- Chain strategy: N/A
- Estimated changed lines: 180–320

## Phase 1: Non-blocking Coverage Signal

- [x] 1.1 Capture RED coverage command evidence before configuration.
- [x] 1.2 Add `c8`/V8 coverage dependency and configuration for current script-based tests.
- [x] 1.3 Add opt-in `pnpm test:coverage` script without changing `pnpm test` semantics.
- [x] 1.4 Keep generated coverage artifacts ignored and confirm `coverage/` output remains untracked.
- [x] 1.5 Update OpenSpec testing coverage availability after the script works.
- [x] 1.6 Persist apply progress in OpenSpec and Engram.
