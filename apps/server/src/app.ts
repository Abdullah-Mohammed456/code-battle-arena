import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { randomUUID } from "node:crypto";
import { type UserProfile } from "@repo/shared";
import { problemRouter, adminRouter } from "./problems.js";
import { importRunner } from "./importers/runner.js";
import { env, type Env } from "./env.js";
import { authentication } from "./auth.js";
import { connectDatabase } from "./db/index.js";
import type { Database } from "./db/index.js";
import { userStore } from "./db/queries/users.js";
import { ApiError } from "./errors.js";
import { submissionRouter } from "./submissions.js";
import { runOnJudge } from "./services/judge.js";

export function createApp(
  options: {
    config?: Env;
    auth?: ReturnType<typeof authentication>;
    database?: Database;
    getUser?: (id: string) => Promise<UserProfile>;
    readiness?: () => Promise<void>;
    execute?: typeof runOnJudge;
  } = {},
) {
  const config = options.config ?? env;
  const auth = options.auth ?? authentication(config);
  const logger = pino({
    level: config.LOG_LEVEL,
    serializers: { err: () => ({ type: "Error" }) },
  });
  const app = express();
  let database: ReturnType<typeof connectDatabase> | undefined;
  const connection = () =>
    options.database ?? (database ??= connectDatabase(config.DATABASE_URL));
  let importer: ReturnType<typeof importRunner> | undefined;
  const imports = () => (importer ??= importRunner(connection()));
  app.locals.shutdown = async () => {
    await importer?.wait();
    await database?.$disconnect();
  };
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader("X-Request-Id", id);
        res.locals.requestId = id;
        return id;
      },
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        }),
        res: (res) => ({ statusCode: res.statusCode }),
        err: () => ({ type: "Error" }),
      },
      customErrorMessage: () => "Request failed",
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, done) => {
        if (!origin || config.CORS_ORIGINS.includes(origin)) done(null, true);
        else done(new ApiError(403, "ORIGIN_DENIED", "Origin not allowed"));
      },
      credentials: true,
      allowedHeaders: ["Authorization", "Content-Type"],
      exposedHeaders: ["X-Request-Id", "Retry-After"],
    }),
  );
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", async (_req, res, next) => {
    try {
      if (options.readiness) await options.readiness();
      else {
        await connection().$queryRaw`select 1`;
        if (config.JUDGE_ENABLED) {
          const response = await fetch(new URL("/ready", config.JUDGE_URL), {
            signal: AbortSignal.timeout(5000),
            redirect: "error",
            headers: config.JUDGE_SECRET
              ? { Authorization: `Bearer ${config.JUDGE_SECRET}` }
              : {},
          });
          if (!response.ok) throw new Error("Judge unavailable");
        }
      }
      res.json({ status: "ok" });
    } catch {
      next(new ApiError(503, "NOT_READY", "Service not ready"));
    }
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_req, _res, next) =>
        next(new ApiError(429, "RATE_LIMITED", "Too many requests")),
    }),
  );
  app.use(express.json({ limit: "384kb" }));
  app.use("/api/problems", problemRouter(connection));
  app.use("/api", auth.middleware);
  app.use(
    "/api",
    submissionRouter(connection, auth, options.execute, config.JUDGE_ENABLED),
  );
  app.use("/api/admin", adminRouter(connection, auth, imports));
  app.get("/api/me", async (req, res, next) => {
    try {
      const id = auth.userId(req);
      const getUser = options.getUser ?? userStore(connection(), auth.profile);
      try {
        res.json(await getUser(id));
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(503, "DATABASE_UNAVAILABLE", "Database unavailable");
      }
    } catch (error) {
      next(error);
    }
  });
  app.use((_req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", "Route not found")),
  );
  app.use(
    (error: unknown, req: Request, res: Response, _next: NextFunction) => {
      const bodyStatus = (error as { status?: number })?.status;
      const status =
        error instanceof ApiError
          ? error.status
          : bodyStatus === 400 || bodyStatus === 413
            ? bodyStatus
            : 500;
      if (status === 429) res.setHeader("Retry-After", "60");
      if (status === 503) res.setHeader("Retry-After", "1");
      if (status >= 500)
        req.log.error(
          { status, requestId: res.locals.requestId },
          "Request failed",
        );
      res.status(status).json({
        error: {
          code:
            error instanceof ApiError
              ? error.code
              : status === 400 || status === 413
                ? "VALIDATION_ERROR"
                : "INTERNAL_ERROR",
          message:
            error instanceof ApiError
              ? error.message
              : status === 400
                ? "Invalid JSON body"
                : status === 413
                  ? "Request body too large"
                  : "Internal server error",
          requestId: res.locals.requestId,
        },
      });
    },
  );
  return app;
}
export const app = createApp();
