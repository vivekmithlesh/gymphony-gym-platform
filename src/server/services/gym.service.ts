import { PaymentStatus, MembershipStatus } from "@prisma/client";
import {
  differenceInCalendarDays,
  endOfMonth,
  formatDistanceToNow,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { CACHE_TTL_SECONDS } from "@/constants";
import { cacheKeys, redisCache } from "@/server/cache";
import { prisma } from "@/server/db";
import type { DashboardSummary, NotificationItem, OverdueMember } from "@/types/gym.types";

function formatCurrencyFromPaise(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

function formatPercentageChange(
  current: number,
  previous: number,
): {
  change: string;
  trend: "up" | "down";
} {
  if (previous === 0) {
    return {
      change: current === 0 ? "0.0%" : "+100.0%",
      trend: "up",
    };
  }

  const percent = ((current - previous) / previous) * 100;

  return {
    change: `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`,
    trend: percent >= 0 ? "up" : "down",
  };
}

function mapNotificationColor(color: string): string {
  if (color.startsWith("text-")) {
    return color;
  }

  return `text-${color}`;
}

function mapNotificationItem(notification: {
  id: number;
  text: string;
  timeLabel: string;
  type: string;
  color: string;
  createdAt: Date;
}): NotificationItem {
  return {
    id: notification.id,
    text: notification.text,
    time:
      notification.timeLabel ||
      formatDistanceToNow(notification.createdAt, { addSuffix: true })
        .replace("about ", "")
        .replace(" minutes", "m")
        .replace(" minute", "m")
        .replace(" hours", "h")
        .replace(" hour", "h"),
    type: notification.type,
    color: mapNotificationColor(notification.color),
  };
}

function mapOverdueMember(member: {
  dueDate: Date;
  planName: string;
  memberUser: { fullName: string };
  plan: { pricePaise: number };
}): OverdueMember {
  return {
    name: member.memberUser.fullName,
    plan: member.planName,
    amount: formatCurrencyFromPaise(member.plan.pricePaise),
    days: Math.max(differenceInCalendarDays(new Date(), member.dueDate), 0),
  };
}

/**
 * Returns dashboard summary metrics for a gym.
 * Caches result in Redis for CACHE_TTL_SECONDS.DASHBOARD
 */
export async function getDashboardSummary(gymId: string): Promise<DashboardSummary> {
  const cachedSummary = await redisCache.get<DashboardSummary>(cacheKeys.dashboard(gymId));

  if (cachedSummary) {
    return cachedSummary;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    activeMembersCount,
    previousActiveMembersCount,
    todayAttendanceCount,
    overdueMembersCount,
    previousOverdueMembersCount,
    overdueMemberships,
    notifications,
    currentMonthRevenue,
    previousMonthRevenue,
  ] = await Promise.all([
    prisma.membership.count({
      where: {
        gymId,
        status: MembershipStatus.ACTIVE,
        memberUser: {
          isActive: true,
        },
      },
    }),
    prisma.membership.count({
      where: {
        gymId,
        status: MembershipStatus.ACTIVE,
        createdAt: {
          lte: lastMonthEnd,
        },
        memberUser: {
          isActive: true,
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
    prisma.membership.count({
      where: {
        gymId,
        status: MembershipStatus.OVERDUE,
        memberUser: {
          isActive: true,
        },
      },
    }),
    prisma.membership.count({
      where: {
        gymId,
        status: MembershipStatus.OVERDUE,
        dueDate: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
        memberUser: {
          isActive: true,
        },
      },
    }),
    prisma.membership.findMany({
      where: {
        gymId,
        status: MembershipStatus.OVERDUE,
        memberUser: {
          isActive: true,
        },
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 10,
      select: {
        dueDate: true,
        planName: true,
        memberUser: {
          select: {
            fullName: true,
          },
        },
        plan: {
          select: {
            pricePaise: true,
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: { gymId },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        text: true,
        timeLabel: true,
        type: true,
        color: true,
        createdAt: true,
      },
    }),
    prisma.paymentRecord.aggregate({
      _sum: {
        amountPaise: true,
      },
      where: {
        gymId,
        status: PaymentStatus.PAID,
        OR: [
          {
            paidAt: {
              gte: monthStart,
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: monthStart,
            },
          },
        ],
      },
    }),
    prisma.paymentRecord.aggregate({
      _sum: {
        amountPaise: true,
      },
      where: {
        gymId,
        status: PaymentStatus.PAID,
        OR: [
          {
            paidAt: {
              gte: lastMonthStart,
              lte: lastMonthEnd,
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: lastMonthStart,
              lte: lastMonthEnd,
            },
          },
        ],
      },
    }),
  ]);

  const revenueChange = formatPercentageChange(
    currentMonthRevenue._sum.amountPaise ?? 0,
    previousMonthRevenue._sum.amountPaise ?? 0,
  );
  const activeMembersChange = formatPercentageChange(
    activeMembersCount,
    previousActiveMembersCount,
  );
  const overdueMembersChange = formatPercentageChange(
    overdueMembersCount,
    previousOverdueMembersCount,
  );

  const summary: DashboardSummary = {
    metrics: [
      {
        title: "Live Now",
        value: `${todayAttendanceCount} Members`,
        change: "Live",
        trend: "up",
        isLive: true,
      },
      {
        title: "Total Revenue",
        value: formatCurrencyFromPaise(currentMonthRevenue._sum.amountPaise ?? 0),
        change: revenueChange.change,
        trend: revenueChange.trend,
      },
      {
        title: "Active Members",
        value: activeMembersCount.toLocaleString("en-IN"),
        change: activeMembersChange.change,
        trend: activeMembersChange.trend,
      },
      {
        title: "Pending Dues",
        value: `${overdueMembersCount} Members`,
        change: overdueMembersChange.change,
        trend: overdueMembersChange.trend,
      },
    ],
    overdueMembers: overdueMemberships.map(mapOverdueMember),
    notifications: notifications.map(mapNotificationItem),
  };

  await redisCache.set(cacheKeys.dashboard(gymId), summary, CACHE_TTL_SECONDS.DASHBOARD);

  return summary;
}
