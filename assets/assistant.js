/* "What are we making?" assistant: floating button on every page, inline box on the home page.
   Meal first, then chips + free text -> POST /api/chat -> 1 to 3 recipe picks (+ an optional dish outside the library). */
(function () {
  if (window.__rfnAssistant) return; window.__rfnAssistant = 1;
  var MEALS = [["breakfast", "🍳", "Breakfast"], ["lunch", "🥪", "Lunch"], ["dinner", "🍽️", "Dinner"], ["snack", "🍓", "Snack"]];
  var CHIPS = [["tired", "😴 Tired"], ["healthy", "🥗 Healthy"], ["quick", "⚡ Quick"], ["comfort", "🧸 Comfort"], ["leftovers", "🥡 Use my leftovers"]];
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var state = { meal: null, chips: [], busy: false };

  var css = "" +
    ".ask-fab{position:fixed;z-index:60;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 16px;background:var(--ink,#22174a);color:var(--bg,#fff);font:700 15px Fredoka,Nunito,system-ui,sans-serif;box-shadow:0 10px 30px rgba(34,23,74,.28);cursor:pointer}" +
    ".ask-fab span{font-size:20px}@media (max-width:380px){.ask-fab b{display:none}}" +
    ".ask-fab b{transition:max-width .25s,opacity .2s;max-width:200px;overflow:hidden;white-space:nowrap}.ask-fab.mini{padding:12px}.ask-fab.mini b{max-width:0;opacity:0}" +
    "body.has-fab{padding-bottom:76px}" +
    "@media print{.ask-fab,.ask{display:none!important}}" +
    ".ask{position:fixed;inset:0;z-index:70;display:none;align-items:flex-end;justify-content:center;background:rgba(20,14,40,.45)}" +
    ".ask.open{display:flex}" +
    ".ask-p{width:100%;max-width:560px;max-height:92dvh;overflow:auto;overscroll-behavior:contain;background:var(--card,#fff);color:var(--ink,#22174a);border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));font-family:Nunito,system-ui,sans-serif;box-shadow:0 -10px 40px rgba(0,0,0,.2)}" +
    "@media (min-width:700px){.ask{align-items:center}.ask-p{border-radius:24px;padding:22px}}" +
    ".ask-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px}.ask-h h2{font:700 22px Fredoka,Nunito,sans-serif;margin:0}" +
    ".ask-x{border:0;background:none;font-size:24px;line-height:1;color:inherit;cursor:pointer;padding:6px}" +
    ".ask-l{font:700 13px Nunito,sans-serif;color:var(--muted,#6b5f8f);margin:14px 0 8px;text-transform:uppercase;letter-spacing:.04em}" +
    ".ask-meals{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}" +
    ".ask-meals button{border:2px solid var(--line,#f1dcea);background:var(--bg,#fff6fa);color:inherit;border-radius:16px;padding:10px 4px;font:700 13px Nunito,sans-serif;cursor:pointer;display:grid;gap:2px;justify-items:center}" +
    ".ask-meals button span{font-size:24px}.ask-meals button[aria-pressed=true]{border-color:var(--pink,#ff4f9a);background:var(--pinkt,#ffe1ee)}" +
    ".ask-chips{display:flex;flex-wrap:wrap;gap:8px}.ask-chips button{border:1.5px solid var(--line,#f1dcea);background:transparent;color:inherit;border-radius:999px;padding:7px 12px;font:600 14px Nunito,sans-serif;cursor:pointer}" +
    ".ask-chips button[aria-pressed=true]{background:var(--mint,#14a77c);border-color:var(--mint,#14a77c);color:#fff}" +
    ".ask textarea{width:100%;box-sizing:border-box;min-height:64px;border:1.5px solid var(--line,#f1dcea);border-radius:14px;padding:10px 12px;font:16px Nunito,sans-serif;background:var(--bg,#fff);color:inherit;resize:vertical}" +
    ".ask-go{width:100%;margin-top:12px;border:0;border-radius:999px;padding:13px;background:var(--pink,#ff4f9a);color:#fff;font:700 16px Fredoka,Nunito,sans-serif;cursor:pointer}.ask-go:disabled{opacity:.5;cursor:default}" +
    ".ask-out{margin-top:14px}.ask-out .intro{margin:0 0 10px;font-weight:600}" +
    ".ask-card{display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit;border:1.5px solid var(--line,#f1dcea);border-radius:18px;padding:8px;margin:0 0 8px;background:var(--bg,#fff)}" +
    ".ask-card img,.ask-card .e{width:72px;height:72px;border-radius:14px;object-fit:cover;flex:none;display:grid;place-items:center;font-size:36px;background:var(--line,#f1dcea)}" +
    ".ask-card b{display:block;font:700 16px Fredoka,Nunito,sans-serif}.ask-card small{display:block;color:var(--muted,#6b5f8f);font-size:14px;line-height:1.35}" +
    ".ask-outside{border:1.5px dashed var(--muted,#6b5f8f);border-radius:18px;padding:10px 12px;margin:0 0 8px}.ask-outside .tag{font:700 12px Nunito,sans-serif;color:var(--muted,#6b5f8f);text-transform:uppercase;letter-spacing:.04em}" +
    ".ask-outside ol{margin:6px 0 0;padding-left:20px}" +
    ".ask-note{font-size:12px;color:var(--muted,#6b5f8f);margin:10px 0 0}" +
    ".ask-err{color:#c0392b;font-weight:600}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var box = document.createElement("div");
  box.className = "ask"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "ask-t");
  box.innerHTML = '<div class="ask-p">' +
    '<div class="ask-h"><h2 id="ask-t">🥷 What are we making?</h2><button class="ask-x" type="button" aria-label="Close">×</button></div>' +
    '<p class="ask-l">Which meal?</p><div class="ask-meals">' + MEALS.map(function (m) { return '<button type="button" data-meal="' + m[0] + '" aria-pressed="false"><span>' + m[1] + "</span>" + m[2] + "</button>"; }).join("") + "</div>" +
    '<p class="ask-l">How are you feeling?</p><div class="ask-chips">' + CHIPS.map(function (c) { return '<button type="button" data-chip="' + c[0] + '" aria-pressed="false">' + c[1] + "</button>"; }).join("") + "</div>" +
    '<p class="ask-l"><label for="ask-text">Anything else?</label></p><textarea id="ask-text" maxlength="400" placeholder="e.g. I have chicken, peppers and rice. Kids are hungry."></textarea>' +
    '<button class="ask-go" type="button" disabled>Pick a meal first</button>' +
    '<div class="ask-out" aria-live="polite"></div>' +
    '<p class="ask-note">Food ideas only, not medical advice.' + (window.SITE_CONFIG && SITE_CONFIG.supabase ? ' <a href="/account/">Sign in</a> so ideas skip your allergies and recent meals.' : "") + "</p>" +
    "</div>";
  var go = box.querySelector(".ask-go"), out = box.querySelector(".ask-out"), text = box.querySelector("#ask-text"), lastFocus = null;

  function refresh() {
    box.querySelectorAll("[data-meal]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.meal === state.meal)); });
    box.querySelectorAll("[data-chip]").forEach(function (b) { b.setAttribute("aria-pressed", String(state.chips.indexOf(b.dataset.chip) >= 0)); });
    go.disabled = state.busy || !state.meal;
    go.textContent = state.busy ? "Thinking…" : state.meal ? "Find ideas" : "Pick a meal first";
  }
  box.addEventListener("click", function (e) {
    if (e.target === box || e.target.closest(".ask-x")) return close();
    var m = e.target.closest("[data-meal]"), c = e.target.closest("[data-chip]");
    if (m) { state.meal = m.dataset.meal; refresh(); }
    if (c) { var i = state.chips.indexOf(c.dataset.chip); i < 0 ? state.chips.push(c.dataset.chip) : state.chips.splice(i, 1); refresh(); }
  });
  go.addEventListener("click", ask);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && box.classList.contains("open")) close(); });
  box.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && e.target === text && state.meal) { e.preventDefault(); ask(); }
  });

  function open(prefill) {
    if (!box.isConnected) document.body.appendChild(box);
    if (prefill) text.value = prefill;
    lastFocus = document.activeElement; box.classList.add("open"); document.documentElement.style.overflow = "hidden";
    refresh(); (box.querySelector(state.meal ? "#ask-text" : "[data-meal]") || go).focus();
    if (window.track) try { track("assistant_open"); } catch (e) {}
  }
  function close() {
    box.classList.remove("open"); document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function token() {
    return window.RFNAuth && RFNAuth.token ? RFNAuth.token().catch(function () { return null; }) : Promise.resolve(null);
  }
  function card(p) {
    var pic = p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<span class=e>' + esc(p.emoji || "🍽️") + "</span>'\">" : '<span class="e">' + esc(p.emoji || "🍽️") + "</span>";
    return '<a class="ask-card" href="' + esc(p.url) + '">' + pic + "<span><b>" + esc(p.title) + "</b><small>" + esc(p.reason) + "</small></span></a>";
  }
  function ask() {
    if (state.busy || !state.meal) return;
    state.busy = true; refresh(); out.innerHTML = "";
    token().then(function (t) {
      var h = { "content-type": "application/json" }; if (t) h.Authorization = "Bearer " + t;
      return fetch("/api/chat", { method: "POST", headers: h, body: JSON.stringify({ meal: state.meal, chips: state.chips, text: text.value }) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "The ninja is offline right now. Try again in a minute."); return d; });
    }).then(function (d) {
      var html = d.intro ? '<p class="intro">' + esc(d.intro) + "</p>" : "";
      html += (d.picks || []).map(card).join("");
      if (d.outside && d.outside.title) {
        html += '<div class="ask-outside"><span class="tag">Outside our recipe library</span><b style="display:block;font:700 16px Fredoka,Nunito,sans-serif;margin-top:2px">' + esc(d.outside.title) + "</b>" +
          (d.outside.reason ? "<small>" + esc(d.outside.reason) + "</small>" : "") +
          ((d.outside.steps || []).length ? "<ol>" + d.outside.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" : "") + "</div>";
      }
      if (!(d.picks || []).length && !d.outside) html += "<p>No match this time. Try another meal or fewer filters.</p>";
      out.innerHTML = html;
      if (window.track) try { track("assistant_answer", { meal: state.meal, ai: !!d.ai }); } catch (e) {}
    }).catch(function (err) {
      out.innerHTML = '<p class="ask-err">' + esc(err.message) + "</p>";
    }).then(function () { state.busy = false; refresh(); });
  }

  function init() {
    var home = document.getElementById("ask-home");
    if (home) {
      // Home page: inline box opens the sheet with what they typed.
      home.addEventListener("submit", function (e) { e.preventDefault(); var v = home.querySelector("input").value.trim(); open(v); });
      return;
    }
    var fab = document.createElement("button");
    fab.type = "button"; fab.className = "ask-fab"; fab.setAttribute("aria-haspopup", "dialog");
    fab.innerHTML = '<span aria-hidden="true">🥷</span><b>What are we making?</b>';
    fab.addEventListener("click", function () { open(); });
    document.body.appendChild(fab); document.body.classList.add("has-fab");
    // Shrink to just the ninja while scrolling down, so it covers less of the recipe.
    var lastY = scrollY;
    addEventListener("scroll", function () { var y = scrollY; fab.classList.toggle("mini", y > lastY && y > 200); lastY = y; }, { passive: true });
  }
  window.RFNAsk = { open: open };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
