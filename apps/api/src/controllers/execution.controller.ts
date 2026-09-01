import { type Request, type Response } from "express";
import { executeCppCode } from "../services/execution.service";
import {
  type ExecuteCodeRequest,
  type ExecuteCodeResponse,
} from "../types/execution.type";

export const handleExecution = async (req: Request, res: Response) => {
  try {
    const { code, testCases } = req.body as ExecuteCodeRequest;

    if (!code || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        error: "Code and non-empty testCases array are required",
      });
    }

    const result: ExecuteCodeResponse = await executeCppCode(code, testCases);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: "Internal server error during execution",
      details: error.message,
    });
  }
};
