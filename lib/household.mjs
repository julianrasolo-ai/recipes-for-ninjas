// Server-side read of the signed-in user's household, using THEIR access token so row-level security applies.
import { createClient } from "@supabase/supabase-js";

export function supabaseConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export function userClient(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function adminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** { userId, household, profiles, likedKeys, recentKeys } or null when not signed in / not configured. */
export async function loadHousehold(accessToken, { recentDays = 14 } = {}) {
  if (!accessToken || !supabaseConfigured()) return null;
  const sb = userClient(accessToken);
  const { data: u, error } = await sb.auth.getUser(accessToken);
  if (error || !u?.user) return null;
  const { data: hh } = await sb.from("households").select("id,size,appliances").limit(1).maybeSingle();
  if (!hh) return { userId: u.user.id, household: null, profiles: [], likedKeys: [], recentKeys: [] };
  const { data: profiles = [] } = await sb.from("profiles").select("id,name,diet,allergies,dislikes,goals,meal_types,cook_minutes").eq("household_id", hh.id).order("sort");
  const ids = profiles.map((p) => p.id);
  const since = new Date(Date.now() - recentDays * 864e5).toISOString();
  const [{ data: likes = [] }, { data: cooked = [] }] = ids.length
    ? await Promise.all([
        sb.from("likes").select("profile_id,recipe_key").in("profile_id", ids),
        sb.from("cooked").select("recipe_key,cooked_at").in("profile_id", ids).gte("cooked_at", since),
      ])
    : [{ data: [] }, { data: [] }];
  return {
    userId: u.user.id, household: hh, profiles,
    likedKeys: [...new Set((likes || []).map((l) => l.recipe_key))],
    recentKeys: [...new Set((cooked || []).map((c) => c.recipe_key))],
  };
}
