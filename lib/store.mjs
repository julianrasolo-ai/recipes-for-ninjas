// Tiny key-value store used by likes and AI usage counters. The host plugs in its backend:
// Netlify Blobs (netlify/functions/_store.mjs) or Cloudflare KV (lib/cf.mjs). Falls back to memory (local dev, tests).
let factory = null;
export function setStoreFactory(fn) { factory = fn; }

function memoryStore() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
    async set(k, v) { m.set(k, structuredClone(v)); },
    async update(k, fn) { const next = fn(m.has(k) ? structuredClone(m.get(k)) : null); m.set(k, structuredClone(next)); return next; },
    async keys() { return [...m.keys()]; },
    async del(k) { m.delete(k); },
  };
}
const memory = new Map();
export function openStore(name) {
  const s = factory && factory(name);
  if (s) return s;
  if (!memory.has(name)) memory.set(name, memoryStore());
  return memory.get(name);
}
