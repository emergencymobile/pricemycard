import React, { useState, useMemo, useEffect, useRef } from "react";
import { Globe, Loader2, Search, TrendingUp, Info, ExternalLink, Image as ImageIcon, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toAED } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { findCorrections, buildCardReference } from "@/lib/cardFuzzy";
import { groupBySeason, detectSeason } from "@/lib/seasonDetect";
import { filterSingleCardListings } from "@/lib/singleCardFilter";
import HeroImage from "@/components/web/HeroImage";
import SeasonGroup from "@/components/web/SeasonGroup";
import ReportListingButton from "@/components/web/ReportListingButton";
import BulkReportBar from "@/components/web/BulkReportBar";
import PriceTrendChart from "@/components/web/PriceTrendChart";
import VoiceSearchButton from "@/components/web/VoiceSearchButton";
import ImageSearchButton from "@/components/web/ImageSearchButton";
import RecentSearches, { addRecentSearch } from "@/components/web/RecentSearches";
import SuggestedSearches from "@/components/web/SuggestedSearches";
import { buildExcludedUrlSet } from "@/lib/listingReports";
import PullToRefresh from "@/components/native/PullToRefresh";
import Paywall from "@/components/web/Paywall";
import ExportPriceHistory from "@/components/web/ExportPriceHistory";
import SaveSearchButton from "@/components/web/SaveSearchButton";
import { usePremium } from "@/hooks/usePremium";
// Upgrade an eBay thumbnail URL to a larger size for clearer display.
const upgradeEbayImage = (url) => (url ? url.replace(/s-l\d+(?=\.)/i, "s-l500") : url);

// Derive a human condition from a listing's grade number and/or title text.
const deriveCondition = (l) => {
  const gradeNum = l.grade ? parseFloat(l.grade) : NaN;
  const title = (l.title || "").toLowerCase();
  if (!isNaN(gradeNum) && gradeNum >= 9) return "mint";
  if (!isNaN(gradeNum) && gradeNum >= 7) return "near_mint";
  if (/near mint|\bnm\b/.test(title)) return "near_mint";
  if (/\bmint\b/.test(title)) return "mint";
  return "";
};

// Refractor-parallel detection for the "No Refractor" filter. Matches the
// "fractor" token family (Refractor, Superfractor, X-Fractor, Wave/Atomic/Gold
// Refractor, etc.) — a low-false-positive signal that covers the common naming
// variants without excluding entire sets like Prizm/Chrome (which are also
// base set names, not always parallels).
const REFRACTOR_RE = /fractor/i;
const isRefractor = (title) => REFRACTOR_RE.test(title || "");

// Brand detection for the "Brand" filter. Scans the listing title for known
// soccer-card brand keywords. More specific sub-brands (Optic, Prizm, Select,
// Donruss, Bowman) are checked before their parents (Panini, Topps) so a
// "Panini Donruss Optic" card is filed under "Optic", not "Panini". Anything
// not matching a known keyword falls back to "Other" rather than being
// excluded or guessed.
const BRAND_PRIORITY = ["Optic", "Prizm", "Select", "Donruss", "Bowman", "Panini", "Topps"];
const detectBrand = (title) => {
  const t = (title || "").toLowerCase();
  for (const b of BRAND_PRIORITY) {
    if (new RegExp(`\\b${b.toLowerCase()}\\b`).test(t)) return b;
  }
  return "Other";
};

// Per-season outlier split: within a group of listings, flag any priced more
// than 3x or less than 1/3 of the group's median as an outlier — but only once
// the group has >= 4 priced listings (otherwise the median isn't meaningful).
// Outliers are returned separately so callers can exclude them from the
// average and display them in a dedicated "Irrelevant Prices" section instead
// of dropping them silently.
const splitOutliers = (items) => {
  const priced = items.filter((l) => l.price_usd > 0);
  if (priced.length < 4) return { normal: items, outliers: [] };
  const sorted = priced.map((l) => toAED(l.price_usd)).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const lo = median / 3;
  const hi = median * 3;
  const normal = [];
  const outliers = [];
  items.forEach((l) => {
    const p = toAED(l.price_usd);
    if (p > 0 && (p < lo || p > hi)) outliers.push(l);else
    normal.push(l);
  });
  return { normal, outliers };
};

