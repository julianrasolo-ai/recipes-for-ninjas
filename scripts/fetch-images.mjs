// Downloads the Higgsfield photos listed in the manifests below and resizes them.
// Runs on every Netlify build; skips files that already exist. If anything fails the site falls back
// to the CDN copy (then an emoji tile), so a failed download never breaks the build.
import { readFile, access, mkdir, writeFile } from "node:fs/promises";

const SETS = [
  { manifest: "data/juice-images.json", dir: "img/juice", ext: "jpg", size: 600 },
  { manifest: "data/home-images.json", dir: "img/home", ext: "webp" }, // webp keeps the ninja cutout's transparency
];
let sharp = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("sharp not installed, skipping image download"); process.exit(0); }

for (const set of SETS) {
  const manifest = JSON.parse(await readFile(set.manifest, "utf8"));
  await mkdir(set.dir, { recursive: true });
  let ok = 0, skipped = 0, failed = 0;
  await Promise.all(Object.entries(manifest).map(async ([id, { src, size }]) => {
    const out = `${set.dir}/${id}.${set.ext}`;
    try { await access(out); skipped++; return; } catch {}
    try {
      const r = await fetch(src);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const img = sharp(Buffer.from(await r.arrayBuffer()));
      const px = size || set.size;
      const resized = set.ext === "jpg"
        ? img.resize(px, px, { fit: "cover" }).jpeg({ quality: 78, progressive: true, mozjpeg: true })
        : img.resize(px, px, { fit: "inside" }).webp({ quality: 82, alphaQuality: 90 });
      await writeFile(out, await resized.toBuffer());
      ok++;
    } catch (e) { failed++; console.warn(`  ${id}: ${e.message}`); }
  }));
  console.log(`${set.dir}: ${ok} downloaded, ${skipped} already present, ${failed} failed`);
}
