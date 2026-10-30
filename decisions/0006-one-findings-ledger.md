# 0006 — One findings ledger; DAD-Quality on AWS is held

- Status: accepted
- Date: 2026-10-29
- Scope: DAD-Main (owns the gate and the ledger), DAD-Quality (the runner), DAD-infra
  (`apps/atm`)

## Context

ATM findings decide whether a candidate is accepted, so there must be one place that
says which findings exist and how they were triaged.

DAD-Main already has that place. Its ATM acceptance gate (`.github/workflows/atm.yml`)
publishes to a Cloudflare Worker ledger (`apps/atm-ledger`, documented in DAD-Main
`docs/atm-ledger.md`): an append-only, hash-chained record with an archived copy. The
Worker accepts only GitHub's signed OIDC tokens from `CoachCoe/DAD-Main` on
GitHub-hosted runners, checks the workflow path and job environment, and binds every
receipt to a GitHub Actions run (`run_id:run_attempt`) and its evidence artifact.

DAD-infra also built a runner for ATM on AWS (`apps/atm`: CodeBuild with privileged
Docker, S3 evidence, a DynamoDB ledger). A CodeBuild run has no GitHub token and no
GitHub run or artifact, so it cannot publish to the Worker ledger.

## Decision

- **The Worker ledger is the single source of truth for ATM findings.** Its trust model
  (GitHub-run-bound receipts) is not changed to admit other identities.
- **The AWS runner is held: built and tested, not deployed.** DAD-infra's `atm-infra.yml`
  runs its tests and an offline synth on every PR and has no deploy jobs. Deployed on
  its own it would write a second, disconnected findings store.
- **If AWS runs are needed later,** a GitHub Actions job starts the CodeBuild run, waits,
  collects its evidence as a GitHub artifact and publishes with its own token, so the
  ledger is unchanged. Only do this for a need GitHub-hosted runs cannot meet, such as
  runs longer than the gate's job limit or heavy AI exploration.

## Cross-repo premise

| Premise | Owner | Consumer | Enforced |
|---|---|---|---|
| A ledger receipt is bound to a GitHub Actions run on a GitHub-hosted runner in `CoachCoe/DAD-Main`. | DAD-Main `apps/atm-ledger` | DAD-Main `atm.yml`; any future AWS integration. | The Worker's token and receipt validation, with its tests. |

## Consequences

- The original goal of running ATM acceptance on AWS is deferred, not abandoned; the
  code is kept and stays green.
- Findings never need reconciling across two stores.
- A wrapped AWS run's receipt will point at the GitHub job that published it, not at
  the machine that ran ATM. Accept that, or revisit this ADR, when the need arises.
