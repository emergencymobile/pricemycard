// Word Search puzzle generator.
// Input:  array of keyword strings (may contain spaces / punctuation).
// Output: { grid, gridSize, placedWords, unplacedWords }
//
// Pure, side-effect-free — call it whenever the keyword list changes.

const A_CODE = 65; // "A"
const Z_CODE = 90; // "Z"

// 8 placement directions: name + row/col delta.
const DIRECTIONS = [
  { name: "horizontal", dr: 0, dc: 1 },
  { name: "horizontal-reverse", dr: 0, dc: -1 },
  { name: "vertical", dr: 1, dc: 0 },
  { name: "vertical-reverse", dr: -1, dc: 0 },
  { name: "diagonal-down-right", dr: 1, dc: 1 },
  { name: "diagonal-down-left", dr: 1, dc: -1 },
  { name: "diagonal-up-right", dr: -1, dc: 1 },
  { name: "diagonal-up-left", dr: -1, dc: -1 },
];

// "New York!" -> "NEWYORK" (spaces/punctuation stripped, uppercased).
const cleanWord = (phrase) =>
  String(phrase ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const randomInt = (max) => Math.floor(Math.random() * max);

// Auto-scale the grid: big enough for the longest word, with headroom that
// grows with word count so placement has room to succeed.
function pickGridSize(words) {
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  const count = words.length;
  let size = Math.max(longest + 2, 8);
  size = Math.max(size, Math.ceil(Math.sqrt(count * longest)) + 2);
  return Math.min(size, 40); // sane upper bound
}

// Can the word land here? Only if every cell is empty OR already holds the
// matching letter (shared-letter overlaps are allowed).
function canPlace(grid, size, word, row, col, dir) {
  const endRow = row + dir.dr * (word.length - 1);
  const endCol = col + dir.dc * (word.length - 1);
  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return false;
  for (let i = 0; i < word.length; i++) {
    const r = row + dir.dr * i;
    const c = col + dir.dc * i;
    const existing = grid[r][c];
    if (existing !== "" && existing !== word[i]) return false;
  }
  return true;
}

function place(grid, word, row, col, dir) {
  for (let i = 0; i < word.length; i++) {
    grid[row + dir.dr * i][col + dir.dc * i] = word[i];
  }
}

function fillEmpty(grid, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = String.fromCharCode(A_CODE + randomInt(26));
      }
    }
  }
}

/**
 * Generate a word-search puzzle from a list of keywords.
 * @param {string[]} keywords - phrases/words to hide in the grid
 * @param {object} [options]
 * @param {number} [options.maxAttemptsPerWord=100] - placement attempts before giving up on a word
 * @param {number} [options.maxGridSize=40] - hard cap on grid dimension
 * @returns {{grid: string[][], gridSize: number, placedWords: object[], unplacedWords: string[]}}
 */
export function generateWordSearch(keywords, options = {}) {
  const maxAttemptsPerWord = options.maxAttemptsPerWord ?? 100;
  const maxGridSize = options.maxGridSize ?? 40;

  // Normalize: keep the original phrase for the clue key, strip to letters
  // for placement. Drop anything that cleans to nothing (e.g. "!!!").
  const items = (Array.isArray(keywords) ? keywords : [])
    .map((k) => ({ original: String(k ?? ""), cleaned: cleanWord(k) }))
    .filter((it) => it.cleaned.length > 0);

  const cleanedWords = items.map((it) => it.cleaned);
  const size = Math.min(pickGridSize(cleanedWords), maxGridSize);

  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const placedWords = [];
  const unplacedWords = [];

  // Place longest words first — they're the hardest to fit later.
  const ordered = items
    .map((it, idx) => ({ ...it, idx }))
    .sort((a, b) => b.cleaned.length - a.cleaned.length || a.idx - b.idx);

  for (const { original, cleaned } of ordered) {
    let placed = false;
    for (let attempt = 0; attempt < maxAttemptsPerWord && !placed; attempt++) {
      const dir = DIRECTIONS[randomInt(DIRECTIONS.length)];
      const row = randomInt(size);
      const col = randomInt(size);
      if (canPlace(grid, size, cleaned, row, col, dir)) {
        place(grid, cleaned, row, col, dir);
        placedWords.push({
          word: cleaned,
          original,
          startRow: row,
          startCol: col,
          direction: dir.name,
          length: cleaned.length,
        });
        placed = true;
      }
    }
    if (!placed) unplacedWords.push(original);
  }

  fillEmpty(grid, size);

  return { grid, gridSize: size, placedWords, unplacedWords };
}