export const starter =
  "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    return 0;\n}";

export function readDraft(key: string): string {
  try {
    return localStorage.getItem(`arena:draft:${key}`) ?? starter;
  } catch {
    return starter;
  }
}

export function saveDraft(key: string, code: string): boolean {
  try {
    localStorage.setItem(`arena:draft:${key}`, code);
    return true;
  } catch {
    return false;
  }
}
