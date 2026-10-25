import { z } from "@repo/shared";

export const envSchema = z.object({
  VITE_API_URL: z
    .url()
    .refine((value) => /^https?:/.test(value), "Expected HTTP or HTTPS")
    .default("http://localhost:4000"),
  VITE_WS_URL: z
    .url()
    .refine((value) => /^wss?:/.test(value), "Expected WS or WSS")
    .default("ws://localhost:4000/ws"),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
});

export const webEnv = envSchema.parse(import.meta.env);
