// Netlify backend for lib/store.mjs: Netlify Blobs with an etag check on updates.
import { getStore } from "@netlify/blobs";
import { setStoreFactory } from "../../lib/store.mjs";

setStoreFactory((name) => {
  let b;
  try { b = getStore({ name, consistency: "strong" }); } catch { return null; } // not on Netlify (local dev): use memory
  return {
    get: (k) => b.get(k, { type: "json" }),
    set: (k, v) => b.setJSON(k, v),
    async update(k, fn) {
      for (let i = 0; i < 5; i++) {
        const cur = await b.getWithMetadata(k, { type: "json" });
        const next = fn(cur?.data ?? null);
        const res = await b.setJSON(k, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
        if (!res || res.modified !== false) return next;
      }
      return null;
    },
    async keys() { return ((await b.list()).blobs || []).map((x) => x.key); },
    del: (k) => b.delete(k),
  };
});
