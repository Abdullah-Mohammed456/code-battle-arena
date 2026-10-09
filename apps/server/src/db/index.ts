import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { ApiError } from "../errors.js";

export function connectDatabase(url?: string) {
  if (!url)
    throw new ApiError(503, "DATABASE_UNAVAILABLE", "Database unavailable");
  const adapter = new PrismaPg({
    connectionString: url,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
  });
  return new PrismaClient({ adapter });
}
export type Database = ReturnType<typeof connectDatabase>;
