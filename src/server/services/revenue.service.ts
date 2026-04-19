import { PaymentStatus } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { prisma } from "@/server/db";
import type { RevenueSummary } from "@/types/gym.types";

const PLAN_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"] as const;

function formatCurrency(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

/**
 * Returns revenue chart data for last 6 months
 * and plan distribution
 */
export async function getRevenueSummary(gymId: string): Promise<RevenueSummary> {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => subMonths(now, 5 - index));

  const [monthly, planCounts, totalThisMonth, totalLastMonth] = await Promise.all([
    Promise.all(
      months.map(async (monthDate) => {
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const revenue = await prisma.paymentRecord.aggregate({
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
                  lte: monthEnd,
                },
              },
              {
                paidAt: null,
                createdAt: {
                  gte: monthStart,
                  lte: monthEnd,
                },
              },
            ],
          },
        });

        return {
          month: format(monthDate, "MMM"),
          amount: revenue._sum.amountPaise ?? 0,
        };
      }),
    ),
    prisma.membership.groupBy({
      by: ["planName"],
      where: {
        gymId,
        memberUser: {
          isActive: true,
        },
      },
      _count: {
        planName: true,
      },
      orderBy: {
        _count: {
          planName: "desc",
        },
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
              gte: startOfMonth(now),
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: startOfMonth(now),
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
              gte: startOfMonth(subMonths(now, 1)),
              lte: endOfMonth(subMonths(now, 1)),
            },
          },
          {
            paidAt: null,
            createdAt: {
              gte: startOfMonth(subMonths(now, 1)),
              lte: endOfMonth(subMonths(now, 1)),
            },
          },
        ],
      },
    }),
  ]);

  return {
    monthly,
    planDistribution: planCounts.map((plan, index) => ({
      name: plan.planName,
      count: plan._count.planName,
      color: PLAN_COLORS[index % PLAN_COLORS.length],
    })),
    totalThisMonth: formatCurrency(totalThisMonth._sum.amountPaise ?? 0),
    totalLastMonth: formatCurrency(totalLastMonth._sum.amountPaise ?? 0),
  };
}
