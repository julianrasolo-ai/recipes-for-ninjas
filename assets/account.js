/* /account/: sign in, signup questionnaire, household dashboard. Runs as a module after auth.js. */
const root = document.getElementById("acct");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const APPLIANCES = [["creami", "🍦 Creami ice cream maker"], ["juicer", "🧃 NeverClog juicer"], ["blender", "🥤 Detect blender"], ["wood-fire", "🔥 Woodfire grill"]];
const DIETS = ["vegetarian", "vegan", "pescatarian", "dairy-free", "gluten-free"];
const ALLERGIES = ["peanut", "tree nut", "dairy", "egg", "gluten", "soy", "shellfish", "fish", "sesame"];
const GOALS = [["healthy", "Healthier"], ["protein", "More protein"], ["quick", "Quick"]];
const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LEGACY = { ice: "creami", juice: "juicer", blender: "blender", fire: "wood-fire" };

function waitAuth() {
  return new Promise((res) => {
    if (window.RFNAuth && RFNAuth.state.ready) return res(RFNAuth.state);
    document.addEventListener("rfn:auth", (e) => res(e.detail), { once: true });
  });
}
const checks = (name, items, picked = []) => items.map(([v, label]) => `<label class="ichip-l"><input type="checkbox" name="${name}" value="${esc(v)}"${picked.includes(v) ? " checked" : ""}> ${esc(label || v)}</label>`).join("");
const pairs = (arr) => arr.map((v) => [v, v.charAt(0).toUpperCase() + v.slice(1)]);
const listOf = (form, name) => [...form.querySelectorAll(`[name="${name}"]:checked`)].map((i) => i.value);
const words = (s) => String(s || "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean).slice(0, 30);
const msg = (t, bad) => `<p class="note ${bad ? "warn" : ""}">${esc(t)}</p>`;

/* ---------- signed out ---------- */
function signedOut(note = "") {
  root.innerHTML = `${note}
  <p class="lead">Save favorites for each person in your family, keep a cooked log, and get recipe ideas that skip your allergies.</p>
  <form id="magic" class="contact-f">
    <label>Email<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>
    <button class="btn" type="submit">Email me a sign-in link</button>
  </form>
  <p class="or">or</p>
  <button class="btn ghost" id="google" type="button">Continue with Google</button>
  <p class="disc">We only store what's needed to run your account. <a href="/privacy/">Privacy policy</a>.</p>`;
  root.querySelector("#magic").onsubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    const { error } = await RFNAuth.signInEmail(email);
    root.querySelector("#magic").outerHTML = error ? msg("Could not send the link: " + error.message, true) : msg(`Check ${email} for your sign-in link. You can close this tab.`);
  };
  root.querySelector("#google").onclick = () => RFNAuth.signInGoogle();
}

