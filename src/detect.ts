import * as fs from "node:fs";
import * as path from "node:path";

export interface ProjectType {
  codeExt: string;
  lintDirs: string[];
  codeDirs: string[];
}

function detectCodeDirs(root: string): string[] {
  const dirs: string[] = ["src"];
  for (const d of ["tests", "test", "experiments", "experiment", "lib"]) {
    if (fs.existsSync(path.join(root, d)) && fs.statSync(path.join(root, d)).isDirectory()) {
      if (!dirs.includes(d)) dirs.push(d);
    }
  }
  return dirs;
}

export function detectProjectType(root: string): ProjectType {
  const codeDirs = detectCodeDirs(root);
  if (fs.existsSync(path.join(root, "tsconfig.json")))
    return { codeExt: ".ts", lintDirs: ["src"], codeDirs };
  if (fs.existsSync(path.join(root, "pyproject.toml")))
    return { codeExt: ".py", lintDirs: ["src"], codeDirs };
  if (fs.existsSync(path.join(root, "setup.py")) || fs.existsSync(path.join(root, "setup.cfg")))
    return { codeExt: ".py", lintDirs: ["src"], codeDirs };
  if (fs.existsSync(path.join(root, "package.json")))
    return { codeExt: ".js", lintDirs: ["src"], codeDirs };
  return { codeExt: ".py", lintDirs: ["src"], codeDirs };
}
