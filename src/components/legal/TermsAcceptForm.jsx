import { useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

// The checkbox + Continue block shown inside the TermsGate modal. "Continue"
// stays disabled until the user ticks the agreement checkbox. The Terms and
// Privacy links open in a new tab so the user can read them without losing
// the gate.
export default function TermsAcceptForm({ onContinue }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div>
      <label
        htmlFor="terms-agree"
        className="flex items-start gap-3 cursor-pointer mb-5 select-none"
      >
        <Checkbox
          id="terms-agree"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <span className="text-sm leading-relaxed text-muted-foreground">
          I have read and agree to the{" "}
          <Link
            to="/terms"
            target="_blank"
            className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
          >
            Terms &amp; Conditions{" "}
            <ExternalLink className="w-3 h-3" />
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            target="_blank"
            className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
          >
            Privacy Policy{" "}
            <ExternalLink className="w-3 h-3" />
          </Link>
          .
        </span>
      </label>

      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={!agreed}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}