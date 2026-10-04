// HTML templates. Every page goes through layout(), so header, footer, consent,
// analytics, ads and email hooks are wired once.

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const json = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

/* "5 min", "24 hours", "1 hour 30 min" -> ISO 8601 duration (PT5M) */
export function minutes(s) {
  if (!s || /none/i.test(s)) return 0;
  const h = /(\d+(?:\.\d+)?)\s*h/i.exec(s), m = /(\d+)\s*min/i.exec(s);
  return Math.round((h ? parseFloat(h[1]) * 60 : 0) + (m ? +m[1] : 0));
}
const iso = (min) => (min ? `PT${Math.floor(min / 60) ? Math.floor(min / 60) + "H" : ""}${min % 60 ? (min % 60) + "M" : ""}` : undefined);

const IMG_FALLBACK = `document.addEventListener('error',function(e){var im=e.target;if(!im||im.tagName!=='IMG')return;if(im.dataset.cdn&&im.src.indexOf(im.dataset.cdn)<0){im.src=im.dataset.cdn;return}if(im.dataset.emo){var d=document.createElement('div');d.className=(im.className?im.className+' ':'')+'emo';d.textContent=im.dataset.emo;d.setAttribute('aria-hidden','true');im.replaceWith(d)}},true);`;

export const img = (r, cls = "", lazy = true) =>
  r.img ? `<img${cls ? ` class="${cls}"` : ""} src="${r.img}" alt="${esc(r.alt || r.title)}" width="600" height="600" decoding="async"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}${r.cdn ? ` data-cdn="${r.cdn}"` : ""} data-emo="${r.emoji}">` : `<div class="emo">${r.emoji}</div>`;

/* Diets: niche ways to eat, shared by every machine. Each recipe's list comes from build.mjs (dietsOf). */
export const DIETS = [
  { k: "keto", label: "Keto & low-carb", short: "Keto", e: "🥑", lead: "Real fat, no sugar, and none of the rock-hard pints or burnt glazes keto cooks complain about.",
    pain: "Keto ice cream freezes like a brick, green juice hides 30 g of sugar, and BBQ sauce is mostly sugar. These recipes fix each of those." },
  { k: "high-protein", label: "High protein", short: "Protein", e: "💪", lead: "Protein ice cream that isn't chalky, shakes that don't clump, and grill plates around 40 g.",
    pain: "Protein pints come out powdery and shakes leave dry pockets of powder. Every recipe here says exactly how to avoid that." },
  { k: "dairy-free", label: "Dairy-free", short: "Dairy-free", e: "🥥", lead: "Creamy without milk. Coconut cream, oat and soy do the work.",
    pain: "Dairy-free pints usually turn icy because plant milks are mostly water. The fat has to come from somewhere else." },
  { k: "vegan", label: "Vegan", short: "Vegan", e: "🌱", lead: "No animal products, plenty of protein and real mains for the grill.",
    pain: "Plant protein tastes gritty and grilled veg dries out. These recipes are built around those two problems." },
  { k: "low-sugar", label: "Low sugar", short: "Low sugar", e: "🍬", lead: "Sweet enough for the kids, without the sugar crash.",
    pain: "Most juices and frozen treats are dessert in disguise. These keep sugar low without tasting like a diet." },
  { k: "21+", label: "21+ boozy", short: "21+", e: "🍸", lead: "Boozy ice cream, fresh-pressed cocktails and grilled desserts for grown-up nights.",
    pain: "Alcohol doesn't freeze and cooks off less than people think. Each recipe gives the strength and keeps it adults-only." },
];
export const dietMap = Object.fromEntries(DIETS.map((d) => [d.k, d]));
const dietSlug = (k) => (k === "21+" ? "21-plus" : k);
export const dietUrl = (k) => `/diet/${dietSlug(k)}/`;

/* ---------- layout ---------- */
function publicConfig(site) {
  const { ads, consent, analytics, email, members, shop, affiliate, family, supabase, ai } = site;
  return { ads, consent, analytics, email: { ...email, ideas: undefined, postalAddress: undefined }, members, shop, family, supabase, ai: { enabled: !!ai?.enabled }, disclosure: affiliate.disclosure };
}