export default function WebSearchPage() {
  const { formatFromAED } = useCurrency();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // { player, active }
  const [error, setError] = useState("");

  // Reference list of known card terms (app listings + common keywords) used
  // for fuzzy typo-correction. Built once on mount, in the background.
  const referenceRef = useRef([]);
  const keywordRef = useRef("");
  const [referenceReady, setReferenceReady] = useState(false);
  const [correction, setCorrection] = useState(null); // { original, corrected }
  const [suggestions, setSuggestions] = useState(null); // { original, options: [] }

  useEffect(() => {
    let alive = true;
    base44.entities.Listing.list("-updated_date", 200).
    then((rows) => {
      if (!alive) return;
      referenceRef.current = buildCardReference(rows || []);
      setReferenceReady(true);
    }).
    catch(() => setReferenceReady(true)); // empty reference → no correction
    return () => {alive = false;};
  }, []);

  // Community report moderation — loaded independently (non-blocking) so it
  // never delays the main listing render. Provides the set of eBay URLs to
  // exclude (auto-hidden / manually hidden) and the URLs the current user has
  // already reported (for the "Reported" button state).
  const [reportData, setReportData] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const { toast } = useToast();
  const { isPremium, loading: premiumLoading } = usePremium();
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await base44.auth.me().catch(() => null);
        const [reports, moderations, settings] = await Promise.all([
          base44.entities.ListingReport.list("-created_date", 500),
          base44.entities.ListingModeration.list("-updated_date", 200),
          base44.entities.ReportSettings.list("-updated_date", 5),
        ]);
        if (!alive) return;
        const threshold = (settings && settings[0]?.auto_hide_threshold) || 3;
        const excludedUrls = buildExcludedUrlSet(reports, moderations, threshold);
        const reportedByMe = new Set();
        if (me) (reports || []).forEach((r) => { if (r.created_by_id === me.id && r.listing_url) reportedByMe.add(r.listing_url); });
        setReportData({ excludedUrls, reportedByMe });
      } catch {
        if (alive) setReportData({ excludedUrls: new Set(), reportedByMe: new Set() });
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleReported = (url) => {
    setReportData((prev) => {
      const reportedByMe = new Set(prev?.reportedByMe || []);
      reportedByMe.add(url);
      return { excludedUrls: prev?.excludedUrls || new Set(), reportedByMe };
    });
  };

  const toggleSelect = (url) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const toggleSelectMode = async () => {
    if (!selectMode) {
      const authed = await base44.auth.isAuthenticated().catch(() => false);
      if (!authed) { base44.auth.redirectToLogin(window.location.href); return; }
    }
    setSelectMode((m) => !m);
    setSelectedUrls(new Set());
  };

  const handleBulkReport = async (reason, comment) => {
    const urls = Array.from(selectedUrls);
    if (!urls.length) return;
    const reportedFrom = results?.player || "";
    const titleMap = {};
    scopedActive.forEach((l) => { if (l && l.url) titleMap[l.url] = l.title || ""; });
    await Promise.all(urls.map((url) =>
      base44.entities.ListingReport.create({
        listing_url: url,
        listing_title: titleMap[url] || "",
        reported_from: reportedFrom,
        reason,
        comment,
      }).catch(() => {})
    ));
    setReportData((prev) => {
      const reportedByMe = new Set(prev?.reportedByMe || []);
      urls.forEach((u) => reportedByMe.add(u));
      return { excludedUrls: prev?.excludedUrls || new Set(), reportedByMe };
    });
    setSelectMode(false);
    setSelectedUrls(new Set());
    toast({ title: `Reported ${urls.length} ${urls.length === 1 ? "listing" : "listings"}` });
  };

  // Filters
  const [condition, setCondition] = useState("all"); // all | raw | graded | mint | near_mint
  const [company, setCompany] = useState("all"); // all | ungraded | PSA | BGS | ...
  const [grade, setGrade] = useState("all"); // all | 10 | 9 ...
  const [season, setSeason] = useState("all"); // all | "<startYear>" | "unknown"
  const [brand, setBrand] = useState("all"); // all | Topps | Panini | ... | Other
  const [refractor, setRefractor] = useState("all"); // all | only | none

  const FEW_RESULTS = 2; // 0–2 active listings → try a fuzzy correction.

  const runSearch = async (name) => {
    const player = (name || query).trim();
    if (!player) return;
    addRecentSearch(player);
    await doSearch(player, null);
  };

  // Pull-to-refresh: re-fetch the current search's live eBay data without
  // resetting the active filters or logging a new search event.
  const refresh = async () => {
    const player = keywordRef.current;
    if (!player) return;
    try {
      const data = (await base44.functions.invoke("ebayMarketData", { player }))?.data;
      if (data?.rate_limited) {
        setError(`You've reached the guest limit of ${data.limit} searches. Sign in to search without limits.`);
        return;
      }
      const allListings = (Array.isArray(data?.active) ? data.active : []).
      filter((l) => l && l.title && l.url && l.price_usd > 0);
      const active = filterSingleCardListings(allListings);
      setResults({ player, active, sold: Array.isArray(data?.sold) ? data.sold : [] });
    } catch {}
  };

  // originalTerm is set only when this call is an auto-corrected re-run, so the
  // correction logic runs once (on the user's manual search) and never loops.
  const doSearch = async (player, originalTerm) => {
    keywordRef.current = player;
    setLoading(true);
    setError("");
    if (!originalTerm) {
      setCorrection(null);
      setSuggestions(null);
    }
    setCondition("all");
    setCompany("all");
    setGrade("all");
    setSeason("all");
    setBrand("all");
    setRefractor("all");
    setResults(null);
    setSelectMode(false);
    setSelectedUrls(new Set());

    let data = null;
    try {
      data = (await base44.functions.invoke("ebayMarketData", { player }))?.data;
    } catch {
      data = null;
    }

    if (data?.rate_limited) {
      setError(`You've reached the guest limit of ${data.limit} searches. Sign in to search without limits.`);
      setLoading(false);
      return;
    }

    // Track search frequency for the homepage "Most Popular" ranking (fire-and-forget).
    base44.entities.SearchActivity.create({ keyword: player, activity_type: "search" }).catch(() => {});

    const allListings = (Array.isArray(data?.active) ? data.active : []).
    filter((l) => l && l.title && l.url && l.price_usd > 0);
    // Base data-quality step: drop multi-card listings (lots, bundles, sets,
    // "x2", etc.) before any grouping, value, or outlier logic — so they never
    // enter any part of the pipeline.
    const sold = Array.isArray(data?.sold) ? data.sold : [];

    const active = filterSingleCardListings(allListings);

    const isEmpty = active.length === 0;
    const veryFew = active.length > 0 && active.length <= FEW_RESULTS;

    if (!originalTerm && (isEmpty || veryFew) && referenceReady && referenceRef.current.length) {
      const { autoCorrect, suggestions } = findCorrections(player, referenceRef.current);
      // Auto-correct only when the original search returned nothing and there
      // is a single confident best match; otherwise offer "Did you mean".
      if (isEmpty && autoCorrect && autoCorrect !== player) {
        setCorrection({ original: player, corrected: autoCorrect });
        setLoading(false);
        return doSearch(autoCorrect, player);
      }
      if (suggestions && suggestions.length) {
        setSuggestions({ original: player, options: suggestions });
      }
    }

    setResults({ player, active, sold });
    setLoading(false);
  };

  // Auto-run the search when the page is opened with a ?q= query (e.g. from the
  // homepage hero search or trending players), so the user lands straight on
  // results without re-typing.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Premium subscription feedback — shows a toast after returning from Stripe.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("premium");
    if (p === "success") toast({ title: "Welcome to Premium!", description: "Your subscription is now active." });
    if (p === "cancelled") toast({ title: "Checkout cancelled", variant: "destructive" });
    if (p) {
      const url = new URL(window.location.href);
      url.searchParams.delete("premium");
      window.history.replaceState({}, "", url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All active listings for the current search, with community-reported listings
  // (auto-hidden / manually hidden) filtered out once moderation data has
  // loaded. Until reportData arrives, listings render unfiltered (non-blocking).
  const scopedActive = useMemo(() => {
    if (!results) return [];
    const excluded = reportData?.excludedUrls;
    if (!excluded || excluded.size === 0) return results.active;
    return results.active.filter((l) => !excluded.has(l.url));
  }, [results, reportData]);

  // Grader options derived from the active listings (scoped to the selected
  // card variation when disambiguation was used).
  const companies = useMemo(() => {
    if (!results) return [];
    return Array.from(new Set(scopedActive.map((l) => l.grade_company).filter(Boolean))).sort();
  }, [results, scopedActive]);

  const grades = useMemo(() => {
    if (!results) return [];
    return Array.from(new Set(scopedActive.map((l) => l.grade ? String(l.grade) : "").filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  }, [results, scopedActive]);

  // Brand options actually present in the current results (derived, so the
  // dropdown only shows relevant brands). "Other" is always sorted last.
  const brands = useMemo(() => {
    if (!results) return [];
    const present = new Set(scopedActive.map((l) => detectBrand(l.title)));
    return Array.from(present).sort((a, b) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    });
  }, [results, scopedActive]);

  // Distinct seasons detected across the active listings, newest first, with
  // "Season Unknown" last. Uses the same detection as the result grouping so the
  // filter options match the section headers exactly.
  const seasons = useMemo(() => {
    if (!results) return [];
    return groupBySeason(scopedActive).map((s) => ({
      value: s.startYear === null ? "unknown" : String(s.startYear),
      label: s.label,
      count: s.items.length
    }));
  }, [results, scopedActive]);

  // Grader / Ungraded / No Refractor + Brand filters: instead of hiding
  // non-matching listings, these REORDER — matching listings float to the top
  // (each tagged with a badge for the filter it matched), non-matching ones
  // stay visible below. The two reorder filters apply simultaneously (AND
  // logic): a listing fully "matches" only when it satisfies every active
  // reorder filter. Condition, grade, and season remain hard filters (they
  // narrow the set). Reordering is applied per-season inside displaySections.
  const companyMatchInfo = (l) => {
    if (company === "all") return { matched: true, badge: null };
    if (company === "no_refractor") {
      const matched = !isRefractor(l.title);
      return { matched, badge: matched ? "No Refractor" : null };
    }
    if (company === "ungraded") {
      const matched = !l.grade_company;
      return { matched, badge: matched ? "Ungraded" : null };
    }
    const matched = (l.grade_company || "") === company;
    return { matched, badge: matched ? `${l.grade_company}${l.grade ? ` ${l.grade}` : ""}` : null };
  };

  const brandMatchInfo = (l) => {
    if (brand === "all") return { matched: true, badge: null };
    const matched = detectBrand(l.title) === brand;
    return { matched, badge: matched ? brand : null };
  };

  // Combined match info for a listing against the active reorder filters.
  const matchInfo = (l) => {
    const c = companyMatchInfo(l);
    const b = brandMatchInfo(l);
    const cActive = company !== "all";
    const bActive = brand !== "all";
    const badges = [];
    if (cActive && c.matched && c.badge) badges.push(c.badge);
    if (bActive && b.matched && b.badge) badges.push(b.badge);
    const matchedCount = (cActive ? (c.matched ? 1 : 0) : 0) + (bActive ? (b.matched ? 1 : 0) : 0);
    const fullyMatched = (!cActive || c.matched) && (!bActive || b.matched);
    return { badges, matchedCount, fullyMatched };
  };

  const filteredActive = useMemo(() => {
    if (!results) return [];
    const base = scopedActive.filter((l) => {
      if (condition === "raw" && !l.raw) return false;
      if (condition === "graded" && l.raw) return false;
      if (condition === "mint" && deriveCondition(l) !== "mint") return false;
      if (condition === "near_mint" && deriveCondition(l) !== "near_mint") return false;
      if (grade !== "all" && String(l.grade || "") !== grade) return false;
      if (season !== "all") {
        const s = detectSeason(l.title || "");
        if (season === "unknown") {if (s) return false;} else
        if (!s || String(s.startYear) !== season) return false;
      }
      if (refractor === "only" && !isRefractor(l.title)) return false;
      if (refractor === "none" && isRefractor(l.title)) return false;
      return true;
    });
    // Attach match metadata; reordering itself happens per-season in
    // displaySections (so matches rise to the top of each season group).
    return base.map((l) => {
      const info = matchInfo(l);
      return { ...l, _badges: info.badges, _matchedCount: info.matchedCount, _fullyMatched: info.fullyMatched };
    });
  }, [scopedActive, condition, company, brand, grade, season, refractor]);

  // Per-season outlier detection (see splitOutliers above). Outliers are
  // excluded from the estimated value and moved to a dedicated
  // "Irrelevant Prices" section — never silently dropped. Detection runs
  // within the company-respected value set and within each season group, so
  // a high-priced older-season card isn't flagged against a newer season's
  // typical prices.
  const { displaySections, outlierSection } = useMemo(() => {
    if (!results) return { displaySections: [], outlierSection: [] };
    // Outlier detection runs on the fully-matched set (listings satisfying all
    // active reorder filters) so the estimated value reflects the chosen
    // criteria, not the still-visible non-matches below.
    const valueSet = filteredActive.filter((l) => l._fullyMatched);
    const outlierUrls = new Set();
    groupBySeason(valueSet).forEach((sec) => {
      splitOutliers(sec.items).outliers.forEach((l) => outlierUrls.add(l.url));
    });
    const displaySections = [];
    const outlierSection = [];
    groupBySeason(filteredActive).forEach((sec) => {
      // Reorder within this season: most-matched first (stable), so filter
      // matches rise to the top of the section specifically.
      const ordered = [...sec.items].sort((a, b) => b._matchedCount - a._matchedCount);
      const normal = [];
      ordered.forEach((l) => {
        if (outlierUrls.has(l.url)) outlierSection.push(l);else
        normal.push(l);
      });
      if (normal.length) displaySections.push({ ...sec, items: normal });
    });
    return { displaySections, outlierSection };
  }, [filteredActive, results]);

  // Estimated Market Value: average of the non-outlier, company-respected
  // listings (so picking "No Refractor" prices base cards, not the refractor
  // parallels still shown below). Low/high reflect the kept range only.
  const value = useMemo(() => {
    const normalItems = displaySections.
    flatMap((s) => s.items).
    filter((l) => l._fullyMatched);
    const prices = normalItems.map((l) => toAED(l.price_usd)).filter((p) => p > 0);
    if (!prices.length) return null;
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return {
      avg,
      low: Math.min(...prices),
      high: Math.max(...prices),
      count: prices.length,
      excludedCount: outlierSection.length
    };
  }, [displaySections, outlierSection]);

  // Hero image: first active listing that has an image, upgraded to a larger
  // eBay size for clarity.
  const heroSrc = useMemo(() => {
    if (!results) return null;
    const withImg = scopedActive.find((l) => l.image);
    return withImg ? upgradeEbayImage(withImg.image) : null;
  }, [results, scopedActive]);

  const showFilters = results && results.active.length > 0;

  // Select-all for the currently visible (filtered) listings.
  const visibleUrls = useMemo(() => new Set(filteredActive.map((l) => l.url)), [filteredActive]);
  const allVisibleSelected = visibleUrls.size > 0 && [...visibleUrls].every((u) => selectedUrls.has(u));
  const selectAllVisible = () => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleUrls.forEach((u) => next.delete(u));
      } else {
        visibleUrls.forEach((u) => next.add(u));
      }
      return next;
    });
  };

  const renderRow = (l, i) =>
  <div
    key={i}
    className={`flex items-start gap-2 p-2 sm:p-4 hover:bg-secondary/60 transition-colors group ${selectMode ? "cursor-pointer" : ""} ${selectMode && selectedUrls.has(l.url) ? "bg-amber-500/10" : ""}`}>
    {selectMode && (
      <div className="flex items-center pt-4 sm:pt-6 pl-1 shrink-0">
        <Checkbox
          checked={selectedUrls.has(l.url)}
          onCheckedChange={() => toggleSelect(l.url)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={(e) => {
        if (selectMode) { e.preventDefault(); toggleSelect(l.url); return; }
        const kw = keywordRef.current;
        if (kw) base44.entities.SearchActivity.create({ keyword: kw, activity_type: "click", listing_title: l.title, listing_image: l.image || "" }).catch(() => {});
      }}
      className="flex items-start gap-3 flex-1 min-w-0">
    
      <div className="w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] shrink-0 rounded-lg overflow-hidden bg-secondary border border-border flex items-center justify-center">
        {l.image ? (
          <img src={l.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm text-foreground group-hover:text-emerald-400 transition-colors line-clamp-2">
            {l.title}
          </p>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {l._badges && l._badges.length > 0 && l._badges.map((b, j) =>
            <Badge key={`b-${j}`} className="text-[10px] bg-emerald-600/15 text-emerald-400 border border-emerald-500/30">{b}</Badge>
            )}
            {l.condition && <Badge variant="secondary" className="text-[10px]">{l.condition}</Badge>}
            {l.grade_company && !l._badges?.some((b) => b.startsWith(l.grade_company)) && <Badge variant="outline" className="text-[10px]">{l.grade_company}{l.grade ? ` ${l.grade}` : ""}</Badge>}
            {l.raw && <Badge variant="outline" className="text-[10px]">Raw</Badge>}
          </div>
          <p className="font-display font-bold text-sm sm:text-base text-foreground whitespace-nowrap shrink-0">{formatFromAED(toAED(l.price_usd))}</p>
        </div>
      </div>
    </a>
    {!selectMode && <ReportListingButton
      listing={{ url: l.url, title: l.title }}
      reportedFrom={results?.player || ""}
      reported={!!(reportData?.reportedByMe?.has(l.url))}
      onReported={handleReported}
    />}
  </div>;


  if (premiumLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!isPremium) {
    return <Paywall />;
  }

  return (
    <PullToRefresh onRefresh={refresh}>
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-5 h-5 text-emerald-600" />
        <h1 className="font-display font-bold text-xl sm:text-2xl">Card Market Search</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-3 sm:mb-6">
        Search live <span className="font-medium text-foreground">active eBay listings</span> for any card. Prices are
        current asking prices from sellers — not confirmed sales — so use them as a negotiating reference.
      </p>

      <div className="sticky top-16 md:static z-30 bg-background/95 backdrop-blur-sm -mx-3 sm:-mx-4 md:mx-0 px-3 sm:px-4 md:px-0 py-2 md:py-0 mb-3 md:mb-6">
        <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(query); }}
          placeholder="Search any soccer card — e.g. 'Messi Topps Chrome rookie card'"
          className="flex-1 h-11 rounded-xl bg-card border-border"
        />
        <ImageSearchButton
          disabled={loading}
          onResult={(text) => { setQuery(text); runSearch(text); }}
        />
        <VoiceSearchButton
          disabled={loading}
          onResult={(text) => { setQuery(text); runSearch(text); }}
        />
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6"
          onClick={() => runSearch(query)}
          disabled={loading || !query.trim()}>
          
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
        </Button>
        </div>
        {!results && !loading && (
          <SuggestedSearches onSelect={(term) => { setQuery(term); runSearch(term); }} />
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground/60 mb-3 sm:mb-6">
        Affiliate disclosure: some links on this page go to eBay. If you purchase an item through one of these links,
        we may earn a small commission at no extra cost to you — this helps keep the site running.
      </p>

      {!results && !loading && (
        <RecentSearches onSelect={(term) => { setQuery(term); runSearch(term); }} />
      )}

      {/* Filters */}
      {showFilters &&
      <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-6">
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="w-36 rounded-lg h-9 sm:h-10"><SelectValue placeholder="Condition" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="mint">Mint</SelectItem>
              <SelectItem value="near_mint">Near Mint</SelectItem>
            </SelectContent>
          </Select>

          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="w-36 rounded-lg h-9 sm:h-10"><SelectValue placeholder="Grader" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Graders</SelectItem>
              <SelectItem value="ungraded">Ungraded</SelectItem>
              <SelectItem value="no_refractor">No Refractor</SelectItem>
              {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-36 rounded-lg h-9 sm:h-10"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="w-28 rounded-lg h-9 sm:h-10"><SelectValue placeholder="Grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-40 rounded-lg h-9 sm:h-10"><SelectValue placeholder="Season" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              {seasons.map((s) =>
            <SelectItem key={s.value} value={s.value}>
                  {s.label} ({s.count})
                </SelectItem>
            )}
            </SelectContent>
          </Select>

          <Select value={refractor} onValueChange={setRefractor}>
            <SelectTrigger className="w-36 rounded-lg h-9 sm:h-10"><SelectValue placeholder="Refractor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Refractors</SelectItem>
              <SelectItem value="only">Refractor Only</SelectItem>
              <SelectItem value="none">No Refractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }

      {/* Auto-correction note */}
      {correction && results && !loading &&
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-4 text-sm">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-muted-foreground">
            Showing results for <span className="font-semibold text-foreground">"{correction.corrected}"</span> instead of <span className="text-muted-foreground">"{correction.original}"</span>.
          </span>
          <button
          type="button"
          className="ml-auto text-emerald-400 hover:underline shrink-0"
          onClick={() => {
            const o = correction.original;
            setCorrection(null);
            setSuggestions(null);
            doSearch(o, "__keep__");
          }}>
          
            Search "{correction.original}"
          </button>
        </div>
      }

      {/* Did-you-mean suggestions */}
      {suggestions && !loading &&
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-secondary/60 border border-border rounded-xl px-4 py-3 mb-4 text-sm">
          <span className="text-muted-foreground">Did you mean:</span>
          {suggestions.options.map((opt, i) =>
        <React.Fragment key={opt}>
              {i > 0 && <span className="text-muted-foreground">·</span>}
              <button
            type="button"
            className="font-medium text-emerald-400 hover:underline"
            onClick={() => {setQuery(opt);runSearch(opt);}}>
            
                {opt}
              </button>
            </React.Fragment>
        )}
        </div>
      }

      {/* Estimated Market Value */}
      {results && !loading && value &&
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-5 items-stretch">
          <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-3 sm:p-5 flex-1 min-w-0">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Estimated Market Value</span>
              <span className="text-[11px] font-normal text-muted-foreground">· Average Asking Price</span>
            </div>
            <p className="font-display font-bold text-2xl sm:text-3xl text-foreground">
              {formatFromAED(value.avg)}
              <span className="text-base font-normal text-muted-foreground ml-2">
                from {value.count} active {value.count === 1 ? "listing" : "listings"}
              </span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground mr-3">
              <span>Low <span className="font-medium text-foreground">{formatFromAED(value.low)}</span></span>
              <span>High <span className="font-medium text-foreground">{formatFromAED(value.high)}</span></span>
            </div>
            <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Based on current active listing prices, not confirmed sales. Actual sale prices may be lower.</span>
            </div>
            {value.excludedCount > 0 &&
          <div className="flex items-start gap-1.5 mt-1.5 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
                <span title="Excludes unusually high/low priced listings — see 'Irrelevant Prices' below.">
                  Excludes {value.excludedCount} unusually high/low priced {value.excludedCount === 1 ? "listing" : "listings"} — see "Irrelevant Prices" below.
                </span>
              </div>
          }
          </div>
          <HeroImage src={heroSrc} alt={results.player}
            wrapClassName="flex-1 flex justify-center sm:justify-end"
            imgClassName="h-48 sm:h-full w-full max-w-[22rem] rounded-2xl border border-emerald-500/30 object-contain" />
        </div>
      }

      {/* Price timeline — sold-price history from eBay */}
      {results && !loading && results.sold && results.sold.length >= 2 &&
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-end mb-2">
            <ExportPriceHistory sold={results.sold} player={results.player} />
          </div>
          <PriceTrendChart data={results.sold} average={value?.avg} />
        </div>
      }

      {/* Loading / error / empty */}
      {loading ?
      <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div> :
      error ?
      <div className="text-center py-20 text-muted-foreground">{error}</div> :
      results && results.active.length === 0 ?
      <div className="text-center py-20">
          <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium text-lg mb-2">No active listings found</p>
          <p className="text-sm text-muted-foreground">We couldn't find any live eBay listings for "{results.player}". Try a different search term.</p>
        </div> :
      results && filteredActive.length === 0 ?
      <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium text-lg mb-2">No listings match your filters</p>
          <p className="text-sm">Try widening the condition, grade, or season filters.</p>
        </div> :
      results ?
      <>
          {!value &&
        <div className="mb-6">
              <HeroImage src={heroSrc} alt={results.player} />
              <div className="bg-secondary rounded-xl p-5 flex items-center gap-3">
                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Not enough priced listings to estimate a value for <span className="font-medium text-foreground">{results.player}</span> with the current filters.
                </p>
              </div>
            </div>
        }
          <section>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">Active Listings</Badge>
              {company === "all" && brand === "all" ?
            <span className="text-xs text-muted-foreground">{filteredActive.length} live eBay {filteredActive.length === 1 ? "listing" : "listings"} · asking prices, not sold</span> :

            <span className="text-xs text-muted-foreground">
                   {filteredActive.filter((l) => l._fullyMatched).length} matching · {filteredActive.length} total · matched shown first
                 </span>
            }
            <div className="ml-auto flex items-center gap-2">
              {selectMode && filteredActive.length > 0 && (
                <Button variant="ghost" size="sm" className="rounded-lg text-xs h-8" onClick={selectAllVisible}>
                  {allVisibleSelected ? "Clear selection" : "Select all"}
                </Button>
              )}
              <SaveSearchButton keyword={results?.player} />
              <Button variant="outline" size="sm" className="rounded-lg text-xs h-8 gap-1" onClick={toggleSelectMode}>
                <Flag className="w-3.5 h-3.5" /> {selectMode ? "Done" : "Report multiple"}
              </Button>
            </div>
            </div>
            {displaySections.map((sec) =>
              <SeasonGroup
                key={sec.label}
                label={sec.label}
                count={sec.items.length}
                startYear={sec.startYear}
                items={sec.items}
                renderRow={renderRow} />
            )}
            {outlierSection.length > 0 &&
              <SeasonGroup
                label="Irrelevant Prices"
                count={outlierSection.length}
                variant="outlier"
                items={outlierSection}
                renderRow={renderRow} />
            }
          </section>
        </> :
      null}
      {selectMode && selectedUrls.size > 0 && (
        <BulkReportBar
          selectedCount={selectedUrls.size}
          onCancel={() => { setSelectMode(false); setSelectedUrls(new Set()); }}
          onSubmit={handleBulkReport}
        />
      )}
    </div>
    </PullToRefresh>
  );

}