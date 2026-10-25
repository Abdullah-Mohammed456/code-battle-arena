import { z } from "@repo/shared";

export const envSchema = z.object({
  VITE_API_URL: z
    .url()
    .refine((value) => /^https?:/.test(value), "Expected HTTP or HTTPS")
    .optional(),
  VITE_WS_URL: z
    .url()
    .refine((value) => /^wss?:/.test(value), "Expected WS or WSS")
    .optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_").optional(),
});

export function resolveWebEnv(
  source: Record<string, unknown>,
  allowLocalDefaults: boolean,
) {
  return envSchema.parse({
    ...source,
    VITE_API_URL:
      source.VITE_API_URL ??
      (allowLocalDefaults ? "http://localhost:4000" : undefined),
    VITE_WS_URL:
      source.VITE_WS_URL ??
      (allowLocalDefaults ? "ws://localhost:4000/ws" : undefined),
  });
}

const appHost =
  typeof window === "undefined" ? "localhost" : window.location.hostname;
const localHost =
  !appHost ||
  appHost === "localhost" ||
  appHost.endsWith(".localhost") ||
  appHost === "127.0.0.1" ||
  appHost === "::1";

export const webEnv = resolveWebEnv(import.meta.env, localHost);
