/** Prisma client singleton with development-only slow query logging. */
import { PrismaClient } from "@prisma/client";
import { env } from "@/config";
import { SLOW_QUERY_THRESHOLD_MS } from "@/constants";

type GlobalPrisma = typeof globalThis & {
  __prismaClient__?: PrismaClient;
};

/**
 * Creates a PrismaClient instance configured for this runtime.
 *
 * In development, query events are enabled so slow queries can be logged.
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "warn" },
            { emit: "stdout", level: "error" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });

  if (env.NODE_ENV === "development") {
    client.$on("query", (event) => {
      if (event.duration > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(
          `[prisma] Slow query (${event.duration}ms): ${event.query} params=${event.params}`,
        );
      }
    });
  }

  return client;
}

const globalForPrisma = globalThis as GlobalPrisma;

/** Shared Prisma client singleton for the application runtime. */
export const prisma = globalForPrisma.__prismaClient__ ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.__prismaClient__ = prisma;
}

if (env.NODE_ENV !== "test") {
  void import("@/server/startup")
    .then(({ startBackgroundJobs }) => startBackgroundJobs())
    .catch((error: unknown) => {
      console.error("[startup] Failed to initialize background jobs", error);
    });
}
