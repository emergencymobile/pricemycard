// A titled section used inside the Terms & Conditions and Privacy Policy
// pages so the two legal documents share consistent typography.
export default function LegalSection({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display font-semibold text-lg text-foreground mb-2">
        {title}
      </h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
        {children}
      </div>
    </section>
  );
}