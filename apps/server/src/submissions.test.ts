import { expect, test } from "bun:test";
import {
  z,
  submissionResultSchema,
  type ExecuteCodeResponse,
} from "@repo/shared";
import type { Database } from "./db/index.js";
import { createApp } from "./app.js";
import { envSchema } from "./env.js";
import { serve } from "./test-utils.js";

const config = envSchema.parse({ LOG_LEVEL: "silent" });
const uuid = "00000000-0000-4000-8000-000000000001";
const problem = {
  id: uuid,
  title: "A + B",
  judgeable: true,
  timeLimitMs: 1000,
  memoryLimitMb: 64,
  compareMode: "token",
  tests: [
    { idx: 1, input: "1 2", expected: "3", isSample: true },
    {
      idx: 2,
      input: "hidden input",
      expected: "hidden expected",
      isSample: false,
    },
  ],
};
const auth = {
  middleware: (_req, _res, next) => next(),
  userId: () => "clerk_test",
  profile: async () => ({
    username: "player",
    firstName: "Player",
    lastName: null,
    imageUrl: "",
  }),
} satisfies NonNullable<Parameters<typeof createApp>[0]>["auth"];

function fixture(
  execute?: NonNullable<Parameters<typeof createApp>[0]>["execute"],
) {
  const saved: {
    submission?: Record<string, unknown>;
    progress?: Record<string, unknown>;
  } = {};
  const historyQuery: { list?: unknown; detail?: unknown } = {};
  const row = {
    id: uuid,
    code: "int main() { return 0; }",
    language: "cpp17",
    status: "AC",
    passed: 2,
    total: 2,
    timeMs: 6,
    results: [
      {
        idx: 1,
        status: "AC",
        timeMs: 3,
        sample: true,
        actual: "3",
        expected: "3",
      },
    ],
    createdAt: new Date("2026-10-10T00:00:00Z"),
    problem: { slug: "cf-a-plus-b", title: "A + B" },
  };
  const tx = {
    submission: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        saved.submission = data;
        return { id: uuid, createdAt: new Date("2026-10-10T00:00:00Z") };
      },
    },
    progress: {
      updateMany: async () => ({ count: 1 }),
      upsert: async ({
        create,
        update,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        saved.progress = saved.progress ? update : create;
        return saved.progress;
      },
    },
  };
  const db = {
    $disconnect: async () => {},
    $transaction: async (action: unknown) =>
      Array.isArray(action)
        ? Promise.all(action)
        : (action as (value: typeof tx) => Promise<unknown>)(tx),
    user: { findUnique: async () => ({ id: uuid }) },
    problem: {
      findFirst: async ({
        select,
      }: {
        select?: { tests?: { where?: { isSample?: boolean } } };
      }) => ({
        ...problem,
        ...(select?.tests?.where?.isSample
          ? { tests: problem.tests.filter((item) => item.isSample) }
          : {}),
      }),
    },
    progress: {
      findMany: async () => [
        {
          status: "solved",
          attempts: 2,
          firstSolvedAt: new Date("2026-10-10T00:00:00Z"),
          problem: { slug: "cf-a-plus-b", title: "A + B" },
        },
      ],
    },
    submission: {
      count: async () => 1,
      findMany: async ({ where }: { where: unknown }) => {
        historyQuery.list = where;
        return [row];
      },
      findFirst: async ({ where }: { where: unknown }) => {
        historyQuery.detail = where;
        return row;
      },
    },
  } as unknown as Database;
  const run =
    execute ??
    (async (input) =>
      ({
        overallStatus: "AC" as const,
        passedCount: input.testCases.length,
        totalCount: input.testCases.length,
        results: input.testCases.map((item) => ({
          testCaseId: item.id,
          status: "AC" as const,
          actualOutput: item.expectedOutput,
          expectedOutput: item.expectedOutput,
          executionTimeMs: 3,
        })),
      }) satisfies ExecuteCodeResponse);
  const app = createApp({ config, auth, database: db, execute: run });
  return { app, saved, historyQuery };
}

