import { env } from "@/config";

type GlobalStartupRegistry = typeof globalThis & {
  __gymBackgroundJobsStartPromise__?: Promise<void>;
};

const globalForStartup = globalThis as GlobalStartupRegistry;

export function startBackgroundJobs(): Promise<void> {
  if (env.NODE_ENV === "test" || typeof window !== "undefined") {
    return Promise.resolve();
  }

  if (globalForStartup.__gymBackgroundJobsStartPromise__) {
    return globalForStartup.__gymBackgroundJobsStartPromise__;
  }

  globalForStartup.__gymBackgroundJobsStartPromise__ = (async () => {
    try {
      const [{ startReminderWorker }, { startNotificationWorker }, { startScheduler }] =
        await Promise.all([
          import("@/server/jobs/workers/reminder.worker"),
          import("@/server/jobs/workers/notification.worker"),
          import("@/server/jobs/scheduler"),
        ]);

      startReminderWorker();
      startNotificationWorker();
      await startScheduler();
    } catch (error) {
      console.error("[startup] Failed to start background jobs", error);
    }
  })();

  return globalForStartup.__gymBackgroundJobsStartPromise__;
}
