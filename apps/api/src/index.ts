// console.log("Hello via Bun!");
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";

const app = express();
const PORT: any = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res
    .status(200)
    .json({ status: "success", message: "Code Battle API is running smooth!" });
});

app.listen(PORT, () => {
  console.log(`console is running on http://localhost:${PORT}/health`);
});
