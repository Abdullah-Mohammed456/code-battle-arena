import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { env } from "./env.js";
import { executionHandler } from "./controllers/execution.controller.js";
import { executeCppCode } from "./services/execution.service.js";
import { createQueue } from "./queue.js";
import { JudgeError } from "./errors.js";
import { ready } from "./sandbox.js";

export function createApp(
  run: typeof executeCppCode = executeCppCode,
  config = env,
) {
  const app = express();
  const enqueue = createQueue(
    config.MAX_CONCURRENT_JOBS,
    config.MAX_QUEUE_SIZE,
  );
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Request-Id", randomUUID());
    next();
  });
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use((req, _res, next) => {
    if (config.JUDGE_SECRET) {
      const hash = (value: string) =>
        createHash("sha256").update(value).digest();
      if (
        !timingSafeEqual(
          hash(req.get("authorization") ?? ""),
          hash(`Bearer ${config.JUDGE_SECRET}`),
        )
      ) {
        return next(new JudgeError(401, "UNAUTHORIZED", "Unauthorized"));
      }
    }
    next();
  });
  app.get("/ready", async (_req, res, next) => {
    try {
      await ready();
      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  });
  app.use(
    "/api/execution",
    rateLimit({
      windowMs: 60000,
      limit: 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(new JudgeError(429, "RATE_LIMITED", "Too many requests")),
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.post(
    "/api/execution/run",
    (req, _res, next) => {
      next(
        req.is("application/json")
          ? undefined
          : new JudgeError(415, "CONTENT_TYPE", "JSON body required"),
      );
    },
    executionHandler(run, enqueue),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status =
        error instanceof JudgeError
          ? error.status
          : (error as { status?: number })?.status;
      const bodyError = status === 400 || status === 413;
      const httpStatus =
        error instanceof JudgeError ? status! : bodyError ? status! : 500;
      if (httpStatus === 503) res.setHeader("Retry-After", "1");
      if (httpStatus === 429) res.setHeader("Retry-After", "60");
      res.status(httpStatus).json({
        error:
          error instanceof JudgeError
            ? error.message
            : status === 400
              ? "Invalid JSON body"
              : status === 413
                ? "Request body too large"
                : "Internal server error during execution",
        code:
          error instanceof JudgeError
            ? error.code
            : bodyError
              ? "VALIDATION_ERROR"
              : "INTERNAL_ERROR",
        requestId: res.getHeader("X-Request-Id"),
      });
    },
  );
  return app;
}

export const app = createApp();