export function layout(ctx, o) {
  const { site } = ctx;
  const title = o.title ? `${o.title} · ${site.name}` : site.name;
  const url = site.url + (o.path || "/");
  // Share card: recipe pages pass their own 1200x630 card (or photo); everything else uses the home banner.
  const ogRel = o.image || ctx.og.home;
  const og = ogRel.startsWith("http") ? ogRel : site.url + ogRel;
  const ogBig = /\/img\/og\//.test(ogRel);
  const ogTitle = esc(o.title || site.name), ogDesc = esc(o.desc || site.tagline);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(o.desc || site.tagline)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${o.ogType || "website"}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDesc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="${ogBig ? 1200 : 600}">
<meta property="og:image:height" content="${ogBig ? 630 : 600}">
<meta property="og:image:alt" content="${esc(o.imageAlt || o.title || site.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDesc}">
<meta name="twitter:image" content="${og}">
${site.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(site.googleSiteVerification)}">` : ""}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/app.css">
<script>window.SITE_CONFIG=${json(publicConfig(site))};${IMG_FALLBACK}</script>
${(o.jsonld || []).map((j) => `<script type="application/ld+json">${json(j)}</script>`).join("\n")}
</head>
<body data-site="${o.theme || "plain"}">
<a class="skip" href="#main">Skip to content</a>
${o.header === false ? "" : header(o.heading, o.kicker, o.headingTag, o.brand, !!site.supabase)}
<main id="main" tabindex="-1">
${o.body}
</main>
${footer(ctx)}
<script src="/assets/site.js" defer></script>
<script src="/assets/assistant.js" defer></script>
${site.supabase ? '<script type="module" src="/assets/auth.js"></script>' : ""}
${(o.scripts || []).map((s) => (s.startsWith("<") ? s : `<script src="${s}" defer></script>`)).join("\n")}
</body>
</html>`;
}

function header(heading, kicker, tag = "h1", brand = false, accounts = false) {
  return `<header class="top${brand ? " brand" : ""}">
  <a class="ibtn home" href="/" aria-label="Home">←</a>
  <div class="ttl">${kicker ? `<p class="kick">${kicker}</p>` : ""}<${tag} class="h">${heading || "Recipes By Ninjas"}</${tag}></div>
  <a class="ibtn srch" href="/search/" aria-label="Search all recipes">🔍</a>${accounts ? '\n  <a class="ibtn srch acct" href="/account/" aria-label="Your account">👤</a>' : ""}
</header>`;
}

function footer(ctx) {
  const { site, appliances } = ctx;
  return `<footer class="foot-site">
  <nav class="fnav" aria-label="Appliances">${appliances.map((a) => `<a href="${a.url}">${a.emoji} ${esc(a.name)}</a>`).join("")}</nav>
  <nav class="fnav small" aria-label="More">
    <a href="/search/">Search</a><a href="/diet/">Diets</a><a href="/gear/">Accessories</a>${site.shop.enabled ? '<a href="/shop/">Shop</a>' : ""}
    <a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/disclosure/">Disclosures</a>${site.email.enabled ? '<a href="/join/">Get recipes by email</a>' : ""}
    <button type="button" class="linkbtn" data-consent-open>Cookie settings</button>
  </nav>
  <p class="disc">© ${new Date().getFullYear()} ${esc(site.ownerName)}. Not affiliated with SharkNinja.${site.contactEmail ? ` · <a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : ""}</p>
</footer>`;
}

/* ---------- shared blocks ---------- */
export function badge(a, r) {
  if (r.badge) return r.badge;
  if (r.ben && r.ben.length) return r.ben.slice(0, 3).map((b) => a.benMap[b]?.[1] || "").join(" ");
  return `${a.catMap[r.cat]?.e || ""} ${esc(r.press.split(/[ ·(]/)[0])}`;
}
function meta(a, r) {
  if (a.key === "creami") return r.freeze === "None" ? "Ready in " + r.prep : r.prep.includes("+") ? r.prep + " + freeze" : r.prep + " prep + freeze";
  if (a.key === "juicer") return r.prep + " · " + (r.makes.includes("shot") ? "shots" : r.makes.includes("2 glasses") ? "serves 2" : "1 glass");
  return r.prep + (r.cook ? " + " + r.cook : "") + " · " + r.makes;
}
export function card(a, r) {
  const s = [r.title, r.blurb, r.ing.join(" "), r.tags.map((t) => a.data.labels[t]).join(" "), (r.ben || []).map((b) => a.benMap[b]?.[2]).join(" "), (r.diets || []).map((d) => dietMap[d]?.label).join(" ")].join(" ").toLowerCase();
  return `<a class="card" href="${r.url}" data-id="${r.id}" data-c="${r.cat}" data-s="${esc(s)}"${r.healthy ? " data-h" : ""}${(r.ben || []).length ? ` data-ben="${r.ben.join(" ")}"` : ""}>
<div class="thumb">${img(r)}<span class="mode">${badge(a, r)}</span>${r.healthy ? '<span class="leaf">🌿</span>' : ""}${r.members ? '<span class="lock">🔒</span>' : ""}<span class="likes" data-lk="${r.id}"></span></div>
<div class="cb"><p class="ct">${esc(r.title)}</p><div class="cm">${esc(meta(a, r))}${r.dfree ? " · Dairy-free" : ""}</div></div></a>`;
}
const grid = (items) => `<div class="grid">${items.map(({ a, r }) => card(a, r)).join("")}</div>`;

export function adSlot(site, name, cls = "") {
  if (!site.ads.enabled) return "";
  return `<aside class="ad-slot ${cls}" data-ad="${name}" aria-label="Advertisement"><span>Advertisement</span></aside>`;
}
export function emailBox(site, where) {
  const e = site.email;
  if (!e.enabled) return "";
  const own = e.provider === "site" || e.provider === "netlify"; // our own list: Netlify Forms on Netlify, /api/form on Cloudflare
  const netlify = own && site.host !== "cloudflare";
  return `<section class="signup" data-where="${where}">
  <h2>${esc(e.headline)}</h2>
  ${e.leadMagnet?.title ? `<p>${esc(e.leadMagnet.title)}, free when you join.</p>` : ""}
  <form class="signup-f" method="POST" ${netlify ? 'name="newsletter" data-netlify="true" action="/thanks/"' : own ? 'action="/api/form"' : `action="${esc(e.action)}" target="_blank"`}>
    ${own ? '<input type="hidden" name="form-name" value="newsletter">' : ""}
    <input type="hidden" name="source" value="${where}">
    <p class="hp" aria-hidden="true"><label>Leave this empty <input name="company" tabindex="-1" autocomplete="off"></label></p>
    <label class="sr" for="em-${where}">Email</label>
    <input id="em-${where}" type="email" name="email" required placeholder="you@example.com" autocomplete="email">
    <button class="btn" type="submit">Join</button>
  </form>
  <p class="disc">New recipes and fixes, about once a week. No spam, unsubscribe any time. <a href="/privacy/">Privacy</a></p>
</section>`;
}
function share(ctx, r) {
  const u = encodeURIComponent(ctx.site.url + r.url), t = encodeURIComponent(r.title);
  return `<div class="share" data-share-url="${ctx.site.url + r.url}" data-share-title="${esc(r.title)}">
  <button class="pill" type="button" data-share>📤 Share</button>
  <a class="pill" href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener" data-track="share" data-net="whatsapp">WhatsApp</a>
  <a class="pill" href="https://pinterest.com/pin/create/button/?url=${u}&description=${t}" target="_blank" rel="noopener" data-track="share" data-net="pinterest">Pinterest</a>
  <a class="pill" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" data-track="share" data-net="facebook">Facebook</a>
</div>`;
}
function video(v) {
  if (!v) return "";
  const url = typeof v === "string" ? v : v.url;
  let src = "";
  const yt = /(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/.exec(url);
  const tt = /tiktok\.com\/.*\/video\/(\d+)/.exec(url);
  const ig = /instagram\.com\/(?:reel|p)\/([\w-]+)/.exec(url);
  if (yt) src = `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  else if (tt) src = `https://www.tiktok.com/embed/v2/${tt[1]}`;
  else if (ig) src = `https://www.instagram.com/reel/${ig[1]}/embed`;
  if (!src) return `<p><a href="${esc(url)}" target="_blank" rel="noopener">▶ Watch the video</a></p>`;
  const tall = !yt || /shorts/.test(url);
  return `<div class="video${tall ? " tall" : ""}"><iframe src="${src}" title="Recipe video" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
}
/* Short affiliate note: only shown once an Amazon tag is set, since links aren't affiliate links before that. */
const affNote = (site, cls = "disc") => site.affiliate.amazonTag ? `<p class="${cls}">We may earn from qualifying purchases. <a href="/disclosure/">Disclosures</a></p>` : "";
function gearBlock(ctx, r) {
  const items = (r.gear || []).map((id) => ctx.products[id]).filter(Boolean);
  if (!items.length) return "";
  return `<section class="gear-used"><h3>Handy for this recipe</h3>
  <div class="gear-row">${items.map((p) => productCard(p, "recipe")).join("")}</div>
  ${affNote(ctx.site)}</section>`;
}
export function productCard(p, where) {
  const pic = p.image ? `<img src="${p.image}" alt="${esc(p.name)}" loading="lazy"${p.cdn ? ` data-cdn="${p.cdn}"` : ""} data-emo="${p.icon || "🧰"}">` : `<div class="emo">${p.icon || "🧰"}</div>`;
  const inner = `<span class="gp">${pic}</span><span class="gt"><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ""}${p.price ? `<small class="price">${esc(p.price)}</small>` : ""}</span>`;
  return p.href
    ? `<a class="gcard" href="${p.href}" rel="sponsored noopener" target="_blank" data-aff="${p.id}" data-where="${where}">${inner}<span class="go">Check price ›</span></a>`
    : `<div class="gcard">${inner}</div>`;
}

/* ---------- home ---------- */
export function home(ctx, html) {
  const cfg = `<script>window.SITE_CONFIG=${json(publicConfig(ctx.site))};</script>`;
  const s = ctx.site, img = s.url + ctx.og.home, big = ctx.og.home.includes("/og/");
  const title = s.name + " — What are we making?";
  const desc = "Family recipes for Ninja machines: Creami ice cream, NeverClog juices, Detect blender smoothies and Woodfire grill BBQ. Pick a machine and start cooking.";
  const social = `<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${s.url}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(s.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${s.url}/">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="${big ? 1200 : 600}">
<meta property="og:image:height" content="${big ? 630 : 600}">
<meta property="og:image:alt" content="Our ninja chef: what are we making?">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${img}">
${s.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(s.googleSiteVerification)}">` : ""}
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;
  // Keep the machine labels' recipe counts in sync with the data.
  for (const a of ctx.appliances) html = html.replace(new RegExp(`(data-k="${a.key}"[^\\n]*?<small>)\\d+ recipes`), `$1${a.data.recipes.length} recipes`);
  return html.replace("<!--SOCIAL-->", social).replace("<!--SITE_CONFIG-->", cfg).replace("<!--SITE_JS-->", '<script src="/assets/site.js" defer></script>\n<script src="/assets/assistant.js" defer></script>' + (s.supabase ? '\n<script type="module" src="/assets/auth.js"></script>' : ""));
}

/* ---------- hub ---------- */
export function hub(ctx, a) {
  const D = a.data, hasBen = D.recipes.some((r) => (r.ben || []).length);
  const secs = D.cats.map((c, i) => {
    const list = D.recipes.filter((r) => r.cat === c.k);
    return `<section class="sec" id="s-${c.k}" data-c="${c.k}" data-k="${c.k}">
<div class="sh"><h2><span class="ico">${c.e}</span><a href="/${a.key}/category/${c.k}/">${esc(c.n)}</a></h2><button class="shop-btn" data-shop="${c.k}" type="button">Shopping list</button></div>
<p class="sd">${esc(c.d)}</p>
${grid(list.map((r) => ({ a, r })))}
</section>${i === 1 ? adSlot(ctx.site, "hub-in-feed", "infeed") : ""}`;
  }).join("\n");
  const SITE = { key: a.key, section: a.section, data: `/data/${a.key}.json`, pantry: a.pantry, haveNote: a.haveNote, focus: a.focus, haveColor: D.cats[0].k, favColor: D.cats[0].k };
  return layout(ctx, {
    title: `${a.name} recipes for the ${a.device}`, desc: a.intro, path: a.url, theme: a.theme,
    heading: `${a.emoji} ${esc(a.name)}`, kicker: `${esc(ctx.site.name)} · ${D.recipes.length} recipes`,
    image: D.recipes[0].img,
    jsonld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${a.name} recipes`, description: a.intro, url: ctx.site.url + a.url }],
    body: `<div class="wrap menu" id="menu">
  <div class="tools">
    <input class="search" id="q" type="search" placeholder="${esc(a.search)}" aria-label="Search ${esc(a.name)} recipes" autocomplete="off">
    <div class="pills">
      <button class="pill fav" id="openFav" type="button"><span class="pe">❤️ </span><span class="pl">Favorites</span><span class="ps">Faves</span></button>
      <button class="pill have" id="openHave" type="button"><span class="pe">🧺 </span><span class="pl">What I have</span><span class="ps">I have</span></button>
      <button class="pill" id="healthyOnly" type="button" aria-pressed="false"><span class="pe">🌿 </span>${esc(a.toggle)}</button>
    </div>
  </div>
  ${(() => { const ds = DIETS.filter((d) => D.recipes.some((r) => (r.diets || []).includes(d.k))); return ds.length ? `<div class="bens dietrow"><span class="lbl">Diet:</span>${ds.map((d) => `<a class="bchip" href="${dietUrl(d.k)}#${a.key}">${d.e} ${esc(d.short)}</a>`).join("")}</div>` : ""; })()}
  ${a.buttons ? `<p class="btnhelp"><a href="/${a.key}/buttons/">🎛️ New to the ${esc(a.short.toLowerCase())} machine? What each button does →</a></p>` : ""}
  ${hasBen ? `<div class="bens" id="bens" aria-label="Filter by benefit"><span class="lbl">I want:</span>${(D.bens || []).filter((b) => D.recipes.some((r) => (r.ben || []).includes(b[0]))).map((b) => `<button class="bchip" type="button" data-b="${b[0]}" aria-pressed="false">${b[1]} ${esc(b[2])}</button>`).join("")}</div>` : ""}
  <nav class="nav" aria-label="Menu sections"><div class="navrow" id="navrow" style="--n:${D.cats.length}">${D.cats.map((c) => `<button class="tab" type="button" data-c="${c.k}" data-t="${c.k}" aria-label="${esc(c.n)}"><span class="te">${c.e}</span><span>${esc(c.s || c.n)}</span></button>`).join("")}</div></nav>
  <div id="sections">${secs}</div>
  <p class="empty" id="empty" hidden>No recipes match. Try another word.</p>
  <p class="foot">${esc(a.foot)}</p>
  ${a.key === "creami" ? helpLinks(a, ctx.guides, 4) : ""}
  ${accessoryStrip(ctx, a)}
  ${emailBox(ctx.site, "hub-" + a.key)}
</div>
<dialog class="sheet" id="sheet" aria-label="Details"><div class="sheet-in" id="sheetIn"></div></dialog>`,
    scripts: [`<script>window.SITE=${json(SITE)};</script>`, "/assets/likes.js", "/assets/app.js"],
  });
}

/* ---------- recipe ---------- */
export function recipe(ctx, a, r) {
  const { site } = ctx, c = a.catMap[r.cat];
  const prep = minutes(r.prep), cook = minutes(r.cook || r.spin), wait = minutes(r.wait);
  const ld = {
    "@context": "https://schema.org", "@type": "Recipe", name: r.title, description: r.blurb,
    image: [r.img.startsWith("http") ? r.img : site.url + r.img], author: { "@type": "Organization", name: site.name },
    recipeCategory: c?.n, recipeCuisine: "Home cooking", keywords: [a.name, a.device, c?.n, ...(r.ben || []).map((b) => a.benMap[b]?.[2])].filter(Boolean).join(", "),
    recipeYield: r.makes, prepTime: iso(prep), cookTime: iso(cook), totalTime: iso(prep + cook + wait),
    tool: [{ "@type": "HowToTool", name: a.device }],
    recipeIngredient: r.ing,
    recipeInstructions: r.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
  };
  if ((r.diets || []).includes("vegan")) ld.suitableForDiet = "https://schema.org/VeganDiet";
  if (r.macros) ld.nutrition = { "@type": "NutritionInformation", servingSize: "1 pint", calories: `${r.macros.kcal} calories`, proteinContent: `${r.macros.protein} g` };
  if (r.video) ld.video = { "@type": "VideoObject", name: r.title, description: r.blurb, thumbnailUrl: ld.image, contentUrl: typeof r.video === "string" ? r.video : r.video.url, uploadDate: r.video.date || undefined };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: site.url + "/" },
    { "@type": "ListItem", position: 2, name: a.name, item: site.url + a.url },
    { "@type": "ListItem", position: 3, name: c?.n, item: `${site.url}/${a.key}/category/${r.cat}/` },
    { "@type": "ListItem", position: 4, name: r.title, item: site.url + r.url }] };
  const related = a.data.recipes.filter((x) => x.cat === r.cat && x.id !== r.id).slice(0, 4);
  const gated = site.members.enabled && r.members;
  const ings = `<h2 class="h3">${esc(r.listTitle || "You need")}</h2><ul class="ingl">${r.ing.map((x) => `<li><label><input type="checkbox"><span>${esc(x)}</span></label></li>`).join("")}</ul>
  <div class="row noprint"><button class="btn" id="cp" type="button">Copy shopping list</button><button class="btn ghost" type="button" onclick="window.print()">🖨️ Print</button><span class="status" id="cps" aria-live="polite"></span></div>`;
  const sp = r.stepPics || [];
  const steps = `<h2 class="h3">Steps</h2><ol class="steps${sp.length ? " pics" : ""}">${r.steps.map((x, i) => `<li>${sp[i] ? `<img class="stepimg" src="${sp[i].img}" alt="Step ${i + 1}: ${esc(r.title)}" width="600" height="450" loading="lazy" decoding="async"${sp[i].cdn ? ` data-cdn="${sp[i].cdn}"` : ""}>` : ""}<span>${esc(x)}</span></li>`).join("")}</ol>`;
  const key = r.key && ctx.products[r.key.id];
  const fixKey = (r.fix ? `<div class="fixbox"><p class="fq"><b>😤 The complaint</b>${esc(r.fix.q)}</p><p class="fa"><b>✅ What this recipe does about it</b>${esc(r.fix.a)}</p></div>` : "") +
    (key ? `<a class="keyp" href="${key.href}" rel="sponsored noopener" target="_blank" data-aff="${key.id}" data-where="key"><span class="ki">${key.icon || "🔑"}</span><span class="kt"><small>The secret ingredient</small><b>${esc(key.name)}</b><span>${esc(r.key.why)}</span></span><span class="go">Check price ›</span></a>` : "");
  return layout(ctx, {
    title: `${r.title} – ${a.brand} recipe`, desc: `${r.blurb} ${r.chips.join(", ")}. Made with the ${a.device}.`, path: r.url, theme: a.theme, image: r.og, imageAlt: r.title, ogType: "article",
    heading: `${a.emoji} ${esc(a.name)}`, kicker: `<a href="/">${esc(ctx.site.name)}</a>`, headingTag: "p",
    jsonld: [ld, crumbs],
    body: `<div class="wrap rlayout${site.ads.enabled ? " has-side" : ""}">
<article class="rpage" data-c="${r.cat}" data-recipe="${r.id}" data-section="${a.section}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${a.url}">${esc(a.name)}</a> › <a href="/${a.key}/category/${r.cat}/">${esc(c?.n)}</a></nav>
  <div class="shero">${img(r, "", false)}</div>
  <div class="sbody">
    <div class="chips"><a class="chip" href="/${a.key}/category/${r.cat}/">${c?.e} ${esc(c?.n)}</a>${r.healthy ? `<a class="chip g" href="/tags/healthy/">${esc(a.toggleChip)}</a>` : ""}${r.dfree ? '<a class="chip g" href="/tags/dairy-free/">Dairy-free</a>' : ""}<span class="chip">${esc(r.level)}</span></div>
    <h1>${esc(r.title)}</h1>
    <p class="lead">${esc(r.blurb)}</p>
    ${(r.ben || []).length ? `<div class="chips">${r.ben.map((b) => `<a class="chip b" href="/tags/${b}/">${a.benMap[b]?.[1]} ${esc(a.benMap[b]?.[2])}</a>`).join("")}</div>` : ""}
    <div class="chips">${r.chips.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}${r.macros ? `<span class="chip g">💪 ${r.macros.protein} g protein · ${r.macros.kcal} kcal / pint</span>` : ""}${r.adult ? '<span class="chip">🍸 21+ only</span>' : ""}</div>
    ${(r.diets || []).length ? `<div class="chips diets">${r.diets.map((d) => `<a class="chip d" href="${dietUrl(d)}">${dietMap[d].e} ${esc(dietMap[d].short)}</a>`).join("")}</div>` : ""}
    <div class="press"><small>${esc(a.pressLabel)}</small> ${esc(r.press)}</div>
    ${a.buttons ? `<p class="btnhelp noprint">🎛️ ${(r.btns || []).length ? `What does ${r.btns.slice(0, 3).map((b) => `<a href="/${a.key}/buttons/#${b.k}">${esc(b.name.split(":")[0])}</a>`).join(" / ")} do?` : `<a href="/${a.key}/buttons/">What do the buttons do?</a>`}</p>` : ""}
    ${fixKey}
    <div class="row noprint"><button class="btn ghost" id="cookmode" type="button" aria-pressed="false" hidden>🍳 Cook mode: keep screen on</button></div>
    <div class="likebox"><b>❤️ Who likes this?</b><div class="who">${site.supabase ? "" : site.family.map((p) => `<button class="who-b" type="button" data-p="${p}" data-like="${p}" aria-pressed="false">${p}</button>`).join("")}</div><p class="sync" id="sync"></p></div>
    ${ings}
    ${adSlot(site, "recipe-in-content", "incontent")}
    ${gated ? `<div class="gate"><div class="gate-blur" aria-hidden="true">${steps}</div><div class="gate-cta"><b>🔒 Members-only recipe</b><p>Join to unlock the steps.</p>${site.members.joinUrl ? `<a class="btn" href="${esc(site.members.joinUrl)}">Join</a>` : ""}</div></div>` : steps}
    ${r.notes.map(([k, v]) => `<p class="note"><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}
    ${r.healthier ? `<p class="note healthier"><b>🌿 Make it healthier:</b> ${esc(r.healthier)}</p>` : ""}
    ${(r.ben || []).length ? '<p class="disclaim">Benefit tags are general nutrition info, not medical advice.</p>' : ""}
    ${a.key === "creami" ? helpLinks(a, ctx.guides) : ""}
    ${video(r.video)}
    ${gearBlock(ctx, r)}
    ${share(ctx, r)}
    ${emailBox(site, "recipe")}
  </div>
  ${related.length ? `<section class="related"><h2 class="h3">More ${esc(c?.n.toLowerCase())}</h2>${grid(related.map((x) => ({ a, r: x })))}</section>` : ""}
</article>
${site.ads.enabled ? `<div class="side">${adSlot(site, "recipe-sidebar", "sidebar")}</div>` : ""}
</div>`,
    scripts: [`<script>window.RECIPE=${json({ id: r.id, title: r.title, ing: r.ing, section: a.section, appliance: a.key })};</script>`, "/assets/likes.js", "/assets/recipe.js"],
  });
}

/* ---------- listing pages ---------- */
function listing(ctx, o) {
  return layout(ctx, { ...o, body: `<div class="wrap menu">
  ${o.crumbs ? `<nav class="crumbs" aria-label="Breadcrumb">${o.crumbs}</nav>` : ""}
  <div class="lhead"><h1>${o.h1}</h1>${o.lead ? `<p class="lead">${esc(o.lead)}</p>` : ""}</div>
  ${o.inner}
</div>`, header: true, heading: o.heading || "🥷 Recipes By Ninjas", headingTag: "p", brand: !o.heading });
}
export function category(ctx, a, c) {
  const items = a.data.recipes.filter((r) => r.cat === c.k).map((r) => ({ a, r }));
  const name = `${a.brand} ${c.n.toLowerCase()} recipes`;
  const intro = `${items.length} easy ${c.n.toLowerCase()} recipes for the ${a.device}. ${c.d}`;
  return listing(ctx, { title: name.charAt(0).toUpperCase() + name.slice(1), desc: intro, path: `/${a.key}/category/${c.k}/`, theme: a.theme, heading: `${a.emoji} ${esc(a.name)}`,
    crumbs: `<a href="/">Home</a> › <a href="${a.url}">${esc(a.name)}</a>`, h1: `${c.e} ${esc(name.charAt(0).toUpperCase() + name.slice(1))}`, lead: intro, inner: grid(items) });
}
export function tag(ctx, t) {
  return listing(ctx, { title: `${t.label} recipes`, desc: `${t.label} recipes across every Ninja machine.`, path: `/tags/${t.k}/`,
    crumbs: `<a href="/">Home</a> › Tags`, h1: `${t.emoji} ${esc(t.label)}`, lead: `${t.items.length} recipes across all machines.`, inner: grid(t.items) });
}
/* Diet pages: one per diet, recipes grouped by machine, plus the pantry items those recipes rely on. */
export function dietHub(ctx, counts) {
  const cards = DIETS.filter((d) => counts[d.k]).map((d) => `<a class="dcard" href="${dietUrl(d.k)}"><span class="de">${d.e}</span><b>${esc(d.label)}</b><small>${counts[d.k]} recipes · ${esc(d.lead)}</small></a>`).join("");
  return listing(ctx, { title: "Recipes by diet", desc: "Keto, high-protein, dairy-free, vegan, low-sugar and 21+ recipes for the Ninja Creami, juicer, blender and Woodfire grill.", path: "/diet/",
    crumbs: `<a href="/">Home</a> › Diets`, h1: "🥗 Eat your way", lead: "Pick a diet. Every recipe works on a Ninja machine and fixes a problem owners actually complain about.",
    inner: `<div class="dgrid">${cards}</div>` });
}
export function dietPage(ctx, d, items) {
  const by = ctx.appliances.map((a) => [a, items.filter((it) => it.a.key === a.key)]).filter(([, l]) => l.length);
  const keys = [...new Set(items.flatMap(({ r }) => [r.key?.id, ...(r.gear || [])]).filter(Boolean))].map((id) => ctx.products[id]).filter((p) => p && p.href).slice(0, 6);
  const others = DIETS.filter((x) => x.k !== d.k && ctx.dietCounts[x.k]);
  return listing(ctx, { title: `${d.label} Ninja recipes`, desc: `${items.length} ${d.label.toLowerCase()} recipes for the Ninja Creami, juicer, blender and Woodfire grill. ${d.lead}`, path: dietUrl(d.k),
    crumbs: `<a href="/">Home</a> › <a href="/diet/">Diets</a> › ${esc(d.label)}`, h1: `${d.e} ${esc(d.label)}`, lead: d.lead,
    jsonld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: `${d.label} recipes`, description: d.lead, url: ctx.site.url + dietUrl(d.k) }],
    inner: `<p class="note">${esc(d.pain)}</p>
  <nav class="chips">${by.map(([a, l]) => `<a class="chip" href="#${a.key}">${a.emoji} ${esc(a.short)} (${l.length})</a>`).join("")}</nav>
  ${by.map(([a, l]) => `<section class="sec" id="${a.key}"><h2 class="h3">${a.emoji} ${esc(a.name)}</h2>${grid(l)}</section>`).join("")}
  ${keys.length ? `<section class="gear-used"><h3>Stock up for ${esc(d.short.toLowerCase())}</h3><div class="gear-row">${keys.map((p) => productCard(p, "diet")).join("")}</div>${affNote(ctx.site)}</section>` : ""}
  <h2 class="h3">Other diets</h2><div class="chips">${others.map((x) => `<a class="chip" href="${dietUrl(x.k)}">${x.e} ${esc(x.label)}</a>`).join("")}</div>
  ${emailBox(ctx.site, "diet")}` });
}
/* Button guide: every button on the machine in kid-simple words, with recipes that use it. FAQ schema for "what does X do". */
export function buttonsPage(ctx, a) {
  const B = a.buttons, items = B.groups.flatMap((g) => g.items);
  const faq = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: `What does ${i.name} do on the ${a.device}?`, acceptedAnswer: { "@type": "Answer", text: i.what + (i.tip ? " " + i.tip : "") } })) };
  const card = (i) => `<article class="btncard" id="${i.k}"><div class="bh"><span class="be" aria-hidden="true">${i.e || "🔘"}</span><div><h3>${esc(i.name)}</h3>${i.modes ? `<small>${esc(i.modes)}</small>` : ""}</div></div>
  <p>${esc(i.what)}</p>${i.tip ? `<p class="tip">💡 ${esc(i.tip)}</p>` : ""}
  ${(i.recipes || []).length ? `<details><summary>${i.recipes.length} recipe${i.recipes.length > 1 ? "s" : ""} use this</summary><ul>${i.recipes.slice(0, 12).map((r) => `<li><a href="${r.url}">${r.emoji} ${esc(r.title)}</a></li>`).join("")}</ul></details>` : ""}</article>`;
  return listing(ctx, { title: `${a.device} buttons explained`, desc: `What every button on the ${a.device} does, in plain words: ${items.slice(0, 6).map((i) => i.name).join(", ")} and more.`, path: `/${a.key}/buttons/`,
    crumbs: `<a href="/">Home</a> › <a href="${a.url}">${esc(a.name)}</a> › Buttons`, h1: `🎛️ ${esc(B.h1)}`, lead: B.lead, heading: `${a.emoji} ${esc(a.name)}`, jsonld: [faq],
    inner: `<nav class="chips">${items.map((i) => `<a class="chip" href="#${i.k}">${i.e || ""} ${esc(i.name)}</a>`).join("")}</nav>
  ${B.groups.map((g) => `<section class="sec"><h2 class="h3">${esc(g.h)}</h2><div class="btngrid">${g.items.map(card).join("")}</div></section>`).join("")}
  <p class="disc">Plain-words summary of the owner's guide. Your model's panel may differ a little; the manual that came with it wins.</p>
  <p><a class="btn" href="${a.url}">See all ${esc(a.name.toLowerCase())} recipes →</a></p>` });
}
export function search(ctx) {
  return listing(ctx, { title: "Search", desc: "Search every recipe across all Ninja machines.", path: "/search/", h1: "🔍 Search every recipe",
    inner: `<div class="tools"><input class="search" id="sq" type="search" placeholder="Try mango, ribs, energy, salsa…" aria-label="Search all recipes" autocomplete="off" autofocus></div>
  <div class="pills afilter" role="group" aria-label="Filter by appliance"><button class="pill on" type="button" data-a="">All</button>${ctx.appliances.map((a) => `<button class="pill" type="button" data-a="${a.key}">${a.emoji} ${esc(a.short)}</button>`).join("")}</div>
  <p class="status" id="scount" aria-live="polite"></p>
  <div class="grid" id="sres"></div>
  <h2 class="h3">Browse by diet</h2><div class="chips">${DIETS.filter((d) => ctx.dietCounts[d.k]).map((d) => `<a class="chip" href="${dietUrl(d.k)}">${d.e} ${esc(d.label)}</a>`).join("")}</div>
  <h2 class="h3">Browse by tag</h2><div class="chips">${(ctx.tags || []).map((t) => `<a class="chip" href="/tags/${t.k}/">${t.emoji} ${esc(t.label)}</a>`).join("")}</div>`,
    scripts: [`<script>window.APPLIANCES=${json(Object.fromEntries(ctx.appliances.map((a) => [a.key, a.emoji + " " + a.short])))};</script>`, "/assets/search.js"] });
}
export function accessoryStrip(ctx, a, limit = 3) {
  const l = Object.values(ctx.products).filter((p) => p.appliance === a.key).sort((x, y) => x.rank - y.rank).slice(0, limit);
  if (!l.length) return "";
  return `<section class="acc-strip"><div class="sh"><h2 class="h3">🧰 Accessories for your ${esc(a.short.toLowerCase())}</h2><a class="shop-btn" href="/gear/#${a.key}">See all</a></div>
  <div class="gear-grid">${l.map((p) => productCard(p, "hub")).join("")}</div>${affNote(ctx.site)}</section>`;
}
function compatTable(c) {
  return `<div class="compat"><h3>${esc(c.title)}</h3><table><thead><tr><th>Your machine</th><th>Pints that fit</th></tr></thead><tbody>${c.rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table><p class="disc">${esc(c.note)}</p></div>`;
}
export function gear(ctx, catalog) {
  const ps = Object.values(ctx.products);
  const secs = ctx.appliances.map((a) => {
    const l = ps.filter((p) => p.appliance === a.key).sort((x, y) => x.rank - y.rank);
    if (!l.length) return "";
    return `<section class="sec" id="${a.key}"><h2 class="h3">${a.emoji} ${esc(a.device)}</h2>
    <div class="gear-grid">${l.map((p) => productCard(p, "gear")).join("")}</div>
    ${a.key === "creami" && catalog.compat ? compatTable(catalog.compat) : ""}</section>`;
  }).join("");
  return listing(ctx, { title: "Accessories we use", desc: "Pints, cups, pellets and the small extras that make Ninja machines easier to live with.", path: "/gear/", h1: "🧰 Accessories we use",
    lead: "You already have the machine. These are the extras we actually reach for.",
    inner: `<nav class="chips">${ctx.appliances.map((a) => `<a class="chip" href="#${a.key}">${a.emoji} ${esc(a.short)}</a>`).join("")}</nav>${affNote(ctx.site, "disc box")}${secs}` });
}
export function shop(ctx, catalog) {
  const items = catalog.digital || [];
  const cards = items.map((d) => `<div class="gcard shopc">${d.image ? `<span class="gp"><img src="${d.image}" alt="${esc(d.name)}" loading="lazy"></span>` : '<span class="gp"><div class="emo">📄</div></span>'}<span class="gt"><b>${esc(d.name)}</b>${d.note ? `<small>${esc(d.note)}</small>` : ""}<small class="price">${esc(d.price)}</small></span>${d.checkoutUrl ? `<a class="btn" href="${esc(d.checkoutUrl)}" data-buy="${d.id}">Buy</a>` : ""}</div>`).join("");
  return listing(ctx, { title: "Shop", desc: "Printable recipe cards and guides.", path: "/shop/", h1: "🛍️ Shop",
    lead: items.length ? "Printables and guides. Secure checkout by Stripe." : "Printable recipe cards and mini-guides are coming soon.",
    inner: (cards ? `<div class="gear-grid">${cards}</div>` : "") + emailBox(ctx.site, "shop") });
}
export function legal(ctx, which) {
  const s = ctx.site, who = esc(s.ownerName), contact = s.contactEmail ? `<a href="mailto:${esc(s.contactEmail)}">${esc(s.contactEmail)}</a>` : "the contact address on this site";
  const T = {
    privacy: ["Privacy policy", `<p>This policy explains what ${who} collects when you use this site.</p>
<h2 class="h3">What we collect</h2><ul>
<li><b>Favorites.</b> When you tap a name under "Who likes this?", that choice is stored on our server so it syncs between devices. It is not linked to an email or account.</li>
<li><b>Preferences.</b> Your cookie choice and offline favorites are stored in your browser (local storage).</li>
<li><b>Email list.</b> If you join, we store your email address, the page you joined from and the date, on our host (Cloudflare), only to send you recipe emails. When we start sending, every email has an unsubscribe link, and you can ask us to delete your address any time.</li>
<li><b>Analytics.</b> If enabled and you consent, we use privacy-friendly analytics to count visits and clicks. No data is sold.</li>
<li><b>Advertising.</b> If ads are enabled and you consent, our ad partner may use cookies to show and measure ads.</li>
<li><b>Purchases.</b> Payments are handled by Stripe. We never see your card details; we keep an order record so you can re-download.</li></ul>
<h2 class="h3">Accounts</h2><ul>
<li><b>What we store.</b> Your email (to sign you in), your household (name, size, which Ninja machines you have), and for each person you add: first name, diet, allergies, foods they don't like, goals, meal types and cooking time. We also store favorites, a "we made this" log, and your email settings.</li>
<li><b>Why.</b> Only to personalize recipe ideas: skip allergies and dislikes, show your machines, and not repeat what you cooked in the last two weeks. Allergy answers are used as filters, not as medical information, and are never shared or sold.</li>
<li><b>Where.</b> Accounts run on Supabase (database and sign-in). Each household can only read its own rows (row-level security). If you sign in with Google we receive your email address only.</li>
<li><b>Tonight by Ninjas emails.</b> Off unless you tick the box, and only daily or weekly at the time you pick. We record when you gave or withdrew permission. Emails are sent through Resend, include a one-click unsubscribe link, and we keep a log of which recipes we sent so ideas rotate.</li>
<li><b>Deleting.</b> "Delete my account" on your account page permanently removes your sign-in, household, people, favorites, history and settings right away.</li></ul>
<h2 class="h3">"What are we making?" assistant</h2>
<p>When you ask for ideas, your meal choice, the chips you tapped and what you typed are sent to our server. If you are signed in, your household's allergies, dislikes and recent meals are used to filter the recipe list. To write the suggestions we may send your request and a shortlist of our recipes to Anthropic (Claude). We don't send your name or email, and Anthropic does not use API data to train its models. To limit use per visitor we count requests by account or by a one-way hash of your IP address, kept for one day. Don't type anything private into the box.</p>
<h2 class="h3">Your choices</h2><p>Change your cookie choice any time with "Cookie settings" in the footer. Edit or delete your account data from the account page, or contact ${contact}.</p>`],
    terms: ["Terms of use", `<p>Recipes are for home use. Follow your appliance manual and food-safety guidance, check internal temperatures for meat, and take care with allergies. Nutrition and benefit tags are general information, not medical advice.</p>
<p>Content on this site belongs to ${who} unless stated otherwise. You may share links freely; please don't republish full recipes or photos without permission.</p>
<p>Product names are trademarks of their owners. This site is not affiliated with or endorsed by SharkNinja.</p>`],
    disclosure: ["Disclosures", `<p>${esc(s.name)} is an independent family recipe site. Not affiliated with SharkNinja; Ninja, Creami, NeverClog and Woodfire are trademarks of their owners.</p><h2 class="h3">Affiliate links</h2><p>${esc(s.affiliate.disclosure)}</p><p>We only recommend products we use or would buy for our own family. Commissions help keep this site free and don't change the price you pay.</p>`],
  }[which];
  return listing(ctx, { title: T[0], desc: `${T[0]} for ${s.name}.`, path: `/${which}/`, h1: T[0], inner: `<div class="prose">${T[1]}<p class="disc">Last updated ${new Date().toISOString().slice(0, 10)}.</p></div>` });
}
export function notFound(ctx) {
  return listing(ctx, { title: "Page not found", path: "/404.html", h1: "🫠 That page melted.", lead: "Try search, or pick a machine below.",
    inner: `<p><a class="btn" href="/search/">Search recipes</a></p>` });
}
export function thanks(ctx) {
  const lm = ctx.site.email.leadMagnet;
  return listing(ctx, { title: "You're in", desc: "Thanks for joining Recipes By Ninjas.", path: "/thanks/", h1: "🎉 You're in", lead: "You're on the list. New recipes and fixes land about once a week.",
    inner: (lm?.url ? `<p><a class="btn" href="${esc(lm.url)}" download>Download: ${esc(lm.title)}</a></p>` : "") + `<p><a class="btn ghost" href="/">Back to recipes</a></p>
<script>if(/[?&]f=contact/.test(location.search)){var h=document.querySelector("h1"),l=document.querySelector(".lead");h.textContent="✉️ Message sent";l.textContent="Thanks for writing. We read everything and reply within a few days.";document.title="Message sent · Recipes By Ninjas"}</script>` });
}

