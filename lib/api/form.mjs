// POST /api/form: contact and newsletter forms on hosts without built-in form handling (Cloudflare).
// Saves each entry in the "forms" store and, if FORM_NOTIFY_TO + RESEND_API_KEY are set, emails it to you.
import { site } from "../generated/data.mjs";
import { openStore } from "../store.mjs";

const FORMS = { contact: ["name", "email", "message"], newsletter: ["email", "source"] };
const back = (path) => new Response(null, { status: 303, headers: { location: path } });

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const f = Object.fromEntries((await req.formData().catch(() => new FormData())).entries());
  const form = String(f["form-name"] || "");
  if (!FORMS[form]) return new Response("Unknown form", { status: 400 });
  if (f.company) return back("/thanks/"); // honeypot: bots fill the hidden field
  const entry = Object.fromEntries(FORMS[form].map((k) => [k, String(f[k] || "").slice(0, k === "message" ? 5000 : 200)]));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(entry.email)) return new Response("Please enter a valid email.", { status: 400 });
  entry.at = new Date().toISOString();
  await openStore("forms").set(`${form}:${entry.at}:${Math.random().toString(36).slice(2, 8)}`, entry);
  const to = process.env.FORM_NOTIFY_TO, key = process.env.RESEND_API_KEY;
  if (to && key) {
    await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: site.email?.ideas?.from || "onboarding@resend.dev", to: [to], reply_to: entry.email, subject: `${site.name}: new ${form}`, text: Object.entries(entry).map(([k, v]) => `${k}: ${v}`).join("\n") }) }).catch(() => {});
  }
  return back(form === "contact" ? "/thanks/?f=contact" : "/thanks/");
};
