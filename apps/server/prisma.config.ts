import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: { path: "./prisma/migrations" },
  datasource: process.env.DATABASE_DIRECT_URL
    ? { url: process.env.DATABASE_DIRECT_URL }
    : undefined,
});
