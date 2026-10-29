#!/usr/bin/env node
// Version-anchor check for DAD-Docs (ADVISORY -- never fails the build).
//
// The ONE machine-checkable staleness signal in these docs is the mobile-foundation
// contract version. This compares the version architecture/mobile-contract.md cites
// as current against the latest mobile-foundation-v* tag on DAD-Main, and WARNS if
// the doc lags. It never fails CI: a doc trailing a fresh tag is expected until
// someone does a review pass, and the whole point is a nudge, not a gate.
//
// It reads tags over PUBLIC git (no token), the same way the apps' drift check does.
// On any network/parse failure it warns and exits 0 -- an unreachable remote must
// never break a docs build.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DOC = process.argv[2] ?? "architecture/mobile-contract.md";
const REMOTE = "https://github.com/CoachCoe/DAD-Main.git";

function latestTag() {
  try {
    const out = execFileSync("git", ["ls-remote", "--tags", "--refs", REMOTE, "mobile-foundation-v*"], {
      encoding: "utf8",
      timeout: 15000,
    });
    const versions = out
      .split("\n")
      .map((l) => l.match(/mobile-foundation-v(\d+)\.(\d+)\.(\d+)$/))
      .filter(Boolean)
      .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    if (versions.length === 0) return null;
    versions.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    return versions.at(-1);
  } catch (e) {
    console.log(`::notice::version-anchor: could not read remote tags (${e.message}); skipping.`);
    return null;
  }
}

function docVersion() {
  const src = readFileSync(DOC, "utf8");
  // The doc cites the current pin in a JSON block: "version": "X.Y.Z".
  const m = src.match(/"version"\s*:\s*"(\d+)\.(\d+)\.(\d+)"/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const tag = latestTag();
const doc = docVersion();

if (!tag) process.exit(0); // unreachable remote -> advisory no-op
if (!doc) {
  console.log("::notice::version-anchor: no version string found in the doc; skipping.");
  process.exit(0);
}

const cmp = tag[0] - doc[0] || tag[1] - doc[1] || tag[2] - doc[2];
const tagS = tag.join(".");
const docS = doc.join(".");

if (cmp > 0) {
  console.log(
    `::warning file=${DOC}::mobile-contract.md cites v${docS} but the latest mobile-foundation tag is v${tagS}. ` +
      `Review whether the contract doc needs a pass (this is advisory, not a failure).`
  );
} else {
  console.log(`version-anchor: doc cites v${docS}, latest tag v${tagS} -- up to date.`);
}
process.exit(0);
