// node tests/ideas.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isDue, pickIdeas, buildEmail, localNow } from "../lib/ideas.mjs";

const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
const site = JSON.parse(readFileSync("data/site.json", "utf8"));
site.email.postalAddress = "123 Test St, Springfield";

// timing: weekly Sunday 4pm New York
const s = { email_consent: true, timezone: "America/New_York", send_hour: 16, email_frequency: "weekly", email_weekday: 0 };
const sunday4pmNY = new Date("2026-10-04T20:30:00Z"); // 16:30 EDT, Sunday
assert.deepEqual(localNow("America/New_York", sunday4pmNY), { hour: 16, weekday: 0 });
assert.equal(isDue(s, null, sunday4pmNY), true);
assert.equal(isDue(s, new Date("2026-10-04T15:00:00Z"), sunday4pmNY), false, "not twice in a day");
assert.equal(isDue({ ...s, email_consent: false }, null, sunday4pmNY), false, "no consent, no email");
assert.equal(isDue(s, null, new Date("2026-10-05T20:30:00Z")), false, "weekly: wrong weekday");
assert.equal(isDue({ ...s, email_frequency: "daily" }, null, new Date("2026-10-05T20:30:00Z")), true, "daily any day");

// picks: per profile, respects allergies + appliances, rotates away from recent
const household = { appliances: ["blender", "juicer", "wood-fire"] };
const profiles = [{ name: "Julian", goals: ["protein"], allergies: [], meal_types: ["dinner"] }, { name: "Noah", allergies: ["peanut"], dislikes: ["mushroom"], goals: ["quick"], meal_types: ["snack"] }];
const ideas = pickIdeas(catalog, { household, profiles, now: sunday4pmNY });
assert.ok(ideas.family); assert.equal(ideas.each.length, 2);
const keys = [ideas.family, ...ideas.each.map((e) => e.pick)].map((x) => x.rec.k);
assert.equal(new Set(keys).size, keys.length, "no duplicate dish in one email");
assert.ok(keys.every((k) => !k.startsWith("creami/")), "only owned appliances");
const noah = ideas.each.find((e) => e.profile === "Noah").pick.rec;
assert.ok(!/peanut/.test(noah.ing), "Noah's pick has no peanut");
const again = pickIdeas(catalog, { household, profiles, avoidKeys: keys, now: sunday4pmNY });
assert.ok([again.family, ...again.each.map((e) => e.pick)].every((x) => !keys.includes(x.rec.k)), "rotation avoids last email");

// email: unsubscribe + address present, refuses to build without an address
const mail = buildEmail({ site, ideas, unsubscribeUrl: "https://x/api/unsubscribe?t=abc", preferencesUrl: "https://x/account/#email" });
assert.ok(mail.subject.startsWith("Tonight by Ninjas: "));
assert.ok(mail.html.includes("Unsubscribe") && mail.html.includes("123 Test St") && mail.text.includes("Unsubscribe: https://x/api/unsubscribe?t=abc"));
assert.equal(mail.keys.length, 3);
assert.throws(() => buildEmail({ site: { ...site, email: { ...site.email, postalAddress: "" } }, ideas, unsubscribeUrl: "u", preferencesUrl: "p" }));
console.log("ideas email tests passed");
