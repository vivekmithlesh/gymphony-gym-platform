// =============================================================================
// AdminRoute — guard for platform-admin-only screens (the /admin dashboard).
// Mirrors ProtectedRoute, but gates on useAuth().isPlatformAdmin. A signed-in
// non-admin is bounced to their own dashboard; a logged-out user to /login.
// =============================================================================

import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPathForRole } from "@/lib/auth-role";
import { PremiumLoader } from "@/components/PremiumLoader";

export function AdminRoute({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { session, role, isPlatformAdmin, isLoading, roleResolved } = useAuth();

  useEffect(() => {
    if (isLoading || !roleResolved) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
    } else if (!isPlatformAdmin) {
      navigate({ to: getDashboardPathForRole(role ?? "owner"), replace: true });
    }
  }, [isLoading, roleResolved, session, isPlatformAdmin, role, navigate]);

  if (isLoading || !roleResolved || !session || !isPlatformAdmin) {
    return <PremiumLoader title="Checking access" subtext="One moment…" />;
  }

  return <>{children}</>;
}

export default AdminRoute;
