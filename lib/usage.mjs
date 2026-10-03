// Daily AI usage caps, kept in the host's key-value store (see lib/store.mjs).
import { openStore } from "./store.mjs";

const store = () => openStore("ai-usage");
const today = () => new Date().toISOString().slice(0, 10);

/** Bump a counter; returns the new value. A race can let one extra call through, which is fine for a cap. */
async function bump(key) {
  const n = await store().update(key, (cur) => ({ n: (cur?.n || 0) + 1 })).catch(() => null);
  return n ? n.n : Infinity;
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
  const s = store(), d = today(); let n = 0;
  for (const k of await s.keys().catch(() => [])) if (!k.includes(`:${d}`)) { await s.del(k).catch(() => {}); n++; }
  return n;
}
