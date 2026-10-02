// Shared family favorites, stored in Netlify Blobs (free, no extra account).
// GET  /api/likes?s=ice|juice           -> { likes: { recipeId: [names] } }
// POST /api/likes { s, id, p, on }      -> { likes }
import { getStore } from "@netlify/blobs";
import { applyToggle, validate } from "../../lib/likes-core.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const store = getStore({ name: "family-likes", consistency: "strong" });
  if (req.method === "GET") {
    const s = new URL(req.url).searchParams.get("s");
    const err = validate({ s, id: "x", p: "Julian", on: true });
    if (err) return json({ error: err }, 400);
    return json({ likes: (await store.get(s, { type: "json" })) || {} });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let op;
  try { op = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const err = validate(op);
  if (err) return json({ error: err }, 400);
  // Read-modify-write with an etag check so two phones tapping at once don't overwrite each other.
  for (let attempt = 0; attempt < 5; attempt++) {
    const cur = await store.getWithMetadata(op.s, { type: "json" });
    const next = applyToggle(cur?.data || {}, op);
    const res = await store.setJSON(op.s, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (!res || res.modified !== false) return json({ likes: next });
  }
  return json({ error: "Busy, try again" }, 409);
};

export const config = { path: "/api/likes" };
