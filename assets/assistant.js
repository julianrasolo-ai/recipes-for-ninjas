/* Ask Ninjas: a chat with the ninja chef. Floating avatar on every page, speech bubble on the home page.
   Flow: meal first -> mood chips + free text -> POST /api/chat -> 1 to 3 recipe picks (+ an optional dish outside the library). */
(function () {
  if (window.__rfnAssistant) return; window.__rfnAssistant = 1;
  var MEALS = [["breakfast", "🍳 Breakfast"], ["lunch", "🥪 Lunch"], ["dinner", "🍽️ Dinner"], ["snack", "🍓 Snack"]];
  var CHIPS = [["tired", "😴 Tired"], ["healthy", "🥗 Healthy"], ["quick", "⚡ Quick"], ["comfort", "🧸 Comfort"], ["leftovers", "🥡 Use my leftovers"]];
  var NINJA = "/img/home/ninja.webp";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var label = function (list, k) { var x = list.filter(function (i) { return i[0] === k; })[0]; return x ? x[1] : k; };
  var accounts = !!(window.SITE_CONFIG && SITE_CONFIG.supabase);
  var st = { meal: null, chips: [], text: "", busy: false };

  var link = document.createElement("link"); link.rel = "stylesheet"; link.href = "/assets/assistant.css"; document.head.appendChild(link);
  var avatar = '<span class="ak-av" aria-hidden="true"><img src="' + NINJA + '" alt="" onerror="this.outerHTML=\'<span class=emo>🥷</span>\'"></span>';

  var wrap = document.createElement("div");
  wrap.className = "ak ak-wrap";
  wrap.innerHTML = '<div class="ak-p" role="dialog" aria-modal="true" aria-labelledby="ak-t">' +
    '<div class="ak-h">' + avatar + '<div><b id="ak-t">Ask Ninjas</b><small>Your chef for tonight</small></div><button class="ak-x" type="button" aria-label="Close">×</button></div>' +
    '<div class="ak-log" aria-live="polite"></div>' +
    '<form class="ak-in"><input maxlength="400" placeholder="Type what you have or how you feel…" aria-label="Message Ask Ninjas"><button class="ak-send" type="submit" aria-label="Send">➤</button></form>' +
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

  function start() {
    st = { meal: null, chips: [], text: st.text || "", busy: false }; log.innerHTML = "";
    ninjaSays("Hey! I'm your ninja chef. 🥷 <br>What are we making?");
    options(MEALS, pickMeal);
    sync();
  }
  function pickMeal(k) {
    st.meal = k; meSays(label(MEALS, k).replace(/^\S+\s/, ""));
    ninjaSays("Nice. How's everyone feeling? Tap any that fit, or tell me what's in the fridge.");
    var chips = options(CHIPS, function (c) { var i = st.chips.indexOf(c); i < 0 ? st.chips.push(c) : st.chips.splice(i, 1); }, true);
    var go = document.createElement("button"); go.type = "button"; go.className = "ak-go"; go.textContent = "Show me ideas →"; go.setAttribute("aria-pressed", "true");
    go.addEventListener("click", function (e) { e.stopPropagation(); ask(); }); chips.appendChild(go);
    if (st.text) input.value = st.text;
    sync(); input.focus();
  }
  function sync() { send.disabled = st.busy || !st.meal; input.disabled = st.busy; }

  function token() { return window.RFNAuth && RFNAuth.token ? RFNAuth.token().catch(function () { return null; }) : Promise.resolve(null); }
  function card(p) {
    var pic = p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<span class=e>' + esc(p.emoji || "🍽️") + "</span>'\">" : '<span class="e">' + esc(p.emoji || "🍽️") + "</span>";
    return '<a class="ak-card" href="' + esc(p.url) + '">' + pic + "<span><b>" + esc(p.title) + "</b><small>" + esc(p.reason) + "</small></span></a>";
  }

  function ask() {
    if (st.busy || !st.meal) return;
    st.text = input.value.trim(); input.value = "";
    log.querySelectorAll(".ak-opts").forEach(function (o) { o.remove(); });
    var said = st.chips.map(function (c) { return label(CHIPS, c); }).join(" · ");
    if (said || st.text) meSays([said, st.text].filter(Boolean).join(" — "));
    st.busy = true; sync();
    var typing = add('<span class="ak-typing"><span></span><span></span><span></span></span>');
    token().then(function (t) {
      var h = { "content-type": "application/json" }; if (t) h.Authorization = "Bearer " + t;
      return fetch("/api/chat", { method: "POST", headers: h, body: JSON.stringify({ meal: st.meal, chips: st.chips, text: st.text }) });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "I'm offline for a minute. Try again soon."); return d; });
    }).then(function (d) {
      typing.remove();
      ninjaSays(esc(d.intro || "Here's what I'd make."));
      (d.picks || []).forEach(function (p) { add(card(p), "ak-pick"); });
      if (d.outside && d.outside.title) {
        add('<span class="tag">Outside our recipe book</span><b>' + esc(d.outside.title) + "</b>" + (d.outside.reason ? "<small>" + esc(d.outside.reason) + "</small>" : "") +
          ((d.outside.steps || []).length ? "<ol>" + d.outside.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" : ""), "ak-out");
      }
      if (!(d.picks || []).length && !d.outside) ninjaSays("Nothing fits that yet. Try another meal or fewer filters.");
      // Sign-in is offered after the first useful answer, not as a gate in front of it.
      if (accounts && !d.signedIn) ninjaSays('Want me to skip allergies and what you cooked lately? <a href="/account/">Sign in</a> and I\'ll remember your family.');
      options([["again", "↺ Start over"]], start);
      if (window.track) try { track("assistant_answer", { meal: st.meal, ai: !!d.ai }); } catch (e) {}
    }).catch(function (err) {
      typing.remove(); ninjaSays(esc(err.message)); options([["again", "↺ Try again"]], start);
    }).then(function () { st.busy = false; st.text = ""; sync(); });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!st.meal) { if (input.value.trim()) { st.text = input.value.trim(); meSays(st.text); input.value = ""; ninjaSays("Got it. Which meal is this for?"); } return; }
    ask();
  });
  wrap.addEventListener("click", function (e) { if (e.target === wrap || e.target.closest(".ak-x")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && wrap.classList.contains("open")) close(); });

  function open(prefill) {
    if (!wrap.isConnected) document.body.appendChild(wrap);
    lastFocus = document.activeElement;
    if (prefill || !log.childElementCount) { st.text = prefill || ""; start(); if (prefill) { meSays(prefill); ninjaSays("Got it. Which meal is this for?"); } }
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
