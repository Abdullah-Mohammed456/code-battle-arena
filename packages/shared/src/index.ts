import { z } from "zod";

export const portSchema = z.coerce.number().int().min(1).max(65535);
export const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

const bytes = (max: number) =>
  z
    .string()
    .refine(
      (value) => new TextEncoder().encode(value).length <= max,
      `Must contain at most ${max} UTF-8 bytes`,
    );

export const executeCodeSchema = z.object({
  code: bytes(64 * 1024).refine(
    (value) => value.length > 0,
    "Code is required",
  ),
  testCases: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
        input: bytes(256 * 1024),
        expectedOutput: bytes(256 * 1024),
      }),
    )
    .min(1)
    .max(100),
  language: z.literal("cpp17").optional(),
  timeLimitMs: z.number().int().min(50).max(10000).optional(),
  memoryLimitMb: z.number().int().min(16).max(512).optional(),
  compareMode: z.enum(["exact", "token", "float"]).optional(),
  floatEpsilon: z.number().min(0).max(0.01).optional(),
});

export type ExecuteCodeRequest = z.infer<typeof executeCodeSchema>;
export type TestCase = ExecuteCodeRequest["testCases"][number];
export type TestResultStatus =
  "AC" | "WA" | "TLE" | "CE" | "RE" | "MLE" | "OLE" | "IE";

export interface TestCaseResult {
  testCaseId: string;
  status: TestResultStatus;
  actualOutput?: string;
  expectedOutput: string;
  error?: string;
  executionTimeMs?: number;
}

export interface ExecuteCodeResponse {
  overallStatus: TestResultStatus;
  passedCount: number;
  totalCount: number;
  results: TestCaseResult[];
}

export { z };

export const userProfileSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  rating: z.number().int(),
  games: z.number().int().nonnegative(),
  cfHandle: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;
export const executeCodeResponseSchema = z
  .object({
    overallStatus: z.enum(["AC", "WA", "TLE", "CE", "RE", "MLE", "OLE", "IE"]),
    passedCount: z.number().int().nonnegative(),
    totalCount: z.number().int().min(1).max(100),
    results: z
      .array(
        z.object({
          testCaseId: z.string(),
          status: z.enum(["AC", "WA", "TLE", "CE", "RE", "MLE", "OLE", "IE"]),
          actualOutput: z.string().optional(),
          expectedOutput: z.string(),
          error: z.string().optional(),
          executionTimeMs: z.number().nonnegative().optional(),
        }),
      )
      .max(100),
  })
  .refine(
    (value) =>
      value.results.length === value.totalCount &&
      value.passedCount ===
        value.results.filter((item) => item.status === "AC").length &&
      value.overallStatus ===
        (value.results.find((item) => item.status !== "AC")?.status ?? "AC"),
    "Inconsistent execution result",
  );

export const problemSourceSchema = z.enum(["codeforces", "codecontests"]);
export const importRequestSchema = z.strictObject({
  limit: z.number().int().min(1).max(1000).optional(),
});
export const publishProblemSchema = z.strictObject({ published: z.boolean() });
export const problemQuerySchema = z.strictObject({
  query: z.string().trim().max(100).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
  minRating: z.coerce.number().int().min(0).max(5000).optional(),
  maxRating: z.coerce.number().int().min(0).max(5000).optional(),
  source: problemSourceSchema.optional(),
  judgeable: z.enum(["true", "false"]).transform(v => v === "true").optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).refine(v => v.minRating === undefined || v.maxRating === undefined || v.minRating <= v.maxRating, "Invalid rating range");
export type ProblemQuery = z.infer<typeof problemQuerySchema>;
export const problemSummarySchema = z.object({
  id: z.uuid(), slug: z.string(), source: problemSourceSchema, sourceId: z.string(),
  title: z.string(), url: z.url(), rating: z.number().int().nullable(), tags: z.array(z.string()),
  judgeable: z.boolean(), timeLimitMs: z.number().int(), memoryLimitMb: z.number().int(),
  compareMode: z.enum(["token", "exact", "float"]), license: z.string(), attribution: z.string(),
});
export const problemDetailSchema = problemSummarySchema.extend({
  statementMd: z.string().nullable(), samples: z.array(z.object({input: z.string(), expected: z.string()})),
});
export const problemListSchema = z.object({
  items: z.array(problemSummarySchema), total: z.number().int(), page: z.number().int(), limit: z.number().int(),
});

export * from "./submissions.js";
