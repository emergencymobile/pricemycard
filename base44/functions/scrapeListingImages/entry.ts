import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fetch each listing page server-side and extract the real primary image
// (og:image / twitter:image / first product img). Returns a map url -> image_url.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

function extractImage(html: string, pageUrl: string): string {
  const pick = (re: RegExp): string | null => {
    const m = re.exec(html);
    return m ? decodeHtmlEntities(m[1]) : null;
  };
  const decodeHtmlEntities = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&#x2F;/g, "/")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

  const og =
    pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (og) return resolveUrl(og, pageUrl);

  const tw =
    pick(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
    pick(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (tw) return resolveUrl(tw, pageUrl);

  // eBay-specific: first i.ebayimg.com image referenced in the page
  const ebay = pick(/(https?:\/\/i\.ebayimg\.com\/[^"'\s<>]+)/i) ||
    pick(/<img[^>]+id=["']icImg["'][^>]+src=["'](https?:\/\/[^"']+)["']/i) ||
    pick(/<img[^>]+src=["'](https?:\/\/i\.ebayimg\.com\/[^"']+)["']/i);
  if (ebay) return ebay;

  // Generic: first large <img src> that looks like a product photo
  const img = pick(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (img) return resolveUrl(img, pageUrl);

  return "";
}

function resolveUrl(u: string, base: string): string {
  try {
    return new URL(u, base).href;
  } catch {
    return u;
  }
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<{ text: string; status: number; finalUrl: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": BROWSER_UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    const text = res.ok ? await res.text() : "";
    return { text, status: res.status, finalUrl: res.url };
  } catch {
    return { text: "", status: 0, finalUrl: url };
  } finally {
    clearTimeout(t);
  }
}

// eBay blocks direct server fetches (403). Microlink unfurls the page on its
// own infrastructure and returns the real og:image — use it as a fallback.
async function microlinkImage(url: string): Promise<string> {
  const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(api, {
      headers: { "user-agent": BROWSER_UA, accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return "";
    const data = await res.json();
    const img = data?.data?.image?.url || data?.data?.logo?.url || "";
    return typeof img === "string" ? img : "";
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

// SSRF guard: only allow eBay listing/image hosts, and block any private,
// loopback, link-local, or cloud-metadata endpoints even if an attacker
// somehow supplies an IP-literal or internal hostname.
function isPrivateOrInternalHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "169.254.169.254" ||
    h === "metadata.google.internal" ||
    h === "metadata" ||
    h.endsWith(".internal") ||
    h.endsWith(".localhost") ||
    h === "localhost"
  ) {
    return true;
  }
  const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ip) {
    const o = [Number(ip[1]), Number(ip[2]), Number(ip[3]), Number(ip[4])];
    if (o.some((n) => n > 255)) return true;
    if (o[0] === 10 || o[0] === 127 || o[0] === 0) return true;
    if (o[0] === 169 && o[1] === 254) return true;
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;
    if (o[0] === 192 && o[1] === 168) return true;
    return false;
  }
  if (h === "::1" || h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

function isAllowedTarget(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  if (isPrivateOrInternalHost(host)) return false;
  // Allow only known eBay listing/image domains (apex + subdomains). Strict
  // exact-domain matching avoids substring/regex flaws that let
  // "evil.ebay.attacker.com" or "notebayimg.com" slip through.
  const EBAY_DOMAINS = [
    "ebay.com", "ebay.co.uk", "ebay.de", "ebay.fr", "ebay.it", "ebay.es",
    "ebay.com.au", "ebay.ca", "ebay.at", "ebay.be", "ebay.ch", "ebay.ie",
    "ebay.nl", "ebay.pl", "ebay.com.hk", "ebay.com.sg", "ebay.com.my",
    "ebay.ph", "ebay.in", "ebay.com.tw", "ebayimg.com",
  ];
  return EBAY_DOMAINS.some((d) => host === d || host.endsWith("." + d));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body: { urls?: string[] } = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const urls: string[] = Array.isArray(body.urls) ? body.urls.filter((u) => typeof u === "string" && u) : [];
    if (!urls.length) return Response.json({ images: {} });

    const results = await Promise.all(
      urls.map(async (url) => {
        if (!isAllowedTarget(url)) return [url, ""] as [string, string];
        const { text, finalUrl } = await fetchWithTimeout(url);
        let image = text ? extractImage(text, finalUrl) : "";
        if (!image) image = await microlinkImage(url);
        return [url, image] as [string, string];
      })
    );
    const images: Record<string, string> = {};
    for (const [url, image] of results) if (image) images[url] = image;
    return Response.json({ images });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});