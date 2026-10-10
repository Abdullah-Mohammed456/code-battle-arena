import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { rateLimit } from "express-rate-limit";
import {
  z,
  problemRunResponseSchema,
  runProblemSchema,
  submissionQuerySchema,
  submitProblemSchema,
} from "@repo/shared";
import type { Database } from "./db/index.js";
import { submissionStore } from "./db/queries/submissions.js";
import { problemStore } from "./db/queries/problems.js";
import type { authentication } from "./auth.js";
import { runOnJudge } from "./services/judge.js";
import { ApiError } from "./errors.js";

const slugSchema = z.string().regex(/^[a-z0-9-]{1,160}$/);
const idSchema = z.uuid();
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid request");
  return result.data;
};

type Execute = typeof runOnJudge;
type StoredResult = {
  idx: number;
  status: string;
  timeMs?: number;
  sample: boolean;
  actual?: string;
  expected?: string;
};

function rateLimitFor(auth: ReturnType<typeof authentication>, limit: number) {
  return rateLimit({
    windowMs: 60000,
    limit,
    keyGenerator: (req) => auth.userId(req),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new ApiError(429, "RATE_LIMITED", "Too many requests")),
  });
}

function abortOnDisconnect(
  req: Request,
  res: Response,
  next: NextFunction,
  run: (signal: AbortSignal) => Promise<unknown>,
) {
  const controller = new AbortController();
  const cancel = () =>
    controller.abort(new ApiError(499, "CLIENT_CLOSED", "Request cancelled"));
  req.once("aborted", cancel);
  res.once("close", () => {
    if (!res.writableEnded) cancel();
  });
  void run(controller.signal)
    .then((value) => {
      if (!res.headersSent && !controller.signal.aborted) res.json(value);
    })
    .catch(next);
}

