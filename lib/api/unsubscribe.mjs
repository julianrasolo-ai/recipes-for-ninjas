// GET  /api/unsubscribe?t=TOKEN  -> confirmation page with a button
// POST /api/unsubscribe?t=TOKEN  -> unsubscribes (also handles one-click List-Unsubscribe-Post from mail apps)
import { site } from "../generated/data.mjs";
import { adminClient } from "../household.mjs";

const page = (msg, form = "") => new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title>
<body style="font:17px/1.5 system-ui,sans-serif;max-width:480px;margin:12vh auto;padding:0 16px;color:#22174a"><h1 style="font-size:24px">${msg}</h1>${form}
<p><a href="${site.url}/account/#email">Manage email preferences</a> · <a href="${site.url}/">Recipes By Ninjas</a></p></body>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  const token = new URL(req.url).searchParams.get("t") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return page("That unsubscribe link isn't valid.");
  if (req.method === "GET") return page("Stop recipe idea emails?", `<form method="POST"><button style="font:inherit;padding:12px 20px;border-radius:999px;border:0;background:#22174a;color:#fff">Unsubscribe</button></form>`);
  const sb = adminClient();
  if (!sb) return page("Email isn't set up yet.");
  const { data, error } = await sb.from("account_settings").update({ email_consent: false, email_consent_at: new Date().toISOString() }).eq("unsubscribe_token", token).select("user_id");
  if (error) return page("Something went wrong. Please try again.");
  return page(data?.length ? "You're unsubscribed. No more recipe idea emails." : "You were already unsubscribed.");
};

