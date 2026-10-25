import { afterAll, beforeAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  progressListSchema,
  submissionDetailSchema,
  submissionListSchema,
  submissionSchema,
} from "@repo/shared";
import { connectDatabase, type Database } from "./index.js";
import { submissionStore } from "./queries/submissions.js";
import { createApp } from "../app.js";
import { envSchema } from "../env.js";
import { serve } from "../test-utils.js";

const enabled = process.env.RUN_DATABASE_TESTS === "1";
const namespace = `user_m4_${randomUUID()}`;
const slug = `m4-${randomUUID()}`;
let db: Database;
let problemId: string;
const profile = async () => ({
  username: null,
  firstName: "Local",
  lastName: "Player",
  imageUrl: "",
});

beforeAll(async () => {
  if (!enabled) return;
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname)
  )
    throw new Error("Integration tests require a dedicated local database");
  db = connectDatabase(url);
  const problem = await db.problem.create({
    data: {
      source: "codecontests",
      sourceId: slug,
      slug,
      title: "Local sum",
      url: "https://example.test/sum",
      tags: [],
      judgeable: true,
      license: "Test fixture",
      attribution: "Local test fixture",
      tests: {
        create: [
          { idx: 1, input: "1 2", expected: "3", isSample: true, bytes: 4 },
          { idx: 2, input: "3 4", expected: "7", isSample: false, bytes: 4 },
        ],
      },
    },
  });
  problemId = problem.id;
});

afterAll(async () => {
  if (!db) return;
  if (problemId) await db.problem.delete({ where: { id: problemId } });
  await db.user.deleteMany({ where: { clerkId: { startsWith: namespace } } });
  await db.$disconnect();
});

function appFor(user: string) {
  return createApp({
    config: envSchema.parse({ LOG_LEVEL: "silent" }),
    database: db,
    auth: {
      middleware: (_req, _res, next) => next(),
      userId: () => `${namespace}_${user}`,
      profile,
    },
    execute: async (input) => ({
      overallStatus: input.code === "accepted" ? "AC" : "WA",
      passedCount: input.code === "accepted" ? input.testCases.length : 0,
      totalCount: input.testCases.length,
      results: input.testCases.map((item) => ({
        testCaseId: item.id,
        status: input.code === "accepted" ? "AC" : "WA",
        actualOutput: "3",
        expectedOutput: item.expectedOutput,
      })),
    }),
  });
}

test.skipIf(!enabled)(
  "API submissions survive a new server instance and stay private to their owner",
  async () => {
    let id = "";
    await serve(appFor("owner"), async (url) => {
      const response = await fetch(`${url}/api/problems/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "accepted" }),
      });
      expect(response.status).toBe(200);
      const item = submissionSchema.parse(await response.json());
      id = item.id;
      expect(item.status).toBe("AC");
      expect(item.results[1]).toEqual({ idx: 2, status: "AC", sample: false });
    });
    await serve(appFor("owner"), async (url) => {
      const progress = progressListSchema.parse(
        await (await fetch(`${url}/api/me/progress`)).json(),
      );
      expect(progress.solved).toBe(1);
      expect(progress.items[0]?.firstSolvedAt).not.toBeNull();
      const firstSolvedAt = progress.items[0]!.firstSolvedAt;
      const wrong = await fetch(`${url}/api/problems/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "wrong" }),
      });
      expect(wrong.status).toBe(200);
      const updated = progressListSchema.parse(
        await (await fetch(`${url}/api/me/progress`)).json(),
      );
      expect(updated.items[0]).toMatchObject({
        status: "solved",
        attempts: 2,
        firstSolvedAt,
      });
      const history = submissionListSchema.parse(
        await (await fetch(`${url}/api/submissions?limit=1&page=2`)).json(),
      );
      expect(history.total).toBe(2);
      expect(history.items[0]?.id).toBe(id);
      const detail = submissionDetailSchema.parse(
        await (await fetch(`${url}/api/submissions/${id}`)).json(),
      );
      expect(detail.code).toBe("accepted");
    });
    await serve(appFor("other"), async (url) => {
      expect((await fetch(`${url}/api/submissions/${id}`)).status).toBe(404);
      expect(
        submissionListSchema.parse(
          await (await fetch(`${url}/api/submissions`)).json(),
        ).total,
      ).toBe(0);
    });
  },
  20000,
);

test.skipIf(!enabled)(
  "concurrent submissions count every attempt and preserve solved progress",
  async () => {
    const store = submissionStore(db, profile);
    const userId = (await store.userId(`${namespace}_race`))!;
    await Promise.all(
      [true, false, true, false].map((solved, index) =>
        store.create({
          userId,
          problemId,
          code: "stored fixture",
          status: solved ? "AC" : "WA",
          passed: solved ? 2 : 0,
          total: 2,
          timeMs: 0,
          results: [],
          solved,
          createdAt: new Date(Date.now() + index),
        }),
      ),
    );
    const [progress] = await store.progress(userId);
    expect(progress?.attempts).toBe(4);
    expect(progress?.status).toBe("solved");
    expect(progress?.firstSolvedAt).not.toBeNull();
    expect((await store.list(userId, slug, 1, 20)).total).toBe(4);
  },
  20000,
);
