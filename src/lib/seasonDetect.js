// Detect the card season/year referenced in a listing title and group listings
// by season. Handles common formats: "2025/26", "2025-26", "2025-2026",
// "25-26", and lone years alongside a brand/set keyword ("2025 Topps").

const BRAND_RE =
  /\b(topps|panini|bowman|donruss|upper deck|score|fleer|leaf|prizm|chrome|select|mosaic|optic|finest|contenders|spectra|origins|chronicles|impeccable|flawless|national treasures|court kings|certified|illusions|hoops|premier|genesis|obsidian|tiffany|stadium club|heritage|update|series|mega|blaster|hobby|match attax|adrenalyn|refractor|rookie|card|set|auto|patch|serial|limited|gold|silver|box|pack)\b/i;

const to4Digit = (y) => (y >= 100 ? y : y < 50 ? 2000 + y : 1900 + y);

// Returns { startYear, label } or null when no confident season can be found.
export function detectSeason(title) {
  if (!title) return null;
  const t = title.toLowerCase();
  const hasBrand = BRAND_RE.test(t);

  // 1) Explicit consecutive-year range: "2025/26", "2025-26", "2025-2026", "25-26".
  //    The two parts must be consecutive years, so prices/quantities ("50-100",
  //    "1/2025") don't match. A 2-digit start needs a brand for confidence.
  const rangeRe = /(\d{2,4})\s*[-/]\s*(\d{2,4})/g;
  let m;
  while ((m = rangeRe.exec(t)) !== null) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const a4 = to4Digit(a);
    const b4 = to4Digit(b);
    if (b4 === a4 + 1 && (a >= 100 || hasBrand)) {
      const endShort = String(b4).slice(-2).padStart(2, "0");
      return { startYear: a4, label: `${a4}/${endShort}` };
    }
  }

  // 2) Lone 4-digit year next to a brand/set keyword: "2025 Topps", "Topps 2025".
  //    Skip years that are part of a serial number (preceded by / or a digit).
  if (hasBrand) {
    const yearRe = /(?<![/\d])(19[5-9]\d|20\d{2})\b/g;
    let ym;
    while ((ym = yearRe.exec(t)) !== null) {
      const y = parseInt(ym[1], 10);
      if (y >= 1995 && y <= 2099) return { startYear: y, label: `${y}` };
    }
  }

  return null;
}

// Group listings into season sections, most recent first; undetectable
// listings land in a trailing "Season Unknown" section. Within each section
// the original listing order (e.g. eBay relevance) is preserved.
export function groupBySeason(listings) {
  const groups = new Map(); // startYear -> { startYear, label, items }
  const unknown = [];

  for (const l of listings || []) {
    const s = detectSeason(l.title || "");
    if (!s) {
      unknown.push(l);
      continue;
    }
    if (!groups.has(s.startYear)) {
      groups.set(s.startYear, { startYear: s.startYear, label: s.label, items: [] });
    }
    const g = groups.get(s.startYear);
    g.items.push(l);
    // Prefer a range-style label ("2025/26") over a plain year ("2025") if
    // any listing in this season provided one.
    if (s.label.includes("/")) g.label = s.label;
  }

  const sections = Array.from(groups.values()).sort((a, b) => b.startYear - a.startYear);
  if (unknown.length) {
    sections.push({ startYear: null, label: "Season Unknown", items: unknown });
  }
  return sections;
}