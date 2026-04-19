/** Typed Redis cache key builders for backend caching and rate limits. */

/**
 * Stable Redis cache key helpers.
 */
export const cacheKeys = {
  /**
   * Builds the dashboard metrics cache key for a gym.
   */
  dashboard(gymId: string): string {
    return `dashboard:${gymId}`;
  },

  /**
   * Builds the member cache key for a member lookup.
   */
  member(memberId: string): string {
    return `member:${memberId}`;
  },

  /**
   * Builds the leaderboard cache key for a gym.
   */
  leaderboard(gymId: string): string {
    return `leaderboard:${gymId}`;
  },

  /**
   * Builds the OTP rate-limit key for a phone number.
   */
  otpRateLimit(phone: string): string {
    return `otp-rate-limit:${phone}`;
  },
} as const;
