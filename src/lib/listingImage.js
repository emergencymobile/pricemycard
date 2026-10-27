// Validates that an external listing's image_url is a real, directly-loadable
// product photo (not a listing page URL, a data URI, or a random stock image
// the LLM hallucinated). Returns the cleaned URL or "".
const KNOWN_IMAGE_HOSTS = [
  "i.ebayimg.com",
  "i.ebtstatic.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images.comc.com",
  "comc.com",
  "pwccmarketplace",
  "goldinimages",
  "storage.googleapis.com",
  "ha.com",
  "pristineauction",
  "my-slabs",
  "myslabs",
  "cloudfront.net",
  "goldin.co",
  "pwccmarketplace.com",
  "microlink.io",
];
// Hosts that are never the real listing photo (search engines, social, stock).
const BAD_HOSTS = [
  "google.com",
  "gstatic.com",
  "googleapis.com",
  "wikimedia.org",
  "wikipedia.org",
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "pinimg.com",
  "unsplash.com",
  "shutterstock.com",
  "istockphoto.com",
  "alamy.com",
  "gettyimages.com",
  "bing.com",
  "duckduckgo.com",
];

export function cleanListingImage(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (/^data:/i.test(trimmed)) return "";
  let u;
  try {
    u = new URL(trimmed);
  } catch {
    return "";
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (BAD_HOSTS.some((b) => host.includes(b))) return "";
  const isImage =
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u.pathname) ||
    KNOWN_IMAGE_HOSTS.some((h) => host.includes(h));
  if (!isImage) return "";
  return u.href;
}