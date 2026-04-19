/** Membership status constants used across the backend. */
export const MEMBERSHIP_STATUSES = {
  ACTIVE: "ACTIVE",
  OVERDUE: "OVERDUE",
  EXPIRED: "EXPIRED",
} as const;

/** Membership status string union derived from MEMBERSHIP_STATUSES. */
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[keyof typeof MEMBERSHIP_STATUSES];
