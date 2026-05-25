# Design: Document and Validate Server Action CSRF Origin Policy

## Technical Approach

Document the project policy that Server Actions rely on Next.js 16.2.6 POST-only detection and Origin-vs-Host/`X-Forwarded-Host` validation, then add a narrow configuration/validation path only for deployments that truly need extra accepted hosts. `node_modules/next/dist/docs/` is absent in this install; design is based on project code plus installed Next source: `server-action-request-meta.js` requires POST for possible Server Actions, `action-handler.js` blocks mismatched Origin/Host unless `serverActions.allowedOrigins` matches, and `csrf-protection.js` supports exact/wildcard host patterns.

No Server Action bodies, Prisma access, CAPTCHA, pagination, CI/E2E, or broad CSRF-token machinery are changed. Server/client boundary stays with Next’s Server Action transport; this change only configures and validates framework policy.

Spec artifact was absent in OpenSpec and Engram at design time; this is not a blocker.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Default to no `serverActions.allowedOrigins` | Strongest reliance on Next same-host protection; proxy edge cases need explicit config | Chosen default |
| Env-driven exact host allow-list | Supports reverse proxies/domains; must reject broad entries | Chosen as optional path via `SERVER_ACTION_ALLOWED_ORIGINS` |
| Wildcards like `*.example.com` | Next supports them, but they broaden CSRF bypass surface | Reject for this project; require explicit hosts |
| Per-action CSRF tokens | More code and UX impact; duplicates framework protection | Rejected as out of scope |

## Data Flow

```
Browser form/fetch POST ──cookies+Origin──> Next Server Action handler
          │                                  │
          │                                  ├─ compare Origin host to XFH/Host
          │                                  ├─ if mismatch, check exact allowedOrigins
          │                                  └─ execute action only after policy passes
Deploy env ──SERVER_ACTION_ALLOWED_ORIGINS──> next.config.mjs
```

## File Changes

| File | Action | Description |
|---|---|---|
| `lib/server/security/server-action-origin-policy.js` | Create | Pure parser/validator for comma-separated exact host allow-list and Next config fragment. |
| `next.config.mjs` | Modify | Import helper and spread optional `serverActions.allowedOrigins`; absent env leaves config unchanged. |
| `scripts/validate-production-security-controls.mjs` | Modify | Static checks that helper is wired, env is documented, and no broad/wildcard `allowedOrigins` literals exist. |
| `scripts/test-production-security-controls.ts` | Modify | Runtime tests for absent config, exact host parsing/dedupe, and rejection of wildcard, scheme, path, or empty values. |
| `.env.example` | Modify | Document `SERVER_ACTION_ALLOWED_ORIGINS` as optional exact host[:port] entries for proxy/domain deployments. |
| `openspec/specs/production-security-controls/spec.md` / change delta | Modify | Add Server Action origin/CSRF policy requirements and scenarios. |

## Interfaces / Contracts

```js
buildServerActionConfig(env = process.env)
// -> {} when unset
// -> { serverActions: { allowedOrigins: ["store.example.com"] } }
// throws on *, **, wildcard labels, URLs, paths, or blank entries
```

Accepted values are exact hostnames or host:port pairs matching Next’s host comparison, not full URL origins.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Parser/config helper | Add script tests in `scripts/test-production-security-controls.ts` with explicit env maps. |
| Static validation | Unsafe config cannot land | Extend `scripts/validate-production-security-controls.mjs` regex/source checks. |
| Integration | Existing production security suite includes checks | Use existing `pnpm validate:production-security-controls` and `pnpm test:production-security-controls`. |
| E2E | Not planned | Out of scope per launch instructions. |

## Migration / Rollout

No migration required. Deploy with env unset unless a proxy/domain mismatch is confirmed; then add exact host entries only.

## Risks

- Exact-host-only policy may reject legitimate wildcard proxy setups; mitigation is to enumerate deployment hosts.
- Static regex validation can miss generated config; runtime helper tests reduce that gap.

## Open Questions

None.
