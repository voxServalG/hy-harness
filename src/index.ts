#!/usr/bin/env node
import * as readline from "node:readline";
import * as fs from "node:fs";
import { deploy, type DeployOverrides } from "./deploy.js";
import { upgrade } from "./upgrade.js";
import { detectProjectType } from "./detect.js";
import { readHarnessVersion, CURRENT_VERSION } from "./version.js";

const root = process.cwd();

function parseFlags(argv: string[]): DeployOverrides & { yes?: boolean; json?: boolean } {
  const flags: DeployOverrides & { yes?: boolean; json?: boolean } = {};
  for (const arg of argv) {
    if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg === "--json") flags.json = true;
    else if (arg.startsWith("--code-ext=")) flags.codeExt = arg.slice(11).replace(/^\./, "");
    else if (arg.startsWith("--lint-dirs=")) flags.lintDirs = arg.slice(12).split(",").map(s => s.trim()).filter(Boolean);
    else if (arg.startsWith("--code-dirs=")) flags.codeDirs = arg.slice(12).split(",").map(s => s.trim()).filter(Boolean);
    else if (arg.startsWith("--docs-dir=")) flags.docsDir = arg.slice(11);
    else if (arg.startsWith("--branch=")) flags.baseBranch = arg.slice(9);
  }
  return flags;
}

function parseCommand(argv: string[]): string {
  for (const arg of argv) {
    if (arg === "check" || arg === "--check") return "check";
    if (arg === "upgrade" || arg === "--upgrade" || arg === "-u") return "upgrade";
    if (!arg.startsWith("-")) return arg;
  }
  return "";
}

function checkStatus() {
  const requiredArtifacts = [
    "codelint.json",
    "doclint.json",
    "docs-gardener.json",
    ".github/workflows/code-quality.yml",
    ".github/workflows/docs-check.yml",
  ];
  const v = readHarnessVersion(root);
  const missingArtifacts = requiredArtifacts.filter(file => !fs.existsSync(`${root}/${file}`));
  const outdatedArtifacts = v && v.version < CURRENT_VERSION ? [".hy/harness.json"] : [];
  const status = !v
    ? "not_deployed"
    : missingArtifacts.length > 0
      ? "missing_artifacts"
      : outdatedArtifacts.length > 0
        ? "outdated"
        : "up_to_date";

  return {
    ok: missingArtifacts.length === 0 && outdatedArtifacts.length === 0,
    status,
    currentTemplateVersion: v?.version ?? null,
    latestTemplateVersion: CURRENT_VERSION,
    missingArtifacts,
    outdatedArtifacts,
    requiresUser: false,
  };
}

function ask(rl: readline.Interface, question: string, defaultVal: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, answer => {
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

  if (existing) {
    fs.writeSync(ttyFd, "\n  hy-harness · 重新配置\n  ──────────────────────\n\n");
    fs.writeSync(ttyFd, "  已检测到现有部署。回车保持默认值，输入可覆盖。\n\n");
  } else {
    fs.writeSync(ttyFd, "\n  hy-harness · 配置\n  ─────────────────\n\n");
    fs.writeSync(ttyFd, "  检测到项目类型。回车确认，输入可覆盖。\n");
    fs.writeSync(ttyFd, `  检测结果: 代码后缀=${detected.codeExt}  生产代码目录=${detected.lintDirs.join(",")}  文档感知目录=${detected.codeDirs.join(",")}\n\n`);
  }

  const codeExtDefault = flags.codeExt ?? detected.codeExt;
  const lintDirsDefault = flags.lintDirs?.join(",") ?? detected.lintDirs.join(",");
  const codeDirsDefault = flags.codeDirs?.join(",") ?? detected.codeDirs.join(",");
  const docsDirDefault = flags.docsDir ?? "docs";
  const branchDefault = flags.baseBranch ?? "dev";

  const rl = readline.createInterface({
    input: fs.createReadStream("", { fd: ttyFd }),
    output: fs.createWriteStream("", { fd: ttyFd }),
  });

  const codeExt = await ask(rl, `  代码后缀 [${codeExtDefault}] `, codeExtDefault);
  const lintDirs = await ask(rl, `  生产代码目录 (codelint) [${lintDirsDefault}] `, lintDirsDefault);
  const codeDirs = await ask(rl, `  文档感知目录 (doclint) [${codeDirsDefault}] `, codeDirsDefault);
  const docsDir = await ask(rl, `  文档目录 [${docsDirDefault}] `, docsDirDefault);
  const branch = await ask(rl, `  基准分支 [${branchDefault}] `, branchDefault);

  rl.close();
  fs.closeSync(ttyFd);

  return {
    codeExt: codeExt !== codeExtDefault || flags.codeExt ? codeExt : undefined,
    lintDirs: lintDirs !== lintDirsDefault ? lintDirs.split(",").map(s => s.trim()).filter(Boolean) : undefined,
    codeDirs: codeDirs !== codeDirsDefault ? codeDirs.split(",").map(s => s.trim()).filter(Boolean) : undefined,
    docsDir: docsDir !== docsDirDefault ? docsDir : undefined,
    baseBranch: branch !== branchDefault ? branch : undefined,
  };
}

function waitEnter(): Promise<void> {
  return new Promise(resolve => {
    try {
      const fd = fs.openSync("/dev/tty", "r");
      const rl = readline.createInterface({
        input: fs.createReadStream("", { fd }),
        output: process.stdout,
      });
      rl.question("  猛击 Enter 以继续 ", () => {
        rl.close();
        fs.closeSync(fd);
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const cmd = parseCommand(rawArgs);
  const flags = parseFlags(rawArgs);

  if (cmd === "upgrade") {
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

  if (cmd === "check") {
    const status = checkStatus();
    if (flags.json) console.log(JSON.stringify(status, null, 2));
    else if (status.currentTemplateVersion !== null) console.log(`v${status.currentTemplateVersion}  (current: v${CURRENT_VERSION})`);
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
    let overrides: DeployOverrides = {};
    let reconfigure = false;
    if (!flags.yes) {
      overrides = await interactiveDeploy(flags);
      reconfigure = true;
    }
    if (reconfigure) {
      console.log("\n  hy-harness · 重新配置\n  ──────────────────────\n");
      const r = deploy(root, overrides, true);
      for (const c of r.created) console.log(`  + ${c}`);
      for (const s of r.skipped) console.log(`  - ${s}（已存在，跳过）`);
      console.log(`\n  ✅  已写入 ${r.created.length}，跳过 ${r.skipped.length}。\n`);
      await waitEnter();
    } else {
      console.log(`\n  ✓  已是最新版本 v${existing.version}。\n`);
    }
    process.exit(0);
  }

  // Deploy path
  let overrides: DeployOverrides = { ...flags };
  delete (overrides as Record<string, unknown>).yes;

  if (!flags.yes) {
    overrides = await interactiveDeploy(flags);
  }

  console.log("\n  hy-harness · 部署\n  ─────────────────\n");
  const r = deploy(root, overrides);
  for (const c of r.created) console.log(`  + ${c}`);
  for (const s of r.skipped) console.log(`  - ${s}（已存在，跳过）`);
  console.log(`\n  ✅  已创建 ${r.created.length}，跳过 ${r.skipped.length}。\n`);
  await waitEnter();
  process.exit(0);
}

main().catch(err => {
  console.error("  ✗", err.message || err);
  process.exit(1);
});
