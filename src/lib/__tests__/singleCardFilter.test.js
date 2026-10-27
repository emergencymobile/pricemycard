// Regression tests for the multi-card listing filter.
// Run with: node --experimental-vm-modules ... or via the app's test runner.
// Verifies multi-card titles are excluded while single-card titles (card
// numbers, serial numbers, parallels) are kept.
import { isMultiCardListing, filterSingleCardListings } from "@/lib/singleCardFilter";

const results = [];
const assert = (cond, msg) => {
  results.push({ pass: !!cond, msg });
  if (!cond) throw new Error("FAIL: " + msg);
};

const isMulti = (title) => isMultiCardListing({ title });
const isSingle = (title) => !isMultiCardListing({ title });

// --- Multi-card listings must be flagged as multi-card (excluded) ---
assert(isMulti("Messi Magic Memories Lot of 3"), "'Lot of 3' excluded");
assert(isMulti("Ronaldinho Refractor x2 Bundle"), "'x2 Bundle' excluded");
assert(isMulti("Lionel Messi Playoff Lot"), "'Playoff Lot' excluded");
assert(isMulti("Haaland Bundle of 5 cards"), "'Bundle of 5 cards' excluded");
assert(isMulti("Mbappe Rookie Bulk x10"), "'Bulk x10' excluded");
assert(isMulti("Topps Chrome Set of 12"), "'Set of 12' excluded");
assert(isMulti("Vini Jr (2) PSA 9"), "'(2)' excluded");
assert(isMulti("Bellingham x3 Prizm"), "'x3' excluded");
assert(isMulti("2x Messi Refractor"), "'2x' excluded");
assert(isMulti("Pack of 3 Chrome cards"), "'Pack of 3' excluded");
assert(isMulti("Multiple players lot"), "'Multiple ... lot' excluded");
assert(isMulti("x10 Mbappe rookies"), "'x10' (multi-digit) excluded");
assert(isMulti("20x Haaland Prizm"), "'20x' (multi-digit) excluded");

// --- Single-card listings must NOT be flagged (kept) ---
assert(isSingle("2022 Topps Chrome Messi #23 Refractor"), "card number '#23' kept");
assert(isSingle("Messi 1/99 Refractor PSA 10"), "serial '1/99' kept");
assert(isSingle("Haaland Rookie #1/1 Superfractor"), "serial '1/1' kept");
assert(isSingle("Vini Jr Refractor (5/5) PSA 10"), "serial '(5/5)' kept");
assert(isSingle("2023 Topps Chrome Erling Haaland #45"), "card number '#45' kept");
assert(isSingle("Ronaldinho Topps Chrome X-Fractor /99"), "'X-Fractor' kept (x not a multiplier)");
assert(isSingle("Mbappe PSA 10 Base Card"), "single base card kept");
assert(isSingle("Adrenalyn XL 2024 Collection Messi #123"), "Adrenalyn 'Collection' single card kept");
assert(isSingle("Match Attax 2023/24 Haaland #56"), "Match Attax single card kept");

// --- filterSingleCardListings drops multi, keeps single, preserves order ---
const filtered = filterSingleCardListings([
  { title: "Messi Lot of 3" },
  { title: "Haaland #23" },
  { title: "Bundle x2" },
  { title: "Vini PSA 10" },
]);
assert(filtered.length === 2, `filter keeps 2 of 4 (got ${filtered.length})`);
assert(filtered[0].title === "Haaland #23", "first kept is 'Haaland #23'");
assert(filtered[1].title === "Vini PSA 10", "second kept is 'Vini PSA 10'");

// --- Empty / missing titles are not flagged as multi-card ---
assert(!isMultiCardListing({ title: "" }), "empty title not flagged");
assert(!isMultiCardListing({}), "missing title not flagged");

export default results;
export { assert };