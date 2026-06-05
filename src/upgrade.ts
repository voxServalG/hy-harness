import * as path from "node:path";
import * as fs from "node:fs";
import { readHarnessVersion, writeHarnessVersion, CURRENT_VERSION, type HarnessVersion } from "./version.js";
import { gitignoreAppend } from "./configs/gitignore.js";
import { appendGitignore } from "./files.js";

export interface UpgradeResult {
  versionFrom: number;
  versionTo: number;
  added: string[];
  kept: string[];
}

export function upgrade(root: string): UpgradeResult {
  const prev = readHarnessVersion(root);
  if (!prev) return { versionFrom: 0, versionTo: CURRENT_VERSION, added: ["first deploy, use 'deploy' instead"], kept: [] };

  const from = prev.version;
  if (from >= CURRENT_VERSION) return { versionFrom: from, versionTo: CURRENT_VERSION, added: [], kept: [] };

  const added: string[] = [];

  // v1 → v2: append tests/_test_* gitignore
  if (from < 2) {
    if (appendGitignore(root, gitignoreAppend())) {
      added.push(".gitignore: +tests/_test_*");
    }
  }

  // v2 → v3: add lintDirs to codelint.json (value from existing codeDirs)
  if (from < 3) {
    const clPath = path.join(root, "codelint.json");
    if (fs.existsSync(clPath)) {
      try {
        const cl = JSON.parse(fs.readFileSync(clPath, "utf-8"));
        if (!cl.lintDirs && cl.codeDirs) {
          cl.lintDirs = cl.codeDirs;
          fs.writeFileSync(clPath, JSON.stringify(cl, null, 2) + "\n", "utf-8");
          added.push("codelint.json: +lintDirs");
        }
      } catch { /* keep existing config intact */ }
    }
  }

  writeHarnessVersion(root, CURRENT_VERSION, prev);

  const kept: string[] = [];
  for (const f of ["codelint.json", "doclint.json", "docs-gardener.json",
                   ".github/workflows/code-quality.yml", ".github/workflows/docs-check.yml"]) {
    if (fs.existsSync(path.join(root, f))) kept.push(f);
  }

  return { versionFrom: from, versionTo: CURRENT_VERSION, added, kept };
}
