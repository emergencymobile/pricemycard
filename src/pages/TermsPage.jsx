import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import LegalSection from "@/components/legal/LegalSection";

// Placeholder fields: replace the bracketed values with your real business
// details before relying on this document. [COMPANY NAME], [JURISDICTION],
// [CONTACT EMAIL], [MINIMUM AGE].
export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-6 h-6 text-emerald-500" />
        <h1 className="font-display font-bold text-3xl">Terms &amp; Conditions</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">Last updated: July 27, 2026</p>

      <LegalSection title="1. Nature of the Service">
        <p>
          Pricemycard is a research and reference tool that surfaces publicly
          available eBay listing links and estimated pricing information for
          soccer trading cards. Pricemycard is <strong>not a marketplace</strong>.
          It does not process payments, facilitate transactions between buyers
          and sellers, or hold inventory. It is not affiliated with, endorsed
          by, or sponsored by eBay Inc.
        </p>
        <p>
          The app is operated by [COMPANY NAME]. By using the app, you agree to
          be bound by these Terms &amp; Conditions and our{" "}
          <Link to="/privacy" className="text-emerald-400 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. No Guarantee of Accuracy">
        <p>
          Pricing and value estimates shown in the app are derived from
          <em> active eBay listing data</em> (current asking prices), not from
          confirmed or completed sales. Asking prices may differ significantly
          from actual sale prices and may not reflect the true market value of
          any card.
        </p>
        <p>
          All information is provided for general reference only, without any
          guarantee of accuracy, completeness, or timeliness. You assume all
          risk when relying on this information to buy, sell, trade, or value
          cards. [COMPANY NAME] is not responsible for financial decisions you
          make based on data shown in the app.
        </p>
      </LegalSection>

      <LegalSection title="3. Third-Party Links & External Sites">
        <p>
          Clicking a listing link takes you to eBay&apos;s website, which is
          operated by eBay Inc. and is governed by eBay&apos;s own Terms of
          Use, Privacy Policy, and buyer/seller protection programs. Kickoff
          Cards has no control over content, pricing, or transactions on
          eBay and is not responsible for any dispute, loss, or damage arising
          from transactions conducted there.
        </p>
        <p>
          Any purchase you make on eBay is a contract between you and the eBay
          seller, not between you and Pricemycard.
        </p>
      </LegalSection>

      <LegalSection title="4. Affiliate Disclosure">
        <p>
          Some links on this app may be affiliate links provided through the
          eBay Partner Network. If you purchase an item through one of these
          links, [COMPANY NAME] may earn a small commission at no additional
          cost to you.
        </p>
        <p>
          This disclosure is provided in accordance with applicable Federal
          Trade Commission (FTC) guidelines and similar requirements in other
          jurisdictions. Affiliate relationships do not influence which
          listings are shown or the estimated pricing presented.
        </p>
      </LegalSection>

      <LegalSection title="5. Age Restriction">
        <p>
          You must be at least [MINIMUM AGE] years of age to use this app.
          [MINIMUM AGE — confirm the correct threshold for your jurisdiction
          with legal counsel; commonly 13+ or 16+.] By using the app, you
          confirm that you meet this requirement and are legally able to enter
          into this agreement.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitation of Liability">
        <p>
          The app is provided &quot;as is&quot; and &quot;as available,&quot;
          without warranties of any kind, whether express or implied, including
          implied warranties of merchantability, fitness for a particular
          purpose, or non-infringement.
        </p>
        <p>
          To the maximum extent permitted by law, [COMPANY NAME] and its
          operators shall not be liable for any direct, indirect, incidental,
          consequential, or financial losses resulting from your use of, or
          reliance on, the app — including trading decisions made based on
          pricing or value estimates shown in the app.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes to These Terms">
        <p>
          [COMPANY NAME] reserves the right to update or modify these Terms
          &amp; Conditions at any time. When material changes are made, the
          &quot;Last updated&quot; date above will be revised and, where
          appropriate, users will be notified within the app. Continued use of
          the app after changes take effect constitutes acceptance of the
          updated terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Governing Law & Jurisdiction">
        <p>
          These Terms &amp; Conditions are governed by and construed in
          accordance with the laws of [JURISDICTION], without regard to
          conflict-of-law principles. Any disputes arising from your use of
          the app shall be subject to the exclusive jurisdiction of the courts
          of [JURISDICTION].
        </p>
        <p className="pt-2 border-t border-border text-foreground/80">
          Questions about these terms? Contact us at{" "}
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