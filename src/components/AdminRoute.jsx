import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import LoginRedirect from "@/components/LoginRedirect";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

const Fallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

// Guards admin-only routes (e.g. /admin). Unauthenticated users are sent to
// login; authenticated non-admins are redirected home. Only users with the
// "admin" role reach the wrapped route, so no admin management UI is exposed
// to regular users — whether by direct URL, hidden link, or leftover nav.
export default function AdminRoute() {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) return <Fallback />;
  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    return <LoginRedirect />;
  }
  if (!isAuthenticated) return <LoginRedirect />;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}