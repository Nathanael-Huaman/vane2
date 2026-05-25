# Delta for Production Security Controls

## ADDED Requirements

### Requirement: Shared Rate Limiting for Public Mutations

Public, unauthenticated, or abuse-prone mutations MUST enforce server-side rate limits before expensive authentication, token, database, or checkout work begins.

The shared rate-limit capability MUST cover login, registration, password reset request, password reset confirmation when it mutates credentials or token state, and checkout submission. Production deployments MUST use a shared cross-instance backing store for counters; Coolify/VPS deployments SHOULD use Redis TCP via `REDIS_URL` as the primary path, with Redis/Upstash-compatible REST variables available as a fallback/alternative. Process-local counters MAY be used only for local development, deterministic tests, or explicitly non-production previews.

Throttle responses and operational logs MUST NOT disclose whether an account, email, reset token, cart, product, or order exists.

#### Scenario: Auth mutation throttles repeated attempts

- GIVEN a request actor repeatedly submits login, registration, password reset request, or password reset confirmation attempts beyond the configured limit
- WHEN another covered request is submitted
- THEN the system MUST reject or defer the request before credential, token, or user lookup side effects proceed
- AND the response MUST be controlled and retry-safe
- AND the response MUST NOT reveal account, email, or token existence

#### Scenario: Password reset security enforcement is active

- GIVEN the password reset security layer evaluates an actor as over the configured limit
- WHEN password reset request or confirmation handling continues
- THEN the security layer MUST return a denied decision that callers enforce
- AND callers MUST NOT continue reset email, token validation, token consumption, or password mutation work for the denied attempt

#### Scenario: Production uses shared counters

- GIVEN the application runs in production where more than one server instance or cold-started runtime is possible
- WHEN rate limiting is initialized
- THEN counters MUST be backed by shared storage across instances
- AND local memory MUST NOT be the production enforcement mechanism

#### Scenario: Safe observability preserves privacy

- GIVEN a covered request is allowed, denied, or malformed
- WHEN the event is logged or measured
- THEN logs MUST include enough operational context to diagnose throttling behavior
- AND logs MUST NOT include reset tokens, raw secrets, full sensitive payloads, or account-enumerating outcomes

### Requirement: App-Level Security Headers and CSP

The application MUST send baseline browser security headers for app routes, including a Content Security Policy that reduces XSS impact without breaking required Next.js runtime scripts, styles, images, fonts, API calls, or framework/static assets.

The CSP rollout SHOULD begin in report-only mode when compatibility is uncertain, then move to enforcement after required runtime violations are resolved or explicitly justified. The final enforced policy MUST avoid broad unsafe allowances except where a framework/runtime constraint is documented.

#### Scenario: Security headers are present on app pages

- GIVEN a browser requests an application page
- WHEN the response is served
- THEN CSP and baseline security headers MUST be present
- AND the policy MUST allow required same-origin framework and static assets
- AND the policy MUST avoid unnecessarily broad third-party origins

#### Scenario: CSP rollout avoids runtime breakage

- GIVEN a CSP change has unknown compatibility with scripts, styles, images, fonts, analytics, or framework assets
- WHEN the policy is introduced
- THEN it SHOULD be delivered as report-only first
- AND enforcement MUST NOT ship until required runtime violations are resolved or explicitly allowed

#### Scenario: Header rollback is safe

- GIVEN a deployed CSP blocks required application behavior
- WHEN operators need to mitigate quickly
- THEN the CSP MUST be switchable back to report-only or a previously known-safe policy without disabling unrelated baseline security headers

### Requirement: Blog HTML Defense in Depth

Blog content rendered as HTML MUST be treated as untrusted display content and MUST NOT rely on CSP as the only XSS mitigation.

Rendered blog HTML MUST exclude executable markup, dangerous URL schemes, and inline event handlers before it reaches the browser. CSP MUST provide an additional containment layer for any missed unsafe content on pages that render blog HTML.

#### Scenario: Unsafe blog markup is neutralized

- GIVEN blog content contains script tags, inline event handlers, or `javascript:` URLs
- WHEN the blog post is rendered
- THEN executable content MUST NOT run in the browser
- AND the page CSP MUST further restrict script execution

#### Scenario: Blog rendering remains functional under CSP

- GIVEN a legitimate blog post contains expected formatted markdown-derived HTML
- WHEN the post is rendered with CSP/security headers active
- THEN the content MUST remain readable and styled according to existing app behavior
- AND CSP MUST NOT require trusting arbitrary inline script execution for blog content

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
