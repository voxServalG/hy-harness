import * as fs from "node:fs";
import * as path from "node:path";
import { codeQualityYaml } from "./configs/workflow-code-quality.js";
import { docsCheckYaml } from "./configs/workflow-docs-check.js";

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeJsonIfMissing(filePath: string, content: object): boolean {
  if (fs.existsSync(filePath)) return false;
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n", "utf-8");
  return true;
}

export function writeYamlIfMissing(filePath: string, content: string): boolean {
  if (fs.existsSync(filePath)) return false;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

export function appendGitignore(root: string, line: string): boolean {
  const p = path.join(root, ".gitignore");
  const existing = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
  if (existing.includes(line)) return false;
  const content = existing.trimEnd() + "\n" + line + "\n";
  fs.writeFileSync(p, content, "utf-8");
  return true;
}

export function ensureGithubDir(root: string): void {
  ensureDir(path.join(root, ".github", "workflows"));
}
