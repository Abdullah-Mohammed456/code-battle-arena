import type { ExecuteCodeResponse } from "@repo/shared";
import { expect, test } from "bun:test";
import { judgeClient } from "./judge.js";
import { envSchema } from "../env.js";

const input = {
  code: "int main() {}",
  testCases: [{ id: "1", input: "", expectedOutput: "" }],
};
const result: ExecuteCodeResponse = {
  overallStatus: "AC",
  passedCount: 1,
  totalCount: 1,
  results: [
    { testCaseId: "1", status: "AC", actualOutput: "", expectedOutput: "" },
  ],
};
const config = envSchema.parse({ JUDGE_SECRET: "x".repeat(32) });
const fake = (
  run: (url: unknown, options?: RequestInit) => Promise<Response>,
) => run as typeof fetch;
test("judge client validates payload, sends secret and parses the legacy result", async () => {
  let body: unknown, authorization: unknown;
  const execute = judgeClient(
    config,
    fake(async (_url, options) => {
      body = JSON.parse(options!.body as string);
      authorization = (options!.headers as Record<string, string>)
        .Authorization;
      return Response.json(result);
    }),
  );
  expect(await execute(input)).toEqual(result);
  expect(body).toEqual(input);
  expect(authorization).toBe(`Bearer ${config.JUDGE_SECRET}`);
  await expect(execute({ ...input, code: "" })).rejects.toThrow();
});
test("only transport failures retry once; HTTP errors and invalid results never retry", async () => {
  let calls = 0;
  expect(
    await judgeClient(
      config,
      fake(async () => {
        if (++calls === 1)
          throw new TypeError("fetch failed", {
            cause: { code: "ECONNRESET" },
          });
        return Response.json(result);
      }),
    )(input),
  ).toEqual(result);
  expect(calls).toBe(2);
  for (const response of [
    new Response("internal host path", { status: 503 }),
    new Response("unauthorized", { status: 401 }),
    Response.json({ ...result, passedCount: 4 }),
  ]) {
    calls = 0;
    await expect(
      judgeClient(
        config,
        fake(async () => {
          calls++;
          return response;
        }),
      )(input),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  }
});
test("cancellation and malformed transport responses do not expose internals", async () => {
  const abort = new AbortController();
  abort.abort(new Error("cancelled"));
  await expect(judgeClient(config)(input, abort.signal)).rejects.toThrow(
    "cancelled",
  );
  await expect(
    judgeClient(
      config,
      fake(async () => new Response("not json")),
    )(input),
  ).rejects.toThrow("Invalid execution response");
  let calls = 0;
  await expect(
    judgeClient(
      config,
      fake(async () => {
        calls++;
        throw new Error("/home/private");
      }),
    )(input),
  ).rejects.toThrow("Execution unavailable");
  expect(calls).toBe(1);
});

test("judge deadline aborts the request without retrying", async () => {
  let calls = 0;
  const execute = judgeClient(
    { ...config, JUDGE_TIMEOUT_MS: 1000 },
    fake(async (_url, options) => {
      calls++;
      return new Promise<Response>((_resolve, reject) =>
        options!.signal!.addEventListener(
          "abort",
          () => reject(options!.signal!.reason),
          { once: true },
        ),
      );
    }),
  );
  await expect(execute(input)).rejects.toMatchObject({
    status: 504,
    code: "JUDGE_TIMEOUT",
  });
  expect(calls).toBe(1);
});
