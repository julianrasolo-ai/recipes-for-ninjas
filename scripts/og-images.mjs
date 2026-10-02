// Builds 1200x630 share cards into img/og/: a home banner and one per recipe.
// Runs after fetch-images on Netlify; skips anything whose source photo isn't on disk.
import { readFile, mkdir, access } from "node:fs/promises";
import sharp from "sharp";

const W = 1200, H = 630, FONT = "DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif";
const has = (p) => access(p).then(() => true, () => false);
const x = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function wrap(text, max) {
  const lines = []; let line = "";
  for (const w of text.split(" ")) { if ((line + " " + w).trim().length > max && line) { lines.push(line); line = w; } else line = (line + " " + w).trim(); }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
const rounded = (w, h, r) => Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
async function roundImg(src, size, r = 36) {
  return sharp(src).resize(size, size, { fit: "cover" }).composite([{ input: rounded(size, size, r), blend: "dest-in" }]).png().toBuffer();
}

// favicon PNGs from the SVG
const fav = await readFile("favicon.svg");
await sharp(fav).resize(32, 32).png().toFile("favicon-32.png");
await sharp(fav).resize(180, 180).png().toFile("apple-touch-icon.png");

const site = JSON.parse(await readFile("data/site.json", "utf8"));
const host = site.url.replace(/^https?:\/\//, "");
const appliances = JSON.parse(await readFile("data/appliances.json", "utf8"));
await mkdir("img/og", { recursive: true });

/* ---- home banner ---- */
{
  const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="a" cx="72%" cy="48%" r="55%"><stop offset="0" stop-color="#fffaf2"/><stop offset=".6" stop-color="#ffe9d6"/><stop offset="1" stop-color="#fff4e8"/></radialGradient>
  <radialGradient id="p" cx="0" cy="0" r="70%"><stop offset="0" stop-color="#ffd9e8"/><stop offset="1" stop-color="#ffd9e8" stop-opacity="0"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#p)"/>
  <circle cx="860" cy="300" r="250" fill="#ffe2c4"/>
  <text x="70" y="120" font-family="${FONT}" font-size="30" font-weight="700" fill="#ff4f9a">${x(site.name)}</text>
  <text x="70" y="215" font-family="${FONT}" font-size="76" font-weight="800" fill="#22174a">What are we</text>
  <text x="70" y="305" font-family="${FONT}" font-size="76" font-weight="800" fill="#ff4f9a">making?</text>
  <text x="70" y="380" font-family="${FONT}" font-size="30" font-weight="600" fill="#6b5f8f">Ice cream · Juice · Smoothies · BBQ</text>
  <text x="70" y="425" font-family="${FONT}" font-size="30" font-weight="600" fill="#6b5f8f">for your Ninja machines</text>
  <rect x="70" y="490" width="${host.length * 17 + 48}" height="58" rx="29" fill="#22174a"/>
  <text x="94" y="529" font-family="${FONT}" font-size="26" font-weight="700" fill="#fff">${x(host)}</text></svg>`);
  const layers = [];
  if (await has("img/home/ninja.webp")) {
    layers.push({ input: await sharp("img/home/ninja.webp").resize({ height: 540 }).png().toBuffer(), top: 60, left: 690 });
  } else if (await has("img/ice/hero.jpg")) {
    layers.push({ input: await roundImg("img/ice/hero.jpg", 440, 220), top: 95, left: 650 });
  }
  await sharp(bg).composite(layers).jpeg({ quality: 84, mozjpeg: true }).toFile("img/og/home.jpg");
}

/* ---- one card per recipe ---- */
let made = 0, skipped = 0;
for (const a of appliances) {
  const D = JSON.parse(await readFile(`data/recipes/${a.key}.json`, "utf8"));
  await mkdir(`img/og/${a.key}`, { recursive: true });
  for (const r of D.recipes) {
    const src = r.img.replace(/^\//, "");
    if (!(await has(src))) { skipped++; continue; }
    const back = await sharp(src).resize(W, H, { fit: "cover" }).blur(28).modulate({ brightness: 0.55 }).toBuffer();
    const photo = await roundImg(src, 500);
    const lines = wrap(r.title, 17);
    const text = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="600" y="0" width="600" height="${H}" fill="#000" fill-opacity=".18"/>
      <text x="620" y="150" font-family="${FONT}" font-size="28" font-weight="700" fill="#ffd28a">${x(a.brand.toUpperCase())}</text>
      ${lines.map((l, i) => `<text x="620" y="${235 + i * 72}" font-family="${FONT}" font-size="62" font-weight="800" fill="#fff">${x(l)}</text>`).join("")}
      <text x="620" y="${255 + lines.length * 72}" font-family="${FONT}" font-size="26" font-weight="600" fill="#f2e9ff">${x(r.chips.slice(0, 2).join(" · "))}</text>
      <text x="620" y="560" font-family="${FONT}" font-size="26" font-weight="700" fill="#fff">${x(host)}</text></svg>`);
    await sharp(back).composite([{ input: photo, top: 65, left: 60 }, { input: text, top: 0, left: 0 }]).jpeg({ quality: 82, mozjpeg: true }).toFile(`img/og/${a.key}/${r.slug}.jpg`);
    made++;
  }
}
console.log(`share cards: home + ${made} recipes (${skipped} skipped, photo not downloaded)`);
