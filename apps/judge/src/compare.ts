import type { ExecuteCodeRequest } from "@repo/shared";

export function compare(
  actual: string,
  expected: string,
  mode?: ExecuteCodeRequest["compareMode"],
  epsilon = 1e-6,
) {
  if (!mode) return actual.trim() === expected.trim();
  if (mode === "exact") return actual === expected;
  const a = actual.trim().split(/\s+/).filter(Boolean);
  const b = expected.trim().split(/\s+/).filter(Boolean);
  return (
    a.length === b.length &&
    a.every((value, index) => {
      if (mode === "token" || value === b[index]) return value === b[index];
      const x = Number(value),
        y = Number(b[index]);
      return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Math.abs(x - y) <= epsilon * Math.max(1, Math.abs(y))
      );
    })
  );
}
