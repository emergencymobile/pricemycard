import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SCHEMA = {
  type: "object",
  properties: {
    description: { type: "string" },
    suggested_title: { type: "string" },
    suggested_price: { type: "number" },
  },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const playerName = body.player_name || "unknown";
    const title = body.title || "N/A";
    const team = body.team || "N/A";
    const condition = body.condition || "N/A";

    const prompt = `Generate a detailed product listing description for a soccer trading card. Player: ${playerName}. Title: ${title}. Team: ${team}. Condition: ${condition}. Include compelling selling points, card highlights, and collector appeal. Keep it concise (3-4 sentences).`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SCHEMA,
    });

    return Response.json({
      description: res.description || "",
      suggested_title: res.suggested_title || "",
      suggested_price: typeof res.suggested_price === "number" ? res.suggested_price : null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}