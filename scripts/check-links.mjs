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
//   - #fragments on links to Markdown files must match a heading in the target
//     (GitHub slug rules).
//   - External URLs (http/https/mailto) are not fetched; external link liveness
//     is out of scope by design.

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

const slug = (heading) =>
  heading
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/ /g, "-");

const anchors = new Map();
function anchorsOf(file) {
  if (!anchors.has(file)) {
    const seen = new Map();
    const set = new Set();
    let fenced = false;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (line.startsWith("```")) fenced = !fenced;
      const m = !fenced && line.match(/^#{1,6}\s+(.*?)\s*#*$/);
      if (!m) continue;
      const base = slug(m[1]);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      set.add(n === 0 ? base : `${base}-${n}`);
    }
    anchors.set(file, set);
  }
  return anchors.get(file);
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
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    checked++;
    const [filePart, fragment] = target.split("#");
    const resolved = filePart === "" ? file : resolve(dirname(file), filePart);
    const missingFile = !existsSync(resolved);
    const missingAnchor =
      !missingFile && fragment && extname(resolved) === ".md" && !anchorsOf(resolved).has(fragment);
    if (missingFile || missingAnchor) {
      console.error(`BROKEN  ${file}\n        -> ${target}`);
      broken++;
    }
  }
}

console.log(`\nchecked ${checked} internal link(s); ${broken} broken.`);
process.exit(broken === 0 ? 0 : 1);
