# Recipes for Ninjas

Family recipe site for four Ninja machines. The homepage is an animated kitchen: a ninja chef with fruit orbiting around him; tap a machine and he throws its ingredients in, then the recipes open.

| Hub | Machine | Recipes |
|---|---|---|
| `/creami/` | Ninja Swirl by CREAMi | 78 |
| `/juicer/` | Ninja NeverClog Cold Press Juicer | 42 |
| `/blender/` | Ninja Detect Power Blender Pro | 24 |
| `/wood-fire/` | Ninja Woodfire Outdoor Grill & Smoker | 24 |

Every recipe has its own page (`/blender/strawberry-banana/`) with Google Recipe schema, plus category pages, tag pages (`/tags/energy/`), site-wide search (`/search/`), a gear hub (`/gear/`), a shop (`/shop/`) and legal pages. Favorites for the family sync across devices.

## Run locally

Needs Node 20+ (https://nodejs.org, LTS installer).

```bash
npm install
npm run dev        # builds dist/ and serves http://localhost:8888
```

`npm run build` also downloads and resizes the Higgsfield images (runs on Netlify). Locally, images that aren't downloaded load from the Higgsfield CDN instead.

## Deploy (Netlify)

Import the GitHub repo in Netlify. Settings come from `netlify.toml` (build `npm run build`, publish `dist`). Favorites use Netlify Blobs through `netlify/functions/likes.mjs`; nothing to set up.

## Where things live

```
data/site.json            switches: ads, consent, analytics, email, members, shop, affiliate tag
data/appliances.json      the four machines: names, labels, colours, homepage throw items
data/recipes/*.json       recipes (one file per machine)
data/products.json        every product + affiliate URL (one place); pages link via /go/<id>
data/images.json          Higgsfield image sources
build/                    static site generator (build.mjs + templates.mjs)
assets/                   CSS + browser JS (app, recipe, search, site, likes)
index.html                homepage scene (copied through the build)
netlify/functions/likes.mjs  favorites API
```

### Recipe fields
`title, blurb, cat, ing[], steps[], prep, cook, makes, press, chips[], notes[[label,text]], tags[] (ingredients for "What I have"), ben[] (benefits), healthy, gear[] (product ids), video (YouTube/TikTok/Instagram URL), members (true = members only), img`.

## Monetization: flip a switch in `data/site.json`, push, done

| Feature | How to turn it on |
|---|---|
| **Affiliate links** | Set `affiliate.amazonTag`; edit URLs in `data/products.json`. Disclosure shows in footer and next to links. Clicks tracked as `affiliate_click`. |
| **Ads** | `ads.enabled: true`, set `client` and slot IDs. Slots on recipe pages (in-content + desktop sidebar) and hubs reserve their height, so no layout shift. Load only after consent. |
| **Consent banner** | On automatically when ads or analytics are on. "Cookie settings" in the footer reopens it. |
| **Analytics** | `analytics.enabled: true` + `plausibleDomain` or `ga4Id`. Events: `affiliate_click`, `signup`, `share`, `checkout_start`. |
| **Email list** | `email.enabled: true`. `provider: "netlify"` collects signups in Netlify Forms with no account; for Beehiiv/ConvertKit set `action` to their form URL. Optional popup and lead magnet (`leadMagnet.url` = your PDF). |
| **Members** | `members.enabled: true` and `"members": true` on a recipe. Today the gate is visual only; real enforcement needs a login provider (e.g. Netlify Identity/Supabase + an edge function). |
| **Shop / Stripe** | `shop.enabled: true`; add items to `products.json` → `digital` with a Stripe Payment Link as `checkoutUrl`. Emailed secure downloads and order records need a Stripe webhook function (not built yet). |
| **Physical products** | Add to `products.json` with `kind: "accessory"` and a Shopify/dropship link; they appear on `/gear/`. |
| **Video** | Add `"video": "https://www.tiktok.com/..."` to a recipe; it embeds and is added to the schema. |
