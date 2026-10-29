#!/usr/bin/env node
// Link + reference integrity check for DAD-Docs.
//
// Fails (exit 1) when a Markdown file links to an internal path that does not
// exist. This catches the MECHANICAL rot a docs repo actually suffers: a link to
// a doc that was renamed or moved. It deliberately does NOT verify prose against
// code -- that cannot be done without false positives.
//
// Scope:
//   - Relative links/images to other files in this repo must resolve on disk.
//   - In-page anchors (#heading) and external URLs (http/https/mailto) are not
//     fetched here; external link liveness is out of scope by design.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, extname } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (extname(p) === ".md") out.push(p);
  }
  return out;
}

// [text](target) -- capture the target, ignoring any "title" after a space.
const LINK = /\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;

let broken = 0;
let checked = 0;

for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(LINK)) {
    const target = m[1];
    // Skip external schemes and pure in-page anchors.
    if (/^(https?:|mailto:|tel:)/.test(target) || target.startsWith("#")) continue;
    checked++;
    // Strip any #fragment; resolve the file part relative to the doc.
    const filePart = target.split("#")[0];
    if (filePart === "") continue; // was a pure "#frag" already handled
    const resolved = resolve(dirname(file), filePart);
    if (!existsSync(resolved)) {
      console.error(`BROKEN  ${file}\n        -> ${target}`);
      broken++;
    }
  }
}

console.log(`\nchecked ${checked} internal link(s); ${broken} broken.`);
process.exit(broken === 0 ? 0 : 1);
