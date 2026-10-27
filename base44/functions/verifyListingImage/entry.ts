import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SCHEMA = {
  type: "object",
  properties: {
    relevant: { type: "boolean" },
    confidence: { type: "number" },
    mismatches: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

const PROMPT = `You are verifying a marketplace trading-card listing. Compare the
SELLER-ENTERED details against what is actually VISIBLE in the attached product
photo. Decide whether the entered details are relevant and consistent with the
photo.

Rules:
- Set "relevant" = true when the entered player name, manufacturer, set,
  parallel, and item type broadly match what is shown on the card/product.
  Minor missing fields or slightly different wording are acceptable.
- Set "relevant" = false when the details clearly contradict the photo, e.g.
  the photo shows a different player, a different sport/league, a different
  manufacturer or set, or the photo is not a trading-card product while the
  details describe one.
- If the photo is too blurry or dark to read, set "relevant" = true (do not
  block on an unreadable image) and mention it in "summary".
- Put each concrete contradiction in "mismatches" as a short phrase, e.g.
  "Photo shows Panini, details say Topps" or "Photo shows Messi, details say
  Ronaldo". Use an empty array when everything matches.
- "summary": one short sentence explaining the verdict.
- "confidence": your confidence in the verdict, 0 to 1.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const imageUrl = body.image_url;
    const details = body.details || {};
    if (!imageUrl) return Response.json({ error: 'image_url required' }, { status: 400 });

    const detailsText = [
      `Category: ${details.category || "(none)"}`,
      `Title: ${details.title || "(none)"}`,
      `Player: ${details.player_name || "(none)"}`,
      `Team: ${details.team || "(none)"}`,
      `Nationality: ${details.nationality || "(none)"}`,
      `Season: ${details.season || "(none)"}`,
      `Manufacturer: ${details.manufacturer || "(none)"}`,
      `Card set: ${details.card_set || "(none)"}`,
      `Parallel: ${details.parallel || "(none)"}`,
      `Serial: ${details.serial_number || "(none)"}`,
      `Autograph: ${details.is_autograph ? "yes" : "no"}`,
      `Patch: ${details.is_patch ? "yes" : "no"}`,
      `Rookie: ${details.is_rookie ? "yes" : "no"}`,
    ].join("\n");

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${PROMPT}\n\nSeller-entered details:\n${detailsText}`,
      file_urls: [imageUrl],
      response_json_schema: SCHEMA,
    });

    return Response.json({
      relevant: res.relevant !== false,
      confidence: typeof res.confidence === "number" ? res.confidence : 1,
      mismatches: Array.isArray(res.mismatches) ? res.mismatches : [],
      summary: res.summary || "",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}