/* ---------- newsletter sign-up page ---------- */
export function join(ctx) {
  const s = ctx.site;
  return listing(ctx, { title: "Get Ninja recipes by email", desc: "Join Recipes By Ninjas: one new recipe or fix a week for your Creami, juicer, blender and Woodfire grill. Free, no spam.", path: "/join/",
    h1: "📬 Get one new Ninja recipe a week",
    lead: "New recipes, protein pints and fixes for your Creami, juicer, blender and Woodfire grill. Free, about once a week, unsubscribe any time.",
    inner: `<ul class="join-why"><li>🍦 New Creami pints, including high-protein and 21+ ones</li><li>🔥 Grill and smoker recipes that use your Woodfire's real settings</li><li>🛠️ Quick fixes for crumbly, icy or stuck pints</li><li>🥷 Seasonal ideas picked by our ninja chef</li></ul>` + (s.email.enabled ? emailBox(s, "join-page") : "<p>Email sign-up opens soon.</p>") });
}

export function about(ctx) {
  const s = ctx.site;
  return listing(ctx, { title: "About", desc: "Who we are and why we write recipes for Ninja kitchen machines.", path: "/about/", h1: "👋 About Recipes By Ninjas",
    inner: `<div class="prose">
<p>We're a family of four (${s.family.map(esc).join(", ")}) with a slightly out-of-hand collection of Ninja machines. This site started as our own recipe book so nobody had to dig through manuals or scroll past ten ads to find out how long to freeze a pint.</p>
<p>Every recipe here is written for a specific machine: the ${ctx.appliances.map((a) => esc(a.device)).join(", ")}. Each one tells you which program, filter or function to press, with times and amounts tested at home.</p>
<h2 class="h3">How we write recipes</h2>
<ul><li>Short ingredient lists, things you can find in a normal supermarket.</li><li>Clear steps you can follow with sticky hands on a phone.</li><li>A "make it healthier" idea on every recipe.</li><li>Food-safety temperatures for anything off the grill.</li></ul>
<p>We're not affiliated with SharkNinja. See our <a href="/disclosure/">disclosures</a>.</p>
<p><a class="btn" href="/contact/">Contact us</a></p></div>` });
}
export function contact(ctx) {
  return listing(ctx, { title: "Contact", desc: "Questions, recipe requests or corrections: send us a note.", path: "/contact/", h1: "✉️ Contact us",
    lead: "Recipe request, a correction, or a partnership idea? We read everything.",
    inner: `<form class="contact-f" name="contact" method="POST" ${ctx.site.host === "cloudflare" ? 'action="/api/form"' : 'data-netlify="true" netlify-honeypot="company" action="/thanks/?f=contact"'}>
  <input type="hidden" name="form-name" value="contact">
  <p class="hp"><label>Leave this empty <input name="company"></label></p>
  <label>Your name<input name="name" required autocomplete="name"></label>
  <label>Email<input type="email" name="email" required autocomplete="email"></label>
  <label>Message<textarea name="message" rows="6" required></textarea></label>
  <button class="btn" type="submit">Send</button>
  ${ctx.site.contactEmail ? `<p class="disc">Or email us directly: <a href="mailto:${esc(ctx.site.contactEmail)}">${esc(ctx.site.contactEmail)}</a></p>` : ""}
</form>` });
}

