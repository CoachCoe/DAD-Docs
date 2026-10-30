# 0007 — Attribution is last-touch on every client

- Status: accepted
- Date: 2026-10-30
- Scope: DAD-iOS, DAD-Android, and the DAD-Main conversion counter they feed
- Supersedes: [0001](0001-attribution-precedence.md)

## Context

Both native apps capture attribution touches (referral link, IRL scan, company code)
and persist them until the first gift. When more than one touch arrives, which one wins
is a product rule, and the PRD states it.

## Decision

**Attribution is last-touch-wins on every client.** The most recent code used before the
first gift is the one that is kept, as PRD **R-4** says ("Attribution is last-touch: the
most recent code used before the first gift wins"). A newly arriving touch replaces the
stored one, field by field, on iOS and Android alike.

The server agrees: DAD-Main records the most recent accepted referral touch
(`referral_touch_captured.v1`, where a later valid link or IRL scan replaces it before
the first gift) and counts the conversion on that touch. PRD **R-3** is a different rule:
a referral counts at the donor's first gift. It does not decide precedence and is not
cited for it.

No platform diverges from this rule. A client that keeps the first touch instead of the
last is out of conformance with R-4 and is fixed, not documented.

## Who owns this premise

- Canonical rule: **PRD R-4** (`docs/requirements/R1-PRD.md` in DAD-Main).
- Server side: DAD-Main `docs/analytics.md`, `referral_touch_captured.v1`.
- Enforced in: each app's `Attribution` source and its unit tests (`AttributionTest` on
  Android, `AttributionTests` on iOS). Each must assert that a later touch replaces an
  earlier one.

## Why it is written down here

The rule is cross-repo: the apps merge touches locally, and the server counts the
conversion. Naming the owner and the enforcement points keeps the three from drifting
apart again.
