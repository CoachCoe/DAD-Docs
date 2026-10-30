# Repositories, branching, and protection

Conventions shared across the DAD family.

## Naming

All repos carry the `DAD-` prefix: `DAD-Main`, `DAD-iOS`, `DAD-Android`,
`DAD-Quality`, `DAD-website`, `DAD-infra`, `DAD-Docs`. Matching casing and prefix
keeps the family grouped and recognizable.

## Branching strategy

Two long-lived branches per repo:

- **`dev`** — the working/integration branch. Feature branches merge here via PR.
- **`main`** — the release/stable branch. Only vetted work reaches it.

Exception: **DAD-website** uses `staging` in place of `dev` (its staging box tracks
`staging`, its prod box tracks `main` — see [architecture/deployment.md](../architecture/deployment.md)).

Feature work goes on a short-lived branch (`feat/…`, `chore/…`, `fix/…`), opened as a
PR into the working branch. Every repo has **"Automatically delete head branches"** on, so
GitHub deletes the remote branch when the PR merges; delete the local copy yourself
(`git fetch --prune`, then `git branch -d <branch>`).

**Releasing.** Promote `dev` to `main` with a PR from `dev`, merged with **"Create a merge
commit"**, never squash or rebase. A merge commit keeps the two branches on one history, so
the next release contains only what is new on `dev`; squashing or rebasing gives `main`
commits that `dev` lacks, and every later release shows old changes again.

## Branch protection (solo-friendly)

The working branch (`dev`, or `staging` in DAD-website) is protected **from deletion
only**: no required checks or reviews, and force-pushes stay allowed. That is what stops
"Automatically delete head branches" from deleting it when a release PR from `dev` merges,
since GitHub never auto-deletes a protected branch. DAD-infra's `dev` ruleset already
blocks deletion (see below).

`main` is protected in every repo with a **solo-owner-friendly** ruleset — strong
enough to stop accidents, loose enough that a single owner can still self-merge:

| Setting | Value | Why |
|---|---|---|
| Require a PR before merging | on | No direct pushes to `main`. |
| Required approvals | **0** | A solo owner cannot approve their own PR; raise to 1 when collaborators join. |
| Require status checks to pass | on | No red merges. |
| Require branches up to date | on | Merge only against current `main`. |
| Block force-pushes | on | Protects history. |
| Block deletions | on | `main` cannot be deleted. |
| Require conversation resolution | on | No unresolved review threads. |
| Enforce on admins | **off** | The owner keeps an escape hatch. |

Required status-check contexts are per repo — name only checks that **always run**,
never a path-gated check that can report "skipping" (a required-but-skipped check
deadlocks the merge):

| Repo | Required checks on `main` |
|---|---|
| DAD-Main | `changes`, `contract` |
| DAD-iOS | `contract`, `ios` |
| DAD-Android | `contract`, `android` |
| DAD-Quality | `checks` |
| DAD-website | `E2E + a11y (Playwright + axe)`, `PHP unit tests` |
| DAD-Docs | `docs` |
| DAD-infra | `synth` (on both `main` and `dev`; see below) |

**DAD-Docs follows this same pattern** — `dev`/`main` branching and the solo-friendly
`main` protection above, with its `docs` link-check job as the required check.

### DAD-infra differences

DAD-infra applies the same policy with two repository **rulesets** (`protect-main`,
`protect-dev`) rather than classic branch protection, so the rules cover **both**
long-lived branches. The settings match the table above (PR required, 0 approvals,
conversation resolution, up-to-date branch, no force-push, no deletion), with two
differences:

- **Bypass.** The "enforce on admins off" escape hatch is a repository-admin bypass in
  `pull_request` mode: an admin can merge a PR that cannot satisfy its checks, but
  cannot push directly. Use it only for a check that **cannot run** (a deadlock), never
  to merge past a check that failed or is still running
  ([ADR 0005](../decisions/0005-platform-operating-standards.md)).
- **One mechanism per repo.** A repo uses classic protection or rulesets, not both;
  DAD-infra uses rulesets and the others classic protection.
- **Always-running check.** The required `synth` job runs on **every** pull request
  (the workflows have no path filter on `pull_request`). A path-filtered required check
  would never report on a PR that touches other paths and would block its merge, which
  is the same rule as "name only checks that always run" above. Deploy triggers stay
  path-filtered.

The exact ruleset is recorded in `DAD-infra/docs/branch-protection.md`.

### Applying protection

Protection is set via the GitHub API (DAD-infra uses the rulesets API instead; see
above), e.g.:

```sh
gh api -X PUT repos/CoachCoe/<repo>/branches/main/protection \
  -H "Accept: application/vnd.github+json" --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["<check>", "..."] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

When collaborators are added: bump `required_approving_review_count` to 1 and
consider `enforce_admins: true`.

## Committed docs vs working docs

Committed Markdown describes **the software as it is** (present tense): READMEs,
CONTRIBUTING/SECURITY, runbooks, durable architecture/design, and this repo's
cross-repo docs. **Working documents** — plans, to-do lists, status/progress reports,
findings, session notes, dated audit trails — are past-tense accounts of work and do
**not** belong in the tree. Keep them untracked (e.g. a local `local-docs/` or a
gitignored scratch path), or in the issue/PR that owns that conversation.
