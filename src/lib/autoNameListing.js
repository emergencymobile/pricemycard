import { base44 } from "@/api/base44Client";

const ITEM_TYPE_LABEL = {
  single_card: "Card",
  pack: "Pack",
  box: "Box",
  case: "Case",
  lot: "Lot",
  memorabilia: "Memorabilia",
  unknown: "",
};

// Maps a detected item_type to the Listing.category enum.
export function categoryForItemType(itemType) {
  return ({
    single_card: "Singles",
    pack: "Packs",
    box: "Boxes",
    case: "Cases",
    lot: "Lots",
    memorabilia: "Memorabilia",
  })[itemType] || null;
}

// Builds a listing title in the app's standard format, for any product type:
//  - Single card: "Player Manufacturer Set Parallel Auto/Patch/RC /Serial"
//  - Pack/Box/Case: "Manufacturer Set Season PackDescription" (e.g. "Topps Match Attax 2025/26 12-Card Pack")
//  - Lot: "Manufacturer Set PackDescription Lot"
//  - Memorabilia: "Player Team Memorabilia"
export function buildListingTitle(d) {
  const type = d.item_type || "single_card";

  if (type === "pack" || type === "box" || type === "case") {
    const parts = [d.manufacturer, d.card_set, d.season, d.pack_description || ITEM_TYPE_LABEL[type]];
    const title = parts.filter(Boolean).join(" ").trim();
    if (title) return title;
  }

  if (type === "lot") {
    const parts = [d.manufacturer, d.card_set, d.season, d.pack_description, "Lot"];
    const title = parts.filter(Boolean).join(" ").trim();
    if (title) return title;
  }

  if (type === "memorabilia") {
    const parts = [d.player_name, d.team, d.pack_description, "Memorabilia"];
    const title = parts.filter(Boolean).join(" ").trim();
    if (title) return title;
  }

  // Default: single card (or unknown with a player name).
  if (!d.player_name) return "";
  const parts = [d.player_name];
  if (d.manufacturer) parts.push(d.manufacturer);
  if (d.card_set) parts.push(d.card_set);
  if (d.parallel) parts.push(d.parallel);
  const feats = [];
  if (d.is_autograph) feats.push("Auto");
  if (d.is_patch) feats.push("Patch");
  if (d.is_rookie) feats.push("RC");
  if (feats.length) parts.push(feats.join(" "));
  if (d.serial_number) parts.push(`/${d.serial_number}`);
  return parts.filter(Boolean).join(" ");
}

/**
 * Analyzes a product photo with vision AI (via a backend function that runs
 * the LLM call server-side). Returns { ...detectedFields, title, confident }.
 */
export async function analyzeCardImage(imageUrl) {
  const res = await base44.functions.invoke("analyzeCardImage", { image_url: imageUrl });
  const data = res.data;
  data.title = buildListingTitle(data);
  return data;
}