export function submissionRouter(
  connection: () => Database,
  auth: ReturnType<typeof authentication>,
  execute: Execute = runOnJudge,
) {
  const router = Router();
  const currentUser = async (db: Database, req: Request) => {
    const userId = await submissionStore(db, auth.profile).userId(
      auth.userId(req),
    );
    if (!userId)
      throw new ApiError(503, "USER_UNAVAILABLE", "User unavailable");
    return userId;
  };

  router.post(
    "/problems/:slug/run",
    rateLimitFor(auth, 20),
    async (req, res, next) => {
      try {
        const slug = parse(slugSchema, req.params.slug);
        const body = parse(runProblemSchema, req.body);
        const db = connection();
        const problem = await problemStore(db).forRun(slug);
        if (!problem) throw new ApiError(404, "NOT_FOUND", "Problem not found");
        if (body.input !== undefined) {
          abortOnDisconnect(req, res, next, async (signal) => {
            const result = await execute(
              {
                code: body.code,
                testCases: [
                  { id: "1", input: body.input!, expectedOutput: "" },
                ],
                timeLimitMs: problem.timeLimitMs,
                memoryLimitMb: problem.memoryLimitMb,
                compareMode: problem.compareMode as "exact" | "token" | "float",
              },
              signal,
            );
            const first = result.results[0];
            if (!first)
              throw new ApiError(
                502,
                "JUDGE_RESPONSE",
                "Invalid execution response",
              );
            const response = {
              kind: "custom" as const,
              status:
                result.overallStatus === "AC" || result.overallStatus === "WA"
                  ? ("OUTPUT" as const)
                  : result.overallStatus,
              output: first.actualOutput,
              timeMs: first.executionTimeMs ?? 0,
              error: first.error,
            };
            return problemRunResponseSchema.parse(response);
          });
          return;
        }
        if (!problem.tests.length)
          throw new ApiError(422, "NO_SAMPLES", "This problem has no samples");
        abortOnDisconnect(req, res, next, async (signal) => {
          const result = await execute(
            {
              code: body.code,
              testCases: problem.tests.map((item) => ({
                id: String(item.idx),
                input: item.input,
                expectedOutput: item.expected,
              })),
              timeLimitMs: problem.timeLimitMs,
              memoryLimitMb: problem.memoryLimitMb,
              compareMode: problem.compareMode as "exact" | "token" | "float",
            },
            signal,
          );
          const results: StoredResult[] = result.results.map((item, index) => ({
            idx: problem.tests[index]!.idx,
            status: item.status,
            timeMs: item.executionTimeMs,
            sample: true,
            actual: item.actualOutput,
            expected: item.expectedOutput,
          }));
          return problemRunResponseSchema.parse({
            kind: "samples",
            status: result.overallStatus,
            passed: result.passedCount,
            total: result.totalCount,
            timeMs: results.reduce((sum, item) => sum + (item.timeMs ?? 0), 0),
            results,
          });
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/problems/:slug/submit",
    rateLimitFor(auth, 6),
    async (req, res, next) => {
      try {
        const slug = parse(slugSchema, req.params.slug);
        const body = parse(submitProblemSchema, req.body);
        const db = connection();
        const userId = await currentUser(db, req);
        const problem = await problemStore(db).forSubmission(slug);
        if (!problem) throw new ApiError(404, "NOT_FOUND", "Problem not found");
        if (!problem.judgeable || !problem.tests.length)
          throw new ApiError(
            422,
            "NOT_JUDGEABLE",
            "This problem cannot be submitted",
          );
        abortOnDisconnect(req, res, next, async (signal) => {
          const result = await execute(
            {
              code: body.code,
              testCases: problem.tests.map((item) => ({
                id: String(item.idx),
                input: item.input,
                expectedOutput: item.expected,
              })),
              timeLimitMs: problem.timeLimitMs,
              memoryLimitMb: problem.memoryLimitMb,
              compareMode: problem.compareMode as "exact" | "token" | "float",
            },
            signal,
          );
          const results: StoredResult[] = result.results.map((item, index) => {
            const test = problem.tests[index]!;
            return {
              idx: test.idx,
              status: item.status,
              timeMs: item.executionTimeMs,
              sample: test.isSample,
              ...(test.isSample
                ? { actual: item.actualOutput, expected: item.expectedOutput }
                : {}),
            };
          });
          const timeMs = Math.round(
            results.reduce((sum, item) => sum + (item.timeMs ?? 0), 0),
          );
          const solved = result.overallStatus === "AC";
          const createdAt = new Date();
          const submission = await submissionStore(db, auth.profile).create({
            userId,
            problemId: problem.id,
            code: body.code,
            status: result.overallStatus,
            passed: result.passedCount,
            total: result.totalCount,
            timeMs,
            results: results as object[],
            solved,
            createdAt,
          });
          return {
            id: submission.id,
            problemSlug: slug,
            problemTitle: problem.title,
            language: "cpp17" as const,
            status: result.overallStatus,
            passed: result.passedCount,
            total: result.totalCount,
            timeMs,
            createdAt: submission.createdAt.toISOString(),
            results,
          };
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/me/progress", async (req, res, next) => {
    try {
      const db = connection();
      const userId = await currentUser(db, req);
      const rows = await submissionStore(db, auth.profile).progress(userId);
      const items = rows.map((item) => ({
        problemSlug: item.problem.slug,
        problemTitle: item.problem.title,
        status: item.status as "attempted" | "solved",
        attempts: item.attempts,
        firstSolvedAt: item.firstSolvedAt?.toISOString() ?? null,
      }));
      res.json({
        items,
        solved: items.filter((item) => item.status === "solved").length,
        attempted: items.length,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions", async (req, res, next) => {
    try {
      const query = parse(submissionQuerySchema, req.query);
      const db = connection();
      const userId = await currentUser(db, req);
      const { total, items: rows } = await submissionStore(
        db,
        auth.profile,
      ).list(userId, query.problem, query.page, query.limit);
      res.json({
        items: rows.map((row) => ({
          id: row.id,
          problemSlug: row.problem.slug,
          problemTitle: row.problem.title,
          language: "cpp17",
          status: row.status,
          passed: row.passed,
          total: row.total,
          timeMs: row.timeMs,
          createdAt: row.createdAt.toISOString(),
          results: row.results,
        })),
        total,
        page: query.page,
        limit: query.limit,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions/:id", async (req, res, next) => {
    try {
      const id = parse(idSchema, req.params.id);
      const db = connection();
      const userId = await currentUser(db, req);
      const row = await submissionStore(db, auth.profile).detail(id, userId);
      if (!row) throw new ApiError(404, "NOT_FOUND", "Submission not found");
      res.json({
        id: row.id,
        problemSlug: row.problem.slug,
        problemTitle: row.problem.title,
        language: "cpp17",
        status: row.status,
        passed: row.passed,
        total: row.total,
        timeMs: row.timeMs,
        createdAt: row.createdAt.toISOString(),
        results: row.results,
        code: row.code,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
