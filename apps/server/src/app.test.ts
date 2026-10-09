import { expect, test } from "bun:test";
import { app } from "./app.js";
import { envSchema } from "./env.js";

test("health endpoint works without external services", async () => {
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
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("server environment defaults and invalid ports", () => {
  expect(envSchema.parse({})).toEqual({ PORT: 4000, NODE_ENV: "development" });
  expect(envSchema.safeParse({ PORT: "invalid" }).success).toBe(false);
});
