// "Tonight by Ninjas" emails: who is due, what to suggest, and the email itself. Pure functions (easy to test).
import { rank, mergeProfiles, reasonFor } from "./picker.mjs";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Local hour/weekday for a timezone, without extra libraries. */
export function localNow(timezone, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23", weekday: "short" }).formatToParts(now);
    const hour = +parts.find((p) => p.type === "hour").value;
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday").value);
    return { hour, weekday: wd };
  } catch { return { hour: now.getUTCHours(), weekday: now.getUTCDay() }; }
}

/** Is this account due right now? settings = account_settings row, lastSent = Date|null */
export function isDue(settings, lastSent, now = new Date()) {
  if (!settings.email_consent) return false;
  const { hour, weekday } = localNow(settings.timezone, now);
  if (hour !== settings.send_hour) return false;
  if (settings.email_frequency === "weekly" && weekday !== settings.email_weekday) return false;
  if (lastSent && now - lastSent < 20 * 3600e3) return false; // never twice in a day
  return true;
}

function mealFor(profile, now) {
  const wanted = (profile.meal_types || []).filter((m) => ["breakfast", "lunch", "dinner", "snack"].includes(m));
  return wanted.includes("dinner") || !wanted.length ? "dinner" : wanted[now.getUTCDate() % wanted.length];
}

/**
 * Pick ideas: one for the whole table (safe for everyone) and one per profile.
 * avoidKeys = cooked in the last 14 days + emailed in the last 21 days, so ideas rotate.
 */
export function pickIdeas(catalog, { household, profiles, likedKeys = [], avoidKeys = [], now = new Date() }) {
  const used = new Set(avoidKeys);
  const day = Math.floor(now / 864e5);
  const choose = (opts) => {
    const list = rank(catalog, { ...opts, appliances: household?.appliances || [], avoidKeys: [...used], limit: 8 });
    if (!list.length) return null;
    const pick = list[day % Math.min(list.length, 4)]; // vary between the top few so it isn't the same dish forever
    used.add(pick.rec.k);
    return pick;
  };
  const family = choose({ meal: "dinner", profile: { ...mergeProfiles(profiles), likedKeys } });
  const each = profiles.map((p) => {
    const meal = mealFor(p, now);
    const pick = choose({ meal, chips: (p.goals || []).filter((g) => ["healthy", "quick"].includes(g)), profile: { ...mergeProfiles([p]), likedKeys } });
    return pick ? { profile: p.name, meal, pick } : null;
  }).filter(Boolean);
  return { family, each };
}

/** Build subject/html/text. Returns null when there's nothing to send. */
export function buildEmail({ site, ideas, unsubscribeUrl, preferencesUrl }) {
  if (!ideas.family && !ideas.each.length) return null;
  if (!site.email?.postalAddress) throw new Error("email.postalAddress is required (anti-spam law) before sending");
  const base = site.url;
  const main = ideas.family || ideas.each[0].pick;
  const subject = `Tonight by Ninjas: ${main.rec.t}`;
  const row = (label, item) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid #f1dcea">
      <a href="${base}${item.rec.u}" style="text-decoration:none;color:#22174a">
        <img src="${base}${item.rec.img}" width="96" height="96" alt="${esc(item.rec.t)}" style="float:left;border-radius:14px;margin-right:14px">
        <div style="font:600 13px Arial,sans-serif;color:#ff4f9a">${esc(label)}</div>
        <div style="font:700 19px Arial,sans-serif;margin:2px 0">${esc(item.rec.t)}</div>
        <div style="font:14px Arial,sans-serif;color:#6b5f8f">${esc(reasonFor(item, {}))}</div>
      </a></td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#fff6fa;padding:20px">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:20px">
    <tr><td style="font:700 24px Arial,sans-serif;color:#22174a;padding-bottom:2px">🥷 Tonight by Ninjas</td></tr>
    <tr><td style="font:15px Arial,sans-serif;color:#6b5f8f;padding-bottom:6px">What are we making tonight?</td></tr>
    ${ideas.family ? row("For everyone", ideas.family) : ""}
    ${ideas.each.map((e) => row(`For ${e.profile} · ${e.meal}`, e.pick)).join("")}
    <tr><td style="font:12px Arial,sans-serif;color:#6b5f8f;padding-top:18px;line-height:1.6">
      You get this because you turned on recipe ideas at ${esc(site.name)}.
      <a href="${preferencesUrl}" style="color:#6b5f8f">Change time or frequency</a> ·
      <a href="${unsubscribeUrl}" style="color:#6b5f8f">Unsubscribe</a><br>
      ${esc(site.ownerName)} · ${esc(site.email.postalAddress)}<br>
      Food ideas only, not medical advice.
    </td></tr>
  </table></body></html>`;
  const lines = [];
  if (ideas.family) lines.push(`For everyone: ${ideas.family.rec.t} - ${base}${ideas.family.rec.u}`);
  for (const e of ideas.each) lines.push(`For ${e.profile} (${e.meal}): ${e.pick.rec.t} - ${base}${e.pick.rec.u}`);
  const text = `Tonight by Ninjas: what are we making tonight?\n\n${lines.join("\n")}\n\nChange time or frequency: ${preferencesUrl}\nUnsubscribe: ${unsubscribeUrl}\n${site.ownerName} · ${site.email.postalAddress}\n`;
  const keys = [ideas.family, ...ideas.each.map((e) => e.pick)].filter(Boolean).map((x) => x.rec.k);
  return { subject, html, text, keys };
}
