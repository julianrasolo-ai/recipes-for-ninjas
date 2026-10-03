// Cloudflare Pages adapter: KV-backed store + env bridge, used by functions/api/[[path]].js.
import { setStoreFactory } from "./store.mjs";

let kv = null;
setStoreFactory((name) => kv && {
  get: (k) => kv.get(`${name}:${k}`, "json"),
  set: (k, v) => kv.put(`${name}:${k}`, JSON.stringify(v)),
  // KV has no compare-and-set; for favorites and rate-limit counters, last write wins is acceptable.
  async update(k, fn) { const next = fn(await kv.get(`${name}:${k}`, "json")); await kv.put(`${name}:${k}`, JSON.stringify(next)); return next; },
  async keys() {
    const out = []; let cursor;
    do { const r = await kv.list({ prefix: `${name}:`, cursor }); out.push(...r.keys.map((x) => x.name.slice(name.length + 1))); cursor = r.list_complete ? null : r.cursor; } while (cursor);
    return out;
  },
  del: (k) => kv.delete(`${name}:${k}`),
});

/** Make Cloudflare env vars/secrets visible as process.env (the shared code reads process.env) and bind KV. */
export function useEnv(env) {
  kv = env.RFN_KV || null;
  globalThis.process ??= { env: {} };
  process.env ??= {};
  for (const [k, v] of Object.entries(env)) if (typeof v === "string") process.env[k] = v;
}
