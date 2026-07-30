import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserRole } from "@/src/auth/types";
import { useAuthContext } from "@/src/auth/AuthProvider";
import { isRoleAllowed } from "@/src/permissions/permissions";
import SplashScreen from "@/src/components/SplashScreen";

export function ProtectedRoute({ allowedRoles }: { allowedRoles: readonly UserRole[] }) {
  const { user, profile, loading } = useAuthContext();
  const location = useLocation();

  if (loading) return <SplashScreen />;
  if (!user || !profile) return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  if (!isRoleAllowed(profile, allowedRoles)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
