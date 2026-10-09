import type { ProblemQuery } from "@repo/shared";
import type { Database } from "../index.js";
import { ApiError } from "../../errors.js";

const summary = {
  id: true, source: true, sourceId: true, slug: true, title: true, url: true,
  rating: true, tags: true, judgeable: true, timeLimitMs: true, memoryLimitMb: true,
  compareMode: true, license: true, attribution: true,
} as const;

export function problemStore(db: Database) {
  return {
    async list(query: ProblemQuery) {
      const where = {
        published: true, source: query.source, judgeable: query.judgeable,
        ...(query.query ? { title: { contains: query.query, mode: "insensitive" as const } } : {}),
        ...(query.tag ? { tags: { has: query.tag } } : {}),
        ...(query.minRating !== undefined || query.maxRating !== undefined
          ? { rating: { gte: query.minRating, lte: query.maxRating } } : {}),
      };
      const [total, items] = await db.$transaction([
        db.problem.count({ where }),
        db.problem.findMany({ where, select: summary, orderBy: { slug: "asc" },
          skip: (query.page - 1) * query.limit, take: query.limit }),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    },
    async detail(slug: string) {
      const value = await db.problem.findFirst({ where: { slug, published: true },
        select: { ...summary, statementMd: true,
          tests: { where: { isSample: true }, orderBy: { idx: "asc" }, select: { input: true, expected: true } } } });
      if (!value) throw new ApiError(404, "NOT_FOUND", "Problem not found");
      const { tests, ...problem } = value;
      return { ...problem, samples: tests };
    },
    async publish(slug: string, published: boolean) {
      const result = await db.problem.updateMany({ where: { slug }, data: { published } });
      if (!result.count) throw new ApiError(404, "NOT_FOUND", "Problem not found");
    },
    async requireAdmin(clerkId: string) {
      const user = await db.user.findUnique({ where: { clerkId }, select: { role: true } });
      if (user?.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Admin access required");
    },
  };
}
