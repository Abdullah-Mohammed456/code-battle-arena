import { expect, test } from "bun:test";
import { envSchema, resolveWebEnv } from "./env";

test("only local development defaults to localhost", () => {
  expect(resolveWebEnv({}, true)).toEqual({
    VITE_API_URL: "http://localhost:4000",
    VITE_WS_URL: "ws://localhost:4000/ws",
  });
  expect(resolveWebEnv({}, false)).toEqual({});
});

test("rejects invalid API and socket destinations", () => {
  for (const VITE_API_URL of ["", "not-a-url", "ftp://localhost"]) {
    expect(envSchema.safeParse({ VITE_API_URL }).success).toBe(false);
  }
  expect(
    envSchema.safeParse({ VITE_WS_URL: "https://localhost" }).success,
  ).toBe(false);
});
