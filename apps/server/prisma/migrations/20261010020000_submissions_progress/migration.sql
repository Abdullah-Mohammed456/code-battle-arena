CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'cpp17',
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "passed" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "time_ms" INTEGER NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "progress" (
    "user_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "best_submission_id" UUID,
    "first_solved_at" TIMESTAMPTZ(6),
    CONSTRAINT "progress_pkey" PRIMARY KEY ("user_id", "problem_id")
);

CREATE UNIQUE INDEX "progress_best_submission_id_key" ON "progress"("best_submission_id");
CREATE INDEX "submissions_user_id_created_at_idx" ON "submissions"("user_id", "created_at" DESC);
CREATE INDEX "submissions_problem_id_idx" ON "submissions"("problem_id");
CREATE INDEX "progress_user_id_status_idx" ON "progress"("user_id", "status");

ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress" ADD CONSTRAINT "progress_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress" ADD CONSTRAINT "progress_best_submission_id_fkey" FOREIGN KEY ("best_submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
