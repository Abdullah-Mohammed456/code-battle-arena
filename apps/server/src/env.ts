import { nodeEnvSchema, portSchema, z } from "@repo/shared";

export const envSchema = z.object({
  PORT: portSchema.default(4000),
  NODE_ENV: nodeEnvSchema,
});

export const env = envSchema.parse(process.env);
