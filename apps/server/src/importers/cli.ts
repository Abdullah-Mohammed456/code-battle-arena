import { importRequestSchema, problemSourceSchema } from "@repo/shared";
import { env } from "../env.js";
import { connectDatabase } from "../db/index.js";
import { adapters, importRunner } from "./runner.js";

const source = problemSourceSchema.parse(process.argv[2]);
const { limit } = importRequestSchema.parse({ limit: process.argv[3] === undefined ? undefined : Number(process.argv[3]) });
const db = connectDatabase(env.DATABASE_URL);
try {
  const runner = importRunner(db);
  const run = await runner.start(adapters[source], limit ?? (source === "codeforces" ? 200 : 50));
  console.log(JSON.stringify({ id: run.id, source, status: run.status }));
  await runner.wait();
  const result = await runner.status(run.id);
  console.log(JSON.stringify({ id: result.id, status: result.status, stats: result.stats, error: result.error }));
  if (result.status !== "completed") process.exitCode = 1;
} finally { await db.$disconnect(); }
