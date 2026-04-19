/** User role constants used across the backend. */
export const USER_ROLES = {
  OWNER: "OWNER",
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
  STAFF: "STAFF",
} as const;

/** User role string union derived from USER_ROLES. */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
