import { expect, test } from "bun:test";
import { createApp } from "./app.js";
import { envSchema } from "./env.js";
import { JudgeError } from "./errors.js";
import type { ExecuteCodeResponse } from "@repo/shared";

const response: ExecuteCodeResponse = {
  overallStatus: "AC",
  passedCount: 1,
  totalCount: 1,
  results: [
    {
      testCaseId: "1",
      status: "AC",
      actualOutput: "8",
      expectedOutput: "8",
      executionTimeMs: 12,
    },
  ],
};
const body = {
  code: "int main() {}",
  testCases: [{ id: "1", input: "3 5", expectedOutput: "8" }],
};
const config = envSchema.parse({ NODE_ENV: "test" });

async function withServer(
  app: ReturnType<typeof createApp>,
  run: (url: string) => Promise<void>,
) {
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
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    if (server.listening)
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
  }
}
const post = (url: string, value: unknown = body, token?: string) =>
  fetch(`${url}/api/execution/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(value),
  });

test("legacy success fields and request IDs are preserved", async () => {
  await withServer(
    createApp(async () => response, config),
    async (url) => {
      const result = await post(url);
      expect(result.status).toBe(200);
      expect(await result.json()).toEqual(response);
      expect(result.headers.get("X-Request-Id")).toMatch(/^[a-f0-9-]{36}$/);
      expect(result.headers.has("X-Powered-By")).toBe(false);
    },
  );
});

test("malformed requests never reach execution", async () => {
  let calls = 0;
  await withServer(
    createApp(async () => {
      calls++;
      return response;
    }, config),
    async (url) => {
      for (const value of [
        null,
        {},
        { ...body, code: 42 },
        { ...body, testCases: [null] },
      ]) {
        const result = await post(url, value);
        expect(result.status).toBe(400);
        expect(await result.json()).toMatchObject({
          error: expect.any(String),
        });
      }
      const oversized = await post(url, {
        ...body,
        code: "x".repeat(2 * 1024 * 1024),
      });
      expect(oversized.status).toBe(413);
      expect(calls).toBe(0);
    },
  );
});

test("authentication is enforced before parsing or executing", async () => {
  const secret = "test-secret-that-is-at-least-32-characters";
  await withServer(
    createApp(async () => response, { ...config, JUDGE_SECRET: secret }),
    async (url) => {
      expect((await fetch(`${url}/health`)).status).toBe(200);
      expect((await post(url)).status).toBe(401);
      expect((await post(url, body, "wrong")).status).toBe(401);
      expect((await post(url, body, secret)).status).toBe(200);
    },
  );
});

test("queue rejects excess HTTP requests", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await withServer(
    createApp(
      async () => {
        calls++;
        await blocked;
        return response;
      },
      { ...config, MAX_QUEUE_SIZE: 0 },
    ),
    async (url) => {
      const first = post(url);
      while (!calls) await new Promise((resolve) => setImmediate(resolve));
      try {
        const result = await post(url);
        expect(result.status).toBe(503);
        expect(result.headers.get("Retry-After")).toBe("1");
        expect(await result.json()).toMatchObject({ code: "QUEUE_FULL" });
      } finally {
        release();
        await first;
      }
    },
  );
});

test("rate limits and infrastructure errors do not leak internals", async () => {
  await withServer(
    createApp(async () => {
      throw new Error("/home/private/secret");
    }, config),
    async (url) => {
      const result = await post(url);
      expect(result.status).toBe(500);
      expect(await result.text()).not.toContain("/home/private");
      for (let i = 0; i < 29; i++) await post(url, {});
      const limited = await post(url, {});
      expect(limited.status).toBe(429);
      expect(limited.headers.get("Retry-After")).toBe("60");
    },
  );
  await withServer(
    createApp(async () => {
      throw new JudgeError(
        503,
        "JUDGE_UNAVAILABLE",
        "Execution service unavailable",
      );
    }, config),
    async (url) => {
      expect((await post(url)).status).toBe(503);
    },
  );
});

test("production requires a secret and queue settings are bounded", () => {
  expect(envSchema.parse({}).PORT).toBe(3001);
  expect(envSchema.safeParse({ NODE_ENV: "production" }).success).toBe(false);
  expect(envSchema.safeParse({ MAX_CONCURRENT_JOBS: "0" }).success).toBe(false);
  expect(envSchema.safeParse({ MAX_QUEUE_SIZE: "101" }).success).toBe(false);
});
