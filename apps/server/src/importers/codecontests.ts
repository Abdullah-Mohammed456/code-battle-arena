import { z } from "@repo/shared";
import { sourceJson } from "./http.js";
import { importedProblemSchema, type SourceAdapter } from "./types.js";

const tests = z.object({ input: z.array(z.string()), output: z.array(z.string()) })
  .refine(v => v.input.length === v.output.length);
const rowSchema = z.object({
  name: z.string(), description: z.string(), source: z.number().int(),
  cf_contest_id: z.number().int(), cf_index: z.string(), cf_rating: z.number().int(), cf_tags: z.array(z.string()),
  time_limit: z.object({ seconds: z.number(), nanos: z.number() }).nullable(),
  memory_limit_bytes: z.number(), input_file: z.string(), output_file: z.string(),
  public_tests: tests, private_tests: tests, generated_tests: tests,
});
const pageSchema = z.object({ rows: z.array(z.object({ row: z.unknown(), truncated_cells: z.array(z.unknown()) })),
  num_rows_total: z.number().int() });
const unsupported = /interactive|print any|output any|any of them|if there are multiple|multiple (?:possible|valid|correct)|any (?:valid|correct|suitable)|absolute or relative error|relative or absolute error|input\.txt|output\.txt/i;

export function datasetProblem(value: unknown) {
  const result = rowSchema.safeParse(value);
  if (!result.success) return null;
  const row = result.data;
  if (row.source !== 2 || row.cf_contest_id <= 0 || !row.cf_index || !row.time_limit
    || row.input_file || row.output_file || row.cf_rating < 800 || row.cf_rating > 3500
    || row.cf_tags.includes("*special") || unsupported.test(row.description)) return null;
  const testCases = [row.public_tests, row.private_tests, row.generated_tests].flatMap((group, i) =>
    group.input.map((input, idx) => ({ input, expected: group.output[idx]!, isSample: i === 0 })));
  const problem = importedProblemSchema.safeParse({
    source: "codecontests", sourceId: `${row.cf_contest_id}${row.cf_index}`, title: row.name.replace(/^\d+_\w+\.\s*/, ""),
    url: `https://codeforces.com/problemset/problem/${row.cf_contest_id}/${row.cf_index}`,
    rating: row.cf_rating, tags: row.cf_tags, statementMd: row.description.replace(/</g, "&lt;"),
    timeLimitMs: row.time_limit.seconds * 1000 + row.time_limit.nanos / 1000000,
    memoryLimitMb: Math.ceil(row.memory_limit_bytes / 1048576), tests: testCases,
    license: "CC BY 4.0 (CodeContests non-code data); original source terms may also apply",
    attribution: "CodeContests by Google DeepMind (https://github.com/google-deepmind/code_contests), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Original problem by its Codeforces authors; description escaped for safe Markdown display.",
  });
  return problem.success && problem.data.tests.length ? problem.data : null;
}

export function codecontests(read = sourceJson): SourceAdapter {
  return {
    name: "codecontests",
    async *fetch({ limit }) {
      let count = 0;
      for (let offset = 0; offset < 5000; offset += 10) {
        const url = `https://datasets-server.huggingface.co/rows?dataset=deepmind%2Fcode_contests&config=default&split=train&offset=${offset}&length=10`;
        const page = pageSchema.parse(await read(url));
        for (const item of page.rows) {
          if (item.truncated_cells.length) continue;
          const problem = datasetProblem(item.row);
          if (!problem) continue;
          yield problem;
          if (++count >= limit) return;
        }
        if (!page.rows.length || offset + 10 >= page.num_rows_total) break;
      }
      if (count < limit) throw new Error("Not enough compatible dataset problems");
    },
  };
}
