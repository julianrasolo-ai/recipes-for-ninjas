// Recipe catalog + picker shared by the chat assistant and the "Tonight by Ninjas" emails.
// The catalog is built from data/recipes/*.json at build time (build/build.mjs -> data/catalog.json).

export const MEALS = ["breakfast", "lunch", "dinner", "snack"];
export const CHIPS = ["tired", "healthy", "protein", "quick", "comfort", "leftovers"];

const MEAL_BY_CAT = {
  creami: { _: ["snack", "dessert"] },
  juicer: { fizz: ["snack", "drink"], _: ["breakfast", "snack", "drink"] },
  blender: { smoothie: ["breakfast", "snack"], bowl: ["breakfast", "snack"], batter: ["breakfast"], frozen: ["snack", "dessert", "drink"], sauce: ["lunch", "dinner"], soup: ["lunch", "dinner"] },
  "wood-fire": { sweet: ["snack", "dessert"], _: ["lunch", "dinner"] },
};
const COMFORT = { creami: ["soft", "ice", "rich", "quick"], blender: ["batter", "soup", "frozen"], "wood-fire": ["smoke", "crisp", "bake", "sweet"], juicer: [] };
/* Sides and dips: fine with a meal, not the meal itself. */
const SIDES = { blender: ["sauce"], "wood-fire": ["veg"] };
const SIDE_IDS = ["w14", "w15"];
const MEAT = ["chicken", "wings", "beef", "ground", "pork", "ribs", "sausage", "salmon", "shrimp", "ham", "bacon", "steak", "turkey", "fish"];

/* Words an allergy or diet rules out, matched against ingredient text. */
const ALLERGEN_WORDS = {
  peanut: ["peanut", "pb "], "tree nut": ["almond", "pecan", "walnut", "hazelnut", "pistachio", "cashew", "pine nut", "nuts", "nut butter", "praline"],
  nut: ["peanut", "almond", "pecan", "walnut", "hazelnut", "pistachio", "cashew", "pine nut", "nuts"],
  dairy: ["milk", "cream", "yogurt", "cheese", "butter", "ice cream", "custard", "parmesan", "mozzarella", "cheddar", "cotija", "feta", "whey", "condensed"],
  milk: ["milk", "cream", "yogurt", "cheese", "butter", "ice cream", "whey"], egg: ["egg"], gluten: ["flour", "cookie", "cereal", "bread", "dough", "bun", "roll", "tortilla", "cracker", "pasta", "oats", "graham", "pretzel", "cake"],
  wheat: ["flour", "bread", "dough", "bun", "roll", "tortilla", "cracker", "pasta", "graham", "pretzel"], soy: ["soy", "tofu"], shellfish: ["shrimp", "prawn", "crab", "lobster"], fish: ["salmon", "fish", "tuna", "cod"],
  sesame: ["sesame", "tahini"], coconut: ["coconut"], strawberry: ["strawberr"],
};
const DIET_WORDS = {
  vegetarian: MEAT, vegan: [...MEAT, ...ALLERGEN_WORDS.dairy, "egg", "honey", "marshmallow"],
  "dairy-free": ALLERGEN_WORDS.dairy, "gluten-free": ALLERGEN_WORDS.gluten, pescatarian: MEAT.filter((m) => !["salmon", "shrimp", "fish"].includes(m)),
};

const ADULT = /\b(booz|alcohol|adult|21\+|rum|bourbon|tequila|whiskey|vodka|liqueur|cocktail|margarita|baileys|irish cream)/i;

export function minutes(s) {
  if (!s || /none/i.test(s)) return 0;
  const h = /(\d+(?:\.\d+)?)\s*h/i.exec(s), m = /(\d+)\s*min/i.exec(s);
  return Math.round((h ? parseFloat(h[1]) * 60 : 0) + (m ? +m[1] : 0));
}

/** Build the compact catalog used at runtime. `appliances` = data/appliances.json with `.data` loaded. */
export function buildCatalog(appliances) {
  const out = [];
  for (const a of appliances) {
    const L = a.data.labels;
    for (const r of a.data.recipes) {
      const cat = MEAL_BY_CAT[a.key] || {};
      const meal = cat[r.cat] || cat._ || ["snack"];
      const active = minutes(r.prep) + minutes(r.cook || r.spin);
      const wait = minutes(r.wait || r.freeze);
      const mood = [];
      if (r.healthy) mood.push("healthy");
      if (active <= 15 && wait === 0) mood.push("quick");
      if ((COMFORT[a.key] || []).includes(r.cat) && !/chilled|cold|iced/i.test(r.title)) mood.push("comfort");
      if ((r.ben || []).includes("energy")) mood.push("energy");
      if ((r.macros?.protein || 0) >= 25 || (a.key === "creami" && r.cat === "pro") || (a.key === "wood-fire" && r.tags.some((t) => ["chicken", "beef", "pork", "ribs", "salmon", "shrimp", "ground"].includes(t)))) mood.push("protein");
      if (active <= 20 && r.steps.length <= 4 && wait === 0) mood.push("tired");
      out.push({
        k: `${a.key}/${r.id}`, a: a.key, id: r.id, t: r.title, u: `/${a.key}/${r.slug}/`, img: r.img, e: r.emoji,
        b: r.blurb, meal, mood, min: active, wait, ben: r.ben || [], h: !!r.healthy,
        side: (SIDES[a.key] || []).includes(r.cat) || SIDE_IDS.includes(r.id),
        adult: !!r.adult, ...(r.macros ? { kcal: r.macros.kcal, prot: r.macros.protein } : {}),
        ing: (r.ing.join(" ; ") + " ; " + r.tags.map((t) => L[t] || t).join(" ; ")).toLowerCase(),
        main: r.tags.slice(0, 6).map((t) => L[t] || t),
      });
    }
  }
  return out;
}

