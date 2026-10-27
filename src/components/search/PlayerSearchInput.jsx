import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { searchAll } from "@/lib/fuzzySearch";
import { HighlightText } from "@/components/search/HighlightText";
import { maskName } from "@/lib/maskName";

// Reusable player-name autocomplete built on the same fuzzy index used by the
// internal search (active listings), so suggestions stay consistent.
export default function PlayerSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Type a player name, e.g. Lamine Yamal",
  className = "",
}) {
  const [index, setIndex] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [hl, setHl] = useState(-1);
  const ref = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    base44.entities.Listing.filter({ status: "active" }, "-created_date", 200)
      .then((listings) => {
        const map = {};
        listings.forEach((l) => {
          if (!l.player_name) return;
          if (!map[l.player_name]) {
            map[l.player_name] = { type: "player", name: l.player_name, team: l.team, popularity: 0 };
          }
          map[l.player_name].popularity++;
        });
        setIndex(Object.values(map));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = value.trim();
    if (!q) { setSuggestions([]); setShow(false); return; }
    debounce.current = setTimeout(() => {
      setSuggestions(searchAll(q, index).filter((s) => s.type === "player"));
      setShow(true);
      setHl(-1);
    }, 80);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [value, index]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (item) => {
    setShow(false);
    onChange(item.name);
    onSelect?.(item.name);
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHl((i) => Math.min(suggestions.length, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHl((i) => Math.max(-1, i - 1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hl >= 0 && hl < suggestions.length) pick(suggestions[hl]);
      else if (value.trim()) { setShow(false); onSelect?.(value.trim()); }
    } else if (e.key === "Escape") { setShow(false); }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => value.trim() && setShow(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-secondary rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        {value && (
          <button onClick={() => { onChange(""); setSuggestions([]); setShow(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {show && value.trim() && (
        <div className="absolute top-full mt-2 w-full bg-card rounded-xl shadow-2xl border border-border overflow-hidden z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Loading…</div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No players in our catalog — press Search to look across the web.
            </div>
          ) : (
            suggestions.map((item, i) => (
              <button
                key={item.name}
                onClick={() => pick(item)}
                onMouseEnter={() => setHl(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === hl ? "bg-emerald-500/20" : "hover:bg-secondary"}`}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {item.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    <HighlightText text={maskName(item.name)} query={value} />
                  </p>
                  {item.team && (
                    <p className="text-xs text-muted-foreground truncate">
                      <HighlightText text={maskName(item.team)} query={value} />
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}