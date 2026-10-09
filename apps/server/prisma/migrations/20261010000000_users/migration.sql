-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clerk_id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "games" INTEGER NOT NULL DEFAULT 0,
    "cf_handle" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");


ALTER TABLE "users" ADD CONSTRAINT "users_role" CHECK ("role" IN ('user', 'admin'));
ALTER TABLE "users" ADD CONSTRAINT "users_games" CHECK ("games" >= 0);
