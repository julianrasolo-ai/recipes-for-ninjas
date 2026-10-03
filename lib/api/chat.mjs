// POST /api/chat  { meal, chips[], text }  (+ optional "Authorization: Bearer <supabase access token>")
// Returns { intro, picks:[{title,url,img,reason,...}], outside, ai, remaining }
import { catalog, site } from "../generated/data.mjs";
import { answer, cleanInput } from "../assistant.mjs";
import { loadHousehold } from "../household.mjs";
import { takeAiCall } from "../usage.mjs";

const sha256 = async (t) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");
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
    const ip = context?.ip || req.headers.get("cf-connecting-ip") || req.headers.get("x-nf-client-connection-ip") || "unknown";
    const who = household?.userId ? `u:${household.userId}` : `ip:${(await sha256(ip + (process.env.USAGE_SALT || "rfn"))).slice(0, 20)}`;
    const quota = await takeAiCall(who, site.ai);
    allowAi = quota.ok; remaining = quota.remaining;
  }
  const out = await answer(input, { catalog, household, ai, allowAi });
  return json({ ...out, remaining, signedIn: !!household });
};

