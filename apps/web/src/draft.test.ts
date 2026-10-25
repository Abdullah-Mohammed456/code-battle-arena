import { afterEach, expect, test } from "bun:test";
import { readDraft, saveDraft, starter } from "./draft";

const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
afterEach(() => {
  if (original) Object.defineProperty(globalThis, "localStorage", original);
  else Reflect.deleteProperty(globalThis, "localStorage");
});

test("drafts stay separate for each account and problem, including an empty draft", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  saveDraft("alice:sum", "solution");
  saveDraft("alice:tree", "");
  expect(readDraft("alice:sum")).toBe("solution");
  expect(readDraft("alice:tree")).toBe("");
  expect(readDraft("bob:sum")).toBe(starter);
});

test("blocked or full browser storage does not crash the workspace", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("Storage blocked");
    },
  });
  expect(readDraft("alice:sum")).toBe(starter);
  expect(saveDraft("alice:sum", "code")).toBe(false);
});
