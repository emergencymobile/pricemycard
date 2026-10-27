// Helpers for the community "Report Irrelevant" feature on eBay web-search
// listings. Shared between the search page (exclusion) and the admin view
// (report summary).

// Compute the set of eBay listing URLs to hide from search results.
//   auto-hidden: a URL reported by >= threshold unique users
//   manual_hide: admin forced hide (always excluded)
//   manual_restore: admin override keeping a URL visible even if auto-hidden
export function buildExcludedUrlSet(reports, moderations, threshold) {
  if (!Array.isArray(reports)) return new Set();
  const th = typeof threshold === "number" && threshold > 0 ? threshold : 3;
  const modBy = new Map();
  (moderations || []).forEach((m) => {
    if (m && m.listing_url) modBy.set(m.listing_url, m);
  });
  const usersBy = new Map();
  reports.forEach((r) => {
    if (!r || !r.listing_url) return;
    if (!usersBy.has(r.listing_url)) usersBy.set(r.listing_url, new Set());
    if (r.created_by_id) usersBy.get(r.listing_url).add(r.created_by_id);
  });
  const excluded = new Set();
  // manual_hide is always excluded, even with no reports.
  modBy.forEach((m, url) => {
    if (m.status === "manual_hide") excluded.add(url);
  });
  usersBy.forEach((users, url) => {
    const mod = modBy.get(url);
    if (mod?.status === "manual_hide") return; // already added
    if (mod?.status === "manual_restore") return; // admin override
    if (users.size >= th) excluded.add(url);
  });
  return excluded;
}

// Build a per-URL summary of reports for the admin view.
export function buildReportSummary(reports) {
  const map = new Map();
  (reports || []).forEach((r) => {
    if (!r || !r.listing_url) return;
    if (!map.has(r.listing_url)) {
      map.set(r.listing_url, {
        url: r.listing_url,
        titles: new Set(),
        froms: new Set(),
        users: new Set(),
        count: 0,
        latest: null,
      });
    }
    const s = map.get(r.listing_url);
    s.count += 1;
    if (r.created_by_id) s.users.add(r.created_by_id);
    if (r.listing_title) s.titles.add(r.listing_title);
    if (r.reported_from) s.froms.add(r.reported_from);
    if (r.created_date && (!s.latest || r.created_date > s.latest)) s.latest = r.created_date;
  });
  return map;
}