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
PR into the working branch, and the branch is pruned (local + remote) after merge.

## Branch protection (solo-friendly)

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
| DAD-Docs | (set once CI exists; until then, protection with no required checks) |

**DAD-Docs follows this same pattern** — `dev`/`main` branching and the solo-friendly
`main` protection above. Until it has CI, protect `main` with the PR + force-push/
deletion rules and no required-check contexts; add contexts when a docs-lint or
link-check job exists.

### Applying protection

Protection is set via the GitHub API, e.g.:

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
