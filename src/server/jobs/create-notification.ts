import { cacheKeys, redisCache } from "@/server/cache";
import { prisma } from "@/server/db";
import type { NotificationJobData } from "@/server/jobs/job-types";

export async function createNotificationRecord(data: NotificationJobData): Promise<void> {
  await prisma.notification.create({
    data: {
      gymId: data.gymId,
      text: data.text,
      timeLabel: "just now",
      type: data.type,
      color: data.color,
    },
  });

  await redisCache.del(cacheKeys.dashboard(data.gymId));
}
