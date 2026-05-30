export function mergeConfig<T extends Record<string, any>>(
  existing: T | null,
  template: T
): T {
  if (!existing) return { ...template };
  const merged: Record<string, any> = { ...template };
  for (const key of Object.keys(template)) {
    if (key in existing) merged[key] = existing[key as keyof T];
  }
  return merged as T;
}
