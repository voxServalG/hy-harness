#!/usr/bin/env node
import { deploy } from "./deploy.js";
import { upgrade } from "./upgrade.js";
import { readHarnessVersion, CURRENT_VERSION } from "./version.js";

const root = process.cwd();
const cmd = process.argv[2] || "";

if (cmd === "upgrade" || cmd === "--upgrade" || cmd === "-u") {
  console.log("\n  hy-harness upgrade");
  console.log("  ──────────────────\n");
  const r = upgrade(root);
  if (r.versionFrom === 0) {
    console.log("  ⚠  No existing deployment found. Use 'npx hy-harness' for first deploy.\n");
    process.exit(0);
  }
  if (r.added.length === 0) {
    console.log(`  ✓ Already at latest version (v${r.versionTo}).\n`);
    process.exit(0);
  }
  for (const a of r.added) console.log(`  + ${a}`);
  for (const k of r.kept) console.log(`  - ${k} (kept)`);
  console.log(`\n  ✅  v${r.versionFrom} → v${r.versionTo}  (${r.added.length} added, ${r.kept.length} kept)\n`);
  process.exit(0);
}

if (cmd === "check" || cmd === "--check") {
  const v = readHarnessVersion(root);
  if (v) console.log(`v${v.version}  (current: v${CURRENT_VERSION})`);
  else console.log("not deployed");
  process.exit(0);
}

// Default: deploy or upgrade
const existing = readHarnessVersion(root);

if (existing && existing.version < CURRENT_VERSION) {
  console.log(`\n  hy-harness · v${existing.version} → v${CURRENT_VERSION}\n`);
  const r = upgrade(root);
  for (const a of r.added) console.log(`  + ${a}`);
  for (const k of r.kept) console.log(`  - ${k} (kept)`);
  console.log(`\n  ✅  Upgraded.\n`);
} else if (existing) {
  console.log(`\n  ✓  Already at v${existing.version}. Nothing to do.\n`);
} else {
  console.log("\n  hy-harness · deploy\n  ──────────────────\n");
  const r = deploy(root);
  for (const c of r.created) console.log(`  + ${c}`);
  for (const s of r.skipped) console.log(`  - ${s} (skipped, exists)`);
  console.log(`\n  ✅  ${r.created.length} created, ${r.skipped.length} kept.\n`);
}
