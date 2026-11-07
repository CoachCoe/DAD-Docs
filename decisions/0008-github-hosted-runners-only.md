# 0008 — CI runs on GitHub-hosted runners only

- Status: accepted
- Date: 2026-11-05
- Scope: every DAD repo

## Context

Some jobs were registered on self-hosted runners. The repos are public under the
`pre-dad` org, so standard GitHub-hosted runners cost nothing, and a self-hosted machine
is a host someone has to patch, label correctly and keep online. One such runner was
macOS on arm64 yet carried a `linux` label, which made selection by label unreliable.

## Decision

**Every job in every repo runs on a GitHub-hosted runner.** No workflow selects a
self-hosted label, and no runner is registered to the org. The per-job runner and the
reason for each non-default choice are in the table in
[../architecture/deployment.md](../architecture/deployment.md#ci-runners).

Two jobs need more than `ubuntu-24.04`:

- DAD-iOS `ios` needs Xcode 27 and the iOS simulator, so it uses the `xcode-27` runner
  label. `macos-latest` does not ship that Xcode.
- DAD-Android `android` boots an x86_64 emulator and needs Linux KVM, which
  `ubuntu-24.04` provides.

A new job starts on `ubuntu-24.04` and justifies any other label in that table.

## Cross-repo premise

| Premise | Owner | Consumer | Enforced |
|---|---|---|---|
| Workflows name only GitHub-hosted runner labels. | Each repo's `.github/workflows/` | The required status checks listed in [../conventions/repos-and-branches.md](../conventions/repos-and-branches.md). | By review. A job that names an unregistered label queues forever and its required check never reports. |

## Consequences

- Jobs are ephemeral: nothing persists between runs except what a job caches or uploads.
- The `ios` job is slow on a cold runner, so its required check can take most of an hour.
- ATM's Worker ledger accepts receipts only from GitHub-hosted runs
  ([0006](0006-one-findings-ledger.md)), which this decision keeps true for every
  repo that publishes to it.
