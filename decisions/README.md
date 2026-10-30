# Decisions

Cross-repo architectural decisions — the ones that span more than one repo or shape
the system as a whole. One short file per decision (an ADR-lite): context, the
decision, and why.

Repo-local decisions stay in that repo. Record here only what a developer needs to
understand a choice that touches the seams between repos.

Each ADR names a **cross-repo premise** — something a change relies on about code it
does not own — along with who owns it and where it is enforced. The habit: when a
change depends on something another repo owns, name that premise and its owner here,
and enforce it in CI only where CI can re-derive it.

## Recorded decisions

- [0001 — Attribution precedence differs by platform, on purpose](0001-attribution-precedence.md) (superseded by 0007)
- [0002 — What reaches the native apps: the openapi native-admission rule](0002-openapi-native-admission.md)
- [0003 — The mobile-foundation semver compatibility promise](0003-mobile-foundation-semver-promise.md)
- [0004 — DAD-infra is the single home for the AWS estate](0004-dad-infra-single-home-for-aws.md)
- [0005 — Platform operating standards](0005-platform-operating-standards.md)
- [0006 — One findings ledger; DAD-Quality on AWS is held](0006-one-findings-ledger.md)
- [0007 — Attribution is last-touch on every client](0007-attribution-last-touch-on-all-clients.md)

## Candidate decisions worth writing up (stubs — fill from the authoritative sources)

- **Separate native apps** (iOS and Android as distinct repos, chosen 18 Oct 2026)
  rather than a cross-platform framework.
- **Hash-locked contract vendoring** instead of the apps tracking DAD-Main's `dev`.
  See [../architecture/mobile-contract.md](../architecture/mobile-contract.md).
- **Go rewrite** of the DAD-Main API (the architecture/operations docs in DAD-Main
  describe the current Go system).
- **Pull-based website deploy** to Lightsail (firewall-locked boxes).
  See [../architecture/deployment.md](../architecture/deployment.md).
