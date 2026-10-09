import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ExecuteCodeRequest,
  ExecuteCodeResponse,
  TestCase,
  TestCaseResult,
  TestResultStatus,
} from "@repo/shared";
import { env } from "../env.js";
import { command, docker } from "../process.js";
import {
  activeDirectories,
  containerState,
  sandboxArgs,
  withSandbox,
} from "../sandbox.js";
import { compare } from "../compare.js";
import { JudgeError, sanitize } from "../errors.js";

async function compile(code: string, directory: string, signal?: AbortSignal) {
  if (/#\s*include\s*["<]\s*(?:\/|\.\.)/.test(code))
    return "Unsupported include path";
  return withSandbox(async (name) => {
    await docker([
      "run",
      "-d",
      ...sandboxArgs(name, 512),
      env.RUNNER_IMAGE,
      "sleep",
      "infinity",
    ]);
    const copied = await command(
      ["exec", "-i", name, "tee", "/work/solution.cpp"],
      {
        input: code,
        maxOutput: 128 * 1024,
        signal,
      },
    );
    if (copied.code !== 0 || copied.timedOut || copied.overflow)
      throw new JudgeError(503, "JUDGE_UNAVAILABLE", "Compiler unavailable");
    const result = await command(
      [
        "exec",
        name,
        "g++",
        "/work/solution.cpp",
        "-o",
        "/work/runner",
        "-std=c++17",
        "-O2",
        "-pipe",
        "-fno-diagnostics-color",
        "-fmax-errors=20",
        "-ftemplate-depth=512",
        "-fconstexpr-ops-limit=33554432",
      ],
      { timeout: 10000, signal },
    );
    if (
      result.timedOut ||
      result.overflow ||
      (await containerState(name)).OOMKilled
    ) {
      return "Compilation resource limit exceeded";
    }
    if (result.code !== 0) {
      if (result.code === 125 || result.code === 126 || result.code === 127)
        throw new JudgeError(503, "JUDGE_UNAVAILABLE", "Compiler unavailable");
      return sanitize(result.stderr) || "Compilation failed";
    }
    const binary = await command(["exec", name, "cat", "/work/runner"], {
      maxOutput: 16 * 1024 * 1024,
      signal,
    });
    if (binary.code !== 0 || binary.timedOut || binary.overflow)
      throw new JudgeError(503, "JUDGE_UNAVAILABLE", "Compiler unavailable");
    await writeFile(join(directory, "runner"), binary.stdoutBuffer, {
      mode: 0o755,
    });
    return undefined;
  });
}

async function runTest(
  tc: TestCase,
  directory: string,
  options: Partial<ExecuteCodeRequest>,
  signal?: AbortSignal,
  outputLimit = 1024 * 1024,
): Promise<TestCaseResult> {
  return withSandbox(async (name) => {
    const start = performance.now();
    const result = await command(
      [
        "run",
        "-i",
        ...sandboxArgs(name, options.memoryLimitMb ?? 256),
        "--mount",
        `type=bind,src=${join(directory, "runner")},dst=/work/runner,readonly`,
        env.RUNNER_IMAGE,
        "/work/runner",
      ],
      {
        input: tc.input,
        timeout: (options.timeLimitMs ?? 2000) + 500,
        maxOutput: outputLimit,
        signal,
      },
    );
    const state = await containerState(name);
    const executionTimeMs = Math.round(performance.now() - start);
    let status: TestResultStatus;
    if (result.overflow) status = "OLE";
    else if (result.timedOut) status = "TLE";
    else if (state.OOMKilled) status = "MLE";
    else if (state.Running || result.code === 125)
      throw new JudgeError(
        503,
        "JUDGE_UNAVAILABLE",
        "Execution service unavailable",
      );
    else if (state.ExitCode !== 0) status = "RE";
    else
      status = compare(
        result.stdout,
        tc.expectedOutput,
        options.compareMode,
        options.floatEpsilon,
      )
        ? "AC"
        : "WA";
    const expectedOutput = tc.expectedOutput.trim();
    if (status === "AC" || status === "WA") {
      return {
        testCaseId: tc.id,
        status,
        actualOutput: result.stdout.trim(),
        expectedOutput,
        executionTimeMs,
      };
    }
    return {
      testCaseId: tc.id,
      status,
      expectedOutput: tc.expectedOutput,
      executionTimeMs,
      error: {
        TLE: "Time Limit Exceeded",
        MLE: "Memory Limit Exceeded",
        OLE: "Output Limit Exceeded",
        RE: "Runtime Error",
      }[status as "TLE" | "MLE" | "OLE" | "RE"],
    };
  });
}

export async function executeCppCode(
  code: string,
  testCases: TestCase[],
  options: Partial<ExecuteCodeRequest> = {},
  signal?: AbortSignal,
): Promise<ExecuteCodeResponse> {
  signal?.throwIfAborted();
  await mkdir(env.WORK_DIR, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(env.WORK_DIR, "job-"));
  activeDirectories.add(directory);
  try {
    const error = await compile(code, directory, signal);
    if (error)
      return {
        overallStatus: "CE",
        passedCount: 0,
        totalCount: testCases.length,
        results: testCases.map((tc) => ({
          testCaseId: tc.id,
          status: "CE",
          expectedOutput: tc.expectedOutput,
          error,
        })),
      };
    const results: TestCaseResult[] = [];
    let outputBytes = 0;
    for (const tc of testCases) {
      signal?.throwIfAborted();
      const result = await runTest(
        tc,
        directory,
        options,
        signal,
        Math.min(1024 * 1024, 4 * 1024 * 1024 - outputBytes),
      );
      outputBytes += Buffer.byteLength(result.actualOutput ?? "");
      results.push(result);
    }
    return {
      overallStatus:
        results.find((result) => result.status !== "AC")?.status ?? "AC",
      passedCount: results.filter((result) => result.status === "AC").length,
      totalCount: testCases.length,
      results,
    };
  } finally {
    try {
      await rm(directory, { recursive: true, force: true });
    } finally {
      activeDirectories.delete(directory);
    }
  }
}
