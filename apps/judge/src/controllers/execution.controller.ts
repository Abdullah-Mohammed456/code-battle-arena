import { type Request, type Response } from "express";
import { executeCodeSchema } from "@repo/shared";
import { executeCppCode } from "../services/execution.service.js";

export const handleExecution = async (req: Request, res: Response) => {
  const parsed = executeCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Code and non-empty testCases array are required",
    });
  }

  try {
    return res.json(
      await executeCppCode(parsed.data.code, parsed.data.testCases),
    );
  } catch {
    return res
      .status(500)
      .json({ error: "Internal server error during execution" });
  }
};
