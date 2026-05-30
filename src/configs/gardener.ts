export interface GardenerConfig {
  docsDir: string;
  codeDirs: string[];
  codeExt: string;
  baseBranch: string;
  catalogs: Record<string, string[]>;
}

export const defaultGardener: GardenerConfig = {
  docsDir: "docs",
  codeDirs: ["src", "tests"],
  codeExt: ".py",
  baseBranch: "dev",
  catalogs: {},
};

export function gardenerTemplate(overrides: Partial<GardenerConfig> = {}): GardenerConfig {
  const merged = { ...defaultGardener, ...overrides };
  if (!merged.catalogs) merged.catalogs = {};
  return merged;
}

export function gardenerFromDoclint(doclint: any): GardenerConfig {
  return {
    docsDir: doclint.docsDir ?? "docs",
    codeDirs: doclint.codeDirs ?? ["src", "tests"],
    codeExt: doclint.codeExt ?? ".py",
    baseBranch: doclint.baseBranch ?? "dev",
    catalogs: {},
  };
}
