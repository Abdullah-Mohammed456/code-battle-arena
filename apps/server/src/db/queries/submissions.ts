import type { Database } from "../index.js";
import { userStore, type ClerkProfile } from "./users.js";

export function submissionStore(
  db: Database,
  profile: (id: string) => Promise<ClerkProfile>,
) {
  return {
    async userId(clerkId: string) {
      let user = await db.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      if (!user) {
        await userStore(db, profile)(clerkId);
        user = await db.user.findUnique({
          where: { clerkId },
          select: { id: true },
        });
      }
      return user?.id ?? null;
    },
    async create(input: {
      userId: string;
      problemId: string;
      code: string;
      status: string;
      passed: number;
      total: number;
      timeMs: number;
      results: object[];
      solved: boolean;
      createdAt: Date;
    }) {
      return db.$transaction(async (tx) => {
        const created = await tx.submission.create({
          data: {
            userId: input.userId,
            problemId: input.problemId,
            code: input.code,
            language: "cpp17",
            status: input.status,
            passed: input.passed,
            total: input.total,
            timeMs: input.timeMs,
            results: input.results,
            createdAt: input.createdAt,
          },
          select: { id: true, createdAt: true },
        });
        await tx.progress.upsert({
          where: {
            userId_problemId: {
              userId: input.userId,
              problemId: input.problemId,
            },
          },
          create: {
            userId: input.userId,
            problemId: input.problemId,
            status: input.solved ? "solved" : "attempted",
            attempts: 1,
            bestSubmissionId: input.solved ? created.id : null,
            firstSolvedAt: input.solved ? input.createdAt : null,
          },
          update: {
            attempts: { increment: 1 },
            ...(input.solved
              ? {
                  status: "solved",
                  bestSubmission: { connect: { id: created.id } },
                }
              : {}),
          },
        });
        if (input.solved)
          await tx.progress.updateMany({
            where: {
              userId: input.userId,
              problemId: input.problemId,
              firstSolvedAt: null,
            },
            data: { firstSolvedAt: input.createdAt },
          });
        return created;
      });
    },
    async progress(userId: string) {
      return db.progress.findMany({
        where: { userId },
        select: {
          status: true,
          attempts: true,
          firstSolvedAt: true,
          problem: { select: { slug: true, title: true } },
        },
        orderBy: [{ status: "desc" }, { firstSolvedAt: "desc" }],
      });
    },
    async list(
      userId: string,
      problemSlug: string | undefined,
      page: number,
      limit: number,
    ) {
      const where = {
        userId,
        ...(problemSlug ? { problem: { slug: problemSlug } } : {}),
      };
      const [total, items] = await db.$transaction([
        db.submission.count({ where }),
        db.submission.findMany({
          where,
          select: {
            id: true,
            language: true,
            status: true,
            passed: true,
            total: true,
            timeMs: true,
            results: true,
            createdAt: true,
            problem: { select: { slug: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);
      return { total, items };
    },
    async detail(id: string, userId: string) {
      return db.submission.findFirst({
        where: { id, userId },
        select: {
          id: true,
          code: true,
          language: true,
          status: true,
          passed: true,
          total: true,
          timeMs: true,
          results: true,
          createdAt: true,
          problem: { select: { slug: true, title: true } },
        },
      });
    },
  };
}
