# 0004 — DAD-infra is the single home for the AWS estate

- Status: accepted
- Date: 2026-10-29
- Scope: DAD-infra (owns the IaC), DAD-Main (deploys onto it), DAD-Quality (runs on it)

## Context

DAD-Main's CDK app originally lived in `DAD-Main/infra/`. DAD-Quality also needs AWS
(a place to run acceptance and keep evidence), in the same accounts and region. Two
facts push toward one repo rather than one per app:

- **The GitHub OIDC provider is an account-level singleton.** Two repos each
  defining one for the same account would collide.
- **Account ids, region, and the `-c env=staging|production` selection are shared.**
  Duplicating them invites drift.

## Decision

One repository, **DAD-infra**, owns every CloudFormation/CDK resource for the DAD
estate. It is an npm-workspaces monorepo:

- `packages/config` — the account map, region (`us-east-2`), and environment
  resolution. `staging` deploys to the org's *sandbox* account; `production` to the
  *production* account.
- `packages/pipeline-iam` — the one GitHub OIDC provider per account, plus a helper
  for scoped deploy roles.
- `apps/dad-main` — the DAD-Main estate (VPC, RDS + RDS Proxy, ECS Fargate, SES, NLB).
- `apps/atm` — the DAD-Quality runner (below).

Each app is its own CDK app with its own stack graph and its own path-filtered
workflow, so a change to one does not synth or deploy the other.

**CDK owns infrastructure only.** DAD-Main's application rollout (build and push
images, run `migrate` then `provision-roles`, then roll the services) stays in
DAD-Main's `.github/workflows/deploy.yml`. The deploy gate is the ECS rollout itself: the
api, web, and nginx task definitions carry container health checks and every service uses
the deployment circuit breaker with rollback, and `scripts/ecs-rollout.sh` waits for the
deployment it started to reach `COMPLETED`. No shell into running tasks is involved.

**DAD-Quality on AWS runs on CodeBuild, not Fargate.** The runner builds Docker images
and starts a Docker Compose project, which needs a privileged Docker daemon that
Fargate does not provide. Evidence (`run.json`, reports, traces) goes to a private S3
bucket; the finding ledger goes to DynamoDB so findings persist and block across runs
from ephemeral compute. Runs are started by EventBridge Scheduler. DAD-Main's CI does
not start them: DAD-Main already has an ATM acceptance gate with its own findings
ledger, and how the AWS runs relate to that gate is undecided (see
`DAD-infra/docs/design/aws-infra-design.md` §6.5).

Not in DAD-infra: DAD-iOS and DAD-Android (API clients with no cloud infrastructure of
their own) and DAD-website (a hand-managed Lightsail box with an `rsync`/cron deploy; a
different paradigm — see [../architecture/deployment.md](../architecture/deployment.md)).

## Cross-repo premises

| Premise | Owner | Consumer | Enforced |
|---|---|---|---|
| Stacks are named `dad-<name>-<env>` and publish the outputs `ClusterName` (`dad-ecs-cluster-<env>`) and `ComputeSubnetIds`, `WorkersSecurityGroupId` (`dad-network-<env>`). | DAD-infra `apps/dad-main` | DAD-Main `deploy.yml` resolves cluster, subnets, and security groups from them. | Not by CI. Neither side can re-derive the other until a stack is deployed. |
| ECS service names and worker commands mirror `docker-compose.prod.yml` (`api`, `web`, `nginx`, and the six `*-worker` services with `worker --kind <kind>`). | DAD-Main | DAD-infra services stack; `deploy.yml` updates them by name. | Partly: DAD-infra's stack tests pin the nine services and worker commands, but against names copied from the Compose file, not read from it. |
| Services declare container health checks and the deployment circuit breaker with rollback; `deploy.yml` gates on the deployment it started reaching `COMPLETED`. | DAD-infra `apps/dad-main` services stack | DAD-Main `deploy.yml` and `scripts/ecs-rollout.sh`. | DAD-infra stack tests pin the probes and the breaker; DAD-Main script tests cover the gate against a stubbed `aws`. Not exercised end to end until an account is bootstrapped. |
| Account ids, region, and OIDC trust: `infra-deploy` trusts DAD-infra's GitHub Environment and `app-deploy` trusts DAD-Main's, each as an exact `repo:<repo>:environment:<env>` subject (`staging` / `production`). | DAD-infra `packages/config` and `packages/pipeline-iam` | The DAD-infra and DAD-Main workflows that assume the roles. Each repo must have matching `staging` / `production` GitHub Environments, and those environments' branch/tag rules are what limit who can deploy. | DAD-infra unit tests for the trust subjects. The environments themselves are repository settings and are not checked by CI. |

## Consequences

- Deploys are gated: the credentialed jobs in DAD-infra's workflows run only once the
  per-environment deploy-role variable is set, so until an account is bootstrapped the
  pipelines run offline `cdk synth` only.
- A stack rename or output-key change in DAD-infra silently breaks DAD-Main's
  `deploy.yml`. Treat the first premise above as an API: change it in both repos in
  step.
- DAD-infra's authoritative design is `DAD-infra/docs/design/aws-infra-design.md`;
  DAD-Main's `docs/aws-deployment.md` records the DAD-Main-specific values.

## Why it is written down here

Neither repo can see the other's half of these premises. The seam between a workflow in
DAD-Main and a stack output in DAD-infra is exactly the kind of thing that breaks
without any test failing, so the owner and the consumer are named here.
