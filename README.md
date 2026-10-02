# Recipes By Ninjas

Family recipe site for four Ninja machines. The homepage is an animated kitchen: a ninja chef with fruit orbiting around him; tap a machine and he throws its ingredients in, then the recipes open.

| Hub | Machine | Recipes |
|---|---|---|
| `/creami/` | Ninja Swirl by CREAMi | 78 |
| `/juicer/` | Ninja NeverClog Cold Press Juicer | 42 |
| `/blender/` | Ninja Detect Power Blender Pro | 24 |
| `/wood-fire/` | Ninja Woodfire Outdoor Grill & Smoker | 24 |

On the hubs, tapping a recipe opens the familiar pop-up sheet (and the address bar shows its page URL). Every recipe also has its own page (`/blender/strawberry-banana/`) with Google Recipe schema, plus category pages, tag pages (`/tags/energy/`), site-wide search (`/search/`), an accessories page (`/gear/`, grouped by machine, with a CREAMi pint compatibility table), a shop (`/shop/`) and legal pages. Favorites for the family sync across devices.

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
| **Affiliate links** | Accessories only (people already own the machine). Set `affiliate.amazonTag`; swap the Amazon search URLs in `data/products.json` for exact product links when you have them. Don't add Amazon prices (Amazon requires live API prices); buttons say "Check price". Clicks tracked as `affiliate_click`. |
| **Ads** | `ads.enabled: true`, set `client` and slot IDs. Slots on recipe pages (in-content + desktop sidebar) and hubs reserve their height, so no layout shift. Load only after consent. |
| **Consent banner** | On automatically when ads or analytics are on. "Cookie settings" in the footer reopens it. |
| **Analytics** | `analytics.enabled: true` + `plausibleDomain` or `ga4Id`. Events: `affiliate_click`, `signup`, `share`, `checkout_start`. |
| **Email list (Beehiiv)** | `email.enabled: true` and paste your Beehiiv subscribe form URL into `email.action`. Or `provider: "netlify"` collects signups in Netlify Forms with no account; for Beehiiv/ConvertKit set `action` to their form URL. Optional popup and lead magnet (`leadMagnet.url` = your PDF). |
| **Members** | `members.enabled: true` and `"members": true` on a recipe. Today the gate is visual only; real enforcement needs a login provider (e.g. Netlify Identity/Supabase + an edge function). |
| **Shop / Stripe** | `shop.enabled: true`; add items to `products.json` → `digital` with a Stripe Payment Link as `checkoutUrl`. Emailed secure downloads and order records need a Stripe webhook function (not built yet). |
| **Physical products** | Add to `products.json` with `kind: "accessory"` and a Shopify/dropship link; they appear on `/gear/`. |
| **Video** | Add `"video": "https://www.tiktok.com/..."` to a recipe; it embeds and is added to the schema. |

## Accounts, assistant and email ideas (setup)

Everything below is off until its keys exist, and the site works without any of it.

| Netlify environment variable | Used for |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Accounts. Build-time: turns on sign-in, the 👤 link and per-profile favorites |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: account deletion, email sending, assistant personalization |
| `ANTHROPIC_API_KEY` | Assistant explanations. Without it the assistant still answers from the library |
| `USAGE_SALT` | Any random string; hashes visitor IPs for the daily AI cap |
| `RESEND_API_KEY` | "Tonight by Ninjas" emails (daily or weekly, each person's choice) |

1. **Supabase**: create a free project and run `supabase/migrations/001_accounts.sql` in the SQL editor. Under Authentication → URL configuration, set Site URL to your domain and add `https://<domain>/account/` as a redirect. To allow Google sign-in, enable Google under Providers and add your Google OAuth client.
2. **Assistant**: settings live in `data/site.json` → `ai` (`enabled`, `model`, `perVisitorDaily`, `globalDaily`).
3. **Email ideas**: verify a sending domain in Resend (a `netlify.app` address can't be verified), then set `email.ideas.from` and `email.postalAddress` (required by anti-spam law) and `email.ideas.enabled: true`. The hourly `send-ideas` function only emails people who ticked the email box, at their chosen day and hour.
4. **Search Console**: add the site, paste the verification code into `googleSiteVerification`, push, then submit `https://<domain>/sitemap.xml`.

Tests: `npm test` (row-level security in PGlite, the assistant with a fake client, and email scheduling).
