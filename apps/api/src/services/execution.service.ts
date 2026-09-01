import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import {
  type TestCase,
  type TestCaseResult,
  type ExecuteCodeResponse,
  type TestResultStatus,
} from "../types/execution.type";

const execPromise = promisify(exec);

export const executeCppCode = async (
  code: string,
  testCases: TestCase[],
): Promise<ExecuteCodeResponse> => {
  const uniqueID = Date.now();
  const filePath = path.join(process.cwd(), `temp_solution${uniqueID}.cpp`);
  const exePath = path.join(process.cwd(), `temp_exe${uniqueID}`);
  const inputPath = path.join(process.cwd(), `temp_input${uniqueID}.txt`);

  try {
    fs.writeFileSync(filePath, code);

    const compileCmd = `docker run --rm \
      -v "${filePath}":/app/solution.cpp \
      -v "${process.cwd()}":/app/build \
      cpp-runner \
      sh -c "g++ /app/solution.cpp -o /app/build/temp_exe${uniqueID} && chmod +x /app/build/temp_exe${uniqueID}"`;

    try {
      await execPromise(compileCmd, { timeout: 8000 });
    } catch (compileError: any) {
      return {
        overallStatus: "CE",
        passedCount: 0,
        totalCount: testCases.length,
        results: testCases.map((tc) => ({
          testCaseId: tc.id,
          status: "CE",
          expectedOutput: tc.expectedOutput,
          error: compileError.stderr || compileError.message,
        })),
      };
    }

    const results: TestCaseResult[] = [];
    let passedCount = 0;
    let overallStatus: TestResultStatus = "AC";

    for (const tc of testCases) {
      fs.writeFileSync(inputPath, tc.input);
      const startTime = Date.now();

      try {
        const runCmd = `docker run --rm \
          --memory=256m \
          --network none \
          -v "${exePath}":/app/runner \
          -v "${inputPath}":/app/input.txt \
          cpp-runner \
          sh -c "/app/runner < /app/input.txt"`;

        const { stdout } = await execPromise(runCmd, { timeout: 3000 });
        const executionTimeMs = Date.now() - startTime;

        const actualOutput = stdout.trim();
        const expected = tc.expectedOutput.trim();

        if (actualOutput === expected) {
          passedCount++;
          results.push({
            testCaseId: tc.id,
            status: "AC",
            actualOutput,
            expectedOutput: expected,
            executionTimeMs,
          });
        } else {
          if (overallStatus === "AC") overallStatus = "WA";
          results.push({
            testCaseId: tc.id,
            status: "WA",
            actualOutput,
            expectedOutput: expected,
            executionTimeMs,
          });
        }
      } catch (runError: any) {
        const executionTimeMs = Date.now() - startTime;
        const isTLE = runError.killed || runError.signal === "SIGTERM";
        const status: TestResultStatus = isTLE ? "TLE" : "RE";

        if (overallStatus === "AC") overallStatus = status;

        results.push({
          testCaseId: tc.id,
          status,
          expectedOutput: tc.expectedOutput,
          error: isTLE
            ? "Time Limit Exceeded"
            : runError.stderr || runError.message,
          executionTimeMs,
        });
      }
    }

    return {
      overallStatus,
      passedCount,
      totalCount: testCases.length,
      results,
    };
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  }
};