const post = (url: string, path: string, body: unknown) =>
  fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("run executes samples or custom input and never returns hidden tests", async () => {
  let received: unknown;
  const { app } = fixture(async (input) => {
    received = input;
    return {
      overallStatus: "AC",
      passedCount: 1,
      totalCount: 1,
      results: [
        {
          testCaseId: "1",
          status: "AC",
          actualOutput: "3",
          expectedOutput: "3",
          executionTimeMs: 2,
        },
      ],
    };
  });
  await serve(app, async (url) => {
    const samples = await post(url, "/api/problems/cf-a-plus-b/run", {
      code: "int main() {}",
    });
    expect(await samples.json()).toMatchObject({
      kind: "samples",
      status: "AC",
      results: [{ idx: 1, sample: true, actual: "3", expected: "3" }],
    });
    expect(JSON.stringify(received)).not.toContain("hidden");
    const custom = await post(url, "/api/problems/cf-a-plus-b/run", {
      code: "int main() {}",
      input: "2 4",
    });
    expect(await custom.json()).toMatchObject({
      kind: "custom",
      status: "OUTPUT",
      output: "3",
    });
    expect(received).toMatchObject({
      testCases: [{ input: "2 4", expectedOutput: "" }],
    });
    expect(
      (
        await post(url, "/api/problems/cf-a-plus-b/run", {
          code: "",
          extra: true,
        })
      ).status,
    ).toBe(400);
  });
});

test("submit persists a private result and progress without hidden outputs", async () => {
  const { app, saved } = fixture();
  await serve(app, async (url) => {
    const response = await post(url, "/api/problems/cf-a-plus-b/submit", {
      code: "int main() {}",
    });
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).not.toContain("hidden input");
    expect(body).not.toContain("hidden expected");
    expect(body).toContain("A + B");
    expect(saved.submission?.status).toBe("AC");
    expect(saved.progress).toMatchObject({
      status: "solved",
      attempts: 1,
      bestSubmissionId: uuid,
    });
    expect(JSON.stringify(saved.submission?.results)).not.toContain("hidden");
    await expect(
      (await fetch(`${url}/api/me/progress`)).json(),
    ).resolves.toMatchObject({ solved: 1, attempted: 1 });
    expect(
      (await post(url, "/api/problems/cf-a-plus-b/submit", { code: "" }))
        .status,
    ).toBe(400);
  });
});

test("submit enforces its per-user rate limit", async () => {
  const { app } = fixture();
  await serve(app, async (url) => {
    for (let i = 0; i < 6; i++)
      expect(
        (
          await post(url, "/api/problems/cf-a-plus-b/submit", {
            code: "int main() {}",
          })
        ).status,
      ).toBe(200);
    const limited = await post(url, "/api/problems/cf-a-plus-b/submit", {
      code: "int main() {}",
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
  });
});

test("history and detail are scoped to the signed-in user", async () => {
  const { app, historyQuery } = fixture();
  await serve(app, async (url) => {
    const response = await fetch(
      `${url}/api/submissions?problem=cf-a-plus-b&page=1&limit=10`,
    );
    expect(response.status).toBe(200);
    const list = (await response.json()) as {
      items: Array<Record<string, unknown>>;
    };
    expect(list.items[0]).not.toHaveProperty("code");
    expect(list.items[0]).toMatchObject({
      problemSlug: "cf-a-plus-b",
      status: "AC",
      total: 2,
    });
    expect(historyQuery.list).toEqual({
      userId: uuid,
      problem: { slug: "cf-a-plus-b" },
    });
    const detail = await fetch(`${url}/api/submissions/${uuid}`);
    expect(await detail.json()).toMatchObject({
      code: "int main() { return 0; }",
      problemSlug: "cf-a-plus-b",
    });
    expect(historyQuery.detail).toEqual({ id: uuid, userId: uuid });
    expect((await fetch(`${url}/api/submissions/not-an-id`)).status).toBe(400);
    expect((await fetch(`${url}/api/submissions?unexpected=yes`)).status).toBe(
      400,
    );
  });
});

test("sample compilation diagnostics survive run and submit without private test details", async () => {
  const { app } = fixture(async (input) => ({
    overallStatus: "CE",
    passedCount: 0,
    totalCount: input.testCases.length,
    results: input.testCases.map((item) => ({
      testCaseId: item.id,
      status: "CE",
      expectedOutput: item.expectedOutput,
      error: "expected ';' before return",
    })),
  }));
  await serve(app, async (url) => {
    for (const action of ["run", "submit"]) {
      const response = await post(url, `/api/problems/cf-a-plus-b/${action}`, {
        code: "invalid",
      });
      expect(response.status).toBe(200);
      const body = z
        .object({ results: z.array(submissionResultSchema) })
        .parse(await response.json());
      expect(body.results[0]!.error).toBe("expected ';' before return");
      if (action === "submit") {
        expect(body.results[1]!.error).toBeUndefined();
        expect(body.results[1]!.expected).toBeUndefined();
      }
    }
  });
});
