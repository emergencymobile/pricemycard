// Tracks user acceptance of the Terms & Conditions / Privacy Policy.
// Acceptance is stored in localStorage keyed by a version string. When the
// terms content changes meaningfully, bump CURRENT_TERMS_VERSION — every
// returning user will be re-prompted to accept the updated terms.

export const CURRENT_TERMS_VERSION = "2026-07-27-v1";
export const TERMS_STORAGE_KEY = "kickoff_terms_acceptance";

export function getTermsAcceptance() {
  try {
    const raw = localStorage.getItem(TERMS_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data; // { version, acceptedAt }
  } catch {
    return null;
  }
}

export function setTermsAcceptance(version) {
  try {
    localStorage.setItem(
      TERMS_STORAGE_KEY,
      JSON.stringify({ version, acceptedAt: new Date().toISOString() })
    );
  } catch {
    // Storage may be unavailable (private mode); the gate will re-prompt
    // next visit, which is the safe fallback.
  }
}

export function isTermsAccepted() {
  const a = getTermsAcceptance();
  return !!a && a.version === CURRENT_TERMS_VERSION;
}