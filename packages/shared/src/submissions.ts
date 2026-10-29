import { z } from "zod";

const bytes = (max: number) =>
  z
    .string()
    .refine(
      (value) => new TextEncoder().encode(value).length <= max,
      `Must contain at most ${max} UTF-8 bytes`,
    );

export const runProblemSchema = z.strictObject({
  code: bytes(64 * 1024).min(1),
  input: bytes(256 * 1024).optional(),
});
export const submitProblemSchema = z.strictObject({
  code: bytes(64 * 1024).min(1),
});
export const submissionStatusSchema = z.enum([
  "AC",
  "WA",
  "TLE",
  "CE",
  "RE",
  "MLE",
  "OLE",
  "IE",
]);
export const submissionResultSchema = z
  .object({
    idx: z.number().int().nonnegative(),
    status: submissionStatusSchema,
    timeMs: z.number().nonnegative().optional(),
    sample: z.boolean(),
    actual: z.string().optional(),
    expected: z.string().optional(),
    error: z.string().optional(),
  })
  .refine(
    (result) =>
      result.sample ||
      (result.actual === undefined &&
        result.expected === undefined &&
        result.error === undefined),
    "Hidden test outputs must not be included",
  );
export const submissionSchema = z.object({
  id: z.uuid(),
  problemSlug: z.string(),
  problemTitle: z.string(),
  language: z.literal("cpp17"),
  status: submissionStatusSchema,
  passed: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  timeMs: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  results: z.array(submissionResultSchema),
});
export const submissionDetailSchema = submissionSchema.extend({
  code: z.string(),
});
export const submissionListSchema = z.object({
  items: z.array(submissionSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});
export const submissionQuerySchema = z.strictObject({
  problem: z
    .string()
    .regex(/^[a-z0-9-]{1,160}$/)
    .optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const progressListSchema = z.object({
  items: z.array(
    z.object({
      problemSlug: z.string(),
      problemTitle: z.string(),
      status: z.enum(["attempted", "solved"]),
      attempts: z.number().int().positive(),
      firstSolvedAt: z.iso.datetime().nullable(),
    }),
  ),
  solved: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
});
export const problemRunResponseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("samples"),
    status: submissionStatusSchema,
    passed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    timeMs: z.number().int().nonnegative(),
    results: z.array(submissionResultSchema),
  }),
  z.object({
    kind: z.literal("custom"),
    status: z.union([z.literal("OUTPUT"), submissionStatusSchema]),
    output: z.string().optional(),
    timeMs: z.number().nonnegative(),
    error: z.string().optional(),
  }),
]);
