import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const cli = join(root, "dist", "index.js");
const forbidden = ["重新配置", "部署", "猛击 Enter"];

function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function setupProject() {
  const dir = mkdtempSync(join(tmpdir(), "hy-harness-check-"));
  mkdirSync(join(dir, ".hy"), { recursive: true });
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  writeJson(join(dir, ".hy", "harness.json"), { version: 3, deployedAt: "2026-01-01T00:00:00.000Z" });
  writeJson(join(dir, "codelint.json"), {});
  writeJson(join(dir, "doclint.json"), {});
  writeJson(join(dir, "docs-gardener.json"), {});
  writeFileSync(join(dir, ".github", "workflows", "code-quality.yml"), "name: Code Quality\n", "utf8");
  writeFileSync(join(dir, ".github", "workflows", "docs-check.yml"), "name: Docs Lint\n", "utf8");
  return dir;
}

function snapshot(dir) {
  const files = {};
  function walk(current, relative = "") {
    for (const entry of readdirSync(current).sort()) {
      const path = join(current, entry);
      const rel = relative ? `${relative}/${entry}` : entry;
      const stat = statSync(path);
      if (stat.isDirectory()) walk(path, rel);
      else files[rel] = readFileSync(path, "utf8");
    }
  }
  walk(dir);
  return files;
}

function run(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

function assertReadonly(args, validate) {
  const dir = setupProject();
  try {
    const before = snapshot(dir);
    const result = run(args, dir);
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 0, output);
    for (const text of forbidden) assert.equal(output.includes(text), false, output);
    assert.deepEqual(snapshot(dir), before);
    validate(result.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

assertReadonly(["--check"], stdout => {
  assert.match(stdout, /^v3  \(current: v3\)\n$/);
});

assertReadonly(["check"], stdout => {
  assert.match(stdout, /^v3  \(current: v3\)\n$/);
});

assertReadonly(["check", "--json"], stdout => {
  const parsed = JSON.parse(stdout);
  assert.deepEqual(parsed, {
    ok: true,
    status: "up_to_date",
    currentTemplateVersion: 3,
    latestTemplateVersion: 3,
    missingArtifacts: [],
    outdatedArtifacts: [],
    requiresUser: false,
  });
});
