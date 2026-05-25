# Proposal: Document and Validate Server Action CSRF Origin Policy

## Intent

Make the project’s Server Action CSRF/origin posture explicit, validated, and deployment-safe. Next.js 16 already restricts Server Actions to POST and compares `Origin` against `Host`/`X-Forwarded-Host`; this change documents that dependency and prevents unsafe broad origin configuration.

## Scope

### In Scope
- Add spec contract for accepted Server Action origin/CSRF posture.
- Validate `serverActions.allowedOrigins` is absent or narrowly configured from explicit deployment origins.
- Add static/runtime security-control checks covering unsafe wildcard or broad origin settings.
- Document accepted deployment origin variables/configuration when needed.

### Out of Scope
- Explicit CSRF token machinery across all Server Actions.
- Anonymous checkout CAPTCHA.
- Order pagination, `loading.js`, E2E CI, coverage, duplicate `* 2` cleanup.
- Deployed HTTP smoke coverage for confirmation-token referrer leakage.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `production-security-controls`: add requirements for Server Action CSRF/origin posture validation and deployment-safe allowed origins.

## Approach

Extend production security controls around Server Actions: inventory/validate current config, add narrow env-driven allowed-origin support only if proxy/domain deployment requires it, and update validation scripts/tests to reject wildcards or broad origins. Reference Next.js 16 POST/origin behavior in docs/specs; avoid touching each action unless validation exposes a concrete gap.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/specs/production-security-controls/spec.md` | Modified | Add Server Action origin/CSRF requirements. |
| `next.config.mjs` | Modified | Optional narrow `serverActions.allowedOrigins` support. |
| `scripts/validate-production-security-controls.mjs` | Modified | Static validation for unsafe origins. |
| `scripts/test-production-security-controls.ts` | Modified | Runtime/test coverage for validator expectations. |
| `lib/server/security/security-headers.js` | Modified | Documentation/validation touchpoint if origin posture references headers. |
| `.env.example` / docs | Modified | Document explicit deployment origin variable if introduced. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legitimate proxy deployments rejected | Med | Allow explicit exact origins; test env parsing. |
| False confidence from docs-only change | Med | Require automated validation coverage. |
| Review scope expands into all actions | Low | Limit to config, validators, docs/specs unless a specific unsafe surface is found. |

## Rollback Plan

Revert the proposal/spec delta and validator/config changes. If deployed config blocks legitimate Server Actions, remove the new allowed-origin env or revert `next.config.mjs` while keeping unrelated security headers intact.

## Dependencies

- Next.js 16 Server Action origin behavior and project deployment domain/proxy variables.

## Success Criteria

- [ ] `production-security-controls` defines Server Action CSRF/origin requirements.
- [ ] Validators reject wildcard/broad `serverActions.allowedOrigins` posture.
- [ ] Tests cover safe absent/narrow config and unsafe broad config.
- [ ] Review-budget risk remains low under 800 changed lines.
