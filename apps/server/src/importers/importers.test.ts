import { expect, test } from "bun:test";
import { codeforces } from "./codeforces.js";
import { datasetProblem } from "./codecontests.js";

test("Codeforces imports metadata only and keeps original attribution", async () => {
  const adapter = codeforces(async () => ({ status: "OK", result: { problems: [
    { contestId: 4, index: "A", name: "Watermelon", rating: 800, tags: ["math"] },
  ] } }));
  const rows: unknown[] = [];
  for await (const problem of adapter.fetch({ limit: 1 })) rows.push(problem);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ sourceId: "4A", statementMd: null, tests: [], license: expect.stringContaining("rights reserved") });
});

test("CodeContests rejects unsupported, incomplete, and non-Codeforces rows", () => {
  const row = {
    name: "1200_A. Sample", description: "Read two numbers and print their sum.", source: 2,
    cf_contest_id: 1200, cf_index: "A", cf_rating: 800, cf_tags: ["math"],
    time_limit: { seconds: 1, nanos: 0 }, memory_limit_bytes: 67108864,
    input_file: "", output_file: "",
    public_tests: { input: ["1 2"], output: ["3"] },
    private_tests: { input: ["4 5"], output: ["9"] },
    generated_tests: { input: [], output: [] },
  };
  expect(datasetProblem(row)?.tests).toHaveLength(2);
  expect(datasetProblem({ ...row, source: 1 })).toBeNull();
  expect(datasetProblem({ ...row, private_tests: { input: [], output: [] } })).toBeNull();
  expect(datasetProblem({ ...row, description: "Print any valid answer." })).toBeNull();
});
