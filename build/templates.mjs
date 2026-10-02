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
  r.img ? `<img${cls ? ` class="${cls}"` : ""} src="${r.img}" alt="${esc(r.title)}"${lazy ? ' loading="lazy"' : ""}${r.cdn ? ` data-cdn="${r.cdn}"` : ""} data-emo="${r.emoji}">` : `<div class="emo">${r.emoji}</div>`;

/* ---------- layout ---------- */
function publicConfig(site) {
  const { ads, consent, analytics, email, members, shop, affiliate, family } = site;
  return { ads, consent, analytics, email, members, shop, family, disclosure: affiliate.disclosure };
}

export function layout(ctx, o) {
  const { site } = ctx;
  const title = o.title ? `${o.title} · ${site.name}` : site.name;
  const url = site.url + (o.path || "/");
  const og = o.image ? (o.image.startsWith("http") ? o.image : site.url + o.image) : site.url + "/img/ice/hero.jpg";
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
<meta property="og:title" content="${esc(o.title || site.name)}">
<meta property="og:description" content="${esc(o.desc || site.tagline)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/app.css">
<script>window.SITE_CONFIG=${json(publicConfig(site))};${IMG_FALLBACK}</script>
${(o.jsonld || []).map((j) => `<script type="application/ld+json">${json(j)}</script>`).join("\n")}
</head>
<body data-site="${o.theme || "plain"}">
<a class="skip" href="#main">Skip to content</a>
${o.header === false ? "" : header(o.heading, o.kicker, o.headingTag, o.brand)}
<main id="main" tabindex="-1">
${o.body}
</main>
${footer(ctx)}
<script src="/assets/site.js" defer></script>
${(o.scripts || []).map((s) => (s.startsWith("<") ? s : `<script src="${s}" defer></script>`)).join("\n")}
</body>
</html>`;
}

function header(heading, kicker, tag = "h1", brand = false) {
  return `<header class="top${brand ? " brand" : ""}">
  <a class="ibtn home" href="/" aria-label="Home">←</a>
  <div class="ttl">${kicker ? `<p class="kick">${kicker}</p>` : ""}<${tag} class="h">${heading || "Recipes for Ninjas"}</${tag}></div>
  <a class="ibtn srch" href="/search/" aria-label="Search all recipes">🔍</a>
</header>`;
}

function footer(ctx) {
  const { site, appliances } = ctx;
  return `<footer class="foot-site">
  <nav class="fnav" aria-label="Appliances">${appliances.map((a) => `<a href="${a.url}">${a.emoji} ${esc(a.name)}</a>`).join("")}</nav>
  <nav class="fnav small" aria-label="More">
    <a href="/search/">Search</a><a href="/gear/">Accessories</a>${site.shop.enabled ? '<a href="/shop/">Shop</a>' : ""}
    <a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/disclosure/">Affiliate disclosure</a>
    <button type="button" class="linkbtn" data-consent-open>Cookie settings</button>
  </nav>
  <p class="disc">${esc(site.affiliate.disclosure)}</p>
  <p class="disc">© ${new Date().getFullYear()} ${esc(site.ownerName)}. Not affiliated with SharkNinja.</p>
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
  const s = [r.title, r.blurb, r.ing.join(" "), r.tags.map((t) => a.data.labels[t]).join(" "), (r.ben || []).map((b) => a.benMap[b]?.[2]).join(" ")].join(" ").toLowerCase();
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
  const netlify = e.provider === "netlify";
  return `<section class="signup" data-where="${where}">
  <h2>${esc(e.headline)}</h2>
  ${e.leadMagnet?.title ? `<p>${esc(e.leadMagnet.title)}, free when you join.</p>` : ""}
  <form class="signup-f" method="POST" ${netlify ? 'name="newsletter" data-netlify="true" action="/thanks/"' : `action="${esc(e.action)}" target="_blank"`}>
    ${netlify ? '<input type="hidden" name="form-name" value="newsletter">' : ""}
    <input type="hidden" name="source" value="${where}">
    <label class="sr" for="em-${where}">Email</label>
    <input id="em-${where}" type="email" name="email" required placeholder="you@example.com" autocomplete="email">
    <button class="btn" type="submit">Join</button>
  </form>
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
function gearBlock(ctx, r) {
  const items = (r.gear || []).map((id) => ctx.products[id]).filter(Boolean);
  if (!items.length) return "";
  return `<section class="gear-used"><h3>Handy for this recipe</h3>
  <div class="gear-row">${items.map((p) => productCard(p, "recipe")).join("")}</div>
  <p class="disc">${esc(ctx.site.affiliate.disclosure)}</p></section>`;
}
export function productCard(p, where) {
  const pic = p.image ? `<img src="${p.image}" alt="" loading="lazy"${p.cdn ? ` data-cdn="${p.cdn}"` : ""} data-emo="${p.icon || "🧰"}">` : `<div class="emo">${p.icon || "🧰"}</div>`;
  const inner = `<span class="gp">${pic}</span><span class="gt"><b>${esc(p.name)}</b>${p.note ? `<small>${esc(p.note)}</small>` : ""}${p.price ? `<small class="price">${esc(p.price)}</small>` : ""}</span>`;
  return p.href
    ? `<a class="gcard" href="${p.href}" rel="sponsored noopener" target="_blank" data-aff="${p.id}" data-where="${where}">${inner}<span class="go">Check price ›</span></a>`
    : `<div class="gcard">${inner}</div>`;
}

/* ---------- home ---------- */
export function home(ctx, html) {
  const cfg = `<script>window.SITE_CONFIG=${json(publicConfig(ctx.site))};</script>`;
  return html.replace("<!--SITE_CONFIG-->", cfg).replace("<!--SITE_JS-->", '<script src="/assets/site.js" defer></script>');
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
    heading: `${a.emoji} ${esc(a.name)}`, kicker: `${esc(a.device)} · ${D.recipes.length} recipes`,
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
  ${hasBen ? `<div class="bens" id="bens" aria-label="Filter by benefit"><span class="lbl">I want:</span>${(D.bens || []).filter((b) => D.recipes.some((r) => (r.ben || []).includes(b[0]))).map((b) => `<button class="bchip" type="button" data-b="${b[0]}" aria-pressed="false">${b[1]} ${esc(b[2])}</button>`).join("")}</div>` : ""}
  <nav class="nav" aria-label="Menu sections"><div class="navrow" id="navrow" style="--n:${D.cats.length}">${D.cats.map((c) => `<button class="tab" type="button" data-c="${c.k}" data-t="${c.k}" aria-label="${esc(c.n)}"><span class="te">${c.e}</span><span>${esc(c.s || c.n)}</span></button>`).join("")}</div></nav>
  <div id="sections">${secs}</div>
  <p class="empty" id="empty" hidden>No recipes match. Try another word.</p>
  <p class="foot">${esc(a.foot)}</p>
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
  if (r.video) ld.video = { "@type": "VideoObject", name: r.title, description: r.blurb, thumbnailUrl: ld.image, contentUrl: typeof r.video === "string" ? r.video : r.video.url, uploadDate: r.video.date || undefined };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: site.url + "/" },
    { "@type": "ListItem", position: 2, name: a.name, item: site.url + a.url },
    { "@type": "ListItem", position: 3, name: c?.n, item: `${site.url}/${a.key}/category/${r.cat}/` },
    { "@type": "ListItem", position: 4, name: r.title, item: site.url + r.url }] };
  const related = a.data.recipes.filter((x) => x.cat === r.cat && x.id !== r.id).slice(0, 4);
  const gated = site.members.enabled && r.members;
  const ings = `<h2 class="h3">${esc(r.listTitle || "You need")}</h2><ul class="ingl">${r.ing.map((x) => `<li><label><input type="checkbox"><span>${esc(x)}</span></label></li>`).join("")}</ul>
  <div class="row"><button class="btn" id="cp" type="button">Copy shopping list</button><span class="status" id="cps" aria-live="polite"></span></div>`;
  const steps = `<h2 class="h3">Steps</h2><ol class="steps">${r.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`;
  return layout(ctx, {
    title: r.title, desc: `${r.blurb} ${a.device} recipe.`, path: r.url, theme: a.theme, image: r.img, ogType: "article",
    heading: `${a.emoji} ${esc(a.name)}`, kicker: `<a href="${a.url}">${esc(a.device)}</a>`, headingTag: "p",
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
    <div class="chips">${r.chips.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>
    <div class="press"><small>${esc(a.pressLabel)}</small> ${esc(r.press)}</div>
    <div class="likebox"><b>❤️ Who likes this?</b><div class="who">${site.family.map((p) => `<button class="who-b" type="button" data-p="${p}" data-like="${p}" aria-pressed="false">${p}</button>`).join("")}</div><p class="sync" id="sync"></p></div>
    ${ings}
    ${adSlot(site, "recipe-in-content", "incontent")}
    ${gated ? `<div class="gate"><div class="gate-blur" aria-hidden="true">${steps}</div><div class="gate-cta"><b>🔒 Members-only recipe</b><p>Join to unlock the steps.</p>${site.members.joinUrl ? `<a class="btn" href="${esc(site.members.joinUrl)}">Join</a>` : ""}</div></div>` : steps}
    ${r.notes.map(([k, v]) => `<p class="note"><b>${esc(k)}:</b> ${esc(v)}</p>`).join("")}
    ${(r.ben || []).length ? '<p class="disclaim">Benefit tags are general nutrition info, not medical advice.</p>' : ""}
    ${video(r.video)}
    ${gearBlock(ctx, r)}
    ${share(ctx, r)}
    ${emailBox(site, "recipe")}
  </div>
  ${related.length ? `<section class="related"><h2 class="h3">More ${esc(c?.n.toLowerCase())}</h2>${grid(related.map((x) => ({ a, r: x })))}</section>` : ""}
</article>
${site.ads.enabled ? `<div class="side">${adSlot(site, "recipe-sidebar", "sidebar")}</div>` : ""}
</div>`,
    scripts: [`<script>window.RECIPE=${json({ id: r.id, title: r.title, ing: r.ing, section: a.section })};</script>`, "/assets/likes.js", "/assets/recipe.js"],
  });
}

