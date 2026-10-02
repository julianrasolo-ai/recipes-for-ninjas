// Downloads every Higgsfield image in data/images.json into img/<key>.<ext> and resizes it.
// Runs before each Netlify build; skips files that already exist. If anything fails the site falls back
// to the CDN copy (then an emoji tile), so a failed download never breaks the build.
import { readFile, access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const manifest = JSON.parse(await readFile("data/images.json", "utf8"));
let sharp = null;
try { sharp = (await import("sharp")).default; } catch { console.warn("sharp not installed, skipping image download"); process.exit(0); }

let ok = 0, skipped = 0, failed = 0;
const entries = Object.entries(manifest);
// small batches so the CDN isn't hammered
for (let i = 0; i < entries.length; i += 8) {
  await Promise.all(entries.slice(i, i + 8).map(async ([key, { src, size = 600, ext = "jpg" }]) => {
    const out = `img/${key}.${ext}`;
    try { await access(out); skipped++; return; } catch {}
    try {
      const r = await fetch(src);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const img = sharp(Buffer.from(await r.arrayBuffer()));
      const buf = ext === "jpg"
        ? await img.resize(size, size, { fit: "cover" }).jpeg({ quality: 78, progressive: true, mozjpeg: true }).toBuffer()
        : await img.trim().resize(size, size, { fit: "inside" }).webp({ quality: 82, alphaQuality: 90 }).toBuffer(); // trim empty transparent edges
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, buf);
      ok++;
    } catch (e) { failed++; console.warn(`  ${key}: ${e.message}`); }
  }));
}
console.log(`images: ${ok} downloaded, ${skipped} already present, ${failed} failed`);
