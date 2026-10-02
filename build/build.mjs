// Static site generator: data/*.json -> dist/
// Run: node build/build.mjs   (npm run build also fetches images first)
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as T from "./templates.mjs";

const ROOT = process.cwd(), OUT = join(ROOT, "dist");
const readJSON = async (p) => JSON.parse(await readFile(join(ROOT, p), "utf8"));

const site = await readJSON("data/site.json");
site.url = (process.env.URL || site.url || "").replace(/\/$/, "");
const appliances = await readJSON("data/appliances.json");
const catalog = await readJSON("data/products.json");
const images = await readJSON("data/images.json");

// Products: one record per item; pages always link through /go/<id>.
const products = {};
for (const p of catalog.products) {
  const key = /^\/img\/(.+)\.(?:webp|jpg)$/.exec(p.image || "")?.[1], im = key && images[key];
  products[p.id] = { ...p, href: p.url ? `/go/${p.id}` : "", cdn: im ? (im.ext === "webp" ? im.src : im.min) : "" };
}

// Recipes, normalised with their URL and appliance.
const all = [];
for (const a of appliances) {
  const D = await readJSON(`data/recipes/${a.key}.json`);
  a.data = D;
  a.url = `/${a.key}/`;
  a.catMap = Object.fromEntries(D.cats.map((c) => [c.k, c]));
  a.benMap = Object.fromEntries((D.bens || []).map((b) => [b[0], b]));
  for (const r of D.recipes) {
    r.url = `/${a.key}/${r.slug}/`;
    r.appliance = a.key;
    const im = images[`${a.imgDir}/${r.id}`];
    if (im) r.cdn = im.min;
    all.push({ r, a });
  }
}

const pages = [];
const page = (path, html) => pages.push([path, html]);
const ctx = { site, appliances, products, all, images };

// Hubs, recipe pages, category pages
for (const a of appliances) {
  page(a.url, T.hub(ctx, a));
  for (const r of a.data.recipes) page(r.url, T.recipe(ctx, a, r));
  for (const c of a.data.cats) page(`/${a.key}/category/${c.k}/`, T.category(ctx, a, c));
}

// Tag pages: benefits + diet flags across every appliance
const tags = {};
const addTag = (k, label, emoji, item) => ((tags[k] ||= { k, label, emoji, items: [] }).items.push(item));
for (const it of all) {
  for (const b of it.r.ben || []) { const B = it.a.benMap[b]; if (B) addTag(b, B[2], B[1], it); }
  if (it.r.healthy) addTag("healthy", "Healthy & light", "🌿", it);
  if (it.r.dfree || (it.r.flags || []).includes("dairy-free")) addTag("dairy-free", "Dairy-free", "🥥", it);
}
for (const t of Object.values(tags)) page(`/tags/${t.k}/`, T.tag(ctx, t));
ctx.tags = Object.values(tags);

page("/", T.home(ctx, await readFile(join(ROOT, "index.html"), "utf8")));
page("/search/", T.search(ctx));
page("/gear/", T.gear(ctx, catalog));
page("/shop/", T.shop(ctx, catalog));
page("/privacy/", T.legal(ctx, "privacy"));
page("/terms/", T.legal(ctx, "terms"));
page("/disclosure/", T.legal(ctx, "disclosure"));
page("/404.html", T.notFound(ctx));
page("/thanks/", T.thanks(ctx));

// ---- write ----
await rm(OUT, { recursive: true, force: true });
for (const dir of ["assets", "img"]) await cp(join(ROOT, dir), join(OUT, dir), { recursive: true });
await cp(join(ROOT, "favicon.svg"), join(OUT, "favicon.svg"));
for (const [path, html] of pages) {
  const file = path.endsWith(".html") ? join(OUT, path) : join(OUT, path, "index.html");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

// Data the browser needs: per-appliance recipe JSON (tools sheets) and the site-wide search index.
await mkdir(join(OUT, "data"), { recursive: true });
for (const a of appliances) await writeFile(join(OUT, "data", `${a.key}.json`), JSON.stringify(a.data));
await writeFile(join(OUT, "search-index.json"), JSON.stringify(all.map(({ r, a }) => ({
  t: r.title, u: r.url, a: a.key, c: a.catMap[r.cat]?.n || "", i: r.img, cdn: r.cdn || "", e: r.emoji,
  s: [r.title, r.blurb, r.ing.join(" "), (r.ben || []).map((b) => a.benMap[b]?.[2]).join(" "), a.name, a.catMap[r.cat]?.n].join(" ").toLowerCase(),
}))));

// SEO + routing
const urls = pages.map(([p]) => p).filter((p) => !p.endsWith(".html"));
await writeFile(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${site.url}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
const withTag = (url) => {
  if (!site.affiliate.amazonTag || !/amazon\./.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "tag=" + encodeURIComponent(site.affiliate.amazonTag);
};
const redirects = [
  "/ice-cream/*  /creami/  301",
  "/juice/*  /juicer/  301",
  ...Object.values(products).filter((p) => p.url).map((p) => `/go/${p.id}  ${withTag(p.url)}  302`),
];
await writeFile(join(OUT, "_redirects"), redirects.join("\n") + "\n");

console.log(`built ${pages.length} pages, ${all.length} recipes -> dist/`);
