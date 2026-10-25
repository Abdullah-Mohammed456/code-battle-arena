import { describe, expect, test } from "bun:test";
import {
  executeCodeSchema,
  nodeEnvSchema,
  portSchema,
  runProblemSchema,
  submissionResultSchema,
} from "./index.js";

const valid = {
  code: "int main() {}",
  testCases: [{ id: "1", input: "", expectedOutput: "" }],
};

describe("execution request", () => {
  test("preserves the legacy request shape and empty test input", () => {
    expect(executeCodeSchema.parse(valid)).toEqual(valid);
  });

  test.each([
    undefined,
    null,
    {},
    { ...valid, code: 1 },
    { ...valid, code: "" },
    { ...valid, testCases: [] },
    { ...valid, testCases: [null] },
    { ...valid, testCases: [{ id: 1, input: "", expectedOutput: "" }] },
    { ...valid, testCases: [{ id: "1", input: 7, expectedOutput: "" }] },
    { ...valid, testCases: [{ id: "1", input: "" }] },
  ])("rejects malformed input: %j", (body) => {
    expect(executeCodeSchema.safeParse(body).success).toBe(false);
  });
});

test("ports must be whole numbers between 1 and 65535", () => {
  expect(portSchema.parse("4000")).toBe(4000);
  for (const value of ["", "abc", "0", "65536", "1.5"]) {
    expect(portSchema.safeParse(value).success).toBe(false);
  }
  expect(nodeEnvSchema.parse(undefined)).toBe("development");
  expect(nodeEnvSchema.safeParse("staging").success).toBe(false);
});

test("execution limits count UTF-8 bytes and reject abusive fields", () => {
  for (const change of [
    { code: "é".repeat(32769) },
    { testCases: Array(101).fill(valid.testCases[0]) },
    { testCases: [{ id: "../bad", input: "", expectedOutput: "" }] },
    { testCases: [{ id: "1", input: "x".repeat(262145), expectedOutput: "" }] },
    { timeLimitMs: 10001 },
    { memoryLimitMb: 513 },
    { language: "python" },
    { floatEpsilon: 0.02 },
  ])
    expect(executeCodeSchema.safeParse({ ...valid, ...change }).success).toBe(
      false,
    );
  expect(
    executeCodeSchema.safeParse({
      ...valid,
      timeLimitMs: 2000,
      compareMode: "token",
    }).success,
  ).toBe(true);
});

test("run requests are strict and hidden test results cannot contain outputs", () => {
  expect(
    submissionResultSchema.safeParse({
      idx: 1,
      status: "RE",
      sample: false,
      error: "private diagnostic",
    }).success,
  ).toBe(false);
  expect(
    runProblemSchema.safeParse({ code: "int main() {}", input: "1 2" }).success,
  ).toBe(true);
  expect(
    runProblemSchema.safeParse({ code: "int main() {}", admin: true }).success,
  ).toBe(false);
  expect(
    submissionResultSchema.safeParse({ idx: 1, status: "WA", sample: false })
      .success,
  ).toBe(true);
  expect(
    submissionResultSchema.safeParse({
      idx: 1,
      status: "WA",
      sample: false,
      expected: "secret",
    }).success,
  ).toBe(false);
});
