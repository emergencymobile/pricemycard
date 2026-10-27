// Typo-tolerance for card web searches.
// Builds a reference list of known terms (player names, set names, and common
// card keywords) and uses a small Levenshtein distance to suggest corrections
// when a search returns few/no results.

const normalize = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

// Max allowed edit distance scales with the shorter string's length, so short
// terms allow 1 edit and longer ones allow proportionally more.
// Max 2 edits for corrections: close enough to catch real typos/transpositions,
// but not so loose that it "corrects" to a different, only vaguely similar name.
const threshold = (len) => Math.max(1, Math.min(2, Math.floor(len * 0.34)));

export function editDistance(a, b) {
  return levenshtein(normalize(a), normalize(b));
}

export const COMMON_CARD_TERMS = [
  "prizm", "chrome", "optic", "select", "mosaic", "donruss", "topps", "panini",
  "bowman", "finest", "contenders", "spectra", "origins", "chronicles",
  "impeccable", "flawless", "national treasures", "court kings", "certified",
  "illusions", "hoops", "clearly authentic", "rookie card", "rookie",
  "autograph", "auto", "patch", "refractor", "refractors", "hobby box",
  "mega box", "blaster", "tiffany", "update series", "trading cards",
  "premier", "genesis", "obsidian", "twilight", "status", "reboot",
];

// Set & insert names (Magic Memories, Downtown, etc.) so typo'd set names are
// correctable too — not just players and teams. Each is split into its words
// when building the reference, so "magic memories" makes both "magic" and
// "memories" known (preventing a correct word like "memories" from being
// corrupted while a typo like "magoc" corrects to "magic").
export const SET_INSERT_NAMES = [
  "magic memories", "downtown", "high voltage", "instant impact", "instant",
  "phenoms", "sensations", "stellar", "galaxy", "cosmos", "eclipse", "zenith",
  "apex", "prime", "relic", "novel", "national pride", "hometown heroes",
  "vibrance", "aura", "domination", "superfractor", "short print", "mojo",
  "base", "gold", "silver", "jumbo", "hanger", "retail", "fat pack", "cello",
];

// Build the reference term list from the app's own listings + common terms.
// Curated roster of well-known footballers so common legends (Ronaldinho,
// Ronaldo Nazário, etc.) are correctable even when the app's own listings
// don't include them. Ranking stays pure edit-distance — this only expands
// what's known, it does not bias toward popular names.
export const PLAYERS_ROSTER = [
  "Lionel Messi", "Cristiano Ronaldo", "Ronaldinho", "Ronaldo", "Romário",
  "Rivaldo", "Kaká", "Roberto Carlos", "Cafu", "Pelé", "Maradona", "Neymar",
  "Vinícius Jr", "Rodrygo", "Endrick", "Mbappé", "Haaland", "Bellingham",
  "Saka", "Foden", "De Bruyne", "Salah", "Mané", "Firmino", "Lamine Yamal",
  "Lautaro Martínez", "Vlahovic", "Harry Kane", "Son Heung-min", "Richarlison",
  "Gabriel Jesus", "Bruno Fernandes", "Bernardo Silva", "João Félix",
  "Rúben Dias", "Declan Rice", "Ødegaard", "Musiala", "Wirtz", "Dembélé",
  "Griezmann", "Benzema", "Van Dijk", "Alexander-Arnold", "Darwin Núñez",
  "Luis Díaz", "Diogo Jota", "Donnarumma", "Kimmich", "Leroy Sané",
  "Kai Havertz", "Jack Grealish", "Cole Palmer", "Garnacho", "Casemiro",
  "Marcelo", "Dani Alves", "Marquinhos", "Thiago Silva", "Alisson", "Ederson",
  "Raphinha", "Lucas Paquetá", "Bruno Guimarães", "Eder Militão", "Antony",
  "Coutinho", "Fabinho", "Willian", "Hulk", "Pedro",
];

export function buildCardReference(listings) {
  const set = new Set();
  for (const l of listings || []) {
    if (l.player_name) set.add(normalize(l.player_name));
    if (l.card_set) set.add(normalize(l.card_set));
  }
  for (const t of COMMON_CARD_TERMS) set.add(normalize(t));
  for (const s of SET_INSERT_NAMES) set.add(normalize(s));
  for (const p of PLAYERS_ROSTER) set.add(normalize(p));
  return Array.from(set).filter(Boolean);
}

function buildWordSet(reference) {
  const set = new Set();
  for (const term of reference) {
    for (const w of normalize(term).split(/\s+/)) if (w) set.add(w);
  }
  return Array.from(set);
}

// Whole-string candidates: the entire query is close to a known full term
// (e.g. a full player name or set name).
function wholeStringCandidates(q, reference) {
  const out = [];
  for (const term of reference) {
    const t = normalize(term);
    if (!t || t === q) continue;
    const dist = levenshtein(q, t);
    const maxDist = threshold(Math.min(q.length, t.length));
    if (dist > 0 && dist <= maxDist) out.push({ term, dist });
  }
  return out;
}

// Token-level correction: replace misspelled words in a multi-word query with
// the closest known word (e.g. "lional mesi rooke" → "lionel messi rookie").
function correctTokens(q, reference) {
  const words = buildWordSet(reference);
  const tokens = q.split(/\s+/).filter(Boolean);
  let totalDist = 0;
  let changed = false;
  const out = tokens.map((tok) => {
    if (tok.length < 4 || words.includes(tok)) return tok; // skip tiny tokens
    const md = threshold(tok.length);
    let best = null;
    for (const w of words) {
      if (Math.abs(w.length - tok.length) > md) continue;
      const d = levenshtein(tok, w);
      if (d > 0 && d <= md && (!best || d < best.dist)) best = { w, dist: d };
    }
    if (best) { changed = true; totalDist += best.dist; return best.w; }
    return tok;
  });
  if (!changed) return null;
  return { term: out.join(" "), dist: totalDist };
}

// Decide whether to auto-correct (one clear best match) or surface 2–3
// "Did you mean" suggestions (multiple equally-likely matches).
export function findCorrections(query, reference) {
  const q = normalize(query);
  if (!q || !reference || !reference.length) return { autoCorrect: null, suggestions: [] };
  if (reference.includes(q)) return { autoCorrect: null, suggestions: [] };

  const map = new Map();
  const add = (term, dist) => {
    const prev = map.get(term);
    if (!prev || dist < prev.dist) map.set(term, { term, dist });
  };

  const tok = correctTokens(q, reference);
  if (tok) add(tok.term, tok.dist);
  for (const c of wholeStringCandidates(q, reference)) add(c.term, c.dist);

  const sorted = Array.from(map.values()).sort((a, b) => a.dist - b.dist);
  if (!sorted.length) return { autoCorrect: null, suggestions: [] };

  const best = sorted[0];
  const tied = sorted.filter((c) => c.dist === best.dist);
  if (tied.length >= 2) {
    return { autoCorrect: null, suggestions: tied.slice(0, 3).map((c) => c.term) };
  }
  return { autoCorrect: best.term, suggestions: [] };
}