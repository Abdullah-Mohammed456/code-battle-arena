import {
  executeCodeSchema,
  executeCodeResponseSchema,
  type ExecuteCodeRequest,
} from "@repo/shared";
import { env, type Env } from "../env.js";
import { ApiError } from "../errors.js";

export function judgeClient(config: Env = env, request: typeof fetch = fetch) {
  return async function runOnJudge(
    input: ExecuteCodeRequest,
    signal?: AbortSignal,
  ) {
    const payload = executeCodeSchema.parse(input);
    const url = new URL("/api/execution/run", config.JUDGE_URL);
    const deadline = AbortSignal.timeout(config.JUDGE_TIMEOUT_MS);
    const abort = signal ? AbortSignal.any([signal, deadline]) : deadline;
    for (let attempt = 0; attempt < 2; attempt++) {
      let response: Response;
      try {
        response = await request(url, {
          method: "POST",
          redirect: "error",
          signal: abort,
          headers: {
            "Content-Type": "application/json",
            ...(config.JUDGE_SECRET
              ? { Authorization: `Bearer ${config.JUDGE_SECRET}` }
              : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        if (signal?.aborted) throw signal.reason;
        if (deadline.aborted)
          throw new ApiError(504, "JUDGE_TIMEOUT", "Execution timed out");
        const code =
          (error as { cause?: { code?: string }; code?: string })?.cause
            ?.code ?? (error as { code?: string })?.code;
        if (
          attempt === 0 &&
          [
            "ECONNRESET",
            "ECONNREFUSED",
            "EPIPE",
            "EAI_AGAIN",
            "ENOTFOUND",
            "UND_ERR_SOCKET",
          ].includes(code ?? "")
        )
          continue;
        throw new ApiError(503, "JUDGE_UNAVAILABLE", "Execution unavailable");
      }
      if (!response.ok)
        throw new ApiError(
          response.status === 429 || response.status === 503 ? 503 : 502,
          "JUDGE_UNAVAILABLE",
          "Execution unavailable",
        );
      try {
        return executeCodeResponseSchema.parse(await response.json());
      } catch {
        if (signal?.aborted) throw signal.reason;
        if (deadline.aborted)
          throw new ApiError(504, "JUDGE_TIMEOUT", "Execution timed out");
        throw new ApiError(502, "JUDGE_RESPONSE", "Invalid execution response");
      }
    }
    throw new ApiError(503, "JUDGE_UNAVAILABLE", "Execution unavailable");
  };
}
export const runOnJudge = judgeClient();
