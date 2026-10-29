# 0002 — What reaches the native apps: the openapi native-admission rule

- Status: accepted
- Date: 2026-10-29
- Scope: DAD-Main (owns the rule), DAD-iOS, DAD-Android (consume its output)

## Context

The native apps do not build against DAD-Main's whole API. The mobile-foundation
bundle is scoped to a subset of operations, and the rule for *which operations are
admitted into that subset* lives in one place: `nativeContract()` in
`DAD-Main/scripts/mobile-foundation.mjs`.

An operation is admitted to the native bundle if **either**:

1. it is explicitly tagged `x-clients: ["native"]`, **or**
2. it is a `GET` **and** is bearer-authenticated (`bearerAuth` / `partnerBearerAuth` /
   `applicationBearerAuth`) or is in the public-reads set.

## Decision

**New GET reads auto-admit; new mutations do NOT — a mutation only reaches the native
apps if it is explicitly tagged `x-clients: ["native"]`.** This is the premise the apps
rely on: "the surface we can call is exactly what `nativeContract()` admits from the
canonical OpenAPI."

Consequences a change author must know:

- Adding a bearer-authed `GET` to DAD-Main **silently widens** the native surface at the
  next re-vendor. That is usually fine, but it is not free — it ships to mobile.
- Adding a mutation that mobile needs and **forgetting the `x-clients` tag** means the
  op never reaches the apps, and the omission is invisible until someone tries to
  generate a client for it. Tag it at the time you add it.

## Who owns this premise

- The admission rule: `DAD-Main/scripts/mobile-foundation.mjs` (`nativeContract`).
- The canonical contract it filters: `DAD-Main/apps/donor-api/api/openapi.json`.
- Enforced structurally: the bundle is cut from the canonical contract through this
  function; the apps verify the cut by hash (see
  [../architecture/mobile-contract.md](../architecture/mobile-contract.md)).

## Why it is written down here

The admission rule is a one-function seam that decides the entire mobile API surface,
and its behaviour is non-obvious (auto-admit reads, opt-in mutations). A DAD-Main change
author adding an endpoint needs to know this without reading the bundler. Naming it
here — with the owner and the exact rule — is the premise made explicit.
