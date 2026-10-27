import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Checks whether the current user has an active Premium Search subscription.
// Returns { isPremium, loading }. Non-logged-in users are never premium.
export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const authed = await base44.auth.isAuthenticated().catch(() => false);
        if (!authed) {
          if (alive) { setIsPremium(false); setLoading(false); }
          return;
        }
        const subs = await base44.entities.PremiumSubscription.list("-created_date", 5);
        const hasActive = (subs || []).some(s => s.status === "active" || s.status === "trialing");
        if (alive) { setIsPremium(hasActive); setLoading(false); }
      } catch {
        if (alive) { setIsPremium(false); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, []);

  return { isPremium, loading };
}

// Initiates the Stripe Checkout flow for the Premium Search subscription.
// Blocks inside iframes (preview), requires login, then redirects to Stripe.
export async function startPremiumCheckout() {
  if (window.self !== window.top) {
    alert("Checkout works only from the published app. Open the app in a new tab to subscribe.");
    return;
  }
  const authed = await base44.auth.isAuthenticated().catch(() => false);
  if (!authed) {
    base44.auth.redirectToLogin(window.location.href);
    return;
  }
  try {
    const res = await base44.functions.invoke("createPremiumCheckout", {
      origin: window.location.origin,
    });
    if (res.data?.url) window.location.href = res.data.url;
  } catch (err) {
    alert("Could not start checkout. Please try again.");
  }
}