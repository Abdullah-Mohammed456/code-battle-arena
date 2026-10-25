import { expect, test } from "bun:test";
import { apiUrl } from "./api";

test("unconfigured API does not fall back to the visitor's localhost", () => {
  expect(() =>
    apiUrl("/api/problems", undefined, "code-battle-arena.vercel.app"),
  ).toThrow("Problem service is temporarily unavailable.");
});

test("production API URLs must be public HTTPS hosts", () => {
  for (const url of [
    "http://api.example.com",
    "https://localhost:4000",
    "https://192.168.1.10",
  ])
    expect(() =>
      apiUrl("/api/problems", url, "code-battle-arena.vercel.app"),
    ).toThrow("Problem service is temporarily unavailable.");
  expect(
    apiUrl(
      "/api/problems",
      "https://api.example.com",
      "code-battle-arena.vercel.app",
    ),
  ).toBe("https://api.example.com/api/problems");
  expect(apiUrl("/api/problems", "http://localhost:4000", "localhost")).toBe(
    "http://localhost:4000/api/problems",
  );
});
