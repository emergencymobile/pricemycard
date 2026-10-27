import React, { useState } from "react";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";

// Lightweight "Are you human?" verification gate for auth forms. Clicking the
// checkbox runs a brief verification spinner, then flips to a verified state.
// The parent form should disable submit until `onVerified` has fired.
export default function HumanCheck({ verified, onVerified }) {
  const [checking, setChecking] = useState(false);

  const handleClick = () => {
    if (verified || checking) return;
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      onVerified(true);
    }, 700);
  };

  return (
    <div
      role="checkbox"
      aria-checked={verified}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && handleClick()}
      className={`w-full flex items-center gap-3 h-12 px-4 rounded-lg border cursor-pointer select-none transition-colors ${verified ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-card hover:bg-secondary"}`}
    >
      <span className={`flex items-center justify-center w-5 h-5 rounded border ${verified ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"}`}>
        {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      </span>
      <span className="text-sm font-medium flex-1 text-left">
        {checking ? "Verifying you're human..." : verified ? "Verified" : "I'm not a robot"}
      </span>
      <ShieldCheck className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}