import { Router } from "express";
import { handleExecution } from "../controllers/execution.controller";

const router = Router();

router.post("/run", handleExecution);

export default router;
