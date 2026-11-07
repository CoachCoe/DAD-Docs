# 0009 — Separate native apps, not a shared cross-platform code base

- Status: accepted
- Date: 2026-10-18
- Scope: DAD-iOS, DAD-Android, and the contract they consume from DAD-Main

## Context

R1 PRD §10 (Code base) recommends one shared code base for iOS and Android, for example
React Native or Flutter, so the two stay in parity. It is a recommendation, not a
requirement.

## Decision

**iOS is a SwiftUI app in DAD-iOS and Android is a Kotlin/Jetpack Compose app in
DAD-Android.** The owner chose this on 18 October 2026, deliberately overriding the PRD
§10 recommendation. The divergence from §10 is accepted and is not reopened per phase.

## Consequences

- Parity is not free. It is held by one contract: both apps vendor the same
  hash-locked mobile-foundation snapshot
  ([../architecture/mobile-contract.md](../architecture/mobile-contract.md)) and each has
  its own tests for shared business rules, such as last-touch attribution
  ([0007](0007-attribution-last-touch-on-all-clients.md)).
- A rule that must behave identically on both platforms is stated in an ADR with its
  enforcement point in each app, because no shared code enforces it.
- Platform work is done twice. A feature is complete when both apps ship it.

## Cross-repo premise

| Premise | Owner | Consumer | Enforced |
|---|---|---|---|
| Both apps implement the same product rules against the same pinned contract. | R1 PRD (DAD-Main `docs/requirements/R1-PRD.md`) and the vendored contract | DAD-iOS, DAD-Android | `check-foundation` for the contract; each app's unit tests for the rules. Nothing compares the two apps' behavior directly. |
