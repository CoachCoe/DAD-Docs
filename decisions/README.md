# Decisions

Cross-repo architectural decisions — the ones that span more than one repo or shape
the system as a whole. One short file per decision (an ADR-lite): context, the
decision, and why.

Repo-local decisions stay in that repo. Record here only what a developer needs to
understand a choice that touches the seams between repos.

Candidate decisions worth writing up (stubs — fill from the authoritative sources):

- **Separate native apps** (iOS and Android as distinct repos, chosen 18 Oct 2026)
  rather than a cross-platform framework.
- **Hash-locked contract vendoring** instead of the apps tracking DAD-Main's `dev`.
  See [../architecture/mobile-contract.md](../architecture/mobile-contract.md).
- **Go rewrite** of the DAD-Main API (the architecture/operations docs in DAD-Main
  describe the current Go system).
- **DAD-infra as the single home** for the AWS estate (DAD-Main + DAD-Quality).
  Authoritative design: `DAD-infra/docs/design/`.
- **Pull-based website deploy** to Lightsail (firewall-locked boxes).
  See [../architecture/deployment.md](../architecture/deployment.md).
