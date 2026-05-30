export interface CodelintConfig {
  codeDirs: string[];
  codeExt: string;
  baseBranch: string;
  maxLines: number;
}

export const defaultCodelint: CodelintConfig = {
  codeDirs: ["src"],
  codeExt: ".py",
  baseBranch: "dev",
  maxLines: 500,
};

export function codelintTemplate(overrides: Partial<CodelintConfig> = {}): CodelintConfig {
  return { ...defaultCodelint, ...overrides };
}
