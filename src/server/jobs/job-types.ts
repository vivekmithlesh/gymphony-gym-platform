export interface MembershipReminderJobData {
  gymId: string;
  memberUserId: string;
  membershipId: string;
  memberName: string;
  phone: string;
  planName: string;
  daysUntilExpiry: number;
}

export interface NotificationJobData {
  gymId: string;
  text: string;
  type: string;
  color: string;
}
