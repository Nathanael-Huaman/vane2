## Exploration: cleanup-duplicate-artifacts

### Current State
The repo is in hybrid SDD mode and keeps archived OpenSpec changes as audit trail. Duplicate-artifact scanning found one actionable tracked duplicate and two local stale copies:

- `reports/sdd-explore-store-cart-foundation.md` and `reports/sdd-explore-store-cart-foundation-scout.md` are byte-identical (`sha1 78fb4ca87c4bc39ac8bc1628ff62a6c0e8f96d9d`) and only the non-`-scout` file is referenced in repo history/docs.
- `reports/ticket-18-functional-validation.json` and `reports/ticket-18-functional-validation 2.json` are byte-identical (`sha1 5c0bb13e4b025f9a3f334a579ca3d3c45a4384ee`); the `" 2"` copy is ignored local output and unreferenced.
- `.git/index 2` exists as a local stale file; Git uses `.git/index` and does not track the `" 2"` file.

Important constraint: archive contents under `openspec/changes/archive/` and legacy `openspec/archive/` include intentional historical snapshots and should not be deleted as part of duplicate cleanup.

### Affected Areas
- `reports/sdd-explore-store-cart-foundation-scout.md` — tracked duplicate of canonical report content; safe candidate for deletion.
- `reports/sdd-explore-store-cart-foundation.md` — canonical counterpart; keep.
- `reports/ticket-18-functional-validation 2.json` — ignored local duplicate run output; safe local cleanup.
- `reports/ticket-18-functional-validation.json` — canonical report path used by scripts and docs; keep.
- `.git/index 2` — local stale artifact inside `.git`; optional local cleanup only.
- `scripts/test-ticket-18-functional.mjs`, `scripts/validate-ticket-18.mjs`, `reports/ticket-18-functional-validation.md` — enforce canonical JSON artifact path and confirm which file must remain.

### Approaches
1. **Conservative canonical cleanup** — Remove only files proven duplicate/stale by hash + reference checks; preserve canonical and archive artifacts.
   - Pros: Lowest risk, aligns with audit-trail rules, small review diff.
   - Cons: Leaves broader historical format drift (legacy archive layout) untouched.
   - Effort: Low

2. **Archive normalization cleanup** — Also rewrite legacy/archived spec artifacts to reduce historical duplication.
   - Pros: Maximum deduplication surface.
   - Cons: High risk of violating archive immutability and breaking audit/history references.
   - Effort: High

### Recommendation
Use **Conservative canonical cleanup**. Apply strict criteria: delete only when (a) byte-identical to a canonical artifact, (b) duplicate path is unreferenced, and (c) duplicate is outside immutable archive history. This yields immediate cleanup value with minimal risk.

### Risks
- Deleting a canonical file by mistake if suffix-based heuristics are used without hash/reference proof.
- Touching `openspec/changes/archive/*` or `openspec/archive/*` could damage audit traceability.

### Ready for Proposal
Yes — propose a narrow cleanup slice that removes `reports/sdd-explore-store-cart-foundation-scout.md` (tracked duplicate) and documents local optional cleanup for `reports/ticket-18-functional-validation 2.json` and `.git/index 2` without modifying archive history.
