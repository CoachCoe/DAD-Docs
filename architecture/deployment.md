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

DAD-infra provisions AWS (CloudFormation/CDK, TypeScript) for DAD-Main (it also holds an
undeployed DAD-Quality runner),
in `us-east-2`. Why it is one repo: [ADR 0004](../decisions/0004-dad-infra-single-home-for-aws.md).
The authoritative design is `DAD-infra/docs/design/aws-infra-design.md`.

```
DAD-infra
  packages/config        account map, region, -c env resolution (shared)
  packages/pipeline-iam  the one GitHub OIDC provider per account (shared)
  apps/dad-main          VPC · RDS + Proxy · ECS Fargate · SES · NLB
  apps/atm               DAD-Quality runner on AWS (held: built and tested, not deployed)
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
  `DAD-Main/scripts/ecs-pin-image.sh` (run by DAD-Main's deploy workflow, not by DAD-infra) registers a new revision of every family with only the image
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
- **DAD-Quality on AWS is held.** `apps/atm` (CodeBuild with privileged Docker, S3
  evidence) is built and tested but not deployed: ATM acceptance runs in DAD-Main's
  GitHub gate, whose Worker ledger is the single source of truth for findings
  ([ADR 0006](../decisions/0006-one-findings-ledger.md)).
- **Operating rules** (one-off tasks instead of database shells, automated credential
  rotation, one owner per piece of state, a single path to production) are
  [ADR 0005](../decisions/0005-platform-operating-standards.md).
- **Verification before deploy.** The pull-request check is an offline `cdk synth` of
  both environments with no AWS credentials. The credentialed deploy jobs stay skipped
  until the per-environment deploy-role variable is set.

### Database passwords

Task definitions hold no database password in `environment`. Each process gets a
password-less URL (`<PREFIX>_DATABASE_URL`, for example `DONOR_API_DATABASE_URL`, naming
the login and the RDS Proxy endpoint) and the login's password as an ECS secret under
`<PREFIX>_DATABASE_PASSWORD` (for example `DONOR_API_DATABASE_PASSWORD`), taken from the
login's Secrets Manager secret. The URL form is kept because it carries
`default_query_exec_mode=exec`, which the RDS Proxy needs. DAD-Main accepts both forms, and
a full URL that already contains a password still wins.

**Deploy order.** DAD-Main commit `7506cbf` (which reads `_DATABASE_PASSWORD`) is deployed
before DAD-infra commit `5c952e2` (which switches the task definitions to the password-less
form). The other order leaves the processes unable to find a password. Rolling either side
back is safe while the other still supports the form in use. Rotating a password changes
the secret value only; restart the service, no template redeploy. Authoritative sources:
`DAD-Main/docs/operations.md` ("Supplying a password as a secret") and
`DAD-infra/docs/bootstrap.md` ("Database passwords are ECS secrets").

## CI runners

Which runner a job uses is decided per repo, and the reason is recorded next to the job.

| Repo | Job | Runner | Why |
|---|---|---|---|
| DAD-Main | `changes`, `ledger`, `api`, `web`, `deploy`, `browser`; the ATM, deploy and cloudflare-ranges workflows; mobile-foundation `contract` and `publish` | GitHub-hosted `ubuntu-24.04` | Ephemeral environments, including for fork PRs. `browser` needs a Postgres service container and `playwright install --with-deps`, both Linux-hosted-runner features. |
| DAD-Main | mobile-foundation `swift-compatibility` | GitHub-hosted `macos-latest` | Compiles the bundle's Swift contract with Apple tooling. |
| DAD-iOS | `contract` | self-hosted `[self-hosted, dad, linux]` | Node foundation checks. |
| DAD-iOS | `ios` | self-hosted `[self-hosted, dad, macos]` | Xcode, Swift and the simulator via `scripts/check-ios.sh`. |
| DAD-Android | `contract` | self-hosted `[self-hosted, dad, linux]` | Node foundation checks. |
| DAD-Android | `android` | GitHub-hosted `ubuntu-24.04` | Boots an x86_64 emulator that needs Linux KVM, which the self-hosted Apple Silicon Mac cannot provide. |
| DAD-Quality | `checks` | self-hosted `[self-hosted, dad, linux]` | Node checks with Docker-isolated fixtures. |
| DAD-infra | all CDK jobs | GitHub-hosted `ubuntu-24.04` | Offline `cdk synth`; the credentialed jobs assume an OIDC deploy role. |

One Apple Silicon Mac can serve both self-hosted labels: label matching is
case-insensitive, so the runner's `macOS` label satisfies `macos`, and `linux` is added at
registration. Runners are registered per repository (`CoachCoe` is a user account).
Prerequisites and registration steps are in each repo's `.github/SELF_HOSTED_RUNNERS.md`
(DAD-iOS, DAD-Android, DAD-Quality). A job waits in the queue while its self-hosted runner
is offline.
