import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import {
  CURRENT_TERMS_VERSION,
  isTermsAccepted,
  setTermsAcceptance,
} from "@/lib/termsVersion";
import TermsAcceptForm from "@/components/legal/TermsAcceptForm";

// Routes the user is allowed to view WITHOUT having accepted the terms — the
// legal documents themselves, so they can read them before agreeing.
const EXEMPT_PATHS = ["/terms", "/privacy"];

// Blocks interaction with the rest of the app until the visitor accepts the
// current version of the Terms & Conditions / Privacy Policy. Acceptance is
// remembered in localStorage (see termsVersion.js); returning users who
// already accepted this version are not re-prompted.
export default function TermsGate({ children }) {
  const location = useLocation();
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    setAccepted(isTermsAccepted());
    // Re-check if acceptance changes in another tab.
    const handler = () => setAccepted(isTermsAccepted());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const exempt = EXEMPT_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  if (accepted || exempt) return children;

  const handleContinue = () => {
    setTermsAcceptance(CURRENT_TERMS_VERSION);
    setAccepted(true);
  };

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h2 className="font-display font-bold text-xl">Before you continue</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Kickoff Cards is a research/reference tool that surfaces publicly
            available eBay listing links and estimated pricing. Please review
            and accept our terms before using the app.
          </p>
          <TermsAcceptForm onContinue={handleContinue} />
        </div>
      </div>
    </>
  );
}