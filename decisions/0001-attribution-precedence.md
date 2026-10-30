# 0001 — Attribution precedence differs by platform, on purpose

- Status: accepted
- Date: 2026-10-29
- Scope: DAD-iOS, DAD-Android (and the DAD-Main conversion counter they feed)

## Context

Both native apps capture attribution touches (referral, company code — D-4, R-3/R-4)
and persist them. When more than one touch arrives for the same donor, *which touch
wins* is a policy decision, and the two platforms resolve it **differently**:

- **Android** (`app/src/main/java/org/dad/foundation/Attribution.kt`):
  **last-touch-wins**. A newly arriving non-null value overwrites the stored one.
- **iOS** (`Sources/DADFoundation/Attribution.swift`): **first-writer-wins** per field.
  The earliest touch is kept; a later value does not overwrite it.

This looks like an inconsistency. It is not.

## Decision

**Android's last-touch-wins is the canonical rule, per PRD R-3 ("last-touch wins"),
and it matches how the DAD-Main server counts conversion (on last touch).** iOS's
first-writer-wins is a deliberate, documented divergence recorded in that file's own
comment — not a bug to reconcile by mirroring one platform onto the other.

When a future change touches attribution on either platform: **follow the PRD / the
platform's documented rule, do not "fix" the divergence to make the two match.** If the
divergence should ever be removed, that is a PRD-level product decision, not a
refactor.

## Who owns this premise

- Canonical rule: **PRD R-3** (DAD-Main product requirements).
- Enforced in: each app's `Attribution` source + its unit tests (`AttributionTest`).
- Server side of the premise: DAD-Main counts conversion on last touch.

## Why it is written down here

This exact premise has already caused a near-miss: the instinct on seeing the two
implementations is to unify them. Naming it as a cross-repo decision — with the owner
(PRD R-3) and the enforcement points — stops a future change from silently "correcting"
a deliberate design choice.
