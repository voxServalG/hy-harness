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
  writeYamlIfMissing,
  appendGitignore,
  ensureGithubDir,
} from "./files.js";
import { writeHarnessVersion, CURRENT_VERSION } from "./version.js";

export interface DeployResult {
  created: string[];
  skipped: string[];
}

export function deploy(root: string): DeployResult {
  const created: string[] = [];
  const skipped: string[] = [];
  const project = detectProjectType(root);
  const overrides = { codeExt: project.codeExt, codeDirs: project.codeDirs };

  // codelint.json
  const cl = codelintTemplate(overrides);
  if (writeJsonIfMissing(path.join(root, "codelint.json"), cl)) created.push("codelint.json");
  else skipped.push("codelint.json");

  // doclint.json
  const dl = doclintTemplate(overrides);
  if (writeJsonIfMissing(path.join(root, "doclint.json"), dl)) created.push("doclint.json");
  else skipped.push("doclint.json");

  // docs-gardener.json (inherits from doclint)
  const gd = gardenerFromDoclint(dl);
  if (writeJsonIfMissing(path.join(root, "docs-gardener.json"), gd)) created.push("docs-gardener.json");
  else skipped.push("docs-gardener.json");

  // CI workflows
  ensureGithubDir(root);
  if (writeYamlIfMissing(path.join(root, ".github/workflows/code-quality.yml"), codeQualityYaml()))
    created.push(".github/workflows/code-quality.yml");
  else skipped.push(".github/workflows/code-quality.yml");

  if (writeYamlIfMissing(path.join(root, ".github/workflows/docs-check.yml"), docsCheckYaml()))
    created.push(".github/workflows/docs-check.yml");
  else skipped.push(".github/workflows/docs-check.yml");

  // .gitignore append
  if (appendGitignore(root, gitignoreAppend())) created.push(".gitignore (appended tests/_test_*)");
  else skipped.push(".gitignore");

  writeHarnessVersion(root, CURRENT_VERSION, null);

  return { created, skipped };
}
