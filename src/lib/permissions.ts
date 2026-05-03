import { supabase } from "@/supabase";

export type PlanType = 'Free' | 'Pro';

export const PRO_FEATURES = [
  'unlimited_members',
  'auto_reminders',
  'attendance_alerts',
  'advanced_analytics',
  'city_discovery',
  'public_profile',
  'whatsapp_support'
] as const;

export type FeatureName = typeof PRO_FEATURES[number];

/**
 * Checks if a user has access to a specific feature based on their plan
 */
export const hasAccess = (planType: string | undefined | null, feature: FeatureName | null): boolean => {
  if (!feature) return true;
  const normalizedPlan = (planType || 'Free').toLowerCase();
  
  // Pro users have access to everything
  if (normalizedPlan === 'pro') return true;
  
  // Free features (negation of PRO_FEATURES)
  // For clarity, we define what is NOT accessible on Free
  return !PRO_FEATURES.includes(feature as any);
};

/**
 * Common limits for Free plan
 */
export const LIMITS = {
  FREE_MEMBER_LIMIT: 100
};