/* ---------- listing pages ---------- */
function listing(ctx, o) {
  return layout(ctx, { ...o, body: `<div class="wrap menu">
  ${o.crumbs ? `<nav class="crumbs" aria-label="Breadcrumb">${o.crumbs}</nav>` : ""}
  <div class="lhead"><h1>${o.h1}</h1>${o.lead ? `<p class="lead">${esc(o.lead)}</p>` : ""}</div>
  ${o.inner}
</div>`, header: true, heading: o.heading || "🥷 Recipes for Ninjas", headingTag: "p", brand: !o.heading });
}
export function category(ctx, a, c) {
  const items = a.data.recipes.filter((r) => r.cat === c.k).map((r) => ({ a, r }));
  return listing(ctx, { title: `${c.n} · ${a.name}`, desc: c.d, path: `/${a.key}/category/${c.k}/`, theme: a.theme, heading: `${a.emoji} ${esc(a.name)}`,
    crumbs: `<a href="/">Home</a> › <a href="${a.url}">${esc(a.name)}</a>`, h1: `${c.e} ${esc(c.n)}`, lead: c.d, inner: grid(items) });
}
export function tag(ctx, t) {
  return listing(ctx, { title: `${t.label} recipes`, desc: `${t.label} recipes across every Ninja machine.`, path: `/tags/${t.k}/`,
    crumbs: `<a href="/">Home</a> › Tags`, h1: `${t.emoji} ${esc(t.label)}`, lead: `${t.items.length} recipes across all machines.`, inner: grid(t.items) });
}
export function search(ctx) {
  return listing(ctx, { title: "Search", desc: "Search every recipe across all Ninja machines.", path: "/search/", h1: "🔍 Search every recipe",
    inner: `<div class="tools"><input class="search" id="sq" type="search" placeholder="Try mango, ribs, energy, salsa…" aria-label="Search all recipes" autocomplete="off" autofocus></div>
  <div class="pills afilter" role="group" aria-label="Filter by appliance"><button class="pill on" type="button" data-a="">All</button>${ctx.appliances.map((a) => `<button class="pill" type="button" data-a="${a.key}">${a.emoji} ${esc(a.short)}</button>`).join("")}</div>
  <p class="status" id="scount" aria-live="polite"></p>
  <div class="grid" id="sres"></div>
  <h2 class="h3">Browse by tag</h2><div class="chips">${(ctx.tags || []).map((t) => `<a class="chip" href="/tags/${t.k}/">${t.emoji} ${esc(t.label)}</a>`).join("")}</div>`,
    scripts: [`<script>window.APPLIANCES=${json(Object.fromEntries(ctx.appliances.map((a) => [a.key, a.emoji + " " + a.short])))};</script>`, "/assets/search.js"] });
}
export function accessoryStrip(ctx, a, limit = 3) {
  const l = Object.values(ctx.products).filter((p) => p.appliance === a.key).sort((x, y) => x.rank - y.rank).slice(0, limit);
  if (!l.length) return "";
  return `<section class="acc-strip"><div class="sh"><h2 class="h3">🧰 Accessories for your ${esc(a.short.toLowerCase())}</h2><a class="shop-btn" href="/gear/#${a.key}">See all</a></div>
  <div class="gear-grid">${l.map((p) => productCard(p, "hub")).join("")}</div><p class="disc">${esc(ctx.site.affiliate.disclosure)}</p></section>`;
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
    inner: `<nav class="chips">${ctx.appliances.map((a) => `<a class="chip" href="#${a.key}">${a.emoji} ${esc(a.short)}</a>`).join("")}</nav><p class="disc box">${esc(ctx.site.affiliate.disclosure)}</p>${secs}` });
}
export function shop(ctx, catalog) {
  const items = catalog.digital || [];
  const cards = items.map((d) => `<div class="gcard shopc">${d.image ? `<span class="gp"><img src="${d.image}" alt="" loading="lazy"></span>` : '<span class="gp"><div class="emo">📄</div></span>'}<span class="gt"><b>${esc(d.name)}</b>${d.note ? `<small>${esc(d.note)}</small>` : ""}<small class="price">${esc(d.price)}</small></span>${d.checkoutUrl ? `<a class="btn" href="${esc(d.checkoutUrl)}" data-buy="${d.id}">Buy</a>` : ""}</div>`).join("");
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
<li><b>Email.</b> If you join the newsletter we store your email address with our email provider to send it. Unsubscribe any time from any email.</li>
<li><b>Analytics.</b> If enabled and you consent, we use privacy-friendly analytics to count visits and clicks. No data is sold.</li>
<li><b>Advertising.</b> If ads are enabled and you consent, our ad partner may use cookies to show and measure ads.</li>
<li><b>Purchases.</b> Payments are handled by Stripe. We never see your card details; we keep an order record so you can re-download.</li></ul>
<h2 class="h3">Your choices</h2><p>Change your cookie choice any time with "Cookie settings" in the footer. To ask for your data to be deleted, contact ${contact}.</p>`],
    terms: ["Terms of use", `<p>Recipes are for home use. Follow your appliance manual and food-safety guidance, check internal temperatures for meat, and take care with allergies. Nutrition and benefit tags are general information, not medical advice.</p>
<p>Content on this site belongs to ${who} unless stated otherwise. You may share links freely; please don't republish full recipes or photos without permission.</p>
<p>Product names are trademarks of their owners. This site is not affiliated with or endorsed by SharkNinja.</p>`],
    disclosure: ["Affiliate disclosure", `<p>${esc(s.affiliate.disclosure)}</p><p>We only recommend products we use or would buy for our own family. Commissions help keep this site free and don't change the price you pay.</p>`],
  }[which];
  return listing(ctx, { title: T[0], path: `/${which}/`, h1: T[0], inner: `<div class="prose">${T[1]}<p class="disc">Last updated ${new Date().toISOString().slice(0, 10)}.</p></div>` });
}
export function notFound(ctx) {
  return listing(ctx, { title: "Page not found", path: "/404.html", h1: "🫠 That page melted.", lead: "Try search, or pick a machine below.",
    inner: `<p><a class="btn" href="/search/">Search recipes</a></p>` });
}
export function thanks(ctx) {
  const lm = ctx.site.email.leadMagnet;
  return listing(ctx, { title: "You're in", path: "/thanks/", h1: "🎉 You're in", lead: "Thanks for joining. Check your inbox for a welcome email.",
    inner: (lm?.url ? `<p><a class="btn" href="${esc(lm.url)}" download>Download: ${esc(lm.title)}</a></p>` : "") + `<p><a class="btn ghost" href="/">Back to recipes</a></p>` });
}
