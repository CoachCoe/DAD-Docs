# 0003 — The mobile-foundation semver compatibility promise

- Status: accepted
- Date: 2026-10-29
- Scope: DAD-Main (produces the tags), DAD-iOS, DAD-Android (pin them)

## Context

The apps vendor DAD-Main's contract by hash via `foundation.lock.json` and refuse to
build if the vendored files do not match (see
[../architecture/mobile-contract.md](../architecture/mobile-contract.md)). The version
on the `mobile-foundation-vX.Y.Z` tag is not decoration — it is a **promise about
compatibility** that the apps rely on when deciding whether a re-vendor is urgent.

## Decision

The semver of a `mobile-foundation` tag means exactly this, and nothing else:

- **MINOR / PATCH bump** (e.g. 2.1 → 2.2): **purely additive.** An app still on the old
  tag builds unchanged; it simply does not see the new operations until it re-vendors.
  **Re-vendoring is safe to defer per app.**
- **MAJOR bump** (e.g. 1.x → 2.0): **breaking.** Both apps must re-vendor and fix fallout
  before they can *adopt* the new contract — but they still do not break in the meantime,
  because they stay pinned to the old snapshot until a human re-vendors.

The premise the apps rely on: **"a tag that is a minor/patch bump over what I pinned
will never break me; only a major bump can."** The drift check encodes this — it warns
on a minor/patch gap and fails on a major gap.

## Obligations this places on the tagger

- **Never tag off an unverified commit.** A tag pins both apps by hash, permanently. Cut
  `mobile-foundation` tags only from a CI-green, reviewed DAD-Main commit.
- **Bump major only for a genuinely breaking contract change**, because a major bump
  obligates both apps to re-vendor. An additive change that is mistakenly tagged major
  manufactures a false "both apps must act now" signal.

## Who owns this premise

- The promise: this ADR + the semver of each `mobile-foundation-vX.Y.Z` tag.
- Enforced advisory: each app's contract-CI drift check (warn on minor/patch gap, fail
  on major gap).
- Enforced hard: `foundation.lock.json` + `check-foundation` (the re-vendor wall).

## Why it is written down here

The compatibility meaning of the version number is the single fact that lets us defer
re-vendoring safely. If a tagger treats the number casually (tags an additive change as
major, or tags off an unverified commit), the promise the apps depend on is broken and
the "safe to defer" property evaporates. Naming the promise and the tagger's obligations
keeps the wall trustworthy.
