import { cacheKeys, redisCache } from "@/server/cache";
import { prisma } from "@/server/db";
import { deleteFile, uploadFile } from "@/server/storage/minio";

function extractObjectNameFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    return segments.at(-1) ?? null;
  } catch {
    return null;
  }
}

async function invalidateDashboardCache(gymId: string): Promise<void> {
  await redisCache.del(cacheKeys.dashboard(gymId));
}

/**
 * Returns gym profile settings
 */
export async function getGymSettings(gymId: string): Promise<{
  gymName: string;
  city: string;
  ownerEmail: string;
  contactNumber: string;
  logoUrl: string | null;
  automaticReminders: boolean;
  dailySummaryEmail: boolean;
}> {
  const gym = await prisma.gym.findUnique({
    where: {
      id: gymId,
    },
    select: {
      name: true,
      city: true,
      gymSettings: {
        select: {
          ownerEmail: true,
          contactNumber: true,
          logoUrl: true,
          automaticReminders: true,
          dailySummaryEmail: true,
        },
      },
    },
  });

  if (!gym || !gym.gymSettings) {
    throw new Error("Gym settings not found");
  }

  return {
    gymName: gym.name,
    city: gym.city,
    ownerEmail: gym.gymSettings.ownerEmail,
    contactNumber: gym.gymSettings.contactNumber,
    logoUrl: gym.gymSettings.logoUrl,
    automaticReminders: gym.gymSettings.automaticReminders,
    dailySummaryEmail: gym.gymSettings.dailySummaryEmail,
  };
}

/**
 * Updates gym profile
 */
export async function updateGymProfile(
  gymId: string,
  input: {
    gymName?: string;
    city?: string;
    ownerEmail?: string;
    contactNumber?: string;
  },
): Promise<{ success: boolean; message: string }> {
  await prisma.$transaction(async (tx) => {
    if (input.gymName !== undefined || input.city !== undefined) {
      await tx.gym.update({
        where: {
          id: gymId,
        },
        data: {
          ...(input.gymName !== undefined ? { name: input.gymName } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
        },
      });
    }

    if (input.ownerEmail !== undefined || input.contactNumber !== undefined) {
      await tx.gymSetting.upsert({
        where: {
          gymId,
        },
        update: {
          ...(input.ownerEmail !== undefined ? { ownerEmail: input.ownerEmail } : {}),
          ...(input.contactNumber !== undefined ? { contactNumber: input.contactNumber } : {}),
        },
        create: {
          gymId,
          ownerEmail: input.ownerEmail ?? "",
          contactNumber: input.contactNumber ?? "",
        },
      });
    }
  });

  await invalidateDashboardCache(gymId);

  return {
    success: true,
    message: "Gym profile updated successfully",
  };
}

/**
 * Updates gym logo
 */
export async function updateGymLogo(
  gymId: string,
  file: Buffer,
  mimetype: string,
  originalName: string,
): Promise<{ logoUrl: string }> {
  const existingSettings = await prisma.gymSetting.findUnique({
    where: {
      gymId,
    },
    select: {
      logoUrl: true,
    },
  });

  const existingObjectName = existingSettings?.logoUrl
    ? extractObjectNameFromUrl(existingSettings.logoUrl)
    : null;

  if (existingObjectName) {
    await deleteFile(existingObjectName);
  }

  const logoUrl = await uploadFile(file, originalName, mimetype);

  await prisma.gymSetting.upsert({
    where: {
      gymId,
    },
    update: {
      logoUrl,
    },
    create: {
      gymId,
      ownerEmail: "",
      contactNumber: "",
      logoUrl,
    },
  });

  await invalidateDashboardCache(gymId);

  return { logoUrl };
}

/**
 * Updates notification settings
 */
export async function updateNotificationSettings(
  gymId: string,
  input: {
    automaticReminders?: boolean;
    dailySummaryEmail?: boolean;
  },
): Promise<{ success: boolean; message: string }> {
  await prisma.gymSetting.upsert({
    where: {
      gymId,
    },
    update: {
      ...(input.automaticReminders !== undefined
        ? { automaticReminders: input.automaticReminders }
        : {}),
      ...(input.dailySummaryEmail !== undefined
        ? { dailySummaryEmail: input.dailySummaryEmail }
        : {}),
    },
    create: {
      gymId,
      ownerEmail: "",
      contactNumber: "",
      automaticReminders: input.automaticReminders ?? true,
      dailySummaryEmail: input.dailySummaryEmail ?? false,
    },
  });

  await invalidateDashboardCache(gymId);

  return {
    success: true,
    message: "Notification settings updated successfully",
  };
}
