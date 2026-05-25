# Delta for Production Security Controls

## ADDED Requirements

### Requirement: Server Action Origin Trust Boundary

Production security controls MUST define Server Actions as protected by Next.js POST-only invocation plus `Origin` to `Host`/`X-Forwarded-Host` verification, and MUST treat broad trusted-origin configuration as non-compliant.

When `serverActions.allowedOrigins` is used, the system SHALL accept only narrowly scoped, deployment-owned origins and MUST reject unsafe wildcard or broad patterns.

#### Scenario: Default first-party posture remains compliant

- GIVEN a deployment where Server Actions run on the same first-party origin
- WHEN production security controls are validated
- THEN `serverActions.allowedOrigins` MUST be absent or empty
- AND Server Action requests MUST rely on Next.js POST plus origin-host verification

#### Scenario: Explicit proxy origins are narrowly allowlisted

- GIVEN a deployment topology that requires trusted proxy or alternate first-party origins
- WHEN `serverActions.allowedOrigins` is configured
- THEN each allowed value MUST be an exact `host[:port]` entry derived from known HTTPS deployment origins
- AND the resulting allowlist MUST NOT include catch-all or domain-wide wildcard trust

#### Scenario: Wildcard or broad origin trust is rejected

- GIVEN `serverActions.allowedOrigins` contains `*`, wildcard host patterns, or similarly broad trust entries
- WHEN static or runtime production-security validation executes
- THEN validation MUST fail with actionable remediation guidance
- AND the deployment posture MUST be marked non-compliant until corrected

#### Scenario: Malformed or unsafe origins are rejected by tests

- GIVEN `serverActions.allowedOrigins` includes scheme-bearing, path-bearing, query-bearing, null-origin, or malformed host values
- WHEN production-security tests validate the policy
- THEN tests MUST assert rejection of those values
- AND compliant configurations MUST continue to pass without weakening origin checks

### Requirement: Server Action Origin Policy Documentation

The system MUST document accepted Server Action origin policy for operators, including when custom origins are required, which configuration inputs are accepted, and that broad trust patterns are prohibited.

#### Scenario: Operators receive explicit configuration contract

- GIVEN an operator configures deployment environment variables or config for Server Action origins
- WHEN they follow project documentation
- THEN documentation MUST specify the accepted exact `host[:port]` format and intended use cases
- AND documentation MUST state that wildcard or broad origins are forbidden

#### Scenario: Documentation aligns with validator behavior

- GIVEN security validators enforce Server Action origin policy
- WHEN documentation and validator expectations are reviewed together
- THEN documented allowed inputs MUST match what validators accept
- AND documented disallowed inputs MUST match what validators reject