/* ---------- questionnaire ---------- */
function questionnaire(state) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  root.innerHTML = `
  <p class="lead">A few quick questions so ideas fit your family. You can change everything later.</p>
  <form id="q" class="qform">
    <fieldset><legend>Who's at your table?</legend>
      <div id="people"><input name="person" value="" placeholder="Name" maxlength="40" required></div>
      <button class="pill" type="button" id="addp">+ Add person</button>
    </fieldset>
    <fieldset><legend>Which Ninja machines do you have?</legend><div class="ichips">${checks("app", APPLIANCES)}</div></fieldset>
    <fieldset><legend>Diet</legend><div class="ichips">${checks("diet", pairs(DIETS))}</div></fieldset>
    <fieldset><legend>Allergies</legend><div class="ichips">${checks("allergy", pairs(ALLERGIES))}</div>
      <label>Other allergies (comma separated)<input name="allergyOther" maxlength="200"></label></fieldset>
    <fieldset><legend>Foods you don't like</legend><label>Comma separated, e.g. mushrooms, coconut<input name="dislikes" maxlength="300"></label></fieldset>
    <fieldset><legend>Cooking time on a normal day</legend><div class="ichips">${[15, 30, 60, 90].map((m, i) => `<label class="ichip-l"><input type="radio" name="time" value="${m}"${i === 1 ? " checked" : ""}> ${m === 90 ? "90+ min" : m + " min"}</label>`).join("")}</div></fieldset>
    <fieldset><legend>Goals</legend><div class="ichips">${checks("goal", GOALS)}</div></fieldset>
    <fieldset><legend>Which meals do you want ideas for?</legend><div class="ichips">${checks("meal", pairs(MEALS), ["dinner"])}</div></fieldset>
    <fieldset id="email"><legend>Ideas by email or text (optional)</legend>
      <label class="consent-l"><input type="checkbox" name="emailOk"> Email me recipe ideas for my household. Unsubscribe any time.</label>
      <div class="when">${whenFields({ email_frequency: "weekly", email_weekday: 0, send_hour: 16 })}</div>
      <label class="consent-l"><input type="checkbox" name="smsOk"> Text me recipe ideas (separate permission; message rates may apply).</label>
      <label class="phone">Mobile number<input name="phone" type="tel" autocomplete="tel" maxlength="20"></label>
      <input type="hidden" name="tz" value="${esc(tz)}">
    </fieldset>
    <button class="btn" type="submit">Save</button>
    <p class="disc">We store your email, your household answers and what you like or cook, to personalize ideas. Nothing is sold. <a href="/privacy/">Privacy policy</a>.</p>
  </form>`;
  const f = root.querySelector("#q");
  root.querySelector("#addp").onclick = () => {
    if (f.querySelectorAll('[name="person"]').length >= 8) return;
    f.querySelector("#people").insertAdjacentHTML("beforeend", `<input name="person" placeholder="Name" maxlength="40">`);
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true; btn.textContent = "Saving…";
    const { sb, state: s } = RFNAuth;
    const uid = s.session.user.id;
    const people = [...new Set([...f.querySelectorAll('[name="person"]')].map((i) => i.value.trim()).filter(Boolean))].slice(0, 8);
    const shared = {
      diet: listOf(f, "diet"), allergies: [...listOf(f, "allergy"), ...words(f.allergyOther.value)],
      dislikes: words(f.dislikes.value), goals: listOf(f, "goal"), meal_types: listOf(f, "meal"), cook_minutes: +f.querySelector('[name="time"]:checked').value,
    };
    try {
      let hh = s.household;
      if (!hh) {
        const { data, error } = await sb.from("households").insert({ owner_id: uid, size: people.length, appliances: listOf(f, "app") }).select().single();
        if (error) throw error; hh = data;
      }
      const { error: pe } = await sb.from("profiles").insert(people.map((name, i) => ({ household_id: hh.id, name, sort: i, ...shared })));
      if (pe) throw pe;
      await saveSettings(f, { onboarded: true });
      await RFNAuth.refresh(); render(RFNAuth.state, msg("All set. Your household is saved."));
    } catch (err) { btn.disabled = false; btn.textContent = "Save"; f.insertAdjacentHTML("beforeend", msg("Could not save: " + err.message, true)); }
  };
}

