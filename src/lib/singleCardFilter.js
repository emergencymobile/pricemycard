// Detects multi-card listings (lots, bundles, sets, "x2", bulk, etc.) so they
// can be excluded from the card market search before any grouping, value, or
// outlier logic runs.
//
// This is a base data-quality fix, not a toggleable filter: it should always
// apply. Detection is title-based. eBay's `quantity` field is intentionally
// NOT used — it represents how many copies the seller has in stock (units
// available), not the number of cards in the listing, so it would wrongly
// drop single-card listings sold from multi-stock listings.
//
// Design goal: never flag a single-card listing. Serial-numbered cards
// ("1/99", "(5/5)"), card numbers ("#23"), and parallels ("X-Fractor") must
// all be kept. "collection" is deliberately NOT a trigger because it is a
// common soccer-card set/brand name (e.g. "Adrenalyn XL Collection",
// "Match Attax Collection") and would wrongly exclude single cards.

// Bare keyword signals — words that almost always mean more than one card.
const MULTI_CARD_RE = /\b(lots?|bundles?|bulk|multiple)\b/i;

// "lot of 3", "set of 12" — explicit count phrasing.
const LOT_OF_RE = /lot of \d+/i;
const SET_OF_RE = /set of \d+/i;

// "(2)", "(3)" — a small count in parentheses. Only single digits 2–9, so a
// card number like "(23)" or a serial "(5/5)" is not matched.
const COUNT_PARENS_RE = /\([2-9]\)/;

// "2x", "x2", "10x", "x10" — multiplier forms for count >= 2. "x1"/"1x" (a
// single copy) and serial-style "/99" are not matched. Counts >= 10 are
// written as "1" followed by more digits, so both branches are needed.
const MULTIPLIER_RE = /\b(?:[2-9]\d*|1\d+)\s*x\b|\bx\s*(?:[2-9]\d*|1\d+)\b/i;

// "2 cards", "10 card" — explicit card count for count >= 2.
const N_CARDS_RE = /\b(?:[2-9]\d*|1\d+)\s+cards?\b/i;

// "pack of 3", "box of 12", "blaster of 5" — unopened multi-card products.
const PACK_OF_RE = /(packs?|boxes?|blaster|hanger|tins?)\s+of\s+\d+/i;

export const isMultiCardListing = (listing) => {
  const title = listing && listing.title ? String(listing.title) : "";
  if (!title.trim()) return false;
  return (
    MULTI_CARD_RE.test(title) ||
    LOT_OF_RE.test(title) ||
    SET_OF_RE.test(title) ||
    COUNT_PARENS_RE.test(title) ||
    MULTIPLIER_RE.test(title) ||
    N_CARDS_RE.test(title) ||
    PACK_OF_RE.test(title)
  );
};

// Convenience: keeps only single-card listings (drops the multi-card ones).
export const filterSingleCardListings = (listings) =>
  (listings || []).filter((l) => !isMultiCardListing(l));