export function account(ctx) {
  const on = !!ctx.site.supabase;
  return listing(ctx, { title: "Your account", desc: "Save favorites for each person in your household, get recipe ideas that fit your family.", path: "/account/", h1: "👤 Your kitchen",
    inner: on ? `<div id="acct" class="acct" aria-live="polite"><p class="muted">Loading…</p></div>` : `<p class="lead">Family accounts are coming soon.</p>`,
    scripts: on ? [`<script type="module" src="/assets/account.js"></script>`] : [] });
}

/* ---------- Creami help: fixes and guides ---------- */
const KIND = { fix: "Fix", guide: "Guide" };
export function helpHub(ctx, a, guides) {
  const sec = (kind, h, lead) => `<section class="sec"><div class="sh"><h2>${h}</h2></div><p class="sd">${lead}</p>
  <div class="glist">${guides.filter((g) => g.kind === kind).map((g) => `<a class="gitem" href="/${a.key}/help/${g.slug}/"><span class="gi">${g.emoji}</span><span><b>${esc(g.h1)}</b><small>${esc(g.lead.split(". ")[0])}.</small></span></a>`).join("")}</div></section>`;
  return listing(ctx, { title: `${a.brand} help: fixes and guides`, desc: `Fix crumbly, icy or powdery ${a.brand} pints, scale recipes for 24 oz pints, and learn protein, sweetener and storage basics.`,
    path: `/${a.key}/help/`, theme: a.theme, heading: `${a.emoji} ${esc(a.name)}`, crumbs: `<a href="/">Home</a> › <a href="${a.url}">${esc(a.name)}</a>`,
    h1: `🛠️ ${esc(a.brand)} fixes and guides`, lead: "Quick answers for the problems everyone hits, plus guides for protein, sweeteners and storage.",
    inner: sec("fix", "🧯 Fixes", "Something went wrong with a pint? Start here.") + sec("guide", "📘 Guides", "Get better pints from the start.") });
}
export function helpPage(ctx, a, g, guides) {
  const { site } = ctx, url = `/${a.key}/help/${g.slug}/`;
  const byId = Object.fromEntries(a.data.recipes.map((r) => [r.id, r]));
  const rel = (g.related || []).map((id) => byId[id]).filter(Boolean).map((r) => ({ a, r }));
  const prods = (g.products || []).map((id) => ctx.products[id]).filter(Boolean);
  const macros = g.table === "macros" ? (() => {
    const rows = a.data.recipes.filter((r) => r.macros).sort((x, y) => y.macros.protein - x.macros.protein);
    return `<div class="gtab-wrap"><table class="gtab"><thead><tr><th>Recipe</th><th>Base</th><th>Protein</th><th>Calories</th></tr></thead><tbody>${rows.map((r) => `<tr><td><a href="${r.url}">${esc(r.title)}</a></td><td>${esc(r.macros.base)}</td><td class="num">${r.macros.protein} g</td><td class="num">${r.macros.kcal}</td></tr>`).join("")}</tbody></table></div><p class="disc">Per full pint, about. Estimates from typical labels.</p>`;
  })() : "";
  const others = guides.filter((x) => x.slug !== g.slug && x.kind === g.kind).slice(0, 4);
  const hero = g.img ? `<div class="ghero">${img({ img: g.img, cdn: g.cdn, emoji: g.emoji, alt: g.h1 }, "", false)}</div>` : "";
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.desc, image: g.img ? [site.url + g.img] : undefined, author: { "@type": "Organization", name: site.name }, publisher: { "@type": "Organization", name: site.name }, mainEntityOfPage: site.url + url },
    ...(g.faq?.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: g.faq.map(([q, ans]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: ans } })) }] : []),
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url + "/" }, { "@type": "ListItem", position: 2, name: a.name, item: site.url + a.url },
      { "@type": "ListItem", position: 3, name: "Fixes and guides", item: `${site.url}/${a.key}/help/` }, { "@type": "ListItem", position: 4, name: g.h1, item: site.url + url }] },
  ];
  return layout(ctx, {
    title: g.title, desc: g.desc, path: url, theme: a.theme, image: g.img, imageAlt: g.h1, ogType: "article",
    heading: `${a.emoji} ${esc(a.name)}`, kicker: `<a href="/">${esc(site.name)}</a>`, headingTag: "p", jsonld: ld,
    body: `<div class="wrap"><article class="gpage">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${a.url}">${esc(a.name)}</a> › <a href="/${a.key}/help/">Fixes and guides</a></nav>
  ${hero}
  <div class="chips"><span class="chip">${g.emoji} ${KIND[g.kind]}</span></div>
  <h1>${esc(g.h1)}</h1>
  <p class="lead answer">${esc(g.lead)}</p>
  ${macros}
  <div class="prose">${g.sections.map(([h, html]) => `<h2 class="h3">${esc(h)}</h2>${html}`).join("\n")}</div>
  ${g.faq?.length ? `<section class="faq"><h2 class="h3">Questions</h2>${g.faq.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join("")}</section>` : ""}
  ${prods.length ? `<section class="gear-used"><h2 class="h3">Handy for this</h2><div class="gear-row">${prods.map((p) => productCard(p, "guide")).join("")}</div>${affNote(site)}</section>` : ""}
  ${rel.length ? `<section class="related"><h2 class="h3">Recipes to try</h2>${grid(rel)}</section>` : ""}
  ${others.length ? `<section class="related"><h2 class="h3">More ${g.kind === "fix" ? "fixes" : "guides"}</h2><div class="glist">${others.map((x) => `<a class="gitem" href="/${a.key}/help/${x.slug}/"><span class="gi">${x.emoji}</span><span><b>${esc(x.h1)}</b></span></a>`).join("")}</div></section>` : ""}
  ${emailBox(site, "guide")}
</article></div>`,
  });
}
/* Short "having trouble?" links shown on Creami pages. */
export function helpLinks(a, guides, n = 3) {
  if (!guides?.length) return "";
  return `<section class="helpstrip"><h2 class="h3">🛠️ Having trouble?</h2><div class="glist">${guides.filter((g) => g.kind === "fix").slice(0, n).map((g) => `<a class="gitem" href="/${a.key}/help/${g.slug}/"><span class="gi">${g.emoji}</span><span><b>${esc(g.h1)}</b></span></a>`).join("")}</div><p><a href="/${a.key}/help/">All fixes and guides ›</a></p></section>`;
}
