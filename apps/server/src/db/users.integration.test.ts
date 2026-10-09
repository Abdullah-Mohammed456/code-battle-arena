import { afterAll, beforeAll, expect, test } from "bun:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { userProfileSchema } from "@repo/shared";
import { connectDatabase } from "./index.js";
import { userStore } from "./queries/users.js";
import { authentication } from "../auth.js";
import { createApp } from "../app.js";
import { envSchema } from "../env.js";

const enabled = process.env.RUN_DATABASE_TESTS === "1";
let connection: ReturnType<typeof connectDatabase>;
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const config = envSchema.parse({
  LOG_LEVEL: "silent",
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("clerk.example.test$").toString("base64")}`,
  CLERK_SECRET_KEY: "sk_test_local_testing_only",
  CLERK_JWT_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
});
function token(overrides = {}, key = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: "local-test" }),
  ).toString("base64url");
  const claims = Buffer.from(
    JSON.stringify({
      iss: "https://clerk.example.test",
      sub: "user_m2_local",
      sid: "sess_local",
      azp: "http://localhost:5173",
      iat: now,
      nbf: now - 5,
      exp: now + 60,
      v: 2,
      sts: "active",
      ...overrides,
    }),
  ).toString("base64url");
  const message = `${header}.${claims}`;
  return `${message}.${sign("RSA-SHA256", Buffer.from(message), key).toString("base64url")}`;
}
beforeAll(async () => {
  if (!enabled) return;
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    !["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname)
  )
    throw new Error("Integration tests require a dedicated local database");
  connection = connectDatabase(url);
  await connection.user.deleteMany({
    where: { clerkId: { startsWith: "user_m2_" } },
  });
});
afterAll(async () => {
  if (connection) {
    await connection.user.deleteMany({
      where: { clerkId: { startsWith: "user_m2_" } },
    });
    await connection.$disconnect();
  }
});
const profile = async () => ({
  username: "local_player",
  firstName: "Local",
  lastName: "Player",
  imageUrl: "https://example.test/avatar.png",
});

test.skipIf(!enabled)(
  "concurrent lazy creation is idempotent and preserves ratings and roles",
  async () => {
    const load = userStore(connection, profile);
    const result = await Promise.all(
      Array.from({ length: 8 }, () => load("user_m2_concurrent")),
    );
    expect(new Set(result.map((user) => user.id)).size).toBe(1);
    expect(result[0]!.handle).toBe("local_player");
    expect(userProfileSchema.safeParse(result[0]).success).toBe(true);
    await connection.user.update({
      where: { clerkId: "user_m2_concurrent" },
      data: { rating: 1500, games: 2, role: "admin" },
    });
    const second = await userStore(connection, async () => {
      throw new Error("Existing users must not refetch profiles");
    })("user_m2_concurrent");
    expect(second.rating).toBe(1500);
    expect(second.games).toBe(2);
    expect("role" in second).toBe(false);
    expect(
      await connection.user.count({
        where: { clerkId: { startsWith: "user_m2_" } },
      }),
    ).toBe(1);
  },
);
test.skipIf(!enabled)(
  "handle collisions use an isolated fallback without losing profile data",
  async () => {
    const result = await userStore(connection, profile)("user_m2_collision");
    expect(result.handle).toMatch(/^user_[a-f0-9]+$/);
    expect(result.displayName).toBe("Local Player");
    expect(result.avatarUrl).toBe("https://example.test/avatar.png");
  },
);
test.skipIf(!enabled)(
  "real Clerk middleware verifies signatures, expiry and authorized parties before DB creation",
  async () => {
    const auth = { ...authentication(config), profile };
    const app = createApp({ config, auth });
    const server = app.listen(0, "127.0.0.1");
    try {
      if (!server.listening)
        await new Promise<void>((resolve) => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Missing listener");
      const url = `http://127.0.0.1:${address.port}/api/me`;
      const call = (value?: string) =>
        fetch(url, {
          headers: value ? { Authorization: `Bearer ${value}` } : {},
        });
      const wrongKey = generateKeyPairSync("rsa", {
        modulusLength: 2048,
      }).privateKey;
      for (const value of [
        undefined,
        "invalid",
        token({ exp: 1 }),
        token({ azp: "https://evil.test" }),
        token({}, wrongKey),
      ]) {
        expect((await call(value)).status).toBe(401);
      }
      expect(
        await connection.user.count({ where: { clerkId: "user_m2_local" } }),
      ).toBe(0);
      const first = await call(token());
      expect(first.status).toBe(200);
      const body = userProfileSchema.parse(await first.json());
      const again = await call(token());
      expect(userProfileSchema.parse(await again.json()).id).toBe(body.id);
      expect(
        await connection.user.count({ where: { clerkId: "user_m2_local" } }),
      ).toBe(1);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await app.locals.shutdown();
    }
  },
  30000,
);
