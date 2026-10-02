// LOCAL PREVIEW ONLY: answers /api/chat in the browser from the recipe library (no AI, no accounts).
import { rank, reasonFor, keywords } from "/assets/picker.mjs";
const catalog = fetch("/data/catalog.json").then((r) => r.json());
const real = window.fetch.bind(window);
window.fetch = async (url, opts) => {
  if (String(url) !== "/api/chat") return real(url, opts);
  const b = JSON.parse(opts.body || "{}"), input = { meal: b.meal, chips: b.chips || [], text: b.text || "" };
  const ranked = rank(await catalog, { ...input, avoidKeys: b.exclude || [], limit: 30 });
  const pantry = input.chips.includes("leftovers") || keywords(input.text).length >= 2;
  let list = pantry ? ranked.filter((x) => x.matched > 0) : ranked; const weak = pantry && !list.length; if (!list.length) list = ranked;
  const picks = list.slice(0, 3).map((x) => ({ key: x.rec.k, title: x.rec.t, url: x.rec.u, img: x.rec.img, emoji: x.rec.e, reason: reasonFor(x, input) }));
  await new Promise((r) => setTimeout(r, 600));
  return new Response(JSON.stringify({ intro: weak ? "Nothing in our recipe book uses those well, but these are easy wins." : "Here are a few ideas from our recipe book.", picks, outside: null, signedIn: false }), { headers: { "content-type": "application/json" } });
};
