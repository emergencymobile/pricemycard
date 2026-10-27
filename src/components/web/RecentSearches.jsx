import React, { useState, useEffect } from "react";
import { Clock, X } from "lucide-react";

const STORAGE_KEY = "pmc_recent_searches";
const MAX_RECENT = 8;

export function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(term) {
  const trimmed = (term || "").trim();
  if (!trimmed) return [];
  const existing = loadRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

export function clearRecentSearches() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  return [];
}

export default function RecentSearches({ onSelect }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(loadRecentSearches());
  }, []);

  if (items.length === 0) return null;

  const handleClear = () => setItems(clearRecentSearches());

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Searches</span>
        <button
          type="button"
          onClick={handleClear}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="px-3 py-1.5 rounded-full bg-secondary border border-border text-sm text-foreground hover:bg-emerald-600/15 hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}