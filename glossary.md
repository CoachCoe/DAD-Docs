# Glossary

Terms that recur across the DAD repos.

- **DAD** — Dynamic Aid. The platform. Public site is `dynamicaid.org`.
- **DAD-Main** — the product monorepo: Go donor API, Next.js web app, and the
  canonical OpenAPI contract. Source of truth for the API.
- **mobile-foundation** — a minor-versioned, hash-locked snapshot of DAD-Main's
  OpenAPI contract, tagged `mobile-foundation-vX.Y.Z` and vendored by the native
  apps. See [architecture/mobile-contract.md](architecture/mobile-contract.md).
- **foundation.lock.json** — the per-app file pinning the vendored contract by
  version + source revision + manifest sha256.
- **re-vendor / the re-vendor wall** — the deliberate act of moving an app to a newer
  mobile-foundation tag. The "wall" is the apps' refusal to silently drift: they stay
  pinned until a human re-vendors.
- **ATM / DAD-Quality** — the local release-acceptance and bounded-AI-exploration
  runner. The GitHub repo was renamed `atm → DAD-Quality`; the tool's internal
  identifiers (and the "ATM" name in some prose) remain `atm` for backward compat.
- **impactgraph** — a versioned adapter/policy identifier set inside DAD-Quality.
  Intentionally stable across the DAD rebrand so existing policies, finding IDs, and
  retained reports stay compatible. Not renamed with the repo.
- **donor-api** — the Go API app inside DAD-Main (`apps/donor-api`).
- **pull-based deploy** — DAD-website's model: each Lightsail box pulls from GitHub on
  a cron, so no inbound connection to the box is needed.
- **staging / prod box** — the two Lightsail hosts tracking `staging` and `main`
  respectively for DAD-website.
