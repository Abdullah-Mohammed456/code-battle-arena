-- CreateTable
CREATE TABLE "problems" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statement_md" TEXT,
    "url" TEXT NOT NULL,
    "rating" INTEGER,
    "tags" TEXT[],
    "time_limit_ms" INTEGER NOT NULL DEFAULT 2000,
    "memory_limit_mb" INTEGER NOT NULL DEFAULT 256,
    "judgeable" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "compare_mode" TEXT NOT NULL DEFAULT 'token',
    "license" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "problem_id" UUID NOT NULL,
    "idx" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "is_sample" BOOLEAN NOT NULL,
    "bytes" INTEGER NOT NULL,

    CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "stats" JSONB NOT NULL,
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),

    CONSTRAINT "import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "problems_slug_key" ON "problems"("slug");

-- CreateIndex
CREATE INDEX "problems_rating_idx" ON "problems"("rating");

-- CreateIndex
CREATE INDEX "problems_judgeable_idx" ON "problems"("judgeable");

-- CreateIndex
CREATE INDEX "problems_tags_idx" ON "problems" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "problems_source_source_id_key" ON "problems"("source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_cases_problem_id_idx_key" ON "test_cases"("problem_id", "idx");

-- AddForeignKey
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

