import { MembershipStatus } from "@prisma/client";
import { format } from "date-fns";
import { prisma } from "@/server/db";
import type {
  LeaderboardMember,
  MemberPortalOverview,
  StoreItem,
  WorkoutHistoryItem,
} from "@/types/gym.types";

function buildAvatar(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMembershipStatus(status: MembershipStatus): string {
  return `${status.slice(0, 1)}${status.slice(1).toLowerCase()}`;
}

function formatPortalDate(date: Date): string {
  return format(date, "d MMM, yyyy");
}

/**
 * Returns member's gym overview matching MemberPortalOverview shape
 */
export async function getMemberOverview(
  memberUserId: string,
  gymId: string,
): Promise<MemberPortalOverview> {
  const [membership, totalMembers] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        gymId,
        memberUserId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        planName: true,
        expiryDate: true,
        status: true,
        points: true,
        memberRank: true,
        gym: {
          select: {
            name: true,
            location: true,
          },
        },
      },
    }),
    prisma.membership.count({
      where: {
        gymId,
        memberUser: {
          isActive: true,
        },
      },
    }),
  ]);

  if (!membership) {
    throw new Error("Membership not found");
  }

  const derivedRank =
    membership.memberRank ??
    (await prisma.membership.count({
      where: {
        gymId,
        points: {
          gt: membership.points,
        },
      },
    })) + 1;

  return {
    gymName: membership.gym.name,
    location: membership.gym.location ?? "Location unavailable",
    planName: membership.planName,
    expiryDate: formatPortalDate(membership.expiryDate),
    status: formatMembershipStatus(membership.status),
    totalMembers,
    memberRank: derivedRank,
    points: membership.points,
  };
}

/**
 * Returns member's workout history
 */
export async function getWorkoutHistory(
  memberUserId: string,
  gymId: string,
): Promise<WorkoutHistoryItem[]> {
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      gymId,
      memberUserId,
    },
    orderBy: {
      checkInAt: "desc",
    },
    take: 20,
    select: {
      id: true,
      checkInAt: true,
      checkOutAt: true,
      bonusLabel: true,
      gym: {
        select: {
          name: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    date: format(session.checkInAt, "EEE, d MMM"),
    timeIn: format(session.checkInAt, "hh:mm a").toUpperCase(),
    timeOut: session.checkOutAt ? format(session.checkOutAt, "hh:mm a").toUpperCase() : "--",
    gymName: session.gym.name,
    ...(session.bonusLabel ? { bonus: session.bonusLabel } : {}),
  }));
}

/**
 * Returns gym leaderboard by points
 */
export async function getLeaderboard(
  memberUserId: string,
  gymId: string,
): Promise<LeaderboardMember[]> {
  const members = await prisma.membership.findMany({
    where: {
      gymId,
      memberUser: {
        isActive: true,
      },
    },
    orderBy: [
      {
        points: "desc",
      },
      {
        memberUser: {
          fullName: "asc",
        },
      },
    ],
    take: 20,
    select: {
      memberUserId: true,
      points: true,
      memberUser: {
        select: {
          fullName: true,
        },
      },
    },
  });

  return members.map((member, index) => ({
    id: member.memberUserId,
    name: member.memberUser.fullName,
    points: member.points,
    rank: index + 1,
    isMe: member.memberUserId === memberUserId,
    avatar: buildAvatar(member.memberUser.fullName),
  }));
}

/**
 * Returns gym store items visible in app
 */
export async function getStoreItems(gymId: string): Promise<StoreItem[]> {
  const products = await prisma.inventoryProduct.findMany({
    where: {
      gymId,
      showInApp: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      price: true,
      category: true,
      icon: true,
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: `₹${product.price}`,
    category: product.category,
    icon: product.icon,
  }));
}
