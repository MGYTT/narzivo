import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Brak DATABASE_URL. Dodaj połączenie Supabase do pliku .env."
  );
}

type PrismaGlobal = typeof globalThis & {
  __narzivoPrisma?: PrismaClient;
  __narzivoPgPool?: Pool;
};

const globalForPrisma = globalThis as PrismaGlobal;

const pool =
  globalForPrisma.__narzivoPgPool ??
  new Pool({
    connectionString,

    // Lokalnie możemy mieć kilka połączeń.
    // Na środowisku serverless ustawimy DB_POOL_MAX=1.
    max: Number(
      process.env.DB_POOL_MAX ??
        (process.env.NODE_ENV === "production" ? "1" : "5")
    ),

    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.__narzivoPrisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__narzivoPrisma = prisma;
  globalForPrisma.__narzivoPgPool = pool;
}