import { Worker, type Job } from "bullmq";
import { sendReminderSmsViaMsg91 } from "@/server/auth/msg91";
import { prisma } from "@/server/db";
import { createNotificationRecord } from "@/server/jobs/create-notification";
import type { MembershipReminderJobData } from "@/server/jobs/job-types";
import { redis } from "@/server/cache";

type GlobalReminderWorkerRegistry = typeof globalThis & {
  __gymReminderWorker__?: Worker<MembershipReminderJobData>;
};

const globalForReminderWorker = globalThis as GlobalReminderWorkerRegistry;

function buildReminderMessage(
  memberName: string,
  planName: string,
  gymName: string,
  daysUntilExpiry: number,
): string {
  return `Hi ${memberName}, your ${planName} membership at ${gymName} expires in ${daysUntilExpiry} day(s). Renew now to keep your streak!`;
}

async function processReminderJob(job: Job<MembershipReminderJobData>): Promise<void> {
  const { data } = job;

  const gym = await prisma.gym.findUnique({
    where: {
      id: data.gymId,
    },
    select: {
      name: true,
    },
  });

  const gymName = gym?.name ?? "your gym";
  const message = buildReminderMessage(
    data.memberName,
    data.planName,
    gymName,
    data.daysUntilExpiry,
  );

  let smsSent = false;

  try {
    const result = await sendReminderSmsViaMsg91(data.phone, message);
    smsSent = result.success;

    if (!result.success) {
      console.error("[jobs:reminder] SMS send failed", {
        membershipId: data.membershipId,
        memberUserId: data.memberUserId,
        reason: result.message,
      });
    }
  } catch (error) {
    console.error("[jobs:reminder] SMS request errored", {
      membershipId: data.membershipId,
      memberUserId: data.memberUserId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  await createNotificationRecord({
    gymId: data.gymId,
    text: smsSent
      ? `Renewal reminder sent to ${data.memberName} for ${data.planName} (${data.daysUntilExpiry} day(s) left).`
      : `Renewal reminder queued for ${data.memberName} for ${data.planName} (${data.daysUntilExpiry} day(s) left), but SMS delivery failed.`,
    type: "reminder",
    color: "amber-500",
  });

  console.info("[jobs:reminder] Processed reminder job", {
    gymId: data.gymId,
    membershipId: data.membershipId,
    memberUserId: data.memberUserId,
    smsSent,
  });
}

export function startReminderWorker(): Worker<MembershipReminderJobData> {
  if (globalForReminderWorker.__gymReminderWorker__) {
    return globalForReminderWorker.__gymReminderWorker__;
  }

  const worker = new Worker<MembershipReminderJobData>("gym-reminders", processReminderJob, {
    connection: redis.duplicate(),
    concurrency: 5,
  });

  worker.on("failed", (job, error) => {
    console.error("[jobs:reminder] Job failed", {
      jobId: job?.id,
      membershipId: job?.data.membershipId,
      error: error.message,
    });
  });

  if (process.env.NODE_ENV !== "production") {
    globalForReminderWorker.__gymReminderWorker__ = worker;
  }

  return worker;
}
