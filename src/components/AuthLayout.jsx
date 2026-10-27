import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Mobile-only back button to exit the auth flow back to the marketplace */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to marketplace"
          className="md:hidden mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to marketplace
        </button>
        <div className="text-center mb-10">
          <Logo className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}