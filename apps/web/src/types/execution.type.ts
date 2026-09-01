export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

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
