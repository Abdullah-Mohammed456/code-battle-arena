import { expect, test } from "bun:test";
import { envSchema } from "./env";

test("local development needs no credentials", () => {
  expect(envSchema.parse({})).toEqual({
    VITE_API_URL: "http://localhost:4000",
    VITE_WS_URL: "ws://localhost:4000/ws",
  });
});

test("rejects invalid API and socket destinations", () => {
  for (const VITE_API_URL of ["", "not-a-url", "ftp://localhost"]) {
    expect(envSchema.safeParse({ VITE_API_URL }).success).toBe(false);
  }
  expect(
    envSchema.safeParse({ VITE_WS_URL: "https://localhost" }).success,
  ).toBe(false);
});
