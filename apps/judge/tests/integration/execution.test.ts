import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  mkdir,
  utimes,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const enabled = process.env.RUN_DOCKER_TESTS === "1";
let directory: string;
let execute: typeof import("../../src/services/execution.service.js").executeCppCode;
let docker: typeof import("../../src/process.js").docker;
let sandbox: typeof import("../../src/sandbox.js");

beforeAll(async () => {
  if (!enabled) return;
  directory = await mkdtemp(join(tmpdir(), "arena-integration-"));
  process.env.WORK_DIR = directory;
  execute = (await import("../../src/services/execution.service.js"))
    .executeCppCode;
  docker = (await import("../../src/process.js")).docker;
  sandbox = await import("../../src/sandbox.js");
  await sandbox.ready();
});

afterAll(async () => {
  if (!enabled) return;
  expect(
    (
      await docker([
        "ps",
        "-a",
        "--filter",
        `label=${sandbox.ownerLabel}`,
        "--format",
        "{{.Names}}",
      ])
    ).trim(),
  ).toBe("");
  expect(await readdir(directory)).toEqual([]);
  await rm(directory, { recursive: true, force: true });
});

async function fixture(name: string, expectedOutput = "", options = {}) {
  const code = await readFile(
    new URL(`../fixtures/${name}`, import.meta.url),
    "utf8",
  );
  return execute(code, [{ id: "1", input: "3 5", expectedOutput }], options);
}

test.skipIf(!enabled)(
  "real Docker preserves compile and judging",
  async () => {
    const code = await readFile(
      new URL("../fixtures/ok_sum.cpp", import.meta.url),
      "utf8",
    );
    const result = await execute(code, [
      { id: "1", input: "3 5", expectedOutput: "8" },
      { id: "2", input: "2 3", expectedOutput: "6" },
    ]);
    expect(result.overallStatus).toBe("WA");
    expect(result.passedCount).toBe(1);
    expect(result.results.map((entry) => entry.status)).toEqual(["AC", "WA"]);
  },
  30000,
);

test.skipIf(!enabled)(
  "defines ONLINE_JUDGE for contest solutions",
  async () => {
    expect((await fixture("online_judge.cpp", "judge")).overallStatus).toBe(
      "AC",
    );
  },
  30000,
);

for (const [name, verdict] of [
  ["compile_error.cpp", "CE"],
  ["compile_bomb.cpp", "CE"],
  ["runtime_error.cpp", "RE"],
  ["infinite_loop.cpp", "TLE"],
  ["fork_bomb.cpp", "TLE"],
  ["output_flood.cpp", "OLE"],
  ["memory_bomb.cpp", "MLE"],
  ["disk_fill.cpp", "RE"],
] as const)
  test.skipIf(!enabled)(
    `contains ${name}`,
    async () => {
      const result = await fixture(name!, "", {
        timeLimitMs: 1500,
        memoryLimitMb: name === "fork_bomb.cpp" ? 256 : 64,
      });
      expect(result.overallStatus).toBe(verdict!);
      expect(await readdir(directory)).toEqual([]);
    },
    30000,
  );

test.skipIf(!enabled)(
  "filesystem, identity and network isolation",
  async () => {
    expect((await fixture("isolation.cpp", "isolated")).overallStatus).toBe(
      "AC",
    );
    const rejected = await execute('#include "/dev/zero"', [
      { id: "1", input: "", expectedOutput: "" },
    ]);
    expect(rejected.overallStatus).toBe("CE");
  },
  30000,
);

test.skipIf(!enabled)(
  "sandbox flags are enforced by Docker",
  async () => {
    await sandbox.withSandbox(async (name) => {
      await docker([
        "run",
        "-d",
        ...sandbox.sandboxArgs(name, 64),
        (await import("../../src/env.js")).env.RUNNER_IMAGE,
        "sleep",
        "infinity",
      ]);
      const [state] = JSON.parse(await docker(["inspect", name]));
      expect(state.Config.User).toBe("65534:65534");
      expect(state.HostConfig.NetworkMode).toBe("none");
      expect(state.HostConfig.Memory).toBe(64 * 1024 * 1024);
      expect(state.HostConfig.MemorySwap).toBe(state.HostConfig.Memory);
      expect(state.HostConfig.PidsLimit).toBe(64);
      expect(state.HostConfig.NanoCpus).toBe(1000000000);
      expect(state.HostConfig.ReadonlyRootfs).toBe(true);
      expect(state.HostConfig.CapDrop).toEqual(["ALL"]);
      expect(state.HostConfig.SecurityOpt).toContain("no-new-privileges");
    });
  },
  15000,
);

