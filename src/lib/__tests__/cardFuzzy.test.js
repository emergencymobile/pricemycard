// Regression tests for fuzzy card-search correction.
// Run with: node --experimental-vm-modules ... or via the app's test runner.
// Covers the "ronaldhino showboat" → Ronaldinho bug and similar edge cases.
import { findCorrections, buildCardReference, editDistance } from "@/lib/cardFuzzy";

const ref = buildCardReference([]); // roster + common terms only (no listings)

const results = [];
const assert = (cond, msg) => {
  results.push({ pass: !!cond, msg });
  if (!cond) throw new Error("FAIL: " + msg);
};

// 1) Distance sanity: "ronaldhino" is closer to "ronaldinho" than to "ronaldo".
assert(editDistance("ronaldhino", "ronaldinho") <= 2, "ronaldhino→ronaldinho within 2 edits");
assert(
  editDistance("ronaldhino", "ronaldinho") < editDistance("ronaldhino", "ronaldo"),
  "ronaldinho strictly closer than ronaldo"
);

// 2) Regression: multi-word typo must correct to Ronaldinho, not Ronaldo.
{
  const r = findCorrections("ronaldhino showboat", ref);
  assert(r.autoCorrect !== null, "'ronaldhino showboat' auto-corrects");
  assert(
    (r.autoCorrect || "").includes("ronaldinho"),
    `corrected term includes 'ronaldinho' (got: "${r.autoCorrect}")`
  );
  assert(
    !(r.autoCorrect || "").startsWith("ronaldo ") && !(r.autoCorrect || "").startsWith("cristiano"),
    `corrected term is not 'ronaldo ...' (got: "${r.autoCorrect}")`
  );
}

// 3) Generalization: other typo'd first names close to real names.
{
  const r = findCorrections("lional mesi", ref);
  assert(
    (r.autoCorrect || "").includes("lionel") && (r.autoCorrect || "").includes("messi"),
    `'lional mesi' → 'lionel messi' (got: "${r.autoCorrect}")`
  );
}
{
  const r = findCorrections("haland card", ref);
  assert(
    (r.autoCorrect || "").includes("haaland"),
    `'haland' → 'haaland' (got: "${r.autoCorrect}")`
  );
}
{
  const r = findCorrections("mbape rookie", ref);
  assert(
    (r.autoCorrect || "").includes("mbappe"),
    `'mbape' → 'mbappe' (got: "${r.autoCorrect}")`
  );
}

// 3b) Regression: set-name typo "messi magoc memories" → "messi magic memories".
//     "Magic" must exist in the reference (via "Magic Memories") so the 1-edit
//     typo "magoc" corrects; "memories" is also a known word so it isn't
//     corrupted. The corrected query must match exactly.
{
  const r = findCorrections("messi magoc memories", ref);
  assert(
    r.autoCorrect === "messi magic memories",
    `'messi magoc memories' → 'messi magic memories' (got: "${r.autoCorrect}")`
  );
}

// 4) Ambiguous input between two similar real names → "Did you mean", not a guess.
{
  const r = findCorrections("ronaldin", ref);
  const opts = (r.suggestions || []).map((s) => s.toLowerCase());
  assert(r.autoCorrect === null, "ambiguous 'ronaldin' is not auto-corrected");
  assert(
    opts.includes("ronaldinho") && opts.includes("ronaldo"),
    `offers both ronaldinho and ronaldo (got: ${JSON.stringify(r.suggestions)})`
  );
}

// 5) No reasonably close match → no forced correction.
{
  const r = findCorrections("zzzzzz qqqqqq", ref);
  assert(
    r.autoCorrect === null && (r.suggestions || []).length === 0,
    "gibberish → no correction (falls back to empty state)"
  );
}

export default results;
export { assert };