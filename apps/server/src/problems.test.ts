import { expect, test } from "bun:test";
import type { Database } from "./db/index.js";
import { createApp } from "./app.js";
import { envSchema } from "./env.js";
import { serve } from "./test-utils.js";

const config = envSchema.parse({ LOG_LEVEL: "silent" });
function fixture() {
  let query: unknown;
  const db = {
    $disconnect: async () => {},
    $transaction: async (items: Promise<unknown>[]) => Promise.all(items),
    problem: {
      count: async ({ where }: { where: unknown }) => { query = where; return 1; },
      findMany: async () => [{ id: "id", title: "Sum", judgeable: true }],
      findFirst: async () => ({ id: "id", title: "Sum", tests: [{ input: "1 2", expected: "3" }] }),
    },
    user: { findUnique: async () => ({ role: "user" }) },
  } as unknown as Database;
  const auth = {
    middleware: (_req, _res, next) => next(),
    userId: () => "user_test",
    profile: async () => ({ username: "player", firstName: "Player", lastName: null, imageUrl: "" }),
  } satisfies NonNullable<Parameters<typeof createApp>[0]>["auth"];
  return { app: createApp({ config, auth, database: db }), getQuery: () => query };
}

test("problem routes validate filters, keep detail samples, and protect admin imports", async () => {
  const { app, getQuery } = fixture();
  await serve(app, async url => {
    const list = await fetch(`${url}/api/problems?tag=math&minRating=800&judgeable=true`);
    expect(list.status).toBe(200);
    expect(getQuery()).toMatchObject({ tags: { has: "math" }, rating: { gte: 800 }, judgeable: true, published: true });
    expect((await list.json() as { items: unknown[] }).items).toHaveLength(1);
    expect((await fetch(`${url}/api/problems?minRating=900&maxRating=800`)).status).toBe(400);
    const detail = await fetch(`${url}/api/problems/sum`);
    expect(detail.status).toBe(200);
    expect((await detail.json() as { samples: unknown[] }).samples).toEqual([{ input: "1 2", expected: "3" }]);
    expect((await fetch(`${url}/api/admin/import/codeforces`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status).toBe(403);
  });
});