test.skipIf(!enabled)(
  "concurrent submissions stay separate",
  async () => {
    const code = await readFile(
      new URL("../fixtures/ok_sum.cpp", import.meta.url),
      "utf8",
    );
    const results = await Promise.all([
      execute(code, [{ id: "1", input: "1 2", expectedOutput: "3" }]),
      execute(code, [{ id: "1", input: "7 8", expectedOutput: "15" }]),
    ]);
    expect(results.map((result) => result.overallStatus)).toEqual(["AC", "AC"]);
  },
  30000,
);

test.skipIf(!enabled)(
  "cancellation cleans containers and files",
  async () => {
    const code = await readFile(
      new URL("../fixtures/infinite_loop.cpp", import.meta.url),
      "utf8",
    );
    const abort = new AbortController();
    const result = execute(
      code,
      [{ id: "1", input: "", expectedOutput: "" }],
      {},
      abort.signal,
    );
    const caught = result.catch((error: unknown) => error);
    const deadline = Date.now() + 15000;
    let running = false;
    while (Date.now() < deadline) {
      const names = (
        await docker([
          "ps",
          "--filter",
          `label=${sandbox.ownerLabel}`,
          "--format",
          "{{.Names}}",
        ])
      )
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      for (const name of names) {
        const command = JSON.parse(
          await docker(["inspect", "--format", "{{json .Config.Cmd}}", name]),
        );
        if (command[0] === "/work/runner") running = true;
      }
      if (running) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(running).toBe(true);
    abort.abort(new Error("disconnected"));
    expect(await caught).toBeInstanceOf(Error);
    expect(await readdir(directory)).toEqual([]);
  },
  30000,
);

test.skipIf(!enabled)(
  "orphan reaper only removes stale job directories",
  async () => {
    const stale = join(directory, "job-stale"),
      fresh = join(directory, "job-fresh"),
      unrelated = join(directory, "keep");
    await Promise.all([mkdir(stale), mkdir(fresh), mkdir(unrelated)]);
    await utimes(stale, new Date(0), new Date(0));
    await (await import("../../src/reaper.js")).reap();
    expect((await readdir(directory)).sort()).toEqual(["job-fresh", "keep"]);
    await Promise.all([
      rm(fresh, { recursive: true }),
      rm(unrelated, { recursive: true }),
    ]);
  },
);

test.skipIf(!enabled)(
  "reaper removes orphan containers but preserves active ones",
  async () => {
    const { randomUUID } = await import("node:crypto");
    const name = `sbx-${randomUUID()}`;
    const image = (await import("../../src/env.js")).env.RUNNER_IMAGE;
    await docker([
      "run",
      "-d",
      ...sandbox.sandboxArgs(name, 64),
      image,
      "sleep",
      "infinity",
    ]);
    try {
      sandbox.activeContainers.add(name);
      const reap = (await import("../../src/reaper.js")).reap;
      await reap(Date.now() + 31 * 60 * 1000);
      expect(
        (
          await docker(["inspect", "--format", "{{.State.Running}}", name])
        ).trim(),
      ).toBe("true");
      sandbox.activeContainers.delete(name);
      await reap(Date.now() + 31 * 60 * 1000);
      expect(
        (
          await docker([
            "ps",
            "-a",
            "--filter",
            `name=${name}`,
            "--format",
            "{{.Names}}",
          ])
        ).trim(),
      ).toBe("");
    } finally {
      sandbox.activeContainers.delete(name);
      await docker(["rm", "-f", name]);
    }
  },
  15000,
);

test.skipIf(!enabled)(
  "HTTP judge stays healthy after hostile submissions",
  async () => {
    const { createApp } = await import("../../src/app.js");
    const { env } = await import("../../src/env.js");
    const server = createApp().listen(0, "127.0.0.1");
    try {
      if (!server.listening)
        await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Missing test listener");
      const url = `http://127.0.0.1:${address.port}`;
      expect((await fetch(`${url}/health`)).status).toBe(200);
      const code = await readFile(
        new URL("../fixtures/ok_sum.cpp", import.meta.url),
        "utf8",
      );
      const response = await fetch(`${url}/api/execution/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.JUDGE_SECRET
            ? { Authorization: `Bearer ${env.JUDGE_SECRET}` }
            : {}),
        },
        body: JSON.stringify({
          code,
          testCases: [{ id: "1", input: "3 5", expectedOutput: "8" }],
        }),
      });
      expect(response.status).toBe(200);
      const body = (await response.json()) as { overallStatus: string };
      expect(body.overallStatus).toBe("AC");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
  30000,
);
