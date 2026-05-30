import * as fs from "node:fs";
import * as path from "node:path";

export interface ProjectType {
  codeExt: string;
  codeDirs: string[];
}

export function detectProjectType(root: string): ProjectType {
  if (fs.existsSync(path.join(root, "tsconfig.json")))
    return { codeExt: ".ts", codeDirs: ["src"] };
  if (fs.existsSync(path.join(root, "pyproject.toml")))
    return { codeExt: ".py", codeDirs: ["src"] };
  if (fs.existsSync(path.join(root, "setup.py")) || fs.existsSync(path.join(root, "setup.cfg")))
    return { codeExt: ".py", codeDirs: ["src"] };
  if (fs.existsSync(path.join(root, "package.json")))
    return { codeExt: ".js", codeDirs: ["src"] };
  return { codeExt: ".py", codeDirs: ["src"] };
}
