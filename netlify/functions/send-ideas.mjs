// Runs every hour only to check whose chosen send time it is: each person gets "Tonight by Ninjas" daily or weekly, never more
// than once a day (see isDue). Also prunes yesterday's AI usage counters.
// Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, and site.json email.ideas.enabled + email.postalAddress.
import catalog from "../../data/catalog.json" with { type: "json" };
import site from "../../data/site.json" with { type: "json" };
import { adminClient } from "../../lib/household.mjs";
import { isDue, pickIdeas, buildEmail } from "../../lib/ideas.mjs";
import { pruneUsage } from "../../lib/usage.mjs";

async function sendResend({ to, subject, html, text, unsubscribeUrl }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: site.email.ideas.from, to: [to], subject, html, text,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return (await r.json()).id;
}

export default async () => {
  await pruneUsage().catch((e) => console.warn("prune usage failed", e)); // hourly housekeeping for the AI rate-limit counters
  const ideasOn = site.email?.ideas?.enabled && process.env.RESEND_API_KEY;
  const sb = adminClient();
  if (!ideasOn || !sb) { console.log("send-ideas: off (enable email.ideas and set RESEND_API_KEY + Supabase service key)"); return; }
  if (!site.email.postalAddress) { console.error("send-ideas: set email.postalAddress in data/site.json before sending"); return; }

  const now = new Date();
  const { data: accounts = [] } = await sb.from("account_settings").select("*").eq("email_consent", true);
  let sent = 0;
  for (const s of accounts) {
    try {
      const { data: last } = await sb.from("email_log").select("sent_at,recipe_keys").eq("user_id", s.user_id).order("sent_at", { ascending: false }).limit(10);
      if (!isDue(s, last?.[0] ? new Date(last[0].sent_at) : null, now)) continue;
      const { data: member } = await sb.from("household_members").select("household_id").eq("user_id", s.user_id).limit(1).maybeSingle();
      if (!member) continue;
      const { data: household } = await sb.from("households").select("id,appliances").eq("id", member.household_id).single();
      const { data: profiles = [] } = await sb.from("profiles").select("*").eq("household_id", household.id).order("sort");
      const ids = profiles.map((p) => p.id);
      const since14 = new Date(now - 14 * 864e5).toISOString(), since21 = new Date(now - 21 * 864e5);
      const [{ data: likes = [] }, { data: cooked = [] }] = await Promise.all([
        sb.from("likes").select("recipe_key").in("profile_id", ids),
        sb.from("cooked").select("recipe_key").in("profile_id", ids).gte("cooked_at", since14),
      ]);
      const emailed = (last || []).filter((l) => new Date(l.sent_at) > since21).flatMap((l) => l.recipe_keys);
      const ideas = pickIdeas(catalog, { household, profiles, likedKeys: likes.map((l) => l.recipe_key), avoidKeys: [...cooked.map((c) => c.recipe_key), ...emailed], now });
      const unsubscribeUrl = `${site.url}/api/unsubscribe?t=${s.unsubscribe_token}`;
      const mail = buildEmail({ site, ideas, unsubscribeUrl, preferencesUrl: `${site.url}/account/#email` });
      if (!mail) continue;
      const { data: user } = await sb.auth.admin.getUserById(s.user_id);
      if (!user?.user?.email) continue;
      const id = await sendResend({ to: user.user.email, ...mail, unsubscribeUrl });
      await sb.from("email_log").insert({ user_id: s.user_id, recipe_keys: mail.keys, provider_id: id });
      sent++;
    } catch (e) { console.error("send-ideas:", s.user_id, e.message); }
  }
  console.log(`send-ideas: ${sent} sent, ${accounts.length} opted in`);
};

export const config = { schedule: "@hourly" };
