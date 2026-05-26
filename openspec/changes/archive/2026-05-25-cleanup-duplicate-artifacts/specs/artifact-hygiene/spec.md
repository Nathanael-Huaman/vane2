# Artifact Hygiene Specification

## Purpose

Define conservative artifact cleanup rules for duplicate and stale artifacts while preserving canonical records and audit history.

## Requirements

### Requirement: Duplicate Validation Before Deletion

The cleanup process MUST mark a tracked artifact as deletable only when it is byte-identical to a canonical artifact and a repository reference search confirms the duplicate path is not required as canonical.

#### Scenario: Tracked duplicate is safely approved

- GIVEN a tracked candidate artifact and a canonical artifact
- WHEN their content hashes are identical and canonical references resolve to the canonical path
- THEN the candidate artifact MAY be approved for deletion

#### Scenario: Duplicate is blocked when reference check fails

- GIVEN a tracked candidate artifact with hash match
- WHEN reference search shows required canonical usage of the candidate path
- THEN the candidate artifact MUST NOT be deleted

### Requirement: Canonical and Archive Preservation

The cleanup process MUST preserve canonical artifacts and SHALL NOT delete or modify artifacts under `openspec/changes/archive/*` or `openspec/archive/*`.

#### Scenario: Canonical artifact remains untouched

- GIVEN a validated duplicate pair outside archive paths
- WHEN cleanup executes
- THEN the canonical artifact remains unchanged and only the approved duplicate is removed

#### Scenario: Archive path cleanup is rejected

- GIVEN a cleanup candidate located in an archive path
- WHEN cleanup evaluation runs
- THEN deletion is rejected and the archive artifact remains unchanged

### Requirement: Tracked vs Local Cleanup Separation

The cleanup process MUST distinguish tracked duplicate deletion from ignored or local stale cleanup. Validated tracked duplicates MAY appear in tracked diffs, while ignored/local stale artifacts SHOULD be reported as optional local cleanup and MUST NOT appear in tracked diffs.

#### Scenario: Tracked duplicate appears in tracked diff

- GIVEN a validated tracked duplicate outside archive paths
- WHEN the cleanup change is prepared
- THEN the tracked diff includes only approved tracked duplicate deletion artifacts

#### Scenario: Ignored or local stale artifacts stay local-only

- GIVEN ignored or local stale artifacts such as `reports/* 2.json` or `.git/index 2`
- WHEN cleanup guidance is generated
- THEN cleanup is recorded as local-only guidance and no tracked deletion is produced for those files

### Requirement: No Application Behavior Changes

Artifact hygiene cleanup MUST NOT alter application behavior and SHALL NOT modify application source files.

#### Scenario: Cleanup diff is artifact-only

- GIVEN an artifact hygiene cleanup change
- WHEN the final diff is reviewed
- THEN no files under `app/`, `lib/`, or `components/` are modified

#### Scenario: Behavior-impacting edits are blocked

- GIVEN a proposed cleanup edit that touches application source files
- WHEN scope validation runs
- THEN the edit MUST be rejected from this change
