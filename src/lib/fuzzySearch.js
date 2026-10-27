export function normalize(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Levenshtein edit distance — O(m*n) DP, fast for short strings (names/titles).
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
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[m];
}

// Max allowed edit distance for fuzzy (typo) matching — roughly 1/3 of query length.
function fuzzyThreshold(qLen) {
  return Math.max(1, Math.floor(qLen * 0.34));
}

// Returns: 3 = exact prefix, 2 = a word starts with query, 1 = contains,
//          0.5 = fuzzy close match (typo-tolerant), 0 = no match
export function textMatch(query, target) {
  const q = normalize(query);
  const t = normalize(target);
  if (!q || !t) return 0;
  if (t.startsWith(q)) return 3;
  const words = t.split(/\s+/);
  for (const w of words) {
    if (w.startsWith(q)) return 2;
  }
  if (t.includes(q)) return 1;
  // Fuzzy: any word within edit-distance threshold of the query
  const maxDist = fuzzyThreshold(q.length);
  for (const w of words) {
    if (Math.abs(w.length - q.length) > maxDist) continue;
    if (levenshtein(q, w) <= maxDist) return 0.5;
  }
  return 0;
}

export function searchAll(query, index) {
  const q = normalize(query);
  if (!q) return [];
  return index
    .map(item => ({ ...item, score: textMatch(q, item.name) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.popularity || 0) - (a.popularity || 0);
    })
    .slice(0, 10);
}

// Build highlight parts for a literal substring match (all occurrences).
function buildLiteralParts(text, normText, normQuery) {
  const parts = [];
  let lastIndex = 0;
  let idx = normText.indexOf(normQuery);
  while (idx !== -1) {
    if (idx > lastIndex) parts.push({ text: text.slice(lastIndex, idx), hl: false });
    parts.push({ text: text.slice(idx, idx + normQuery.length), hl: true });
    lastIndex = idx + normQuery.length;
    idx = normText.indexOf(normQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), hl: false });
  return parts;
}

// Returns highlight parts for `text` given `query`:
//  1. Literal substring → highlight all occurrences (exact-match path)
//  2. No literal match but a word is fuzzy-close → highlight that whole word
//  3. No match at all → no highlight
export function fuzzyHighlightParts(text, query) {
  if (!query || !text) return [{ text, hl: false }];
  const normText = normalize(text);
  const normQuery = normalize(query);
  if (!normQuery || !normText) return [{ text, hl: false }];

  if (normText.includes(normQuery)) {
    return buildLiteralParts(text, normText, normQuery);
  }

  // Collect words with their start offsets in the normalized text
  const words = [];
  let pos = 0;
  for (const token of normText.split(/(\s+)/)) {
    if (token.trim()) words.push({ start: pos, text: token });
    pos += token.length;
  }

  let bestWord = null;
  let bestDist = Infinity;
  const maxDist = fuzzyThreshold(normQuery.length);
  for (const word of words) {
    if (Math.abs(word.text.length - normQuery.length) > maxDist) continue;
    const dist = levenshtein(normQuery, word.text);
    if (dist < bestDist) {
      bestDist = dist;
      bestWord = word;
    }
  }

  if (bestWord && bestDist <= maxDist) {
    const end = bestWord.start + bestWord.text.length;
    const parts = [];
    if (bestWord.start > 0) parts.push({ text: text.slice(0, bestWord.start), hl: false });
    parts.push({ text: text.slice(bestWord.start, end), hl: true });
    if (end < text.length) parts.push({ text: text.slice(end), hl: false });
    return parts;
  }

  return [{ text, hl: false }];
}