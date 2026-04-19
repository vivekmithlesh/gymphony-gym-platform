import { Worker, type Job } from "bullmq";
import { createNotificationRecord } from "@/server/jobs/create-notification";
import type { NotificationJobData } from "@/server/jobs/job-types";
import { redis } from "@/server/cache";

type GlobalNotificationWorkerRegistry = typeof globalThis & {
  __gymNotificationWorker__?: Worker<NotificationJobData>;
};

const globalForNotificationWorker = globalThis as GlobalNotificationWorkerRegistry;

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  await createNotificationRecord(job.data);

  console.info("[jobs:notification] Created notification", {
    jobId: job.id,
    gymId: job.data.gymId,
    type: job.data.type,
  });
}

export function startNotificationWorker(): Worker<NotificationJobData> {
  if (globalForNotificationWorker.__gymNotificationWorker__) {
    return globalForNotificationWorker.__gymNotificationWorker__;
  }

  const worker = new Worker<NotificationJobData>("gym-notifications", processNotificationJob, {
    connection: redis.duplicate(),
    concurrency: 10,
  });

  worker.on("failed", (job, error) => {
    console.error("[jobs:notification] Job failed", {
      jobId: job?.id,
      gymId: job?.data.gymId,
      error: error.message,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    globalForNotificationWorker.__gymNotificationWorker__ = worker;
  }

  return worker;
}
