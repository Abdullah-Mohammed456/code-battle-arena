import { createHash } from "node:crypto";
import type { Database } from "../db/index.js";
import { ApiError } from "../errors.js";
import { importedProblemSchema, type SourceAdapter } from "./types.js";
import { codeforces } from "./codeforces.js";
import { codecontests } from "./codecontests.js";

export const adapters = { codeforces: codeforces(), codecontests: codecontests() };
export function importRunner(db: Database) {
  let active: Promise<void> | undefined;
  async function execute(id: string, adapter: SourceAdapter, limit: number) {
    let imported = 0;
    let judgeable = 0;
    try {
      for await (const raw of adapter.fetch({ limit })) {
        if (imported >= limit) break;
        const { tests, ...problem } = importedProblemSchema.parse(raw);
        if (problem.source !== adapter.name) throw new Error("Source mismatch");
        const data = { ...problem, judgeable: tests.length > 0, fetchedAt: new Date() };
        const slug = `${problem.source}-${problem.sourceId.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${createHash("sha256").update(problem.sourceId).digest("hex").slice(0, 8)}`;
        await db.$transaction(async tx => {
          const row = await tx.problem.upsert({ where: { source_sourceId: { source: problem.source, sourceId: problem.sourceId } },
            create: { ...data, slug }, update: data });
          await tx.testCase.deleteMany({ where: { problemId: row.id } });
          if (tests.length) await tx.testCase.createMany({ data: tests.map((test, idx) => ({ ...test, idx, problemId: row.id,
            bytes: Buffer.byteLength(test.input) + Buffer.byteLength(test.expected) })) });
        });
        imported++;
        if (data.judgeable) judgeable++;
        await db.importRun.update({ where: { id }, data: { stats: { imported, judgeable } } });
      }
      await db.importRun.update({ where: { id }, data: { status: "completed", finishedAt: new Date(), stats: { imported, judgeable } } });
    } catch {
      await db.importRun.update({ where: { id }, data: { status: "failed", finishedAt: new Date(), error: "Import failed; retry the source later", stats: { imported, judgeable } } });
    }
  }
  return {
    async start(adapter: SourceAdapter, limit: number) {
      if (active) throw new ApiError(409, "IMPORT_BUSY", "An import is already running");
      // Reserve the slot before the first database await.
      let release!: () => void;
      active = new Promise<void>(resolve => { release = resolve; });
      try {
        const run = await db.importRun.create({ data: { source: adapter.name, stats: { imported: 0, judgeable: 0 } } });
        void execute(run.id, adapter, limit).catch(() => undefined).finally(() => { release(); active = undefined; });
        return run;
      } catch (error) { release(); active = undefined; throw error; }
    },
    async wait() { await active; },
    async status(id: string) {
      const run = await db.importRun.findUnique({ where: { id } });
      if (!run) throw new ApiError(404, "NOT_FOUND", "Import not found");
      return run;
    },
  };
}
