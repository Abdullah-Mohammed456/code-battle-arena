import { nodeEnvSchema, portSchema, z } from "@repo/shared";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const envSchema = z
  .object({
    PORT: portSchema.default(3001),
    NODE_ENV: nodeEnvSchema,
    JUDGE_SECRET: z.string().min(32).optional(),
    RUNNER_IMAGE: z
      .string()
      .regex(/^[a-zA-Z0-9_./:@-]+$/)
      .default("cpp-runner"),
    WORK_DIR: z
      .string()
      .startsWith("/")
      .default(join(tmpdir(), "code-battle-arena-judge")),
    MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(8).default(1),
    MAX_QUEUE_SIZE: z.coerce.number().int().min(0).max(100).default(20),
  })
  .refine((value) => value.NODE_ENV !== "production" || !!value.JUDGE_SECRET, {
    path: ["JUDGE_SECRET"],
    message: "Production requires JUDGE_SECRET",
  });

export const env = envSchema.parse(process.env);
