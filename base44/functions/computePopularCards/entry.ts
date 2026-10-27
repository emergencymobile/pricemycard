import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Computes the homepage "Most Popular" ranking by combining two signals:
//   1. Internal Sell purchases — count of completed Orders, grouped by player.
//   2. Web Search activity — search + click frequency from SearchActivity,
//      grouped by keyword.
// Each source is min-max normalized to a 0..1 scale (purchase counts and search
// counts live on different scales, so raw numbers can't be summed directly) and
// the normalized scores are summed per card. A card popular in both sources
// merges into one entry carrying both source badges.
//
// The result is cached in PopularCardsCache and only recomputed when the cache
// is older than CACHE_TTL_MS, so the homepage never aggregates on every load.
// Auth-protected: only authenticated app users may trigger a (re)compute via
// the frontend. Anonymous homepage visitors read the cached PopularCardsCache
// entity directly and never invoke this function, so the public cannot run
// the expensive aggregation.

const CACHE_TTL_MS = 60 * 60 * 1000; // recompute at most once per hour
const TOP_N = 12;
const CLICK_WEIGHT = 2; // clicks weighted higher than searches (stronger intent)

function normKey(s) {
  return (s || "").toString().trim().toLowerCase();
}

// Min-max normalize a count to 0..1 within its source. When all values are
// equal (max <= min), a present item gets 0.5 so a single-item source does
// not dominate the combined score.
function normalize(count, min, max) {
  if (max <= min) return count > 0 ? 0.5 : 0;
  return (count - min) / (max - min);
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Reject unauthenticated callers before any aggregation/cache work runs.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // --- Return cached ranking if fresh ---
    let cache = null;
    try {
      const cached = await base44.asServiceRole.entities.PopularCardsCache.list("-updated_date", 1);
      cache = cached && cached[0] ? cached[0] : null;
    } catch (e) {
      cache = null;
    }
    if (cache) {
      const age = Date.now() - new Date(cache.updated_date).getTime();
      if (age < CACHE_TTL_MS) {
        return Response.json({ ranking: cache.ranking || [], updated_at: cache.updated_date, cached: true });
      }
    }

    // --- Source 1: completed purchases grouped by player ---
    const completedOrders = await base44.asServiceRole.entities.Order.filter({ status: "completed" }, "-created_date", 500);
    const listings = await base44.asServiceRole.entities.Listing.filter({}, "-created_date", 500);
    const listingMap = {};
    (listings || []).forEach((l) => { if (l && l.id) listingMap[l.id] = l; });

    const purchaseByPlayer = {}; // key -> { player, count, title, image, listingId }
    (completedOrders || []).forEach((o) => {
      const listing = o && o.listing_id ? listingMap[o.listing_id] : null;
      if (!listing) return;
      const player = (listing.player_name || "").trim();
      if (!player) return;
      const key = normKey(player);
      if (!purchaseByPlayer[key]) {
        purchaseByPlayer[key] = {
          player,
          count: 0,
          title: listing.title || player,
          image: (listing.images && listing.images[0]) || null,
          listingId: listing.id
        };
      }
      purchaseByPlayer[key].count += 1;
    });

    // --- Source 2: web search activity grouped by keyword ---
    const activity = await base44.asServiceRole.entities.SearchActivity.list("-created_date", 2000);
    const searchByKey = {}; // key -> { keyword, searchCount, clickCount, title, image }
    (activity || []).forEach((a) => {
      const kw = (a && a.keyword ? a.keyword : "").trim();
      if (!kw) return;
      const key = normKey(kw);
      if (!searchByKey[key]) searchByKey[key] = { keyword: kw, searchCount: 0, clickCount: 0, title: null, image: null };
      if (a.activity_type === "search") {
        searchByKey[key].searchCount += 1;
      } else if (a.activity_type === "click") {
        searchByKey[key].clickCount += 1;
        if (a.listing_title) {
          searchByKey[key].title = a.listing_title;
          if (a.listing_image) searchByKey[key].image = a.listing_image;
        }
      }
    });

    const searchEntries = Object.values(searchByKey).map((e) => ({
      keyword: e.keyword,
      searchCount: e.searchCount,
      clickCount: e.clickCount,
      title: e.title,
      image: e.image,
      combined: e.searchCount + CLICK_WEIGHT * e.clickCount
    }));

    // --- Normalize each source to 0..1 (min-max) ---
    const pCounts = Object.values(purchaseByPlayer).map((e) => e.count);
    const sCounts = searchEntries.map((e) => e.combined);
    const pMax = pCounts.length ? Math.max.apply(null, pCounts) : 0;
    const pMin = pCounts.length ? Math.min.apply(null, pCounts) : 0;
    const sMax = sCounts.length ? Math.max.apply(null, sCounts) : 0;
    const sMin = sCounts.length ? Math.min.apply(null, sCounts) : 0;

    // --- Merge by player keyword ---
    const merged = {};
    Object.values(purchaseByPlayer).forEach((e) => {
      const key = normKey(e.player);
      if (!merged[key]) merged[key] = { player: e.player, title: e.title, image: e.image, link: "/listing/" + e.listingId, sources: [], score: 0 };
      merged[key].score += normalize(e.count, pMin, pMax);
      if (merged[key].sources.indexOf("purchase") === -1) merged[key].sources.push("purchase");
    });
    searchEntries.forEach((e) => {
      const key = normKey(e.keyword);
      if (!merged[key]) merged[key] = { player: e.keyword, title: e.title || e.keyword, image: e.image, link: "/web-search?q=" + encodeURIComponent(e.keyword), sources: [], score: 0 };
      merged[key].score += normalize(e.combined, sMin, sMax);
      if (merged[key].sources.indexOf("search") === -1) merged[key].sources.push("search");
      if (!merged[key].image && e.image) merged[key].image = e.image;
      if ((!merged[key].title || merged[key].title === merged[key].player) && e.title) merged[key].title = e.title;
    });

    const ranking = Object.values(merged)
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_N)
      .map((item, i) => ({
        rank: i + 1,
        title: item.title,
        image: item.image || null,
        player: item.player,
        sources: item.sources,
        link: item.link
      }));

    // --- Write cache ---
    if (cache) {
      await base44.asServiceRole.entities.PopularCardsCache.update(cache.id, { ranking: ranking, items_count: ranking.length });
    } else {
      await base44.asServiceRole.entities.PopularCardsCache.create({ ranking: ranking, items_count: ranking.length });
    }

    return Response.json({ ranking: ranking, updated_at: new Date().toISOString(), cached: false });
  } catch (error) {
    return Response.json({ error: error.message, ranking: [] }, { status: 500 });
  }
}