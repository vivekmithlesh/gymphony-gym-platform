import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { prisma } from "@/server/db";
import type { AttendanceListResponse } from "@/types/gym.types";

function buildAvatar(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Returns all active members with their attendance dates for current month
 */
export async function getAttendanceForGym(gymId: string): Promise<AttendanceListResponse> {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const todayStart = startOfDay(new Date());

  const [memberships, liveCount] = await Promise.all([
    prisma.membership.findMany({
      where: {
        gymId,
        memberUser: {
          isActive: true,
        },
      },
      orderBy: {
        memberUser: {
          fullName: "asc",
        },
      },
      select: {
        memberUserId: true,
        planName: true,
        memberUser: {
          select: {
            fullName: true,
          },
        },
      },
    }),
    prisma.attendanceSession.count({
      where: {
        gymId,
        checkInAt: {
          gte: todayStart,
        },
      },
    }),
  ]);

  const attendanceSessions = await prisma.attendanceSession.findMany({
    where: {
      gymId,
      checkInAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: {
      checkInAt: "asc",
    },
    select: {
      memberUserId: true,
      checkInAt: true,
    },
  });

  const dateMap = new Map<string, string[]>();

  for (const session of attendanceSessions) {
    const dates = dateMap.get(session.memberUserId) ?? [];
    dates.push(session.checkInAt.toISOString());
    dateMap.set(session.memberUserId, dates);
  }

  return {
    members: memberships.map((membership) => ({
      id: membership.memberUserId,
      name: membership.memberUser.fullName,
      plan: membership.planName,
      avatar: buildAvatar(membership.memberUser.fullName),
      dates: dateMap.get(membership.memberUserId) ?? [],
    })),
    liveCount,
  };
}

/**
 * Records a check-in via QR scan.
 * Validates member belongs to gym.
 * Prevents duplicate check-ins same day.
 */
export async function recordCheckIn(
  gymId: string,
  memberUserId: string,
): Promise<{ success: boolean; message: string }> {
  const dayStart = startOfDay(new Date());
  const memberMembership = await prisma.membership.findFirst({
    where: {
      gymId,
      memberUserId,
      memberUser: {
        isActive: true,
      },
    },
    select: {
      memberUserId: true,
    },
  });

  if (!memberMembership) {
    return {
      success: false,
      message: "Member does not belong to this gym",
    };
  }

  const existingCheckIn = await prisma.attendanceSession.findFirst({
    where: {
      gymId,
      memberUserId,
      checkInAt: {
        gte: dayStart,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCheckIn) {
    return {
      success: false,
      message: "Member is already checked in for today",
    };
  }

  await prisma.attendanceSession.create({
    data: {
      gymId,
      memberUserId,
      checkInAt: new Date(),
    },
    select: {
      id: true,
    },
  });

  return {
    success: true,
    message: "Check-in recorded successfully",
  };
}
