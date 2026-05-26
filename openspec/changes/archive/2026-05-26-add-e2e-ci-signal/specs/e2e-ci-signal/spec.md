# E2E CI Signal Specification
## Purpose

Define a narrow, PR-gated Playwright/Chromium smoke signal in CI without expanding the default test command, full E2E suite, browser matrix, or product behavior.

## Requirements
### Requirement: PR-gated E2E smoke job

The system MUST run a separate E2E smoke CI signal for pull requests.

#### Scenario: Pull request runs smoke E2E

- GIVEN a pull request targets the repository's main development branch
- WHEN GitHub Actions runs CI
- THEN a distinct E2E smoke job MUST run
- AND the job result MUST be visible to reviewers.

#### Scenario: Push-only runs avoid E2E smoke

- GIVEN CI runs for a non-pull-request event
- WHEN the workflow evaluates the E2E smoke job
- THEN the smoke job SHOULD be skipped unless explicitly enabled later.

### Requirement: Narrow Chromium target

The system MUST run only a bounded Chromium smoke target for the initial CI signal.

#### Scenario: Targeted command is used

- GIVEN existing package scripts include targeted E2E commands
- WHEN the E2E smoke job executes
- THEN it MUST run the selected narrow command, such as `pnpm test:store-admin-orders:e2e`
- AND it MUST NOT run `pnpm test:e2e` or `pnpm test:e2e:all`.

#### Scenario: Browser matrix remains out of scope

- GIVEN Playwright supports multiple projects
- WHEN the smoke job installs and runs browsers
- THEN it MUST limit execution to Chromium for this change.

### Requirement: Existing test semantics preserved

The system MUST preserve current lint, test, build, and package-script semantics outside the E2E smoke job.

#### Scenario: Default tests stay non-E2E

- GIVEN maintainers run `pnpm test`
- WHEN this change is applied
- THEN `pnpm test` MUST keep its existing validation/runtime behavior
- AND MUST NOT include Playwright E2E execution.

#### Scenario: Existing CI checks remain intact

- GIVEN the existing CI check job runs lint, tests, and build
- WHEN E2E smoke is added
- THEN those existing steps MUST remain present and independently readable.

### Requirement: Explicit runner setup

The system MUST make the E2E CI environment setup explicit enough to diagnose failures.

#### Scenario: Browser dependencies are installed

- GIVEN the smoke job runs on a fresh hosted runner
- WHEN dependencies are installed
- THEN the job MUST install Chromium and required Playwright system dependencies.

#### Scenario: App and database setup follows existing runner

- GIVEN `scripts/run-e2e.mjs` owns E2E DB, port, seed, and output isolation
- WHEN CI runs the smoke command
- THEN the workflow SHOULD reuse that runner instead of duplicating setup inline.

### Requirement: Reviewer-visible failure signal

The system MUST fail the E2E smoke job when the selected smoke spec fails.

#### Scenario: Smoke failure blocks the job

- GIVEN the selected Playwright smoke spec fails
- WHEN the command exits non-zero
- THEN the E2E smoke job MUST fail visibly in the pull request checks.

#### Scenario: Failure scope is identifiable

- GIVEN the smoke job fails
- WHEN a reviewer inspects CI
- THEN logs SHOULD identify the E2E smoke job separately from lint/test/build.

### Requirement: Artifacts and logs stay bounded

The system MUST avoid committing generated E2E artifacts and SHOULD keep CI output focused.

#### Scenario: Generated files remain untracked

- GIVEN Playwright or the E2E runner writes temporary output
- WHEN the smoke job completes
- THEN generated artifacts MUST remain ignored or runner-local.

#### Scenario: No broad E2E rewrites

- GIVEN this change adds CI signal only
- WHEN implementation is reviewed
- THEN it MUST NOT rewrite E2E specs, Playwright config, or product code to satisfy the job.
