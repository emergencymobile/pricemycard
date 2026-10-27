// Centralized currency formatting for the marketplace. All prices are shown
// in AED (UAE Dirham) so the currency is consistent across every page.
export function formatAED(amount) {
  const n = Number(amount || 0);
  return `AED ${n.toLocaleString()}`;
}

// External listings are sold in many currencies. We keep the original price
// for transparency and convert to AED for the value estimate. USD->AED is
// pegged (~3.6725); other currencies arrive already converted to USD by the LLM.
export const USD_TO_AED = 3.6725;

export function toAED(usd) {
  return Math.round((Number(usd) || 0) * USD_TO_AED);
}

export function formatOriginal(amount, currency) {
  const code = (currency || "USD").toUpperCase();
  const n = Number(amount || 0);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${code}`;
}