// node tests/assistant.test.mjs  (no network: Claude is replaced by a fake client)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { answer, cleanInput } from "../lib/assistant.mjs";

const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
function fake(reply, opts = {}) {
  const calls = [];
  return { calls, beta: { messages: { create: async (req) => { calls.push(req); if (opts.throw) throw Object.assign(new Error("boom"), { status: 529 });
    return { stop_reason: opts.stop || "end_turn", content: [{ type: "text", text: typeof reply === "string" ? reply : JSON.stringify(reply) }] }; } } } };
}
const ai = { enabled: true, model: "claude-opus-5-5" };

// 1. valid picks kept, invented ids dropped, outside dish passed through
{
  const input = cleanInput({ meal: "dinner", chips: ["tired"], text: "I slept badly" });
  const client = fake({ intro: "Easy night.", picks: [{ id: "wood-fire/w04", reason: "Fast and light." }, { id: "made-up/x1", reason: "nope" }], outside: { title: "", reason: "", steps: [] } });
  const r = await answer(input, { catalog, household: null, ai, allowAi: true, client });
  assert.equal(r.ai, true); assert.equal(r.picks.length, 1); assert.equal(r.picks[0].url, "/wood-fire/shrimp-and-veggie-skewers/");
  assert.equal(r.outside, null);
  const req = client.calls[0];
  assert.equal(req.model, "claude-opus-5-5"); assert.equal(req.fallbacks, "default"); assert.ok(req.betas.includes("server-side-fallback-2026-07-01"));
  assert.equal(req.output_config.format.type, "json_schema"); assert.equal(req.output_config.effort, "low");
  assert.equal(req.system[0].cache_control.type, "ephemeral");
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(req.system[0].text), "system prompt has no volatile content");
}
// 2. pantry question gets an outside-the-library dish
{
  const input = cleanInput({ meal: "lunch", chips: ["leftovers"], text: "I have flour, 4 eggs, leftover ham and bread" });
  const client = fake({ intro: "Let's use it up.", picks: [{ id: "wood-fire/w15", reason: "Uses the eggs." }], outside: { title: "Ham and egg bread bake", reason: "Uses all of it.", steps: ["Tear bread", "Whisk eggs", "Bake"] } });
  const r = await answer(input, { catalog, household: null, ai, allowAi: true, client });
  assert.equal(r.outside.title, "Ham and egg bread bake"); assert.equal(r.outside.steps.length, 3);
}
// 3. refusal, API error, bad JSON, over the cap -> library fallback (never empty)
for (const [label, client, allowAi] of [["refusal", fake({}, { stop: "refusal" }), true], ["error", fake({}, { throw: true }), true], ["bad json", fake("not json"), true], ["capped", fake({}), false]]) {
  const r = await answer(cleanInput({ meal: "breakfast", chips: ["healthy"] }), { catalog, household: null, ai, allowAi, client });
  assert.equal(r.ai, false, label); assert.ok(r.picks.length >= 1, label);
  if (label === "capped") assert.equal(client.calls.length, 0, "no AI call when capped");
}
// 4. household rules: allergies/dislikes/appliances/recently cooked never reach the AI
{
  const household = { userId: "u1", household: { appliances: ["blender", "juicer"] }, profiles: [{ name: "Noah", allergies: ["peanut"], dislikes: ["banana"], diet: [], goals: [] }], likedKeys: [], recentKeys: ["blender/b02"] };
  const client = fake({ intro: "x", picks: [], outside: { title: "", reason: "", steps: [] } });
  await answer(cleanInput({ meal: "breakfast" }), { catalog, household, ai, allowAi: true, client });
  const sent = client.calls[0].messages[0].content;
  assert.ok(!/creami\/|wood-fire\//.test(sent), "only owned appliances");
  assert.ok(!sent.includes("blender/b02"), "recently cooked removed");
  assert.ok(!sent.includes("blender/b03"), "peanut butter cup removed for peanut allergy");
  assert.ok(!/"Strawberry banana"/.test(sent), "banana dislike removed");
}
// 5. input is sanitised
{
  const i = cleanInput({ meal: "brunch", chips: ["tired", "evil"], text: "x".repeat(900) });
  assert.equal(i.meal, null); assert.deepEqual(i.chips, ["tired"]); assert.equal(i.text.length, 400);
}
console.log("assistant tests passed");

// "Something else": excluded recipes are not picked again, and bad keys are ignored
{
  const first = await answer(cleanInput({ meal: "dinner", chips: ["quick"] }), { catalog, household: null, ai: { enabled: false } });
  const keys = first.picks.map((p) => p.key);
  const next = await answer(cleanInput({ meal: "dinner", chips: ["quick"], exclude: [...keys, "bad key!"] }), { catalog, household: null, ai: { enabled: false } });
  assert.ok(next.picks.length > 0);
  assert.ok(next.picks.every((p) => !keys.includes(p.key)));
  console.log("assistant exclude test passed");
}
