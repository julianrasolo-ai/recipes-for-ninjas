# Recipes for Ninjas

Family recipe site. The homepage is an animated kitchen: a ninja chef with fruit and ice floating around him. Tap a machine and its ingredients fly into it, then the recipes open.

- **Ice cream** (`/ice-cream/`): 78 Ninja Swirl by CREAMi recipes, carried over from the original single-file site.
- **Juice** (`/juice/`): 42 Ninja NeverClog cold-press juices, filterable by ingredient and by benefit (energy, immunity, digestion, hydration and more).

Both sections share the same design and features: menu tabs on one line (even at 320px), search, "What I have" picker, per-section shopping lists, and favorites for Julian, Charlyne, Leanne and Noah that sync across devices.

## Run locally

No Node? `python3 -m http.server 8888` works too (favorites then stay on that device).

```bash
npm install
npm start          # http://localhost:8888
```

`server.mjs` serves the site and a file-backed `/api/likes` (stored in `.data/likes.json`, git-ignored), so favorites work locally exactly like in production.

## Deploy to Netlify (one time, about 2 minutes)

1. Netlify → **Add new site → Import an existing project → GitHub** → pick `recipes-for-ninjas`.
2. Branch: the one you want live. Build settings come from `netlify.toml`, so leave them as they are.
3. Deploy. Every push to that branch redeploys.

Favorites use **Netlify Blobs** through `netlify/functions/likes.mjs`. It's free, needs no extra account and has no setup. The build step (`npm run build`) downloads the juice photos from Higgsfield into `img/juice/` and resizes them to 600px. If a download fails, the page falls back to the Higgsfield CDN copy, then to an emoji tile.

## Project layout

```
index.html                 landing screen
ice-cream/, juice/         section pages (generated: python3 scripts/pages.py)
scripts/section.template.html  shared page template
assets/app.css, app.js     shared design and app logic
assets/likes.js            favorites sync client (offline queue + 30s refresh)
data/ice.json, juice.json  recipes
data/juice-images.json     Higgsfield photo URLs (juice recipes)
data/home-images.json      Higgsfield homepage assets (ninja, machines, fruit)
img/ice/                   ice cream photos (extracted from the original file)
netlify/functions/likes.mjs  favorites API (Netlify Blobs)
lib/likes-core.mjs         validation + toggle logic shared by API and dev server
.claude/skills/            taste-skill, redesign-skill, scroll-craft (MIT)
```

To edit a recipe, change the JSON in `data/`. To change page text, edit `scripts/pages.py` or the template, then run `npm run pages`.

## Notes

- Juice recipes are original write-ups of common combinations, informed by the Ninja NeverClog usage guidance (2-inch pieces, peel citrus, black filter = less pulp, orange filter = lots of pulp) and popular recipes online. Benefit tags are general nutrition info, not medical advice.
- The "NC701" PDF provided is the Ninja Swirl manual, not the NeverClog manual, and the "100 Juices" PDF is a Froothie/Optimum book. Neither is copied here.
