import { afterEach, expect, mock, test } from "bun:test";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const calls: string[][] = [];
let outputs: string[] = [];
let failure: Error | undefined;
const execFile = Object.assign(() => {}, {
  [promisify.custom]: async (_file: string, args: string[]) => {
    calls.push(args);
    if (failure) throw failure;
    return {
      stdout: args.includes("g++") ? "" : (outputs.shift() ?? "8"),
      stderr: "",
    };
  },
});
mock.module("child_process", () => ({ execFile }));
const { app } = await import("./app.js");
const { executeCppCode } = await import("./services/execution.service.js");
const { envSchema } = await import("./env.js");

afterEach(() => {
  calls.length = 0;
  outputs = [];
  failure = undefined;
});

async function post(body: unknown) {
  const server = app.listen(0, "127.0.0.1");
  try {
    if (!server.listening)
      await new Promise<void>((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
      });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test port");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/execution/run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

const testCases = [{ id: "1", input: "3 5", expectedOutput: "8" }];

test("legacy endpoint preserves its success response", async () => {
  const response = await post({ code: "int main() {}", testCases });
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({
    overallStatus: "AC",
    passedCount: 1,
    totalCount: 1,
    results: [
      { testCaseId: "1", status: "AC", actualOutput: "8", expectedOutput: "8" },
    ],
  });
  expect(calls[0]).toContain("g++");
  const sourceMount = calls[0]?.find((arg) =>
    arg.endsWith(":/app/solution.cpp"),
  );
  expect(sourceMount).toBeDefined();
  expect(existsSync(sourceMount!.split(":")[0]!)).toBe(false);
});

test("invalid bodies never start the runner", async () => {
  for (const body of [
    null,
    {},
    { code: 42, testCases },
    { code: "x", testCases: [null] },
  ]) {
    expect((await post(body)).status).toBe(400);
  }
  expect(calls).toHaveLength(0);
});

test("compiles once and keeps the first failing verdict", async () => {
  outputs = ["wrong", "8"];
  const response = await executeCppCode("int main() {}", [
    ...testCases,
    { ...testCases[0]!, id: "2" },
  ]);
  expect(response.overallStatus).toBe("WA");
  expect(response.passedCount).toBe(1);
  expect(response.results.map((result) => result.status)).toEqual(["WA", "AC"]);
  expect(calls.filter((args) => args.includes("g++"))).toHaveLength(1);
});

test("compile failure preserves CE results", async () => {
  failure = Object.assign(new Error("compile failed"), {
    stderr: "invalid C++",
  });
  const response = await executeCppCode("broken", testCases);
  expect(response.overallStatus).toBe("CE");
  expect(response.results[0]?.error).toBe("invalid C++");
  expect(calls).toHaveLength(1);
});

test("judge environment has a local default and rejects invalid ports", () => {
  expect(envSchema.parse({})).toEqual({ PORT: 3001, NODE_ENV: "development" });
  expect(envSchema.safeParse({ PORT: "65536" }).success).toBe(false);
});
