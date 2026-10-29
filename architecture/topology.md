# System topology

How the DAD repositories relate at runtime and at build/release time.

## Source of truth

**DAD-Main is the source of truth for the product and the API contract.** Everything
else either consumes its contract (the native apps), validates it (DAD-Quality),
provisions it (DAD-infra), or is adjacent to it (DAD-website).

```
                         ┌──────────────────────────────┐
                         │          DAD-Main            │
                         │  Go donor API  ·  Next.js web │
                         │  OpenAPI contract (truth)     │
                         └───────────────┬──────────────┘
                                         │  tags mobile-foundation-vX.Y.Z
                   hash-locked snapshot  │  (see mobile-contract.md)
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                        ▼
         ┌──────────────┐        ┌──────────────┐          (web is in-repo,
         │   DAD-iOS    │        │ DAD-Android  │           not vendored)
         │  SwiftUI app │        │  Compose app │
         └──────────────┘        └──────────────┘

         ┌──────────────┐  acceptance runs against a pinned DAD-Main revision
         │ DAD-Quality  │ ─────────────────────────────────────────────▶ DAD-Main
         │ (ATM runner) │   Docker-isolated runs, evidence, finding triage
         └──────────────┘

         ┌──────────────┐  provisions AWS for DAD-Main + DAD-Quality
         │  DAD-infra   │ ─────────────────────────────────────────────▶ (AWS)
         └──────────────┘

         ┌──────────────┐  pull-based deploy to Lightsail (see deployment.md)
         │ DAD-website  │ ─────────────────────────────────────────────▶ dynamicaid.org
         └──────────────┘
```

## How each repo relates

- **DAD-iOS / DAD-Android** never track DAD-Main's `dev`. They build against a
  **vendored, hash-locked snapshot** of the contract (`foundation.lock.json` +
  `contracts/foundation/`). DAD-Main can churn freely; the apps only move when a
  human deliberately re-vendors to a newer `mobile-foundation` tag. This is the
  central cross-repo mechanism — see **[mobile-contract.md](mobile-contract.md)**.

- **DAD-Quality** (the local acceptance runner, formerly `atm`) checks out a pinned
  DAD-Main revision, builds it in Docker-isolated runs, and accumulates findings.
  DAD-Main's `.github/workflows/atm.yml` checks out `CoachCoe/DAD-Quality` at a
  pinned SHA to run acceptance in CI. DAD-Quality keeps internal `atm` / `impactgraph`
  identifiers for backward-compatible evidence/finding IDs — those are intentionally
  stable and are **not** renamed with the repo.

- **DAD-website** is independent of the API contract. It is a mostly-static site
  (plus a small `/api`) pull-deployed to Lightsail boxes — see
  **[deployment.md](deployment.md)**.

- **DAD-infra** owns the AWS estate (CloudFormation/CDK) for DAD-Main and DAD-Quality.
  DAD-Main's `deploy.yml` rolls the application out onto the infrastructure DAD-infra
  creates, finding it through DAD-infra's stack outputs. See
  **[deployment.md](deployment.md)** and
  **[ADR 0004](../decisions/0004-dad-infra-single-home-for-aws.md)**.

## DAD-Main internal layout (for orientation)

DAD-Main is a monorepo of three apps plus the contract:

```
DAD-Main/
  apps/donor-api/    # Go API (source of truth for the OpenAPI contract)
  apps/web/          # Next.js web app (consumes the contract in-repo)
  apps/atm-ledger/   # ledger component
  contracts/         # mobile-foundation bundle source + version.json
```

Repo-local build/test commands for each live in `DAD-Main/README.md` — not here.
