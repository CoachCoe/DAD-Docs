# Runbooks and operational procedures

This page indexes where each cross-cutting procedure is written down and which repo
owns it. The procedures themselves stay in the owning repo, where they are tested
against the code they describe.

## Incidents, data and keys

| Situation | Procedure | Owner |
|---|---|---|
| Queue backlog, parked jobs or worker failure | `DAD-Main/docs/operations.md`, "Queue alerts and incident response" | DAD-Main |
| Restore a database backup, or prove restores work | `DAD-Main/docs/operations.md`, "Backup and restore drill" | DAD-Main |
| Rotate an encryption key, or respond to a suspected compromise | `DAD-Main/docs/operations.md`, "Encryption keys" | DAD-Main |
| Rotate or supply a database password | `DAD-Main/docs/operations.md`, "Database roles"; `DAD-infra/docs/bootstrap.md`, "Database passwords are ECS secrets" | DAD-Main, DAD-infra |
| Payment webhook or Stripe reconciliation problems | `DAD-Main/docs/operations.md`, "Stripe" | DAD-Main |
| Security controls and reporting a vulnerability | `DAD-Main/docs/security.md`, `DAD-Main/SECURITY.md` | DAD-Main |

## Deploying and rolling back

| Target | Procedure | Owner |
|---|---|---|
| First deploy of an AWS environment | `DAD-infra/docs/bootstrap.md` | DAD-infra |
| Application release to AWS | `DAD-Main/.github/workflows/deploy.yml`; gate and rollback behavior in [../architecture/deployment.md](../architecture/deployment.md) | DAD-Main |
| Rollback of a failed application deploy | Automatic: the ECS circuit breaker restores the previous image ([../architecture/deployment.md](../architecture/deployment.md)). Rolling back a deploy that succeeded has no written procedure | DAD-Main |
| Website release and manual prod rollback | `DAD-website/deploy/README.md`, "Manual rollback (prod)" | DAD-website |
| Mobile contract re-vendor | [../architecture/mobile-contract.md](../architecture/mobile-contract.md) | DAD-iOS, DAD-Android |
| Branch protection setup and recovery | [../conventions/repos-and-branches.md](../conventions/repos-and-branches.md); `DAD-infra/docs/branch-protection.md` | each repo |

## Gaps

No single disaster-recovery plan spans the repos: there is no documented
recovery-time or recovery-point objective, and no documented procedure for losing the
Lightsail website boxes beyond the per-box install in `DAD-website/deploy/README.md`.
Add one here as an ADR when the objectives are set.
