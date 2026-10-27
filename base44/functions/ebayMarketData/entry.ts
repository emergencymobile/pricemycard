import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Kickoff Cards — web card-value lookup.
// Queries the eBay Browse API (item_summary/search) with the exact keyword
// string the user typed, using the Production App ID + Cert ID (OAuth client
// credentials). Returns ACTIVE listings (title, price, condition, link) plus
// a SOLD history (sale date + price) from the Finding API for the price
// timeline chart. No AI, no images, no caching — the client fetches fresh on
// every search.
//
// Guests (unauthenticated) are allowed but capped at GUEST_SEARCH_LIMIT total
// searches per hashed IP. Logged-in users have no limit.

const GUEST_SEARCH_LIMIT = 10;
// Minimum interval between guest searches per IP. Prevents rapid-fire
// scripted abuse of the eBay API quota within the lifetime search cap.
const GUEST_COOLDOWN_MS = 2000;
// Max keyword length — guards against oversized payload abuse.
const MAX_KEYWORD_LEN = 80;

async function hashIp(ip) {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- Title-based relevance pre-filter ---
// Drops listings whose title strongly signals a non-soccer sport or a
// non-card item, before any (expensive) image verification runs. This is
// conservative: it only removes clear mismatches, leaving borderline cases
// for the image classifier to decide.

// Other sports that have their own trading cards and would pollute results.
const NON_SOCCER_SPORT_RE = /\b(basketball|baseball|nfl|nba|mlb|nhl|hockey|golf|tennis|cricket|rugby|boxing|ufc|mma|nascar|wrestling|wwe|formula\s*1|\bf1\b)\b/i;

// Non-card memorabilia / items that are not trading cards at all.
const NON_CARD_ITEM_RE = /\b(jerseys?|shirts?|kits?|scarf|scarves|poster|posters|magazine|programme|programme|ticket|tickets|badge|badges|pin\b|pins\b|flag|flags|mug|mugs|figurine|figure|statue|bobblehead|calendar|dvd|blu-?ray|video\s*game|console|controller|socks?|cleats?|boots?|ball\b|balls?|glove|gloves|helmet|cap\b|hat\b|cap\s*card)\b/i;

// Positive card signal — a listing title must contain at least one of these
// trading-card keywords to be kept. This is the main defence against non-card
// items that happen to contain the search tokens (e.g. "salah energy" energy
// drinks, "messi gold" gold coins). Without a card signal, the listing is
// almost certainly not a trading card.
const CARD_SIGNAL_RE = /\b(card|cards|rookie|\brc\b|prizm|chrome|topps|panini|select|donruss|bowman|optic|elite|finite|mosaic|refractor|fractor|patch|autograph|auto|relic|memorabilia|graded|mint|near\s*mint|\bnm\b|\blot\b|insert|parallel|serial|numbered|sticker|collection|futera|match\s*attax|adrenalyn|psa|bgs|sgc|cgc|\bset\b|\bpack\b|\bbox\b|\bcase\b)\b/i;

function passesTitleRelevanceFilter(listing, keywords) {
  const title = (listing && listing.title ? String(listing.title) : '').toLowerCase();
  if (!title) return false;
  if (NON_SOCCER_SPORT_RE.test(title)) return false;
  if (NON_CARD_ITEM_RE.test(title)) return false;
  // Require at least one trading-card signal keyword in the title. eBay's
  // search returns loosely-matched listings (e.g. energy drinks for "salah
  // energy"); without a card signal the item isn't a trading card.
  if (!CARD_SIGNAL_RE.test(title)) return false;
  // Require every search keyword token to appear in the title. eBay's search
  // is fuzzy and returns loosely-matched listings; this drops results that
  // don't actually contain the words the user typed (e.g. a "CARLOS ESPI"
  // card showing up for "pedri 100 club").
  const tokens = (keywords || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    for (const tok of tokens) {
      if (!title.includes(tok)) return false;
    }
  }
  return true;
}

// --- Sold-items history (Finding API) ---
// Fetches recently-completed SOLD items (EndedWithSales) for the price
// timeline chart. The Finding API authenticates with the App ID directly
// (SECURITY-APPNAME), no OAuth token needed, so this can run in parallel
// with the Browse API token flow. Returns { date, price_usd, title } per
// sale, filtered to soccer cards matching the keywords.
async function fetchSoldItems(keywords) {
  let proxyUrl = Deno.env.get('EBAY_PROXY_URL');
  if (!proxyUrl) return [];
  if (!proxyUrl.startsWith('http')) proxyUrl = 'https://' + proxyUrl;
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.13.0',
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': keywords,
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    'sortOrder': 'EndTimeSoonest',
    'paginationInput.entriesPerPage': '100',
  });
  const url = proxyUrl.replace(/\/$/, '') + '?' + params.toString();
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const root = await res.json();
    const items = root?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    return items.map((it) => {
      const title = Array.isArray(it.title) ? it.title[0] : (it.title || '');
      const priceArr = it.sellingStatus?.[0]?.convertedCurrentPrice;
      const priceVal = priceArr ? (priceArr[0]?.__value__ ?? priceArr[0]) : 0;
      const price = Number(priceVal) || 0;
      const endTimeArr = it.listingInfo?.[0]?.endTime;
      const endTime = Array.isArray(endTimeArr) ? endTimeArr[0] : (endTimeArr || '');
      const date = endTime ? String(endTime).slice(0, 10) : '';
      return { title, price_usd: price, date };
    }).filter((s) => s.title && s.price_usd > 0 && s.date);
  } catch {
    return [];
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const keywords = (body?.player || '').trim().slice(0, MAX_KEYWORD_LEN);
    if (!keywords) return Response.json({ error: 'player required' }, { status: 400 });

    // Guest rate limiting: 10 searches total per hashed IP (lifetime), plus a
    // short cooldown between searches to block rapid-fire scripted abuse of
    // the eBay API quota. Logged-in users bypass the guest limit.
    if (!user) {
      // Use Cloudflare's CF-Connecting-IP, which is set by the edge and cannot
      // be spoofed by the caller (unlike X-Forwarded-For, which is a
      // client-supplied chain an attacker can rotate to bypass the guest cap).
      const rawIp = req.headers.get('cf-connecting-ip')
        || req.headers.get('x-real-ip') || 'unknown';
      const ipHash = await hashIp(rawIp);
      const existing = await base44.asServiceRole.entities.GuestSearchUsage.filter(
        { ip_address: ipHash }, '-created_date', 1
      );
      if (existing.length > 0) {
        const record = existing[0];
        if (record.search_count >= GUEST_SEARCH_LIMIT) {
          return Response.json({ rate_limited: true, limit: GUEST_SEARCH_LIMIT, active: [] });
        }
        const lastAt = record.updated_date ? new Date(record.updated_date).getTime() : 0;
        if (Date.now() - lastAt < GUEST_COOLDOWN_MS) {
          return Response.json({ rate_limited: true, limit: GUEST_SEARCH_LIMIT, active: [], cooldown: true });
        }
        await base44.asServiceRole.entities.GuestSearchUsage.update(record.id, {
          search_count: record.search_count + 1,
        });
      } else {
        await base44.asServiceRole.entities.GuestSearchUsage.create({
          ip_address: ipHash,
          search_count: 1,
        });
      }
    }

    const appId = Deno.env.get('EBAY_APP_ID');
    const certId = Deno.env.get('EBAY_CERT_ID');
    if (!appId || !certId) {
      return Response.json({ source: 'eBay', active: [], reason: 'no_credentials' });
    }

    // Start the sold-items fetch early — the Finding API relay only needs the
    // proxy URL (no OAuth token), so it runs in parallel with the Browse API.
    const soldPromise = fetchSoldItems(keywords);

    // OAuth client-credentials token for the Browse API (api.ebay.com).
    const auth = btoa(appId + ':' + certId);
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
    });
    if (!tokenRes.ok) {
      return Response.json({ source: 'eBay', active: [], reason: 'no_token' });
    }
    const tokenData = await tokenRes.json().catch(() => ({}));
    const token = tokenData.access_token;
    if (!token) {
      return Response.json({ source: 'eBay', active: [], reason: 'no_token' });
    }

    // Search eBay US with the exact keyword string. No appended words — eBay
    // AND-matches every keyword, so adding fixed terms over-constrains.
    // Fetch up to 200 (API max) instead of the default 50 so lower-ranked
    // base / non-refractor versions appear in the results too, not just the
    // refractor parallels eBay tends to surface first.
    const url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?q=' +
      encodeURIComponent(keywords) + '&limit=200';
    const res = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) {
      return Response.json({ source: 'eBay', active: [], reason: 'browse_http_' + res.status });
    }
    const root = await res.json();

    // eBay Partner Network (ePN) campaign ID — when set, outbound listing
      // links are tagged with the campid query parameter so clicks are
      // attributed to this affiliate campaign for commission earning.
      const epnCampaignId = Deno.env.get('EBAY_EPN_CAMPAIGN_ID') || '';
      const tagUrl = (rawUrl) => {
        if (!rawUrl || !epnCampaignId) return rawUrl;
        const sep = rawUrl.includes('?') ? '&' : '?';
        return rawUrl + sep + 'campid=' + encodeURIComponent(epnCampaignId);
      };

    const mapItem = (it) => {
      const title = it.title || '';
      const url = tagUrl(it.itemWebUrl || '');
      if (!title || !url) return null;
      const price = it.price?.value ? Number(it.price.value) : 0;
      const currency = it.price?.currency || 'USD';
      const g = title.match(/\b(PSA|BGS|SGC|CGC)\s*([0-9](?:\.\d{1,2})?)\b/i);
      const gradeCompany = g ? g[1].toUpperCase() : '';
      const grade = g ? g[2] : '';
      return {
        title,
        url,
        price_usd: price,
        currency,
        condition: it.condition || '',
        image: it.image?.imageUrl || '',
        grade_company: gradeCompany,
        grade,
        raw: !gradeCompany,
      };
    };

    const mapped = (root?.itemSummaries || [])
      .map(mapItem)
      .filter(Boolean);

    // --- Relevance filtering: drop obvious non-soccer sports and non-card
    // items (jerseys, posters, magazines, figurines, etc.) via title keywords.
    const titleFiltered = mapped.filter((l) => passesTitleRelevanceFilter(l, keywords));

    // Sold history for the price timeline chart — same relevance filter so
    // only matching soccer-card sales are plotted.
    const soldRaw = await soldPromise;
    const sold = soldRaw.filter((s) => passesTitleRelevanceFilter(s, keywords));

    return Response.json({ source: 'eBay', active: titleFiltered, sold });
  } catch (error) {
    return Response.json({ source: 'eBay', active: [], reason: 'error', error: error.message });
  }
}