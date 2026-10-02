// Daily AI usage caps, stored in Netlify Blobs (falls back to memory when Blobs isn't available, e.g. local dev).
import { getStore } from "@netlify/blobs";

const memory = new Map();
function store() {
  try { return getStore({ name: "ai-usage", consistency: "strong" }); } catch { return null; }
}
const today = () => new Date().toISOString().slice(0, 10);

/** Atomically-ish bump a counter; returns the new value. Races only ever let one extra call through. */
async function bump(key) {
  const s = store();
  if (!s) { const n = (memory.get(key) || 0) + 1; memory.set(key, n); return n; }
  for (let i = 0; i < 4; i++) {
    const cur = await s.getWithMetadata(key, { type: "json" }).catch(() => null);
    const n = (cur?.data?.n || 0) + 1;
    const res = await s.setJSON(key, { n }, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true }).catch(() => ({ modified: true }));
    if (!res || res.modified !== false) return n;
  }
  return Infinity;
}

/**
 * Check and count one AI call. who = stable visitor or user id.
 * Returns { ok, remaining, reason }.
 */
export async function takeAiCall(who, { perVisitorDaily = 8, globalDaily = 300 } = {}) {
  const d = today();
  const mine = await bump(`v:${d}:${who}`);
  if (mine > perVisitorDaily) return { ok: false, remaining: 0, reason: "visitor" };
  const all = await bump(`all:${d}`);
  if (all > globalDaily) return { ok: false, remaining: perVisitorDaily - mine, reason: "global" };
  return { ok: true, remaining: perVisitorDaily - mine };
}

/** Delete counters from previous days (visitor hashes are only kept for the current day). */
export async function pruneUsage() {
  const s = store(); if (!s) return 0;
  const d = today(); let n = 0;
  const { blobs = [] } = await s.list().catch(() => ({}));
  for (const b of blobs) if (!b.key.includes(`:${d}`)) { await s.delete(b.key).catch(() => {}); n++; }
  return n;
}
