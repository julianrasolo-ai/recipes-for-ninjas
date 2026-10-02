/* Accounts (Supabase). Loaded as a module only when SITE_CONFIG.supabase is set.
   Exposes window.RFNAuth and fires "rfn:auth" on document when the session/household is known. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const C = window.SITE_CONFIG.supabase;
const sb = createClient(C.url, C.anonKey, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } });
const state = { session: null, household: null, profiles: [], settings: null, ready: false };

async function loadHousehold() {
  state.household = null; state.profiles = []; state.settings = null;
  if (!state.session) return;
  const { data: hh } = await sb.from("households").select("*").limit(1).maybeSingle();
  state.household = hh || null;
  if (hh) {
    const { data: profiles } = await sb.from("profiles").select("*").eq("household_id", hh.id).order("sort");
    state.profiles = profiles || [];
  }
  const { data: settings } = await sb.from("account_settings").select("*").eq("user_id", state.session.user.id).maybeSingle();
  state.settings = settings || null;
}

async function refresh() {
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  await loadHousehold().catch((e) => console.warn("household load failed", e));
  state.ready = true;
  document.dispatchEvent(new CustomEvent("rfn:auth", { detail: state }));
  connectLikes();
}

/* ---------- favorites + cooked history for the current page's appliance ---------- */
let likeRows = []; // [{profile_id, recipe_key}]
const applianceKey = () => (window.RECIPE && window.RECIPE.appliance) || (window.SITE && window.SITE.key) || null;
async function connectLikes() {
  if (!window.Likes) return;
  const app = applianceKey();
  if (!state.session || !state.profiles.length || !app) {
    Likes.setAdapter({ mode: state.session ? "noprofiles" : "signedout", people: [], get: () => ({}), toggle() {}, status: () => "on" });
    return;
  }
  const ids = state.profiles.map((p) => p.id);
  const { data } = await sb.from("likes").select("profile_id,recipe_key").in("profile_id", ids).like("recipe_key", app + "/%");
  likeRows = data || [];
  const nameOf = Object.fromEntries(state.profiles.map((p) => [p.id, p.name]));
  const idOf = Object.fromEntries(state.profiles.map((p) => [p.name, p.id]));
  let ok = "on";
  Likes.setAdapter({
    mode: "account",
    people: state.profiles.map((p) => p.name),
    status: () => ok,
    get() {
      const map = {};
      for (const l of likeRows) { const rid = l.recipe_key.split("/")[1]; (map[rid] ||= []).push(nameOf[l.profile_id]); }
      return map;
    },
    async toggle(rid, name) {
      const key = `${app}/${rid}`, pid = idOf[name];
      const has = likeRows.some((l) => l.profile_id === pid && l.recipe_key === key);
      if (has) likeRows = likeRows.filter((l) => !(l.profile_id === pid && l.recipe_key === key));
      else likeRows.push({ profile_id: pid, recipe_key: key });
      const q = has ? sb.from("likes").delete().eq("profile_id", pid).eq("recipe_key", key) : sb.from("likes").insert({ profile_id: pid, recipe_key: key });
      const { error } = await q; ok = error ? "off" : "on";
      if (error) console.warn("like failed", error);
    },
  });
}

window.RFNAuth = {
  sb, state,
  async signInEmail(email) {
    return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + "/account/" } });
  },
  async signInGoogle() {
    return sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + "/account/" } });
  },
  async signOut() { await sb.auth.signOut(); await refresh(); },
  async token() { const { data } = await sb.auth.getSession(); return data.session?.access_token || null; },
  async cooked(recipeKey) {
    if (!state.profiles.length) return { error: "no profiles" };
    return sb.from("cooked").insert(state.profiles.map((p) => ({ profile_id: p.id, recipe_key: recipeKey })));
  },
  refresh,
};

sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_IN" || evt === "SIGNED_OUT") refresh(); });
refresh();
