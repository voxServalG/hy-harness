import * as path from "node:path";
import { detectProjectType } from "./detect.js";
import { codelintTemplate } from "./configs/codelint.js";
import { doclintTemplate } from "./configs/doclint.js";
import { gardenerFromDoclint } from "./configs/gardener.js";
import { codeQualityYaml } from "./configs/workflow-code-quality.js";
import { docsCheckYaml } from "./configs/workflow-docs-check.js";
import { gitignoreAppend } from "./configs/gitignore.js";
import {
  writeJsonIfMissing,
  writeJson,
  writeYamlIfMissing,
  writeYaml,
  appendGitignore,
  ensureGithubDir,
} from "./files.js";
import { writeHarnessVersion, CURRENT_VERSION } from "./version.js";

export interface DeployResult {
  created: string[];
  skipped: string[];
}

export interface DeployOverrides {
  codeExt?: string;
  lintDirs?: string[];
  codeDirs?: string[];
  docsDir?: string;
  baseBranch?: string;
}

export function deploy(root: string, overrides: DeployOverrides = {}, force = false): DeployResult {
  const created: string[] = [];
  const skipped: string[] = [];
  const project = detectProjectType(root);

  const codeExt = overrides.codeExt ?? project.codeExt;
  const lintDirs = overrides.lintDirs ?? project.lintDirs;
  const codeDirs = overrides.codeDirs ?? project.codeDirs;

  const writeJ = force ? writeJson : writeJsonIfMissing;
  const writeY = force ? writeYaml : writeYamlIfMissing;

  const lintOverrides = { codeExt, lintDirs, codeDirs: lintDirs };
  const docOverrides: Record<string, unknown> = { codeExt, codeDirs };
  if (overrides.docsDir !== undefined) docOverrides.docsDir = overrides.docsDir;
  if (overrides.baseBranch !== undefined) docOverrides.baseBranch = overrides.baseBranch;

  // codelint.json
  const cl = codelintTemplate(lintOverrides);
  if (writeJ(path.join(root, "codelint.json"), cl)) created.push("codelint.json");
  else skipped.push("codelint.json");

  // doclint.json
  const dl = doclintTemplate(docOverrides);
  if (writeJ(path.join(root, "doclint.json"), dl)) created.push("doclint.json");
  else skipped.push("doclint.json");

  // docs-gardener.json (inherits from doclint)
  const gd = gardenerFromDoclint(dl);
  if (writeJ(path.join(root, "docs-gardener.json"), gd)) created.push("docs-gardener.json");
  else skipped.push("docs-gardener.json");

  // CI workflows
  ensureGithubDir(root);
  if (writeY(path.join(root, ".github/workflows/code-quality.yml"), codeQualityYaml()))
    created.push(".github/workflows/code-quality.yml");
  else skipped.push(".github/workflows/code-quality.yml");

  if (writeY(path.join(root, ".github/workflows/docs-check.yml"), docsCheckYaml()))
    created.push(".github/workflows/docs-check.yml");
  else skipped.push(".github/workflows/docs-check.yml");

  // .gitignore append
  if (appendGitignore(root, gitignoreAppend())) created.push(".gitignore (appended tests/_test_*)");
  else skipped.push(".gitignore");

  writeHarnessVersion(root, CURRENT_VERSION, null);

  return { created, skipped };
}