/* Word-start match so "egg" doesn't hit "veggie" and "ham" doesn't hit "shampoo". */
const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function hasWord(text, w) {
  return new RegExp(`(^|[^a-z])${esc(w.trim())}`, "i").test(text);
}
function hits(text, words) {
  return words.filter((w) => hasWord(text, w));
}
/** Why a recipe is unsafe for this person, or null. Profile = merged household rules. */
export function blocked(rec, profile = {}) {
  for (const al of profile.allergies || []) {
    const key = al.toLowerCase().trim(); if (!key) continue;
    const words = ALLERGEN_WORDS[key] || [key.replace(/s$/, "")];
    if (hits(rec.ing + " " + rec.t.toLowerCase(), words).length) return `contains ${al}`;
  }
  for (const d of profile.diet || []) {
    const words = DIET_WORDS[d.toLowerCase()];
    if (words && hits(rec.ing, words).length) return `not ${d}`;
  }
  for (const dis of profile.dislikes || []) {
    const w = dis.toLowerCase().trim().replace(/s$/, ""); if (!w) continue;
    if (hasWord(rec.ing + " " + rec.t.toLowerCase(), w)) return `has ${dis}`;
  }
  return null;
}

const STOP = new Set("i a an the and or with of to in for my me some have got leftover leftovers left over any want something make like is it this that we our on at from just".split(" "));
export function keywords(text = "") {
  return [...new Set(text.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ies)$/, "y").replace(/s$/, "")))];
}

/**
 * Score and rank recipes. Hard filters: allergies, diet, dislikes, appliances owned, recently cooked/sent.
 * Returns [{rec, score, why[]}] best first.
 */
export function rank(catalog, { meal, chips = [], text = "", profile = {}, appliances = [], avoidKeys = [], limit = 30 } = {}) {
  const words = keywords(text);
  const avoid = new Set(avoidKeys);
  const res = [];
  for (const rec of catalog) {
    if (avoid.has(rec.k)) continue;
    if (appliances.length && !appliances.includes(rec.a)) continue;
    if (blocked(rec, profile)) continue;
    if (rec.adult && !ADULT.test(text)) continue; // boozy recipes only when someone asks for them
    let score = 0; const why = [];
    if (meal) {
      if (rec.meal.includes(meal)) { score += 6; } else if (meal === "snack" && rec.meal.includes("dessert")) { score += 4; } else continue;
    }
    for (const c of chips) {
      if (c === "leftovers") continue;
      if (rec.mood.includes(c)) { score += words.length ? 2 : 4; why.push(c); } // named ingredients matter more than mood
    }
    if (chips.includes("quick") && rec.min > 25) score -= 4;
    if ((chips.includes("tired") || chips.includes("quick")) && rec.wait > 60) score -= 6;
    if (chips.includes("tired") && rec.min > 45) score -= 5; // no 3-hour smokes when everyone is tired
    if (rec.side && (meal === "lunch" || meal === "dinner")) score -= 6; // sauces and sides are not a meal on their own
    const matched = words.filter((w) => hasWord(rec.ing, w) || hasWord(rec.t, w));
    if (matched.length) { score += matched.reduce((n, w) => n + (MEAT.includes(w) ? 7 : 4), 0); why.push("uses " + matched.slice(0, 3).join(", ")); }
    for (const g of profile.goals || []) {
      if (g === "healthy" && rec.h) score += 2;
      if (g === "protein" && (rec.prot >= 25 || /protein|chicken|beef|salmon|shrimp|yogurt|cottage|egg|pork/.test(rec.ing))) score += 2;
      if (g === "quick" && rec.min <= 15 && rec.wait === 0) score += 2;
    }
    if (profile.likedKeys?.includes(rec.k)) { score += 1; why.push("a family favorite"); }
    res.push({ rec, score, why, matched: matched.length });
  }
  res.sort((x, y) => y.score - x.score || x.rec.min - y.rec.min || x.rec.k.localeCompare(y.rec.k));
  return res.slice(0, limit);
}

/** Combine several household profiles into one rule set (safe for everyone at the table). */
export function mergeProfiles(profiles = []) {
  const u = (f) => [...new Set(profiles.flatMap((p) => p[f] || []))];
  return { allergies: u("allergies"), diet: u("diet"), dislikes: u("dislikes"), goals: u("goals") };
}

/** Plain-language reason for a non-AI pick. */
export function reasonFor(item, { chips = [], meal } = {}) {
  const r = item.rec, bits = [];
  if (item.why.some((w) => w.startsWith("uses"))) bits.push(item.why.find((w) => w.startsWith("uses")).replace("uses", "Uses your"));
  if (chips.includes("tired") || chips.includes("quick")) bits.push(!r.min ? "almost no work" : r.min < 90 ? `about ${r.min} minutes of work` : `about ${Math.round(r.min / 60)} hours, mostly hands-off`);
  if (chips.includes("healthy") && r.h) bits.push("on the lighter side");
  if (chips.includes("protein") && r.prot) bits.push(`about ${r.prot} g protein a pint`); else if (chips.includes("protein") && r.mood.includes("protein")) bits.push("high in protein");
  if (chips.includes("comfort") && r.mood.includes("comfort")) bits.push("proper comfort food");
  if (!bits.length) bits.push(meal ? `a good ${meal} pick` : "an easy family favorite");
  if (r.wait >= 600) bits.push("needs a frozen pint ready");
  const s = bits.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}
