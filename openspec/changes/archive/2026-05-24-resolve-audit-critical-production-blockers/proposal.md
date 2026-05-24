# Proposal: Resolve Audit Critical Production Blockers

## Intent

Close the two CRITICAL production blockers from Judgment Day: abuse-prone unauthenticated mutations and missing browser XSS defense-in-depth for blog HTML rendering.

## Scope

### In Scope
- Add enforced rate limiting to login, registration, password reset request/confirm, and checkout.
- Add app-wide CSP and security headers, explicitly protecting blog `dangerouslySetInnerHTML` paths.
- Decide production rate-limit storage and CSP rollout strategy before implementation.

### Out of Scope
- CSRF Server Action redesign, CAPTCHA, order pagination, streaming SSR/loading work.
- E2E CI/test-runner overhaul and duplicate `* 2` directory cleanup.
- Referrer-Policy cleanup except as part of security header recommendation.

## Capabilities

### New Capabilities
- `production-security-controls`: shared rate limiting, CSP, and security headers for production-facing mutation and render surfaces.

### Modified Capabilities
- `store-checkout-order-foundation`: checkout MUST reject abusive repeated attempts before order creation.

## Approach

Use centralized server-side rate-limit helpers with a production shared store decision gate: prefer Coolify/VPS Redis TCP via `REDIS_URL`, with Redis/Upstash-compatible REST variables as a fallback/alternative, over process memory for multi-instance safety. Wire limits at auth API routes, password reset actions/security layer, and checkout action before expensive DB work. Add headers in `next.config.mjs` or equivalent framework-supported middleware. Roll CSP in `Report-Only` first if inline/script compatibility is uncertain, then enforce with nonce/hash/allowlist fixes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/api/auth/credentials-login/route.js` | Modified | Login throttling |
| `app/api/auth/registro/route.js` | Modified | Registration throttling |
| `lib/actions/password-reset.js` | Modified | Reset request/confirm throttling |
| `lib/server/password/password-reset-security.js` | Modified | Enable/reset security enforcement |
| `lib/actions/store-checkout.js` | Modified | Checkout throttling before order transaction |
| `next.config.mjs` | Modified | CSP and security headers |
| `app/blog/[slug]/page.js`, `lib/server/blog/markdown.js` | Reviewed | CSP defense-in-depth around rendered HTML |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CSP breaks scripts/styles/assets | Med | Start Report-Only or test strict allowlist before enforce |
| In-memory limits fail in production | High | Require shared external store decision |
| Legit users blocked | Med | Per-surface thresholds and clear retry behavior |

## Rollback Plan

Disable rate-limit enforcement flags/helpers and revert header config. If CSP causes breakage, switch to Report-Only while keeping non-breaking security headers.

## Dependencies

- Production shared rate-limit store/provider values: Coolify/VPS Redis TCP via `REDIS_URL` is the primary path; REST-compatible Redis/Upstash remains a fallback/alternative.
- CSP policy inventory for scripts, styles, images, fonts, and analytics if present.

## Success Criteria

- [ ] Protected surfaces return controlled throttle responses under repeated attempts.
- [ ] CSP/security headers are present and blog HTML remains functional.
- [ ] `pnpm test`, `pnpm lint`, and `pnpm build` evidence is planned for verify.
- [ ] Review-budget risk is Medium; split rate limiting and CSP into work-unit commits if needed.
