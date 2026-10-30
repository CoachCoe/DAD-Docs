# 0005 — Platform operating standards

- Status: accepted
- Date: 2026-10-29
- Scope: every DAD repo; first applied in DAD-infra and DAD-Main

## Context

Building DAD-infra raised the same questions repeatedly: how to reach the database, who
creates a credential, which of two switches wins, how many ways a change can reach
production. Each was answered once. These are the answers, so the next repo does not
have to re-decide them.

## Decision

1. **Privileged operations are versioned code, run as one-off tasks.** Work that needs
   elevated access (creating database roles, data repairs) is a checked-in task
   definition run on demand and logged, never an interactive session. There is no
   bastion and no standing human shell on a database, and the most powerful credential
   is readable by exactly the task that needs it. A break-glass path may be added later
   as an explicit, logged exception.
   *Applied:* `dad-maint-bootstrap-owner` creates the database owner role as the RDS
   master. The master secret is not on the RDS Proxy, and only that task's security
   group may reach the instance.

2. **Every credential has an automated rotation path; IaC never mints long-lived keys.**
   Infrastructure code may create the place a credential lives, but not the credential.
   A rotation function creates, verifies and promotes it, and rotation keeps the
   previous credential valid until running consumers have picked up the new one.
   *Applied:* the SES SMTP credentials rotate every 90 days, and the first rotation runs
   when the stack is created. Application secrets are created empty, with no value in
   the CloudFormation template.

3. **State has one owner; everything else reads it.** A fact (is this running, which
   image is live) is set in exactly one place. Other systems query it rather than keep
   their own copy, because two copies drift.
   *Applied:* DAD-infra's `workersEnabled` sets the workers' desired count, and
   DAD-Main's `deploy.yml` reads it from ECS. The deployed image tag lives in one SSM
   parameter that the pipeline writes and CDK reads.

4. **There is a single, approved path to production.** Production changes only by a
   merge to `main`, deployed by that repo's pipeline under its `production` GitHub
   Environment (branch rule plus required reviewer). There are no release- or
   tag-triggered production deploys. Tags may record what shipped; they do not ship it.
   Deploy roles trust exactly a repo's GitHub Environment (an exact OIDC `sub`, no
   wildcard), and the shared helper cannot build any other trust.

5. **Each repo uses one branch-protection mechanism.** Either classic branch protection
   or rulesets, never a second, inactive one. The active configuration is recorded in
   [../conventions/repos-and-branches.md](../conventions/repos-and-branches.md).

6. **The admin bypass is for a check that cannot run, not for one that failed.** The
   solo-owner bypass exists so a deadlocked PR can still merge. A red or still-running
   check is waited for and fixed. (Merging past a failing check once landed a CI change
   on `dev` without the fix for its own failure.)

## Consequences

- A new repo starts from these rules; a deviation is written down as its own ADR.
- Some first-time operations are slower: an operator runs a task instead of opening a
  shell, and a credential is rotated instead of pasted in.
- Reviewers can check each rule mechanically, and most are enforced by tests in
  DAD-infra (no IAM access key in CloudFormation, no secret values in templates, no
  wildcard trust, workers off unless switched on).
