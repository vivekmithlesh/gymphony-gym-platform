import { Queue } from "bullmq";
import { redis } from "@/server/cache";
import type { MembershipReminderJobData, NotificationJobData } from "@/server/jobs/job-types";

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000,
  },
} as const;

type GlobalQueueRegistry = typeof globalThis & {
  __gymReminderQueue__?: Queue<MembershipReminderJobData>;
  __gymNotificationQueue__?: Queue<NotificationJobData>;
};

const globalForQueues = globalThis as GlobalQueueRegistry;

export const reminderQueue =
  globalForQueues.__gymReminderQueue__ ??
  new Queue<MembershipReminderJobData>("gym-reminders", {
    connection: redis,
    defaultJobOptions,
  });

export const notificationQueue =
  globalForQueues.__gymNotificationQueue__ ??
  new Queue<NotificationJobData>("gym-notifications", {
    connection: redis,
    defaultJobOptions,
  });

if (process.env.NODE_ENV !== "production") {
  globalForQueues.__gymReminderQueue__ = reminderQueue;
  globalForQueues.__gymNotificationQueue__ = notificationQueue;
}
