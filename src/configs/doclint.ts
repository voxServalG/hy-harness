export interface DoclintConfig {
  docsDir: string;
  codeDirs: string[];
  codeExt: string;
  baseBranch: string;
  maxLines: number;
}

export const defaultDoclint: DoclintConfig = {
  docsDir: "docs",
  codeDirs: ["src", "tests"],
  codeExt: ".py",
  baseBranch: "dev",
  maxLines: 200,
};

export function doclintTemplate(overrides: Partial<DoclintConfig> = {}): DoclintConfig {
  return { ...defaultDoclint, ...overrides };
}
