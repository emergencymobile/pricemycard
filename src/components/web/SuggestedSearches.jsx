import React from "react";
import { Sparkles } from "lucide-react";

// Curated, high-signal soccer-card search starters. Picked to showcase the
// kinds of queries that return good results: star players, rookie cards,
// specific parallels, and set names. Tapping a chip runs that search.
const SUGGESTED = [
  "Topps",
  "Prizm",
  "Panini",
  "card",
  "rookie",
  "Chrome",
  "Select",
  "Donruss"
];

export default function SuggestedSearches({ onSelect }) {
  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested Searches</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="px-3 py-1.5 rounded-full bg-emerald-600/10 border border-emerald-500/25 text-sm text-emerald-300 hover:bg-emerald-600/20 hover:border-emerald-500/40 transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}