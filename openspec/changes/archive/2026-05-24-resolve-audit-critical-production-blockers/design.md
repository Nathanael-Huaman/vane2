# Design: Resolve Audit Critical Production Blockers

## Technical Approach

Add one server-only rate-limit layer for public mutations, then call it before credential lookup, token validation/consumption, checkout validation, stock checks, or transactions. Production prefers Coolify/VPS Redis TCP via `REDIS_URL`; if absent, it falls back to the existing Upstash/Redis-compatible REST store selected by env. Memory counters are allowed only in local/test. If production lacks shared-store config, protected mutations fail closed with neutral, retry-safe responses.

Security headers/CSP are centralized in a pure header builder and wired at the app level. `node_modules/next/dist/docs/` was checked and no docs files were present, so implementation MUST verify the Next 16.2.6 `next.config.mjs` `headers()` contract with `pnpm build`; if unsupported/deprecated, use `middleware.js` as the fallback wiring.

## Architecture Decisions

| Decision | Option | Tradeoff | Decision |
|---|---|---|---|
| Rate-limit store | Redis TCP vs Upstash/Redis REST vs Prisma table vs memory | Redis TCP matches Coolify/VPS production and uses a small official client dependency; REST remains cross-instance fallback; Prisma adds hot writes; memory is unsafe in production. | Use `REDIS_URL` first, REST env vars second, memory only local/test. |
| Keys/logging | Raw identifiers vs HMAC hashes | Hashes avoid account/cart/token disclosure while keeping debuggability. | HMAC normalized actor parts with `RATE_LIMIT_KEY_SECRET`; logs store surface/decision/retry only. |
| CSP rollout | Enforce immediately vs staged | Immediate enforce may break Next runtime, `next-themes`, fonts, or assets. | Start Report-Only by default; enforce only after violation inventory is clean or documented. |
| Blog HTML | Trust markdown escaping vs final sanitizer | Existing escaping is good, but `dangerouslySetInnerHTML` deserves a second guard. | Keep escaping and sanitize final HTML, stripping executable tags, event handlers, and dangerous URLs. |

## Data Flow

```text
Request/Action -> derive actor hash -> checkRateLimit(surface)
  denied -> neutral response + safe log, no DB/token/order work
  allowed -> existing validation/auth/reset/checkout flow

Page response -> securityHeaderBuilder(mode) -> CSP Report-Only/Enforce headers
Blog markdown -> escape markdown -> sanitize HTML -> dangerouslySetInnerHTML under CSP
```

## File Changes

| File | Action | Description |
|---|---|---|
| `lib/server/security/rate-limit.js` | Create | Store adapters, actor hashing, limit contracts, safe logging metadata. |
| `lib/server/security/security-headers.js` | Create | CSP/security header builder with report-only/enforce/off modes. |
| `app/api/auth/credentials-login/route.js` | Modify | Check login limit after form parse, before validation/auth/session creation; remove raw email logs. |
| `app/api/auth/registro/route.js` | Modify | Check registration limit before `registrarUsuario`; generic 429 JSON. |
| `lib/actions/password-reset.js` | Modify | Pass request context if needed; keep neutral public responses. |
| `lib/server/password/password-reset-security.js` | Modify | Replace prepared-only checks with enforced shared limiter decisions. |
| `lib/server/password/password-reset.js` | Modify | Stop on `allow:false` before user/token lookup or password mutation; safe audit fields only. |
| `lib/actions/store-checkout-dependencies.js` | Modify | Add `headers()` dependency for testable actor derivation. |
| `lib/actions/store-checkout.js` | Modify | Check checkout limit before input validation and `createOrderFromCart`; preserve cart on denial. |
| `next.config.mjs` | Modify | Wire app-level headers if verified for Next 16.2.6. |
| `middleware.js` | Create if needed | Fallback header wiring if Next config headers are unavailable. |
| `lib/server/blog/markdown.js`, `app/blog/[slug]/page.js` | Modify | Apply sanitizer defense-in-depth before HTML injection. |
| `scripts/test-production-security-controls.ts`, validators/package scripts | Create/Modify | RED/GREEN coverage included in `pnpm test`. |

## Interfaces / Contracts

```js
checkRateLimit({ surface, actorParts, limit })
// -> { allowed, retryAfterSeconds, store, decision }
```

Covered denial responses MUST NOT reveal account, email, token, cart, product, or order existence. Logs MUST NOT include raw email, token, cart contents, secrets, or full payloads.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | limiter windows, production store guard, HMAC redaction, CSP builder, sanitizer edge cases | Add stubs first, then `tsx` script tests. |
| Integration | login/registration/reset/checkout stop before expensive work; checkout cart remains | Dependency-injected tests and existing seeded checkout runtime pattern. |
| Build/verify | Next header wiring compatibility | `pnpm test`, `pnpm lint`, `pnpm build`; inspect report-only/enforce header names. |

## Migration / Rollout

No data migration. Deploy with `SECURITY_HEADERS_CSP_MODE=report-only`, `RATE_LIMIT_KEY_SECRET`, and a configured shared rate-limit store: `REDIS_URL` for Coolify/VPS Redis TCP first, or `RATE_LIMIT_REST_URL` + `RATE_LIMIT_REST_TOKEN` for REST-compatible Redis/Upstash fallback. Promote CSP to `enforce` after violations are resolved. Roll back by switching CSP to report-only/off while keeping baseline headers; rate-limit rollback requires disabling enforcement only outside production or restoring prior config.

## Open Questions

- [ ] Non-blocking: confirm production provider env values for Coolify/VPS `REDIS_URL` and `RATE_LIMIT_KEY_SECRET` before deployment; REST values remain fallback/alternative only when `REDIS_URL` is absent.

## Review / Work Units

400-line budget risk: Medium. Use work-unit commits, likely split into: (1) shared limiter + auth/reset integration/tests, (2) checkout integration/tests, (3) CSP/blog/header tests.
