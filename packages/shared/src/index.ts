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
