import { createServerFn } from "@tanstack/react-start";
import { CACHE_TTL_SECONDS, USER_ROLES } from "@/constants";
import { cacheKeys, redisCache } from "@/server/cache";
import { requireRole } from "@/server/auth/middleware";
import { getLeaderboard } from "@/server/services/member-portal.service";
import type { LeaderboardMember } from "@/types/gym.types";

export const memberPortalLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireRole(USER_ROLES.MEMBER)])
  .handler(async ({ context }) => {
    const cacheKey = cacheKeys.leaderboard(context.session.gymId);
    const cachedLeaderboard = await redisCache.get<LeaderboardMember[]>(cacheKey);

    if (cachedLeaderboard) {
      return cachedLeaderboard.map((member) => ({
        ...member,
        isMe: member.id === context.session.userId,
      }));
    }

    const leaderboard = await getLeaderboard(context.session.userId, context.session.gymId);
    const cacheValue = leaderboard.map((member) => ({
      ...member,
      isMe: false,
    }));

    await redisCache.set(cacheKey, cacheValue, CACHE_TTL_SECONDS.LEADERBOARD);

    return leaderboard;
  });
