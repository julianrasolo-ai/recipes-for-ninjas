// POST /api/chat  { meal, chips[], text }  (+ optional "Authorization: Bearer <supabase access token>")
// Returns { intro, picks:[{title,url,img,reason,...}], outside, ai, remaining }
import { createHash } from "node:crypto";
import catalog from "../../data/catalog.json" with { type: "json" };
import site from "../../data/site.json" with { type: "json" };
import { answer, cleanInput } from "../../lib/assistant.mjs";
import { loadHousehold } from "../../lib/household.mjs";
import { takeAiCall } from "../../lib/usage.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body; try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const input = cleanInput(body);
  if (!input.meal && !input.text && !input.chips.length) return json({ error: "Pick a meal or tell us what you feel like." }, 400);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || null;
  const household = await loadHousehold(token).catch(() => null);

  const ai = { enabled: !!site.ai?.enabled, model: site.ai?.model };
  let allowAi = false, remaining = null;
  if (ai.enabled && process.env.ANTHROPIC_API_KEY) {
    const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
    const who = household?.userId ? `u:${household.userId}` : `ip:${createHash("sha256").update(ip + (process.env.USAGE_SALT || "rfn")).digest("hex").slice(0, 20)}`;
    const quota = await takeAiCall(who, site.ai);
    allowAi = quota.ok; remaining = quota.remaining;
  }
  const out = await answer(input, { catalog, household, ai, allowAi });
  return json({ ...out, remaining, signedIn: !!household });
};

export const config = { path: "/api/chat" };
