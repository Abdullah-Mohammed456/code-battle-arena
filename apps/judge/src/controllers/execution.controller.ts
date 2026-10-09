import type { Request, Response, NextFunction } from "express";
import { executeCodeSchema } from "@repo/shared";
import { executeCppCode } from "../services/execution.service.js";
import { JudgeError } from "../errors.js";

export function executionHandler(
  run: typeof executeCppCode,
  enqueue: <T>(job: () => Promise<T>, signal?: AbortSignal) => Promise<T>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const abort = new AbortController();
    const disconnect = () => {
      if (!res.writableEnded) abort.abort();
    };
    res.once("close", disconnect);
    try {
      const parsed = executeCodeSchema.safeParse(req.body);
      if (!parsed.success)
        throw new JudgeError(
          400,
          "VALIDATION_ERROR",
          "Invalid code or test cases",
        );
      const { code, testCases } = parsed.data;
      const result = await enqueue(
        () => run(code, testCases, parsed.data, abort.signal),
        abort.signal,
      );
      if (!res.destroyed) res.json(result);
    } catch (error) {
      if (!abort.signal.aborted) next(error);
    } finally {
      res.removeListener("close", disconnect);
    }
  };
}
