// Shared family favorites, stored in the host's key-value store (Netlify Blobs or Cloudflare KV).
// GET  /api/likes?s=ice|juice           -> { likes: { recipeId: [names] } }
// POST /api/likes { s, id, p, on }      -> { likes }
import { openStore } from "../store.mjs";
import { applyToggle, validate } from "../likes-core.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const store = openStore("family-likes");
  if (req.method === "GET") {
    const s = new URL(req.url).searchParams.get("s");
    const err = validate({ s, id: "x", p: "Julian", on: true });
    if (err) return json({ error: err }, 400);
    return json({ likes: (await store.get(s)) || {} });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let op;
  try { op = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const err = validate(op);
  if (err) return json({ error: err }, 400);
  const next = await store.update(op.s, (cur) => applyToggle(cur || {}, op));
  return next ? json({ likes: next }) : json({ error: "Busy, try again" }, 409);
};

