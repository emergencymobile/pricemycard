import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Shown briefly while we bounce an unauthenticated visitor to the platform
// login page. After login they return to the page they tried to reach.
export default function LoginRedirect() {
  useEffect(() => {
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
}