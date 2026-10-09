import { z } from "zod";

export const portSchema = z.coerce.number().int().min(1).max(65535);
export const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

export const executeCodeSchema = z.object({
  code: z.string().min(1),
  testCases: z
    .array(
      z.object({
        id: z.string(),
        input: z.string(),
        expectedOutput: z.string(),
      }),
    )
    .min(1),
});

export type ExecuteCodeRequest = z.infer<typeof executeCodeSchema>;
export type TestCase = ExecuteCodeRequest["testCases"][number];
export type TestResultStatus = "AC" | "WA" | "TLE" | "CE" | "RE";

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
