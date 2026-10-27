import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import LegalSection from "@/components/legal/LegalSection";

// Placeholder fields: replace bracketed values with your real business
// details before relying on this document. [COMPANY NAME], [CONTACT EMAIL].
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-6 h-6 text-emerald-500" />
        <h1 className="font-display font-bold text-3xl">Privacy Policy</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Last updated: July 27, 2026</p>

      <LegalSection title="1. Overview">
        <p>
          This Privacy Policy explains what information Pricemycard (operated
          by [COMPANY NAME]) collects about users of the app, how it is used,
          and the choices you have. By using the app, you consent to the
          practices described here. See also our{" "}
          <Link to="/terms" className="text-emerald-400 hover:underline">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Data We Collect">
        <p>
          <strong>Account data:</strong> If you create an account, we store the
          email address and display name you provide, and any listings,
          favorites, messages, or orders you create within the app.
        </p>
        <p>
          <strong>Usage & analytics:</strong> We may collect anonymous or
          pseudonymous analytics events (such as which features are used) to
          improve the app. This may include approximate IP address and device
          type.
        </p>
        <p>
          <strong>Cookies & local storage:</strong> We use browser local storage
          to remember your preferences (such as selected currency) and your
          acceptance of these terms. We do not use cookies for third-party
          advertising tracking.
        </p>
      </LegalSection>

      <LegalSection title="3. eBay Data">
        <p>
          Pricemycard queries eBay&apos;s public APIs to surface listing
          links and pricing. <strong>We do not store eBay user account data.</strong>
          Listing information shown in the app is fetched on demand from eBay
          and is not retained in our database beyond what is needed to display
          it to you.
        </p>
      </LegalSection>

      <LegalSection title="4. Sharing With Third Parties">
        <p>
          <strong>eBay:</strong> When you search for a card, your search term is
          sent to the eBay API to retrieve matching listings. eBay&apos;s own
          privacy policy governs any data it collects through that process.
        </p>
        <p>
          <strong>Analytics providers:</strong> If enabled, aggregated usage
          data may be shared with analytics providers. We do not sell your
          personal data to third parties.
        </p>
      </LegalSection>

      <LegalSection title="5. Data Retention & Your Rights">
        <p>
          Your account data is retained for as long as your account is active.
          You may request deletion of your account and associated personal data
          at any time by contacting us at{" "}
          <a
            href="mailto:[CONTACT EMAIL]"
            className="text-emerald-400 hover:underline"
          >
            [CONTACT EMAIL]
          </a>
          . We will respond to verified requests within a reasonable time and
          in accordance with applicable data-protection laws.
        </p>
      </LegalSection>

      <LegalSection title="6. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes
          will be reflected in the &quot;Last updated&quot; date above and, where
          appropriate, notified within the app.
        </p>
        <p className="pt-2 border-t border-border text-foreground/80">
          Questions about privacy? Contact us at{" "}
          <a
            href="mailto:[CONTACT EMAIL]"
            className="text-emerald-400 hover:underline"
          >
            [CONTACT EMAIL]
          </a>
          .
        </p>
      </LegalSection>
    </div>
  );
}