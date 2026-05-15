import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

export const DEFAULT_DATABASE_URL = "file:./dev.db";

export function resolveDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  return String(databaseUrl || DEFAULT_DATABASE_URL);
}

export function createRuntimeAdapter(databaseUrl = resolveDatabaseUrl()) {
  const normalizedUrl = databaseUrl.toLowerCase();

  if (
    normalizedUrl.startsWith("postgres://") ||
    normalizedUrl.startsWith("postgresql://")
  ) {
    return new PrismaPg(new Pool({ connectionString: databaseUrl }));
  }

  if (normalizedUrl.startsWith("file:") || normalizedUrl.startsWith("libsql:")) {
    return new PrismaLibSql({ url: databaseUrl });
  }

  throw new Error(
    "DATABASE_URL no soportada. Usa file:/libsql: para SQLite o postgres:/postgresql: para PostgreSQL."
  );
}

export function createRuntimePrismaClient(databaseUrl = resolveDatabaseUrl()) {
  return new PrismaClient({
    adapter: createRuntimeAdapter(databaseUrl),
  });
}
