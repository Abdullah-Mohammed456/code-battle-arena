import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import router from "./routes/execution.route.js";

export const app = express();
app.use(express.json());
app.use(cors());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/execution", router);
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (error as { status?: number })?.status;
  res.status(status === 400 || status === 413 ? status : 500).json({
    error:
      status === 400
        ? "Invalid JSON body"
        : status === 413
          ? "Request body too large"
          : "Internal server error during execution",
  });
});
