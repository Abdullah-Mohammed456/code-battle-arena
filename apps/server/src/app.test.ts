import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { UserProfile } from "@repo/shared";
import { createApp } from "./app.js";
import { envSchema } from "./env.js";
import { ApiError } from "./errors.js";

const config = envSchema.parse({ LOG_LEVEL: "silent" });
const profile: UserProfile = {
  id: randomUUID(),
  handle: "player",
  displayName: "Player",
  avatarUrl: null,
  rating: 1200,
  games: 0,
  cfHandle: null,
  createdAt: new Date().toISOString(),
};
const auth = {
  middleware: (_req, _res, next) => next(),
  userId: () => "user_test",
  profile: async () => ({
    username: "player",
    firstName: "Player",
    lastName: null,
    imageUrl: "",
  }),
} satisfies NonNullable<Parameters<typeof createApp>[0]>["auth"];
export async function serve(
  app: ReturnType<typeof createApp>,
  run: (url: string) => Promise<void>,
) {
  const server = app.listen(0, "127.0.0.1");
  try {
    if (!server.listening)
      await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing test listener");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await app.locals.shutdown();
  }
}
test("health works without services; auth never silently bypasses", async () => {
  await serve(createApp({ config }), async (url) => {
    const health = await fetch(`${url}/health`, {
      headers: { "X-Request-Id": "spoofed" },
    });
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });
    expect(health.headers.get("x-request-id")).toMatch(/^[a-f0-9-]{36}$/);
    expect(health.headers.get("x-powered-by")).toBeNull();
    expect(health.headers.get("x-content-type-options")).toBe("nosniff");
    expect((await fetch(`${url}/api/me`)).status).toBe(401);
    expect(
      (
        await fetch(`${url}/api/me`, {
          headers: { Authorization: "Bearer fake" },
        })
      ).status,
    ).toBe(503);
    expect((await fetch(`${url}/ready`)).status).toBe(503);
  });
});
test("me uses authenticated identity and returns a private profile", async () => {
  let id = "";
  await serve(
    createApp({
      config,
      auth,
      getUser: async (value) => {
        id = value;
        return profile;
      },
    }),
    async (url) => {
      const response = await fetch(`${url}/api/me?clerkId=attacker&role=admin`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(profile);
      expect(id).toBe("user_test");
    },
  );
});
test("CORS allowlist and JSON errors are enforced", async () => {
  await serve(createApp({ config }), async (url) => {
    const allowed = await fetch(`${url}/health`, {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(
      (
        await fetch(`${url}/health`, {
          headers: { Origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
    const malformed = await fetch(`${url}/api/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(malformed.status).toBe(400);
    const large = await fetch(`${url}/api/me`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "x".repeat(128 * 1024) }),
    });
    expect(large.status).toBe(413);
    expect((await fetch(`${url}/missing`)).status).toBe(404);
  });
});
test("rate limits return Retry-After and errors hide internal details", async () => {
  await serve(
    createApp({
      config,
      auth,
      getUser: async () => {
        throw new Error("password at /home/private");
      },
    }),
    async (url) => {
      const first = await fetch(`${url}/api/me`);
      expect(first.status).toBe(503);
      expect(await first.text()).not.toContain("private");
      for (let i = 1; i < 120; i++) await fetch(`${url}/api/me`);
      const response = await fetch(`${url}/api/me`);
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("60");
    },
  );
});
test("readiness and unauthorized responses use the error contract", async () => {
  await serve(
    createApp({
      config,
      auth: {
        ...auth,
        userId: () => {
          throw new ApiError(401, "UNAUTHORIZED", "Sign in required");
        },
      },
      readiness: async () => {},
    }),
    async (url) => {
      expect((await fetch(`${url}/ready`)).status).toBe(200);
      const result = await fetch(`${url}/api/me`);
      expect(result.status).toBe(401);
      const body = (await result.json()) as {
        error: { code: string; requestId: string };
      };
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.error.requestId).toBe(result.headers.get("x-request-id")!);
    },
  );
});
test("environment rejects unsafe and incomplete production settings", () => {
  expect(config.PORT).toBe(4000);
  for (const values of [
    { PORT: "invalid" },
    { NODE_ENV: "production" },
    { CORS_ORIGINS: "*" },
    { DATABASE_URL: "https://db.test" },
    { CLERK_SECRET_KEY: "sk_test_only" },
    { JUDGE_SECRET: "short" },
    { TRUST_PROXY: 2 },
  ])
    expect(envSchema.safeParse(values).success).toBe(false);
});