function whenFields(s) {
  return `<label>How often<select name="freq"><option value="weekly"${s.email_frequency === "weekly" ? " selected" : ""}>Weekly</option><option value="daily"${s.email_frequency === "daily" ? " selected" : ""}>Daily</option></select></label>
  <label>Day (weekly)<select name="weekday">${DAYS.map((d, i) => `<option value="${i}"${s.email_weekday === i ? " selected" : ""}>${d}</option>`).join("")}</select></label>
  <label>Time<select name="hour">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${s.send_hour === h ? " selected" : ""}>${((h + 11) % 12) + 1}:00 ${h < 12 ? "am" : "pm"}</option>`).join("")}</select></label>`;
}

async function saveSettings(f, extra = {}) {
  const { sb, state: s } = RFNAuth, prev = s.settings || {};
  const emailOk = f.emailOk.checked, smsOk = f.smsOk.checked, now = new Date().toISOString();
  const row = {
    user_id: s.session.user.id, email_consent: emailOk, sms_consent: smsOk && !!f.phone.value.trim(), phone: smsOk ? f.phone.value.trim() || null : null,
    email_frequency: f.freq.value, email_weekday: +f.weekday.value, send_hour: +f.hour.value, timezone: (f.tz && f.tz.value) || prev.timezone || "America/New_York",
    updated_at: now, ...extra,
  };
  if (emailOk !== !!prev.email_consent) row.email_consent_at = now;
  if (row.sms_consent !== !!prev.sms_consent) row.sms_consent_at = now;
  const { error } = await sb.from("account_settings").upsert(row);
  if (error) throw error;
}

/* ---------- dashboard ---------- */
async function dashboard(state, note = "") {
  const { sb } = RFNAuth, hh = state.household, st = state.settings || {};
  const ids = state.profiles.map((p) => p.id);
  const [{ count: likeCount }, { data: cooked }] = await Promise.all([
    ids.length ? sb.from("likes").select("*", { count: "exact", head: true }).in("profile_id", ids) : { count: 0 },
    ids.length ? sb.from("cooked").select("recipe_key,cooked_at").in("profile_id", ids).order("cooked_at", { ascending: false }).limit(20) : { data: [] },
  ]);
  const seen = new Set(), recent = (cooked || []).filter((c) => !seen.has(c.recipe_key) && seen.add(c.recipe_key)).slice(0, 8);
  root.innerHTML = `${note}
  <p class="lead">Signed in as <b>${esc(state.session.user.email)}</b>.</p>
  <section class="card-s"><h2 class="h3">Machines</h2>
    <form id="apps"><div class="ichips">${checks("app", APPLIANCES, hh.appliances)}</div><button class="btn ghost" type="submit">Save machines</button></form></section>
  <section class="card-s"><h2 class="h3">People</h2>
    ${state.profiles.map((p) => personForm(p)).join("")}
    <button class="pill" id="addperson" type="button">+ Add person</button></section>
  <section class="card-s" id="email"><h2 class="h3">Ideas by email or text</h2>
    <form id="mail">
      <label class="consent-l"><input type="checkbox" name="emailOk"${st.email_consent ? " checked" : ""}> Email me recipe ideas for my household.</label>
      <div class="when">${whenFields(st)}</div>
      <label class="consent-l"><input type="checkbox" name="smsOk"${st.sms_consent ? " checked" : ""}> Text me recipe ideas (separate permission).</label>
      <label class="phone">Mobile number<input name="phone" type="tel" value="${esc(st.phone || "")}" maxlength="20"></label>
      <input type="hidden" name="tz" value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone || st.timezone || "")}">
      <button class="btn ghost" type="submit">Save email settings</button></form></section>
  <section class="card-s"><h2 class="h3">Favorites and history</h2>
    <p>${likeCount || 0} favorites saved.</p>
    <button class="pill" id="import" type="button">Import favorites saved before accounts</button>
    ${recent.length ? `<p class="muted">Recently cooked:</p><ul class="recent">${recent.map((c) => `<li>${esc(c.recipe_key.replace("/", " · "))} <small class="muted">${new Date(c.cooked_at).toLocaleDateString()}</small></li>`).join("")}</ul>` : ""}</section>
  <section class="card-s"><h2 class="h3">Your data</h2>
    <p class="disc">Deleting your account removes your household, people, favorites, cooked log and email settings for good.</p>
    <button class="btn ghost" id="signout" type="button">Sign out</button>
    <button class="btn danger" id="delete" type="button">Delete my account</button></section>`;
  bind(state);
}

function personForm(p) {
  return `<details class="person"><summary><b>${esc(p.name)}</b> <small class="muted">${esc([...(p.allergies || []).map((a) => "no " + a), ...(p.diet || [])].join(", ") || "no restrictions")}</small></summary>
  <form class="pform" data-id="${p.id}">
    <label>Name<input name="name" value="${esc(p.name)}" maxlength="40" required></label>
    <fieldset><legend>Diet</legend><div class="ichips">${checks("diet", pairs(DIETS), p.diet)}</div></fieldset>
    <fieldset><legend>Allergies</legend><div class="ichips">${checks("allergy", pairs(ALLERGIES), p.allergies)}</div>
      <label>Other<input name="allergyOther" value="${esc((p.allergies || []).filter((a) => !ALLERGIES.includes(a)).join(", "))}"></label></fieldset>
    <label>Doesn't like<input name="dislikes" value="${esc((p.dislikes || []).join(", "))}"></label>
    <fieldset><legend>Goals</legend><div class="ichips">${checks("goal", GOALS, p.goals)}</div></fieldset>
    <fieldset><legend>Meals</legend><div class="ichips">${checks("meal", pairs(MEALS), p.meal_types)}</div></fieldset>
    <label>Cooking time (minutes)<input name="time" type="number" min="5" max="600" value="${p.cook_minutes || 30}"></label>
    <div class="row"><button class="btn ghost" type="submit">Save</button><button class="pill" type="button" data-remove="${p.id}">Remove</button></div>
  </form></details>`;
}

function bind(state) {
  const { sb } = RFNAuth, hh = state.household;
  const done = async (text, bad) => { await RFNAuth.refresh(); render(RFNAuth.state, msg(text, bad)); };
  root.querySelector("#apps").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.from("households").update({ appliances: listOf(e.target, "app") }).eq("id", hh.id);
    done(error ? "Could not save: " + error.message : "Machines saved.", !!error);
  };
  root.querySelectorAll(".pform").forEach((f) => {
    f.onsubmit = async (e) => {
      e.preventDefault();
      const row = { name: f.name.value.trim(), diet: listOf(f, "diet"), allergies: [...listOf(f, "allergy"), ...words(f.allergyOther.value).filter((w) => !ALLERGIES.includes(w))],
        dislikes: words(f.dislikes.value), goals: listOf(f, "goal"), meal_types: listOf(f, "meal"), cook_minutes: Math.min(600, Math.max(5, +f.time.value || 30)) };
      const { error } = await sb.from("profiles").update(row).eq("id", f.dataset.id);
      done(error ? "Could not save: " + error.message : `${row.name} saved.`, !!error);
    };
    f.querySelector("[data-remove]").onclick = async () => {
      if (!confirm("Remove this person and their favorites?")) return;
      const { error } = await sb.from("profiles").delete().eq("id", f.dataset.id);
      done(error ? "Could not remove: " + error.message : "Removed.", !!error);
    };
  });
  root.querySelector("#addperson").onclick = async () => {
    const name = (prompt("Name") || "").trim().slice(0, 40); if (!name) return;
    const { error } = await sb.from("profiles").insert({ household_id: hh.id, name, sort: state.profiles.length });
    done(error ? "Could not add: " + error.message : `${name} added.`, !!error);
  };
  root.querySelector("#mail").onsubmit = async (e) => {
    e.preventDefault();
    try { await saveSettings(e.target); done("Email settings saved."); } catch (err) { done("Could not save: " + err.message, true); }
  };
  root.querySelector("#import").onclick = () => importLegacy(state).then((n) => done(n ? `Imported ${n} favorites.` : "Nothing new to import."), (err) => done("Import failed: " + err.message, true));
  root.querySelector("#signout").onclick = () => RFNAuth.signOut().then(() => signedOut(msg("Signed out.")));
  root.querySelector("#delete").onclick = async () => {
    if (prompt('This can\'t be undone. Type DELETE to remove your account and all its data.') !== "DELETE") return;
    const r = await fetch("/api/account-delete", { method: "POST", headers: { Authorization: "Bearer " + (await RFNAuth.token()) } });
    if (!r.ok) return done("Could not delete the account. Please contact us.", true);
    await RFNAuth.sb.auth.signOut(); signedOut(msg("Your account and all its data have been deleted."));
  };
}

/* Bring over the family favorites stored before accounts existed (the four-name list). */
async function importLegacy(state) {
  const { sb } = RFNAuth, hh = state.household;
  let profiles = [...state.profiles], n = 0;
  for (const [section, appliance] of Object.entries(LEGACY)) {
    const r = await fetch("/api/likes?s=" + section); if (!r.ok) continue;
    const { likes = {} } = await r.json();
    for (const [rid, names] of Object.entries(likes)) {
      for (const name of names) {
        let p = profiles.find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (!p) {
          const { data, error } = await sb.from("profiles").insert({ household_id: hh.id, name, sort: profiles.length }).select().single();
          if (error) throw error; profiles.push(data); p = data;
        }
        const { error } = await sb.from("likes").upsert({ profile_id: p.id, recipe_key: `${appliance}/${rid}` }, { onConflict: "profile_id,recipe_key", ignoreDuplicates: true });
        if (!error) n++;
      }
    }
  }
  return n;
}

function render(state, note = "") {
  if (!state.session) return signedOut(note);
  if (!state.household || !state.profiles.length || !(state.settings && state.settings.onboarded)) return questionnaire(state);
  return dashboard(state, note);
}

waitAuth().then((s) => render(s));
document.addEventListener("rfn:auth", (e) => { if (!root.querySelector("form#q")) render(e.detail); });
