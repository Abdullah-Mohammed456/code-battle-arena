import { nodeEnvSchema, portSchema, z } from "@repo/shared";

const httpUrl = (value: string, originOnly = false) => {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      (!originOnly || url.origin === value)
    );
  } catch {
    return false;
  }
};
const origin = z
  .url()
  .refine(
    (value) => httpUrl(value, true),
    "Expected an HTTP origin without a trailing slash",
  );
const databaseUrl = z.url().refine((value) => /^postgres(ql)?:/.test(value));
export const envSchema = z
  .object({
    PORT: portSchema.default(4000),
    NODE_ENV: nodeEnvSchema,
    DATABASE_URL: databaseUrl.optional(),
    DATABASE_DIRECT_URL: databaseUrl.optional(),
    CLERK_PUBLISHABLE_KEY: z
      .string()
      .regex(/^pk_(test|live)_/)
      .optional(),
    CLERK_SECRET_KEY: z
      .string()
      .regex(/^sk_(test|live)_/)
      .optional(),
    CLERK_JWT_KEY: z.string().min(1).optional(),
    CORS_ORIGINS: z
      .string()
      .default("http://localhost:5173")
      .transform((value) => value.split(",").map((item) => item.trim()))
      .pipe(z.array(origin).min(1)),
    JUDGE_URL: z
      .url()
      .refine((value) => httpUrl(value))
      .default("http://127.0.0.1:3001"),
    JUDGE_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(1200000)
      .default(120000),
    JUDGE_SECRET: z.string().min(32).optional(),
    LOG_LEVEL: z
      .enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    TRUST_PROXY: z.coerce.number().int().min(0).max(1).default(0),
  })
  .superRefine((value, ctx) => {
    if (!!value.CLERK_PUBLISHABLE_KEY !== !!value.CLERK_SECRET_KEY)
      ctx.addIssue({
        code: "custom",
        path: ["CLERK_SECRET_KEY"],
        message: "Configure both Clerk keys",
      });
    if (value.NODE_ENV === "production") {
      for (const field of [
        "DATABASE_URL",
        "CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "JUDGE_SECRET",
      ] as const)
        if (!value[field])
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "Required in production",
          });
      if (
        value.CORS_ORIGINS.some((value) => !value.startsWith("https://")) ||
        !value.JUDGE_URL.startsWith("https://")
      )
        ctx.addIssue({
          code: "custom",
          message: "Production origins and judge must use HTTPS",
        });
    }
  });
export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
