import { Router } from "express";
import { handleExecution } from "../controllers/execution.controller.js";

const router = Router();

router.post("/run", handleExecution);

export default router;
