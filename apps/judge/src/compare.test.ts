import { expect, test } from "bun:test";
import { compare } from "./compare.js";
import { sanitize } from "./errors.js";

test("legacy comparison keeps trimmed string semantics", () => {
  expect(compare(" 8\n", "8")).toBe(true);
  expect(compare("1  2", "1 2")).toBe(false);
});

test("exact and token modes distinguish whitespace correctly", () => {
  expect(compare("8\n", "8", "exact")).toBe(false);
  expect(compare("1  2\r\n", "1\n2", "token")).toBe(true);
  expect(compare("12", "1 2", "token")).toBe(false);
});

test("float comparison handles scientific notation and tolerance", () => {
  expect(compare("1e-3 2.0000001", "0.001 2", "float")).toBe(true);
  expect(compare("2.01", "2", "float")).toBe(false);
  expect(compare("NaN", "2", "float")).toBe(false);
  expect(compare("answer 2", "answer 2.0000001", "float")).toBe(true);
});

test("compiler output strips control characters, host paths and excessive data", () => {
  const output = sanitize(
    "\x1b[31m/work/solution.cpp:1 /home/user/private\x00 " + "x".repeat(10000),
  );
  expect(output).not.toContain("/work");
  expect(output).not.toContain("/home");
  expect(output).not.toContain("\x1b");
  expect(output).not.toContain("\x00");
  expect(output.length).toBeLessThanOrEqual(4096);
});
