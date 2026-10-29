# DAD documentation

System-level documentation for the **DAD** (Dynamic Aid) platform: how the
repositories fit together, the cross-repo contracts that bind them, and the
conventions every repo follows. This repo describes the **seams between repos** —
anything local to one repo (how to build or test it) stays in that repo's own
README, which this repo links to rather than copies.

> Scope rule: a fact belongs here only if it is cross-repo or system-level. If it
> describes one repo's own build/test/run, it belongs in that repo's README. Keep
> everything here present-tense ("what the system is"), never plans, status, or
> dated working notes.

## Start here

New to the codebase? Read in this order:

1. **[architecture/topology.md](architecture/topology.md)** — the repositories, what
   each one is, and how data and releases flow between them.
2. **[architecture/mobile-contract.md](architecture/mobile-contract.md)** — the
   single most important cross-repo mechanism: how the native apps consume a
   hash-locked snapshot of the API contract.
3. **[conventions/repos-and-branches.md](conventions/repos-and-branches.md)** — naming,
   branch strategy, and branch protection.
4. **[architecture/deployment.md](architecture/deployment.md)** — how the website and
   the quality runner reach their targets.
5. **[glossary.md](glossary.md)** — terms you will hit immediately (ATM, mobile-foundation,
   impactgraph, …).

## The repositories

| Repo | What it is | Own README |
|------|-----------|------------|
| **DAD-Main** | The product: Go donor API, Next.js web app, contract source of truth. | `DAD-Main/README.md` |
| **DAD-iOS** | SwiftUI native donor app. Builds against a vendored contract snapshot. | `DAD-iOS/README.md` |
| **DAD-Android** | Kotlin/Jetpack Compose native donor app. Same vendoring model. | `DAD-Android/README.md` |
| **DAD-Quality** | Local release-acceptance + bounded AI exploration runner (formerly `atm`). | `DAD-Quality/README.md` |
| **DAD-website** | Marketing/informational site, pull-deployed to Lightsail. | `DAD-website/README.md` |
| **DAD-infra** | AWS IaC for the estate (CloudFormation/CDK). | `DAD-infra/README.md` |
| **DAD-Docs** | This repo. Cross-repo system documentation. | — |

## What does NOT go here

- Repo-local build/test/run instructions (live in each repo's README).
- Working documents — plans, to-do lists, status/progress reports, findings,
  session notes, dated audit trails. Those are untracked scratch, not shipped docs.
- Secrets, credentials, or environment values.
