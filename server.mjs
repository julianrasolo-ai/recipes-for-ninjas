// Local dev server: serves the site and a file-backed /api/likes (same API as the Netlify function).
// Run: npm start  ->  http://localhost:8888
import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { applyToggle, validate } from "./lib/likes-core.mjs";

const ROOT = process.cwd();
const SITE = join(ROOT, "dist"); // run `npm run build` first
const PORT = Number(process.env.PORT) || 8888;
const DB = join(ROOT, ".data", "likes.json");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };

async function readDb() { try { return JSON.parse(await readFile(DB, "utf8")); } catch { return {}; } }
const send = (res, status, body, type = "application/json") => { res.writeHead(status, { "content-type": type, "cache-control": "no-store" }); res.end(body); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/likes") {
    const db = await readDb();
    if (req.method === "GET") {
      const s = url.searchParams.get("s");
      if (validate({ s, id: "x", p: "Julian", on: true })) return send(res, 400, '{"error":"Unknown section"}');
      return send(res, 200, JSON.stringify({ likes: db[s] || {} }));
    }
    let body = ""; for await (const c of req) body += c;
    let op; try { op = JSON.parse(body); } catch { return send(res, 400, '{"error":"Invalid JSON"}'); }
    const err = validate(op); if (err) return send(res, 400, JSON.stringify({ error: err }));
    db[op.s] = applyToggle(db[op.s] || {}, op);
    await mkdir(join(ROOT, ".data"), { recursive: true });
    await writeFile(DB, JSON.stringify(db, null, 1));
    return send(res, 200, JSON.stringify({ likes: db[op.s] }));
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(SITE, p);
  if (!file.startsWith(SITE)) return send(res, 403, "Forbidden", "text/plain");
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch {}
  try { send(res, 200, await readFile(file), TYPES[extname(file)] || "application/octet-stream"); }
  catch { send(res, 404, await readFile(join(SITE, "404.html")).catch(() => "Not found"), "text/html; charset=utf-8"); }
}).listen(PORT, () => console.log(`Recipes for Ninjas on http://localhost:${PORT}`));
