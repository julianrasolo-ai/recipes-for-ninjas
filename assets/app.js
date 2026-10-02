/* Appliance hub: cards are pre-rendered links; this adds filters, favorites dots and the tool sheets. */
(function(){
  var SITE=window.SITE;
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function goTo(el,off){var y=el.getBoundingClientRect().top+scrollY+(off||0);scrollTo({top:y,behavior:reduce?'auto':'smooth'})}

  var cards=$$('.card'), secs=$$('.sec'), tabs=$$('.tab'), nav=$('#navrow');

  /* ---------- tabs ---------- */
  tabs.forEach(function(t){t.addEventListener('click',function(){goTo($('#s-'+t.dataset.t),-64)})});
  function setCur(k){tabs.forEach(function(t){var on=t.dataset.t===k;t.classList.toggle('cur',on);if(on)t.setAttribute('aria-current','true');else t.removeAttribute('aria-current')})}
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)setCur(e.target.dataset.k)})},{rootMargin:'-30% 0px -60% 0px'});
    secs.forEach(function(s){io.observe(s)});
  }
  if(secs[0])setCur(secs[0].dataset.k);

  /* ---------- filters ---------- */
  var qEl=$('#q'), hOnly=false, benSel={};
  function filter(){
    var q=qEl.value.trim().toLowerCase(), n=0, want=Object.keys(benSel).filter(function(k){return benSel[k]});
    cards.forEach(function(c){
      var ben=(c.dataset.ben||'').split(' ');
      var ok=(!q||c.dataset.s.indexOf(q)>-1)&&(!hOnly||c.hasAttribute('data-h'))&&want.every(function(b){return ben.indexOf(b)>-1});
      c.hidden=!ok; if(ok)n++;
    });
    secs.forEach(function(s){s.hidden=!s.querySelector('.card:not([hidden])')});
    tabs.forEach(function(t){t.hidden=$('#s-'+t.dataset.t).hidden});
    nav.style.setProperty('--n',tabs.filter(function(t){return !t.hidden}).length||1);
    $('#empty').hidden=n>0;
  }
  qEl.addEventListener('input',filter);
  $('#healthyOnly').addEventListener('click',function(){hOnly=!hOnly;this.classList.toggle('on',hOnly);this.setAttribute('aria-pressed',hOnly);filter()});
  $$('.bchip').forEach(function(c){c.addEventListener('click',function(){
    var on=c.getAttribute('aria-pressed')!=='true'; c.setAttribute('aria-pressed',on); benSel[c.dataset.b]=on; filter();
  })});

  /* ---------- favorites dots ---------- */
  var PEOPLE=Likes.PEOPLE;
  Likes.init(SITE.section,function(){paintLikes();if(dlg.open&&refreshOpen)refreshOpen()});
  function likedBy(id){return Likes.get()[id]||[]}
  function paintLikes(){
    $$('[data-lk]').forEach(function(el){
      el.innerHTML=likedBy(el.dataset.lk).map(function(p){return '<span class="dot" data-p="'+p+'" title="'+p+'">'+p.charAt(0)+'</span>'}).join('');
    });
  }
  paintLikes();

  /* ---------- tool sheets (need the full recipe data) ---------- */
  var D=null, byId={}, L={}, catMap={}, benMap={};
  function data(cb){
    if(D)return cb();
    fetch(SITE.data).then(function(r){return r.json()}).then(function(d){
      D=d; L=d.labels; d.recipes.forEach(function(r){byId[r.id]=r}); d.cats.forEach(function(c){catMap[c.k]=c}); (d.bens||[]).forEach(function(b){benMap[b[0]]=b}); cb();
    }).catch(function(){open(bar()+'<div class="sbody"><p class="empty">Could not load recipes. Check your connection and try again.</p></div>')});
  }
  var dlg=$('#sheet'), sin=$('#sheetIn'), refreshOpen=null;
  function open(html,c){
    sin.innerHTML=html; dlg.dataset.c=c||'';
    if(!dlg.open){ if(dlg.showModal)dlg.showModal(); else dlg.setAttribute('open',''); }
    sin.scrollTop=0; $$('[data-close]',sin).forEach(function(b){b.onclick=close});
  }
  var pushed=false;
  function close(){refreshOpen=null; if(dlg.close)dlg.close(); else dlg.removeAttribute('open')}
  dlg.addEventListener('click',function(e){if(e.target===dlg)close()});
  dlg.addEventListener('close',function(){refreshOpen=null; if(pushed){pushed=false;history.back()}});
  addEventListener('popstate',function(){if(pushed&&dlg.open){pushed=false;close()}});
  function bar(){return '<div class="sbar"><span></span><button class="ibtn" data-close type="button" aria-label="Close">✕</button></div>'}
  function copy(txt,st){
    var done=function(ok){st.textContent=ok?'Copied':'Could not copy here. Long-press to select.'};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){done(true)},function(){done(false)})}else done(false)}catch(e){done(false)}
  }
  function thumb(r){return r.img?'<img src="'+r.img+'" alt=""'+(r.cdn?' data-cdn="'+r.cdn+'"':'')+' data-emo="'+r.emoji+'">':r.emoji}
  function miniRow(r,extra){
    return '<a class="mini" data-id="'+r.id+'" href="/'+SITE.key+'/'+r.slug+'/"><span class="mt">'+thumb(r)+'</span><span><b>'+esc(r.title)+'</b>'+(extra||'')+'</span></a>';
  }
  function syncLine(){var st=Likes.status();return '<p class="sync" data-s="'+st+'">'+(st==='off'?'Offline: saved on this device, will sync when back online.':'Shared with the whole family.')+'</p>'}

  /* Desktop opens recipes in the sheet; phones follow the link to the full page so it can be shared and Back works natively. */
  var wide=matchMedia('(min-width: 900px)');
  function plainClick(e){return wide.matches&&!(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button>0)}
  $('#sections').addEventListener('click',function(e){
    var s=e.target.closest('[data-shop]'); if(s){data(function(){showShop(s.dataset.shop)});return}
    var c=e.target.closest('.card'); if(c&&plainClick(e)){e.preventDefault();data(function(){showRecipe(c.dataset.id)})}
  });
  /* recipe rows inside the tool sheets open in the sheet too */
  sin.addEventListener('click',function(e){
    var m=e.target.closest('a.mini[data-id]'); if(m&&plainClick(e)){e.preventDefault();showRecipe(m.dataset.id)}
  });

  /* ---------- recipe sheet (same look as before; the URL changes so it can be shared) ---------- */
  function showRecipe(id){
    var r=byId[id], c=catMap[r.cat], url='/'+SITE.key+'/'+r.slug+'/';
    refreshOpen=function(){showRecipe(id)};
    var liked=likedBy(r.id);
    var h=bar()+'<div class="shero">'+thumb(r)+'</div><div class="sbody">'+
      '<div class="chips"><span class="chip">'+c.e+' '+esc(c.n)+'</span>'+(r.badge?'<span class="chip">'+r.badge+'</span>':'')+(r.healthy?'<span class="chip g">'+esc(D.toggleChip)+'</span>':'')+(r.dfree?'<span class="chip g">Dairy-free</span>':'')+'<span class="chip">'+esc(r.level)+'</span></div>'+
      '<h2>'+esc(r.title)+'</h2><p class="lead">'+esc(r.blurb)+'</p>'+
      ((r.ben||[]).length?'<div class="chips">'+r.ben.map(function(b){return '<span class="chip b">'+benMap[b][1]+' '+esc(benMap[b][2])+'</span>'}).join('')+'</div>':'')+
      '<div class="chips">'+r.chips.map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join('')+'</div>'+
      '<div class="press"><small>'+esc(D.pressLabel)+'</small> '+esc(r.press)+'</div>'+
      '<div class="likebox"><b>❤️ Who likes this?</b><div class="who">'+PEOPLE.map(function(p){return '<button class="who-b" type="button" data-p="'+p+'" data-like="'+p+'" aria-pressed="'+(liked.indexOf(p)>-1)+'">'+p+'</button>'}).join('')+'</div>'+syncLine()+'</div>'+
      '<h3>'+esc(r.listTitle||'You need')+'</h3><ul class="ingl">'+r.ing.map(function(x){return '<li><label><input type="checkbox"><span>'+esc(x)+'</span></label></li>'}).join('')+'</ul>'+
      '<div class="row"><button class="btn" id="cp" type="button">Copy shopping list</button><span class="status" id="cps" aria-live="polite"></span></div>'+
      '<h3>Steps</h3><ol class="steps">'+r.steps.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ol>'+
      r.notes.map(function(n){return '<p class="note"><b>'+esc(n[0])+':</b> '+esc(n[1])+'</p>'}).join('')+
      ((r.ben||[]).length?'<p class="disclaim">Benefit tags are general nutrition info, not medical advice.</p>':'')+
      ((r.gearItems||[]).length?'<h3>Handy for this recipe</h3><div class="gear-row">'+r.gearItems.map(function(p){
        return p.href?'<a class="gcard" href="'+p.href+'" rel="sponsored noopener" target="_blank" data-aff="'+p.id+'" data-where="sheet"><span class="gp"><div class="emo">'+(p.icon||'🧰')+'</div></span><span class="gt"><b>'+esc(p.name)+'</b><small>'+esc(p.note||'')+'</small></span><span class="go">Check price ›</span></a>':'';
      }).join('')+'</div><p class="disc">'+esc(D.disclosure)+'</p>':'')+
      '<a class="open-page" href="'+url+'">Open full page ›</a></div>';
    var keep=dlg.open?sin.scrollTop:0;
    open(h,r.cat); if(keep)sin.scrollTop=keep;
    if(!pushed){history.pushState({rid:id},'',url);pushed=true}else history.replaceState({rid:id},'',url);
    $$('[data-like]',sin).forEach(function(b){b.onclick=function(){Likes.toggle(r.id,b.dataset.like);paintLikes();b.setAttribute('aria-pressed',likedBy(r.id).indexOf(b.dataset.like)>-1)}});
    $('#cp',sin).onclick=function(){copy(r.title+'\n'+r.ing.map(function(x){return '- '+x}).join('\n'),$('#cps',sin))};
  }
  function showShop(k){
    var c=catMap[k], list=D.recipes.filter(function(r){return r.cat===k}), freq={};
    list.forEach(function(r){r.tags.forEach(function(t){freq[t]=(freq[t]||0)+1})});
    var keys=Object.keys(freq).sort(function(a,b){return freq[b]-freq[a]||L[a].localeCompare(L[b])});
    var h=bar()+'<div class="sbody"><h2>'+c.e+' '+esc(c.n)+'</h2><p class="lead">Stock these and you can make most of this section. The number shows how many recipes use each item.</p>'+
      '<h3>Shopping list</h3><ul class="ingl">'+keys.map(function(t){return '<li><label><input type="checkbox" data-l="'+esc(L[t])+'"><span>'+esc(L[t])+' <small class="muted">· '+freq[t]+' recipes</small></span></label></li>'}).join('')+
      (SITE.pantry?'<li><label><input type="checkbox" data-l="'+esc(SITE.pantry)+'"><span>'+esc(SITE.pantry)+' <small class="muted">· pantry</small></span></label></li>':'')+'</ul>'+
      '<div class="row"><button class="btn" id="cp" type="button">Copy list</button><span class="status" id="cps" aria-live="polite"></span></div>'+
      '<h3>Recipes in this section</h3>'+list.map(function(r){return miniRow(r,'<span>'+esc(r.tags.map(function(t){return L[t]}).join(', '))+'</span>')}).join('')+'</div>';
    open(h,k);
    $('#cp',sin).onclick=function(){
      var picked=$$('input:checked',sin).map(function(i){return i.dataset.l});
      if(!picked.length)picked=keys.map(function(t){return L[t]});
      copy(c.n+' shopping list\n'+picked.map(function(x){return '- '+x}).join('\n'),$('#cps',sin));
    };
  }
  var sel={}, focus='all';
  function showHave(){
    var h=bar()+'<div class="sbody"><h2>🧺 What do you have?</h2><p class="lead">'+esc(SITE.haveNote)+'</p>'+
      D.groups.map(function(g){return '<div class="igrp"><h4>'+esc(g[0])+'</h4><div class="ichips">'+g[1].map(function(t){return '<button class="ichip" type="button" data-t="'+t+'" aria-pressed="'+(sel[t]?'true':'false')+'">'+esc(L[t])+'</button>'}).join('')+'</div></div>'}).join('')+
      '<div class="row">'+SITE.focus.map(function(f){return '<button class="pill'+(focus===f[0]?' on':'')+'" data-f="'+f[0]+'" type="button">'+esc(f[1])+'</button>'}).join('')+'<button class="btn ghost" id="clr" type="button">Clear</button></div>'+
      '<div class="res" id="res" aria-live="polite"></div></div>';
    open(h,SITE.haveColor);
    $$('.ichip',sin).forEach(function(b){b.onclick=function(){var on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);sel[b.dataset.t]=on;results()}});
    $$('[data-f]',sin).forEach(function(b){b.onclick=function(){focus=b.dataset.f;$$('[data-f]',sin).forEach(function(x){x.classList.toggle('on',x===b)});results()}});
    $('#clr',sin).onclick=function(){sel={};$$('.ichip',sin).forEach(function(b){b.setAttribute('aria-pressed','false')});results()};
    results();
  }
  function results(){
    var box=$('#res',sin), have=Object.keys(sel).filter(function(k){return sel[k]});
    if(!have.length){box.innerHTML='<p class="empty">Tap an ingredient to see what you can make.</p>';return}
    var rows=[];
    D.recipes.forEach(function(r){
      if(focus==='healthy'&&!r.healthy)return; if(focus!=='all'&&focus!=='healthy'&&r.cat!==focus)return;
      var m=r.tags.filter(function(t){return sel[t]}); if(!m.length)return;
      rows.push({r:r,m:m,miss:r.tags.filter(function(t){return !sel[t]})});
    });
    rows.sort(function(a,b){return a.miss.length-b.miss.length||b.m.length-a.m.length});
    if(!rows.length){box.innerHTML='<p class="empty">Nothing yet. Add another ingredient.</p>';return}
    var groups=[['Make it now','you have everything',function(x){return !x.miss.length}],['Almost there','1 or 2 things to grab',function(x){return x.miss.length&&x.miss.length<=2}],['Bigger shop','3+ things missing',function(x){return x.miss.length>2}]];
    box.innerHTML=groups.map(function(s){var l=rows.filter(s[2]);if(!l.length)return '';
      return '<p class="rh">'+s[0]+' <small>'+s[1]+' ('+l.length+')</small></p>'+l.map(function(x){
        return miniRow(x.r,x.miss.length?'<span class="need">Need: '+esc(x.miss.map(function(t){return L[t]}).join(', '))+'</span>':'<span>✓ You have it all</span>')}).join('');
    }).join('');
  }
  var favWho='all';
  function showFav(){
    refreshOpen=showFav;
    var list=D.recipes.filter(function(r){var l=likedBy(r.id);return favWho==='all'?l.length:l.indexOf(favWho)>-1});
    var h=bar()+'<div class="sbody"><h2>❤️ Favorites</h2><p class="lead">Pick a person to see their favorites.</p>'+
      '<div class="fchips"><button class="fchip'+(favWho==='all'?' on':'')+'" data-p="all" type="button">Everyone</button>'+
      PEOPLE.map(function(p){return '<button class="fchip'+(favWho===p?' on':'')+'" data-p="'+p+'" type="button">'+p+'</button>'}).join('')+'</div>'+syncLine()+
      (list.length?list.map(function(r){return miniRow(r,'<span>'+(favWho==='all'?'❤️ '+esc(likedBy(r.id).join(', ')):esc(catMap[r.cat].n))+'</span>')}).join(''):'<p class="empty">Nothing here yet. Open any recipe and tap your name under ❤️ Who likes this?</p>')+'</div>';
    open(h,SITE.favColor);
    $$('.fchip',sin).forEach(function(b){b.onclick=function(){favWho=b.dataset.p;showFav()}});
  }
  $('#openFav').addEventListener('click',function(){data(showFav)});
  $('#openHave').addEventListener('click',function(){data(showHave)});
  if(location.hash==='#favorites')data(showFav);
})();
