#!/usr/bin/env node
import * as readline from "node:readline";
import * as fs from "node:fs";
import { deploy, type DeployOverrides } from "./deploy.js";
import { upgrade } from "./upgrade.js";
import { detectProjectType } from "./detect.js";
import { readHarnessVersion, CURRENT_VERSION } from "./version.js";

const root = process.cwd();

function parseFlags(argv: string[]): DeployOverrides & { yes?: boolean } {
  const flags: DeployOverrides & { yes?: boolean } = {};
  for (const arg of argv) {
    if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg.startsWith("--code-ext=")) flags.codeExt = arg.slice(11).replace(/^\./, "");
    else if (arg.startsWith("--lint-dirs=")) flags.lintDirs = arg.slice(12).split(",").map(s => s.trim()).filter(Boolean);
    else if (arg.startsWith("--code-dirs=")) flags.codeDirs = arg.slice(12).split(",").map(s => s.trim()).filter(Boolean);
    else if (arg.startsWith("--docs-dir=")) flags.docsDir = arg.slice(11);
    else if (arg.startsWith("--branch=")) flags.baseBranch = arg.slice(9);
  }
  return flags;
}

function ask(tty: number, question: string, defaultVal: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: fs.createReadStream("", { fd: tty }),
      output: fs.createWriteStream("", { fd: tty }),
    });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

async function interactiveDeploy(flags: DeployOverrides): Promise<DeployOverrides> {
  let ttyFd: number;
  try {
    ttyFd = fs.openSync("/dev/tty", "r+");
  } catch {
    return flags;
  }

  const detected = detectProjectType(root);
  const existing = readHarnessVersion(root);

  const tty = ttyFd;

  if (existing) {
    fs.writeSync(tty, "\n  hy-harness · re-configure\n  ──────────────────────────\n\n");
    fs.writeSync(tty, "  Current deployment found. Press Enter to keep defaults, type to override.\n\n");
  } else {
    fs.writeSync(tty, "\n  hy-harness · config\n  ───────────────────\n\n");
    fs.writeSync(tty, "  Detected project type. Press Enter to accept, type to override.\n");
    fs.writeSync(tty, `  Detected: codeExt=${detected.codeExt}  lintDirs=${detected.lintDirs.join(",")}  codeDirs=${detected.codeDirs.join(",")}\n\n`);
  }

  const codeExtDefault = flags.codeExt ?? detected.codeExt;
  const lintDirsDefault = flags.lintDirs?.join(",") ?? detected.lintDirs.join(",");
  const codeDirsDefault = flags.codeDirs?.join(",") ?? detected.codeDirs.join(",");
  const docsDirDefault = flags.docsDir ?? "docs";
  const branchDefault = flags.baseBranch ?? "dev";

  const codeExt = await ask(tty, `  Code extension [${codeExtDefault}] `, codeExtDefault);
  const lintDirs = await ask(tty, `  Lint dirs (codelint) [${lintDirsDefault}] `, lintDirsDefault);
  const codeDirs = await ask(tty, `  Code dirs (doclint) [${codeDirsDefault}] `, codeDirsDefault);
  const docsDir = await ask(tty, `  Docs dir [${docsDirDefault}] `, docsDirDefault);
  const branch = await ask(tty, `  Base branch [${branchDefault}] `, branchDefault);

  fs.writeSync(tty, "\n");

  return {
    codeExt: codeExt !== codeExtDefault || flags.codeExt ? codeExt : undefined,
    lintDirs: lintDirs !== lintDirsDefault ? lintDirs.split(",").map(s => s.trim()).filter(Boolean) : undefined,
    codeDirs: codeDirs !== codeDirsDefault ? codeDirs.split(",").map(s => s.trim()).filter(Boolean) : undefined,
    docsDir: docsDir !== docsDirDefault ? docsDir : undefined,
    baseBranch: branch !== branchDefault ? branch : undefined,
  };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const cmd = rawArgs.find(a => !a.startsWith("-")) || "";
  const flags = parseFlags(rawArgs);

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

  const existing = readHarnessVersion(root);

  if (existing && existing.version < CURRENT_VERSION) {
    console.log(`\n  hy-harness · v${existing.version} → v${CURRENT_VERSION}\n`);
    const r = upgrade(root);
    for (const a of r.added) console.log(`  + ${a}`);
    for (const k of r.kept) console.log(`  - ${k} (kept)`);
    console.log(`\n  ✅  Upgraded.\n`);
    return;
  }

  if (existing && !cmd) {
    console.log(`\n  ✓  Already at v${existing.version}. Nothing to do.\n`);
    return;
  }

  // Deploy path
  let overrides: DeployOverrides = { ...flags };
  delete (overrides as Record<string, unknown>).yes;

  if (!flags.yes) {
    overrides = await interactiveDeploy(flags);
  }

  console.log("\n  hy-harness · deploy\n  ──────────────────\n");
  const r = deploy(root, overrides);
  for (const c of r.created) console.log(`  + ${c}`);
  for (const s of r.skipped) console.log(`  - ${s} (skipped, exists)`);
  console.log(`\n  ✅  ${r.created.length} created, ${r.skipped.length} kept.\n`);
}

main().catch(err => {
  console.error("  ✗", err.message || err);
  process.exit(1);
});
