import { z } from "@repo/shared";
import { sourceJson } from "./http.js";
import type { SourceAdapter } from "./types.js";

const responseSchema = z.object({ status: z.literal("OK"), result: z.object({ problems: z.array(z.object({
  contestId: z.number().int().optional(), index: z.string(), name: z.string(),
  rating: z.number().int().optional(), tags: z.array(z.string()),
})) }) });
export function codeforces(read = sourceJson): SourceAdapter {
  return {
    name: "codeforces",
    async *fetch({ limit }) {
      const data = responseSchema.parse(await read("https://codeforces.com/api/problemset.problems?lang=en"));
      let count = 0;
      for (const row of data.result.problems) {
        if (!row.contestId || row.tags.includes("*special")) continue;
        yield { source: "codeforces", sourceId: `${row.contestId}${row.index}`,
          title: row.name, url: `https://codeforces.com/problemset/problem/${row.contestId}/${row.index}`,
          rating: row.rating ?? null, tags: row.tags, statementMd: null, tests: [], timeLimitMs: 2000,
          memoryLimitMb: 256, license: "Codeforces metadata; original problem rights reserved",
          attribution: "Problem by its original authors on Codeforces. Metadata from the official Codeforces API." };
        if (++count >= limit) break;
      }
    },
  };
}
