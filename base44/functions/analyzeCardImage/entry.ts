import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SCHEMA = {
  type: "object",
  properties: {
    item_type: {
      type: "string",
      enum: ["single_card", "pack", "box", "case", "lot", "memorabilia", "unknown"],
    },
    player_name: { type: "string" },
    team: { type: "string" },
    nationality: { type: "string" },
    season: { type: "string" },
    competition: { type: "string" },
    manufacturer: { type: "string" },
    card_set: { type: "string" },
    parallel: { type: "string" },
    serial_number: { type: "string" },
    pack_description: { type: "string" },
    is_autograph: { type: "boolean" },
    is_patch: { type: "boolean" },
    is_rookie: { type: "boolean" },
    confident: { type: "boolean" },
  },
};

const PROMPT = `You are analyzing a photo of a soccer/football trading-card product.
First determine what the product IS — a single card, an unopened pack, a box, a
case, a lot (multiple cards), or a piece of memorabilia. Put that in "item_type".
Then read the text PRINTED on the product and identify the fields below.

Rules:
- Only fill a field if you can read it clearly from the product.
- "pack_description" describes the product format, e.g. "12-Card Pack",
  "Hobby Box", "Blaster Box", "20-Pack Box". Use it for packs/boxes/cases/lots.
- Set "confident" to true ONLY when you can read enough to name the listing:
    * single_card: confident if the player's name is clearly readable.
    * pack/box/case/lot: confident if the manufacturer OR the card set is readable.
    * memorabilia: confident if the player name or a clear item name is readable.
- If the photo is blurry, cropped, poorly lit, or you cannot read the key text,
  set "confident" to false and leave string fields empty ("").
Never guess a player name, manufacturer, or set you cannot read.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const imageUrl = body.image_url;
    if (!imageUrl) return Response.json({ error: 'image_url required' }, { status: 400 });

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: PROMPT,
      file_urls: [imageUrl],
      response_json_schema: SCHEMA,
    });

    const data = {
      item_type: res.item_type || "unknown",
      player_name: res.player_name || "",
      team: res.team || "",
      nationality: res.nationality || "",
      season: res.season || "",
      competition: res.competition || "",
      manufacturer: res.manufacturer || "",
      card_set: res.card_set || "",
      parallel: res.parallel || "",
      serial_number: res.serial_number || "",
      pack_description: res.pack_description || "",
      is_autograph: !!res.is_autograph,
      is_patch: !!res.is_patch,
      is_rookie: !!res.is_rookie,
      confident: !!res.confident,
    };
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}