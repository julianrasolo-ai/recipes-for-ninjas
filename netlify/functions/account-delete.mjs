// POST /api/account-delete  (Authorization: Bearer <supabase access token>)
// Deletes the auth user; every household, profile, like, history and email row cascades with it.
import { adminClient } from "../../lib/household.mjs";

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = adminClient();
  if (!sb || !token) return json({ error: "Not available" }, 400);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return json({ error: "Please sign in again." }, 401);
  // Households this user owns go too (members' own accounts are untouched).
  await sb.from("households").delete().eq("owner_id", data.user.id);
  const { error: delErr } = await sb.auth.admin.deleteUser(data.user.id);
  if (delErr) return json({ error: "Could not delete the account. Please contact us." }, 500);
  return json({ ok: true });
};

export const config = { path: "/api/account-delete" };
