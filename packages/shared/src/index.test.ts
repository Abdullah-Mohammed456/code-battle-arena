import { describe, expect, test } from "bun:test";
import { executeCodeSchema, nodeEnvSchema, portSchema } from "./index.js";

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
