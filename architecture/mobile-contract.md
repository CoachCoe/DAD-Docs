# The mobile-foundation contract

This is the most important cross-repo mechanism in DAD. It governs how the native
apps consume DAD-Main's API without ever building against a moving target.

## The problem it solves

DAD-Main's API contract changes constantly on `dev`. The native apps must build
against a **stable, verified** version of that contract — never against whatever
`dev` happens to be at build time. The mobile-foundation bundle is that stable
snapshot, and the lock mechanism makes drift impossible without a deliberate human
action.

## What the bundle is

A **minor-versioned snapshot** of DAD-Main's canonical OpenAPI, scoped to an
operation allow-list and shipped as a tagged release of DAD-Main:

- Tag form: `mobile-foundation-vX.Y.Z` (e.g. `mobile-foundation-v2.3.0`).
- Produced by `DAD-Main/scripts/mobile-foundation.mjs`; the version is declared in
  `DAD-Main/contracts/mobile/version.json`.
- Each tag pins a specific DAD-Main source commit; both apps vendor it **by hash**.

## How the apps pin it

Each app commits a `foundation.lock.json` that pins the exact snapshot. As of this
writing the current release is `2.3.0`, and the apps vendor it as this triple:

```json
{
  "version": "2.3.0",
  "source_repository": "CoachCoe/DAD-Main",
  "source_revision": "ac83b73a94eeb4ce4f7b38168b948559944bdcdd",
  "release_tag": "mobile-foundation-v2.3.0",
  "manifest_sha256": "2767a0db3a5c2944bde8084bae2daba7551b37ffdb23b17a236e96204a46e302"
}
```

The vendored contract files live under each app's `contracts/foundation/`. A
`check-foundation` step verifies **version + source revision + manifest sha256 +
per-file payload hashes** offline, before any code generation. If a vendored file's
hash does not match the manifest, the build fails. This is the "re-vendor wall":
the apps physically refuse to silently drift.

## Semver = the compatibility promise

- **MINOR bump** (e.g. 2.2 → 2.3): purely additive. An old app still builds; it just
  does not see the new operations until it re-vendors. **Safe to defer per app.**
- **MAJOR bump** (e.g. 1.x → 2.0): breaking. Both apps must re-vendor and fix fallout
  before they can adopt — but they still do not *break* in the meantime, because they
  stay pinned to the old snapshot until someone re-vendors.

Nothing in an app breaks when DAD-Main ships a new contract. The apps only change
when a human re-vendors. The wall is a feature, not friction.

Release 2.3.0 is additive over 2.2.0: `partnerOverview.user_id` (the signed-in partner
user's id, which lets a client avoid self-removal) and `DonorDashboard.rankings_opted_out`
(distinguishes opted out from not yet ranked). An app that is still pinned to an earlier
release keeps building and does not see these fields until it re-vendors.

## Re-vendoring an app (the per-phase chore)

When an app needs operations from a newer contract:

1. Confirm the target `mobile-foundation-vX.Y.Z` tag exists and is cut from a
   CI-green, reviewed DAD-Main commit. **Never tag off an unverified commit** — a tag
   pins both apps by hash, permanently.
2. Copy the bundle's vendored files into the app's `contracts/foundation/`.
3. Bump the app's `foundation.lock.json` to the new version + revision + manifest hash.
4. Widen the app's generator allow-list for any new operations it will use.
5. Regenerate the client, run `check-foundation`, build.

Re-vendoring is done **independently per app, on each app's own schedule.** Re-vendor
at phase boundaries so drift does not pile up.

## Drift check

Both apps run an advisory **drift check** in their contract CI job: it compares the
pinned version against the latest `mobile-foundation` tag and warns on a minor/patch
gap (fails on a major gap). It reads tags over public git with no token. Silent when
up to date; warns once a newer tag is cut, until the app re-vendors.

## Known generator caveats (mobile-side, not fixed by the bundle)

- Swift/Kotlin generators choke on `anyOf` + `type: null` and enforce
  `additionalProperties: false` — handled with per-app type overrides
  (iOS type overrides; Android's `LogoutAcknowledgement` pattern).
- Each app's `scripts/check-foundation.test.mjs` **hardcodes the expected version
  string**. When re-vendoring, update that pin too, or the contract CI leg fails on the
  version assertion.

## Authoritative sources

- `DAD-Main/scripts/mobile-foundation.mjs` and `DAD-Main/contracts/mobile/version.json` —
  bundle tooling and declared version.
- `DAD-iOS/foundation.lock.json`, `DAD-Android/foundation.lock.json` — the pins.
- Each app's `scripts/check-foundation*` — the offline verifier.
