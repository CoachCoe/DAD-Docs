# Deployment

How non-API repos reach their targets. (DAD-Main and the native apps are not
covered here — the apps ship through the App Store / Play Console per their own
release checklists; DAD-Main's deploy lives in `DAD-Main/deploy/` and DAD-infra.)

## DAD-website — pull-based deploy to Lightsail

The website uses a **pull-based** model: each Lightsail box pulls from GitHub on a
cron schedule. GitHub never connects inbound, so the box firewall stays locked (no
inbound SSH/webhook).

```
feature branches ──PR──▶ staging ──▶ staging box ──▶ staging.dynamicaid.org  (preview)
                             │
                        approved
                             ▼
                           main   ──▶ prod box    ──▶ dynamicaid.org         (live)
```

- Work happens on `staging` (or feature branches merged into `staging`).
- The **staging box** tracks `staging`, deploys to `staging.dynamicaid.org`.
- Approved work is merged `staging → main`; the **prod box** tracks `main`, deploys
  to `dynamicaid.org`. `main` is whatever is live.
- A cron runs `deploy/pull-deploy.sh` every 3 minutes. If the tracked branch has not
  moved it exits quietly; otherwise it syncs/builds, fixes perms, runs the post-deploy
  smoke test, and publishes (prod) or leaves the preview live (staging).
- `deploy/deploy.sh` (SSH push-from-laptop) remains only for one-off manual syncs.

Repo-rename note: the GitHub repo was renamed `dad-main-website → DAD-website`, but
the **on-box clone directory and the cron are intentionally unchanged** — the box
pulls in place and GitHub's redirect keeps the existing remote working. The box only
needs a change if the directory itself is ever renamed.

Authoritative source: `DAD-website/deploy/README.md`.

## DAD-Quality — acceptance runs

DAD-Quality runs locally (and in DAD-Main CI) rather than deploying. It checks out a
pinned DAD-Main revision, builds it in Docker-isolated runs with synthetic
credentials and loopback-only ingress, and writes evidence/findings under `.atm/runs/`.
DAD-Main's `.github/workflows/atm.yml` invokes it in CI against a pinned SHA. See
`DAD-Quality/README.md`.

## DAD-infra — AWS estate

DAD-infra provisions AWS (CloudFormation/CDK, TypeScript) for DAD-Main and DAD-Quality,
in `us-east-2`. Why it is one repo: [ADR 0004](../decisions/0004-dad-infra-single-home-for-aws.md).
The authoritative design is `DAD-infra/docs/design/aws-infra-design.md`.

```
DAD-infra
  packages/config        account map, region, -c env resolution (shared)
  packages/pipeline-iam  the one GitHub OIDC provider per account (shared)
  apps/dad-main          VPC · RDS + Proxy · ECS Fargate · SES · NLB
  apps/atm               DAD-Quality runner: CodeBuild · S3 evidence · DynamoDB ledger
```

- **Environments.** `-c env=staging|production`. `staging` is the org's sandbox
  account; `production` is the production account. Each app is a separate CDK app, and
  its workflow is path-filtered to that app (and `packages/**`).
- **Infrastructure vs application rollout.** CDK deploys infrastructure only. DAD-Main
  ships the application itself through its own `.github/workflows/deploy.yml`
  (push images to ECR, pin task definitions to the image, `migrate`, `provision-roles`,
  then roll the services), resolving cluster and network ids from the stack outputs
  DAD-infra publishes.
- **Task definitions are pinned per release.** CDK creates the task definitions with a
  placeholder image tag, and an ECS service or `run-task` runs a specific revision.
  `scripts/ecs-pin-image.sh` registers a new revision of every family with only the image
  tag changed to the release's git SHA, and the later steps deploy those revisions. Because
  each revision names an immutable SHA, a circuit-breaker rollback restores the previous
  image. `migrate` and `provision-roles` are waited on and fail the deploy unless their
  container exits 0. The nightly reconcile schedule targets the task-definition family, so
  it runs the latest active revision.
- **Deploy gate.** The api, web, and nginx task definitions have container health checks
  (api `/health/live`, nginx `/health` on 8081, web `/`), and every service uses the ECS
  deployment circuit breaker with rollback. `scripts/ecs-rollout.sh` starts each new
  deployment and waits for that deployment to reach `COMPLETED`; one that ends `FAILED`
  was rolled back and fails the job. It follows its own deployment id because a rollback
  is a new deployment that itself reports `COMPLETED`. The api check is liveness, not the
  database-backed readiness endpoint. Releases tagged `mobile-foundation-*` never start a
  deploy.
- **DAD-Quality on AWS.** The runner runs on CodeBuild with privileged Docker (Fargate
  cannot host the Docker daemon the runner needs). Evidence goes to S3 and the finding
  ledger to DynamoDB. Runs start from an EventBridge schedule; DAD-Main's CI does not
  start them. DAD-Main's own ATM gate keeps its separate ledger, and how the two relate
  is not decided.
- **Verification before deploy.** The pull-request check is an offline `cdk synth` of
  both environments with no AWS credentials. The credentialed deploy jobs stay skipped
  until the per-environment deploy-role variable is set.
