// Downloads the Higgsfield juice photos listed in data/juice-images.json into img/juice/*.jpg (600px).
// Runs on every Netlify build; skips files that already exist. If anything fails the site falls back
// to the CDN copy, then to an emoji tile, so a failed download never breaks the build.
import { readFile, access, mkdir, writeFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("data/juice-images.json", "utf8"));
await mkdir("img/juice", { recursive: true });
let sharp = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("sharp not installed, skipping image download"); process.exit(0); }

let ok = 0, skipped = 0, failed = 0;
await Promise.all(Object.entries(manifest).map(async ([id, { src }]) => {
  const out = `img/juice/${id}.jpg`;
  try { await access(out); skipped++; return; } catch {}
  try {
    const r = await fetch(src);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await writeFile(out, await sharp(buf).resize(600, 600, { fit: "cover" }).jpeg({ quality: 78, progressive: true, mozjpeg: true }).toBuffer());
    ok++;
  } catch (e) { failed++; console.warn(`  ${id}: ${e.message}`); }
}));
console.log(`juice images: ${ok} downloaded, ${skipped} already present, ${failed} failed`);
