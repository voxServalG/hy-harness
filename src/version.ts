import * as fs from "node:fs";
import * as path from "node:path";

const HARNESS_JSON = ".hy/harness.json";

export const CURRENT_VERSION = 3;

export interface HarnessVersion {
  version: number;
  deployedAt: string;
  upgradedAt?: string;
}

export function readHarnessVersion(root: string): HarnessVersion | null {
  const p = path.join(root, HARNESS_JSON);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as HarnessVersion;
  } catch {
    return null;
  }
}

export function writeHarnessVersion(root: string, version: number, existing: HarnessVersion | null): void {
  const dir = path.join(root, ".hy");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date().toISOString();
  const v: HarnessVersion = {
    version,
    deployedAt: existing?.deployedAt ?? now,
  };
  if (existing) v.upgradedAt = now;

  fs.writeFileSync(path.join(root, HARNESS_JSON), JSON.stringify(v, null, 2) + "\n", "utf-8");
}
