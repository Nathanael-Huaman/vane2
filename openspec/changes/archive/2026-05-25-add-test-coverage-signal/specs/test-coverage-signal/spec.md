# Test Coverage Signal Specification

## Purpose

Define how the project exposes a non-blocking coverage signal over the existing script-based test suite without migrating test runners or adding E2E execution to CI.

## Requirements

### Requirement: Coverage command for existing script tests

The system MUST provide an explicit coverage command that exercises the existing script-based test suite or a documented coverage-compatible subset.

The coverage command MUST NOT change the behavior of `pnpm test`.

#### Scenario: Coverage command runs without changing default tests

- GIVEN the project has script-based validation and runtime tests
- WHEN a maintainer runs the coverage command
- THEN coverage MUST execute through the existing Node/tsx test scripts or documented wrappers
- AND `pnpm test` MUST remain available with its existing semantics

#### Scenario: Coverage command avoids E2E scope creep

- GIVEN E2E-in-CI is a separate audit warning
- WHEN coverage support is added
- THEN the coverage command MUST NOT add Playwright/E2E execution to CI
- AND E2E coverage MUST remain out of scope for this change

### Requirement: Coverage artifacts are generated and ignored

The system MUST generate a reviewer-visible coverage signal, such as text summary and machine-readable reports, while keeping generated artifacts out of tracked diffs.

#### Scenario: Coverage output is visible and untracked

- GIVEN the coverage command completes successfully
- WHEN coverage output is produced
- THEN a text summary SHOULD be visible in command output
- AND generated coverage files MUST be ignored by version control

#### Scenario: Coverage output has stable location

- GIVEN a maintainer wants to inspect coverage details locally
- WHEN the coverage command runs
- THEN report artifacts SHOULD be written under the ignored `coverage/` directory
- AND the output location MUST be documented in scripts or SDD artifacts

### Requirement: Initial coverage signal is non-blocking

Initial coverage MUST be report-only and MUST NOT enforce percentage thresholds until a stable baseline is established.

#### Scenario: Low baseline does not fail CI

- GIVEN the first coverage baseline is noisy or low
- WHEN the coverage command runs
- THEN the command SHOULD report metrics without failing solely on threshold percentages
- AND threshold enforcement MUST be deferred to a later explicit change

#### Scenario: Coverage failures still fail on test errors

- GIVEN a wrapped test command exits non-zero
- WHEN coverage runs
- THEN the coverage command MUST fail because the underlying tests failed
- AND the failure MUST NOT be hidden by report-only threshold behavior

### Requirement: Coverage scope is documented

The system MUST document what source paths are included or excluded from the initial coverage signal.

#### Scenario: Source inclusion is explicit

- GIVEN coverage results are reviewed
- WHEN maintainers interpret the report
- THEN included production source paths MUST be documented
- AND excluded generated, test, seed, and report plumbing paths SHOULD be documented
