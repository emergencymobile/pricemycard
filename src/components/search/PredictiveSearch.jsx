import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Package, Layers, Trophy, Building2, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { searchAll } from "@/lib/fuzzySearch";
import { HighlightText } from "@/components/search/HighlightText";
import { maskName } from "@/lib/maskName";

const TEAM_COLORS = ["#16a34a", "#2563eb", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#db2777", "#ca8a04"];

function teamColor(team) {
  if (!team) return TEAM_COLORS[0];
  let hash = 0;
  for (let i = 0; i < team.length; i++) hash = team.charCodeAt(i) + ((hash << 5) - hash);
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

function TeamBadge({ team }) {
  const initials = (team || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ backgroundColor: teamColor(team) }} className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

const ICON_MAP = { cardSet: Layers, manufacturer: Building2, competition: Trophy };
const COLOR_MAP = { cardSet: "bg-purple-100 text-purple-600", manufacturer: "bg-blue-100 text-blue-600", competition: "bg-orange-100 text-orange-600" };
const TYPE_LABELS = { player: "Player", club: "Club", cardSet: "Card Set", manufacturer: "Manufacturer", competition: "Competition" };

function TypeIcon({ type, item }) {
  if (type === "player") {
    return item.photo ? (
      <Image src={item.photo} alt={item.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
    ) : (
      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {item.name[0]}
      </div>
    );
  }
  if (type === "club") return <TeamBadge team={item.name} />;
  const Icon = ICON_MAP[type] || Package;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${COLOR_MAP[type] || "bg-gray-100 text-gray-600"}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

export default function PredictiveSearch({ placeholder = "Search players, clubs, sets...", className = "", variant = "hero" }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const inputClasses = variant === "hero"
    ? "w-full pl-12 pr-10 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white/15 transition-all"
    : "w-full pl-10 pr-4 py-2 bg-secondary rounded-full text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all";
  const iconClasses = variant === "hero"
    ? "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
    : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none";

  useEffect(() => {
    base44.entities.Listing.filter({ status: "active" }, "-created_date", 200)
      .then(listings => {
        const playerMap = {}, clubMap = {}, setMap = {}, manMap = {}, compMap = {};
        listings.forEach(l => {
          if (l.player_name) {
            if (!playerMap[l.player_name]) playerMap[l.player_name] = { type: "player", name: l.player_name, team: l.team, photo: l.images?.[0] || null, count: 0, popularity: 0 };
            playerMap[l.player_name].count++;
            playerMap[l.player_name].popularity++;
            if (!playerMap[l.player_name].photo && l.images?.[0]) playerMap[l.player_name].photo = l.images[0];
          }
          if (l.team) {
            if (!clubMap[l.team]) clubMap[l.team] = { type: "club", name: l.team, count: 0, popularity: 0 };
            clubMap[l.team].count++;
            clubMap[l.team].popularity++;
          }
          if (l.card_set) {
            if (!setMap[l.card_set]) setMap[l.card_set] = { type: "cardSet", name: l.card_set, count: 0, popularity: 0 };
            setMap[l.card_set].count++;
            setMap[l.card_set].popularity++;
          }
          if (l.manufacturer) {
            if (!manMap[l.manufacturer]) manMap[l.manufacturer] = { type: "manufacturer", name: l.manufacturer, count: 0, popularity: 0 };
            manMap[l.manufacturer].count++;
            manMap[l.manufacturer].popularity++;
          }
          if (l.competition) {
            if (!compMap[l.competition]) compMap[l.competition] = { type: "competition", name: l.competition, count: 0, popularity: 0 };
            compMap[l.competition].count++;
            compMap[l.competition].popularity++;
          }
        });
        setIndex([
          ...Object.values(playerMap),
          ...Object.values(clubMap),
          ...Object.values(setMap),
          ...Object.values(manMap),
          ...Object.values(compMap),
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setSuggestions([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(() => {
      setSuggestions(searchAll(q, index));
      setShowDropdown(true);
      setHighlightIndex(-1);
    }, 80);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, index]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectItem = (item) => {
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(item.name)}`);
  };

  const searchAllCards = () => {
    setShowDropdown(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const browseAll = () => {
    setShowDropdown(false);
    setQuery("");
    navigate("/search");
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex(i => Math.min(suggestions.length, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(i => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) selectItem(suggestions[highlightIndex]);
      else if (query.trim()) searchAllCards();
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className={iconClasses} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setShowDropdown(true)}
          placeholder={placeholder}
          className={inputClasses}
        />
        {query && (
          <button onClick={() => { setQuery(""); setSuggestions([]); setShowDropdown(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-card rounded-xl shadow-2xl border border-border overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Loading search index…</div>
          ) : suggestions.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium text-sm mb-3 text-foreground">No matching players found.</p>
              <button onClick={browseAll} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                Browse all cards
              </button>
            </div>
          ) : (
            <>
              {suggestions.map((item, i) => (
                <button
                  key={`${item.type}-${item.name}`}
                  onClick={() => selectItem(item)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === highlightIndex ? "bg-emerald-500/20" : "hover:bg-secondary"}`}
                >
                  <TypeIcon type={item.type} item={item} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate text-foreground"><HighlightText text={item.type === "player" || item.type === "club" ? maskName(item.name) : item.name} query={query} /></p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.type === "player" ? <HighlightText text={maskName(item.team)} query={query} /> : TYPE_LABELS[item.type]}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                    {item.count} {item.count === 1 ? "card" : "cards"}
                  </span>
                </button>
              ))}
              <button
                onClick={searchAllCards}
                onMouseEnter={() => setHighlightIndex(suggestions.length)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left border-t border-border transition-colors ${highlightIndex === suggestions.length ? "bg-emerald-500/20" : "hover:bg-secondary"}`}
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Search all cards for "<span className="font-medium">{query.trim()}</span>"</span>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}