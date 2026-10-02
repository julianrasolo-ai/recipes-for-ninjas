/* Ask Ninjas: a chat with the ninja chef. Floating avatar on every page, speech bubble on the home page.
   Pantry-first: say what you have / how you feel (meal pre-set from the clock, mood chips optional) -> POST /api/chat
   -> 1 to 3 recipe picks (+ an optional simple dish outside the library). Follow-ups refine; "Something else" excludes what was shown. */
(function () {
  if (window.__rfnAssistant) return; window.__rfnAssistant = 1;
  var MEALS = [["breakfast", "🍳 Breakfast"], ["lunch", "🥪 Lunch"], ["dinner", "🍽️ Dinner"], ["snack", "🍓 Snack"]];
  var CHIPS = [["tired", "😴 Tired"], ["healthy", "🥗 Healthy"], ["quick", "⚡ Quick"], ["comfort", "🧸 Comfort"], ["leftovers", "🥡 Use my leftovers"]];
  var NINJA = "/img/home/ninja.webp";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var label = function (list, k) { var x = list.filter(function (i) { return i[0] === k; })[0]; return x ? x[1] : k; };
  var accounts = !!(window.SITE_CONFIG && SITE_CONFIG.supabase);
  var st = { meal: null, chips: [], text: "", said: [], shown: [], busy: false };

  var link = document.createElement("link"); link.rel = "stylesheet"; link.href = "/assets/assistant.css"; document.head.appendChild(link);
  var avatar = '<span class="ak-av" aria-hidden="true"><img src="' + NINJA + '" alt="" onerror="this.outerHTML=\'<span class=emo>🥷</span>\'"></span>';

  var wrap = document.createElement("div");
  wrap.className = "ak ak-wrap";
  wrap.innerHTML = '<div class="ak-p" role="dialog" aria-modal="true" aria-labelledby="ak-t">' +
    '<div class="ak-h">' + avatar + '<div><b id="ak-t">Ask Ninjas</b><small>Your chef for tonight</small></div><button class="ak-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="ak-log" aria-live="polite"></div>' +
    '<form class="ak-in"><input maxlength="400" placeholder="e.g. chicken, rice, peppers. Kids are tired." aria-label="Message Ask Ninjas"><button class="ak-send" type="submit" aria-label="Send">➤</button></form>' +
    '<p class="ak-note">Food ideas only, not medical advice.</p></div>';
  var log = wrap.querySelector(".ak-log"), form = wrap.querySelector(".ak-in"), input = form.querySelector("input"), send = form.querySelector(".ak-send"), lastFocus = null;

  function add(html, cls) {
    var d = document.createElement("div"); d.className = cls || "ak-m"; d.innerHTML = html; log.appendChild(d);
    log.scrollTop = log.scrollHeight; return d;
  }
  function ninjaSays(html) { return add(html); }
  function meSays(text) { return add(esc(text), "ak-m me"); }
  function options(list, onPick, multi) {
    var box = add(list.map(function (o) { return '<button type="button" data-k="' + o[0] + '" aria-pressed="false">' + o[1] + "</button>"; }).join(""), "ak-opts");
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || st.busy) return;
      if (multi) { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); onPick(b.dataset.k, b); }
      else { box.remove(); onPick(b.dataset.k); }
    });
    return box;
  }

  // Default meal from the clock; people can change it with one tap.
  function mealNow() { var h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? "breakfast" : h < 15 ? "lunch" : h < 17 ? "snack" : "dinner"; }
  function start() {
    st = { meal: mealNow(), chips: [], text: "", said: [], shown: [], busy: false }; log.innerHTML = "";
    ninjaSays("Hey, I'm your ninja chef. 🥷<br>Tell me what's in the fridge or pantry, how everyone's feeling, or what you're craving. I'll find something to make.");
    var meals = options(MEALS, function (k) {
      st.meal = k; meals.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.k === k)); });
    }, true);
    meals.classList.add("ak-meals");
    meals.querySelector('[data-k="' + st.meal + '"]').setAttribute("aria-pressed", "true");
    options(CHIPS, function (c) { var i = st.chips.indexOf(c); i < 0 ? st.chips.push(c) : st.chips.splice(i, 1); }, true);
    var go = add('<button type="button" aria-pressed="true">Show me ideas →</button>', "ak-opts ak-gorow");
    go.querySelector("button").addEventListener("click", function () { ask(); });
    sync();
  }
  function sync() { send.disabled = st.busy; input.disabled = st.busy; }
  function token() { return window.RFNAuth && RFNAuth.token ? RFNAuth.token().catch(function () { return null; }) : Promise.resolve(null); }
  function card(p) {
    var pic = p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<span class=e>' + esc(p.emoji || "🍽️") + "</span>'\">" : '<span class="e">' + esc(p.emoji || "🍽️") + "</span>";
    return '<a class="ak-card" href="' + esc(p.url) + '">' + pic + "<span><b>" + esc(p.title) + "</b><small>" + esc(p.reason) + "</small></span></a>";
  }

  // more = true asks for different picks than the ones already shown.
  function ask(more) {
    if (st.busy) return;
    var typed = input.value.trim(); input.value = "";
    if (typed) st.said.push(typed);
    st.text = st.said.join(". ").slice(-400); // the whole conversation so far, so "no meat" refines the last answer
    log.querySelectorAll(".ak-opts").forEach(function (o) { o.remove(); });
    var tags = st.chips.map(function (c) { return label(CHIPS, c); });
    if (!more) meSays([label(MEALS, st.meal).replace(/^\S+\s/, "")].concat(tags, typed ? [typed] : []).join(" · "));
    else meSays("Something else, please");
    st.busy = true; sync();
    var typing = add('<span class="ak-typing"><span></span><span></span><span></span></span>');
    token().then(function (t) {
      var h = { "content-type": "application/json" }; if (t) h.Authorization = "Bearer " + t;
      return fetch("/api/chat", { method: "POST", headers: h, body: JSON.stringify({ meal: st.meal, chips: st.chips, text: st.text, exclude: more ? st.shown : [] }) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "I'm offline for a minute. Try again soon."); return d; });
    }).then(function (d) {
      typing.remove();
      ninjaSays(esc(d.intro || "Here's what I'd make."));
      (d.picks || []).forEach(function (p) { add(card(p), "ak-pick"); if (p.key) st.shown.push(p.key); });
      if (d.outside && d.outside.title) {
        add('<span class="tag">Outside our recipe book</span><b>' + esc(d.outside.title) + "</b>" + (d.outside.reason ? "<small>" + esc(d.outside.reason) + "</small>" : "") +
          ((d.outside.steps || []).length ? "<ol>" + d.outside.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" : ""), "ak-out");
      }
      if (!(d.picks || []).length && !d.outside) ninjaSays("Nothing fits that yet. Try another meal or fewer filters.");
      else if (st.said.length < 2) ninjaSays("Not quite? Tell me more, like \"no meat\" or \"I also have rice\", and I'll adjust.");
      // Sign-in is offered after a useful answer, not as a gate in front of it.
      if (accounts && !d.signedIn && !st.offered) { st.offered = 1; ninjaSays('Want me to remember allergies, what your family likes and what you cooked lately? <a href="/account/">Sign in</a>.'); }
      options([["more", "🔁 Something else"], ["again", "↺ Start over"]], function (k) { k === "more" ? ask(true) : start(); });
      if (window.track) try { track("assistant_answer", { meal: st.meal, ai: !!d.ai }); } catch (e) {}
    }).catch(function (err) {
      typing.remove(); ninjaSays(esc(err.message)); options([["again", "↺ Try again"]], start);
    }).then(function () { st.busy = false; sync(); input.focus(); });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (input.value.trim()) ask();
  });
  wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.closest(".ak-x")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && wrap.classList.contains("open")) close(); });

  function open(prefill) {
    if (!wrap.isConnected) document.body.appendChild(wrap);
    lastFocus = document.activeElement;
    if (prefill || !log.childElementCount) { start(); if (prefill) { input.value = prefill; ask(); } }
    wrap.classList.add("open"); document.documentElement.style.overflow = "hidden";
    (log.querySelector(".ak-opts button") || input).focus();
    if (window.track) try { track("assistant_open"); } catch (e) {}
  }
  function close() {
    wrap.classList.remove("open"); document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function init() {
    var home = document.getElementById("ask-home");
    if (home) {
      home.addEventListener("submit", function (e) { e.preventDefault(); open(home.querySelector("input").value.trim()); });
      return;
    }
    var fab = document.createElement("button");
    fab.type = "button"; fab.className = "ak ak-fab"; fab.setAttribute("aria-haspopup", "dialog"); fab.setAttribute("aria-label", "Ask Ninjas: what are we making?");
    fab.innerHTML = '<span class="ak-say">Ask Ninjas</span>' + avatar;
    fab.addEventListener("click", function () { open(); });
    document.body.appendChild(fab); document.body.classList.add("ak-pad");
    var lastY = scrollY; // tuck the bubble away while scrolling down so it covers less of the recipe
    addEventListener("scroll", function () { var y = scrollY; fab.classList.toggle("mini", y > lastY && y > 200); lastY = y; }, { passive: true });
  }
  window.RFNAsk = { open: open };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
