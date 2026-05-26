# Design: Cleanup Duplicate Artifacts

## Technical Approach

Use a repository-artifact-only cleanup. Before deletion, prove candidate/canonical pairs are byte-identical, duplicate paths have no downstream references outside this active SDD change, and each path is correctly classified as tracked, ignored, or local stale. The only intended tracked cleanup is deleting `reports/sdd-explore-store-cart-foundation-scout.md`; ignored/local stale files may be cleaned manually but must not enter the PR. No application, Next.js route/component, Prisma, server/client boundary, coverage, E2E, CAPTCHA, pagination, or route-loading work is included.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Delete policy | Delete only `reports/sdd-explore-store-cart-foundation-scout.md` after hash/reference/tracking validation. | Delete all duplicate-looking files. | Suffix heuristics are unsafe; byte identity plus reference checks keep the cleanup conservative. |
| Archive policy | Do not touch `openspec/changes/archive/*` or `openspec/archive/*`. | Normalize archived artifacts too. | Archived SDD/OpenSpec content is an audit trail, not cleanup inventory. |
| Local stale policy | Keep `reports/ticket-18-functional-validation 2.json` and `.git/index 2` out of the tracked diff; optional local cleanup only. | Model them as repository changes. | The JSON duplicate is ignored local output; `.git/index 2` is Git-side local state. |
| App boundary | No `app/`, `lib/`, `components/`, `scripts/`, `prisma/`, or package changes. | Add validation scripts. | Existing Git/shell checks are enough and avoid changing behavior. |

## Data Flow

    Candidate paths
         │
         ├─→ SHA-1 byte comparison ── fail → keep
         ├─→ reference search outside active SDD change ── referenced → keep
         ├─→ git tracking/ignore check
         │        ├─ tracked duplicate → delete in PR
         │        └─ ignored/local stale → optional local cleanup only
         └─→ diff review + rollback command

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `reports/sdd-explore-store-cart-foundation-scout.md` | Delete | Tracked byte-identical duplicate of canonical report. |
| `reports/sdd-explore-store-cart-foundation.md` | Keep | Canonical report retained unchanged. |
| `reports/ticket-18-functional-validation 2.json` | Local only | Ignored duplicate output; may be removed locally, not tracked. |
| `.git/index 2` | Local only | Stale Git-side file; may be removed locally, not tracked. |
| `openspec/changes/cleanup-duplicate-artifacts/design.md` | Create | SDD design artifact. |

## Interfaces / Contracts

No runtime interfaces, server/client contracts, Prisma models, or Next.js APIs change. Cleanup is allowed only when all validation criteria below pass.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Artifact validation | Byte identity | `shasum -a 1 -- "reports/sdd-explore-store-cart-foundation.md" "reports/sdd-explore-store-cart-foundation-scout.md"`; both must equal `78fb4ca87c4bc39ac8bc1628ff62a6c0e8f96d9d`. |
| Artifact validation | Local JSON duplicate | `shasum -a 1 -- "reports/ticket-18-functional-validation.json" "reports/ticket-18-functional-validation 2.json"`; both must equal `5c0bb13e4b025f9a3f334a579ca3d3c45a4384ee`. |
| Reference check | No downstream duplicate references | `rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!openspec/changes/cleanup-duplicate-artifacts/**' 'sdd-explore-store-cart-foundation-scout\.md|ticket-18-functional-validation 2\.json' .`; expected no output. |
| Tracking check | Tracked vs ignored/local | `git ls-files --stage -- "reports/sdd-explore-store-cart-foundation.md" "reports/sdd-explore-store-cart-foundation-scout.md" "reports/ticket-18-functional-validation.json" "reports/ticket-18-functional-validation 2.json"` and `git check-ignore -v -- "reports/ticket-18-functional-validation 2.json"`; scout is tracked, `" 2"` JSON is ignored/untracked. |
| Diff check | No app code touched | `git diff --name-status -- "reports/sdd-explore-store-cart-foundation-scout.md" "openspec/changes/cleanup-duplicate-artifacts"` and `git diff --name-only -- app lib components scripts prisma e2e package.json`; second command must be empty. |
| Rollback | Restore tracked duplicate | `git restore -- "reports/sdd-explore-store-cart-foundation-scout.md"`. |

## Migration / Rollout

No migration required. Roll out as a small documentation/artifact cleanup PR after validation passes.

## Open Questions

None.
