import { z, problemSourceSchema } from "@repo/shared";

export const importedProblemSchema = z.object({
  source: problemSourceSchema, sourceId: z.string().min(1).max(100),
  title: z.string().min(1).max(500), url: z.url(), rating: z.number().int().min(0).max(5000).nullable(),
  tags: z.array(z.string().max(100)).max(50), statementMd: z.string().max(100000).nullable(),
  timeLimitMs: z.number().int().min(50).max(10000), memoryLimitMb: z.number().int().min(16).max(512),
  license: z.string().min(1), attribution: z.string().min(1),
  tests: z.array(z.object({ input: z.string(), expected: z.string(), isSample: z.boolean() })).max(100),
}).refine(p => p.tests.every(t => Buffer.byteLength(t.input) <= 256 * 1024 && Buffer.byteLength(t.expected) <= 256 * 1024)
  && p.tests.reduce((n, t) => n + Buffer.byteLength(t.input) + Buffer.byteLength(t.expected), 0) <= 1024 * 1024, "Tests exceed storage limits")
.refine(p => p.tests.length === 0 || (p.statementMd && p.tests.some(t => !t.isSample)), "Judgeable problems need a statement and hidden tests");
export type ImportedProblem = z.infer<typeof importedProblemSchema>;
export interface SourceAdapter {
  name: ImportedProblem["source"];
  fetch(options: { limit: number }): AsyncIterable<ImportedProblem>;
}
