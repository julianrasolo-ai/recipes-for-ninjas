/* Shared recipe app. Each section page sets window.SITE before loading this file. */
(function(){
  var SITE=window.SITE, isJuice=SITE.key==='juice';
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(el,off){var y=el.getBoundingClientRect().top+scrollY+(off||0);scrollTo({top:y,behavior:reduce?'auto':'smooth'})}

  fetch(SITE.data).then(function(r){return r.json()}).then(start).catch(function(){
    $('#sections').innerHTML='<p class="empty">Could not load recipes. Check your connection and reload.</p>';
  });

  function start(D){
  var R=D.recipes, L=D.labels, byId={};
  R.forEach(function(r){byId[r.id]=r});
  var catMap={}; D.cats.forEach(function(c){catMap[c.k]=c});
  var benMap={}; (D.bens||[]).forEach(function(b){benMap[b[0]]=b});

  /* ---------- per-section wording ---------- */
  function modeLabel(r){
    if(isJuice)return (r.ben||[]).slice(0,3).map(function(b){return benMap[b][1]}).join(' ');
    return r.mode==='Swirl'?'🍦 Swirl':r.mode==='Scoop'?'🥄 Scoop':'⚡ Quick';
  }
  function meta(r){
    if(isJuice)return r.prep+' · '+(r.makes.indexOf('shot')>-1?'shots':r.makes.indexOf('2 glasses')>-1?'serves 2':'1 glass');
    return r.freeze==='None'?'Ready in '+r.prep:r.prep+' prep + freeze';
  }
  function filterName(r){return r.filter==='orange'?'Orange filter · lots of pulp':'Black filter · less pulp'}
  function searchText(r){
    return (r.title+' '+r.blurb+' '+r.ing.join(' ')+' '+r.tags.map(function(t){return L[t]}).join(' ')+' '+
      (r.ben||[]).map(function(b){return benMap[b][2]}).join(' ')).toLowerCase();
  }

  /* ---------- MENU ---------- */
  function thumb(r){return r.img?'<img src="'+r.img+'" alt="'+esc(r.title)+'" loading="lazy"'+(r.cdn?' data-cdn="'+r.cdn+'"':'')+' data-emo="'+r.emoji+'">':'<div class="emo">'+r.emoji+'</div>'}
  var secWrap=$('#sections'), nav=$('#navrow');
  nav.style.setProperty('--n',D.cats.length);
  D.cats.forEach(function(c){
    var list=R.filter(function(r){return r.cat===c.k});
    var s=document.createElement('section'); s.className='sec'; s.id='s-'+c.k; s.dataset.c=c.k; s.dataset.k=c.k;
    var h='<div class="sh"><h2><span class="ico">'+c.e+'</span>'+esc(c.n)+'</h2><button class="shop-btn" data-shop="'+c.k+'" type="button">Shopping list</button></div>'+
      '<p class="sd">'+esc(c.d)+'</p><div class="grid">';
    list.forEach(function(r){
      h+='<button class="card" type="button" data-id="'+r.id+'" data-c="'+r.cat+'" data-s="'+esc(searchText(r))+'">'+
        '<div class="thumb">'+thumb(r)+'<span class="mode">'+modeLabel(r)+'</span>'+(r.healthy?'<span class="leaf">🌿</span>':'')+'<span class="likes" data-lk="'+r.id+'"></span></div>'+
        '<div class="cb"><p class="ct">'+esc(r.title)+'</p><div class="cm">'+esc(meta(r))+(r.dfree?' · Dairy-free':'')+'</div></div></button>';
    });
    s.innerHTML=h+'</div>'; secWrap.appendChild(s);
    var b=document.createElement('button'); b.className='tab'; b.type='button'; b.dataset.c=c.k; b.dataset.t=c.k;
    b.innerHTML='<span class="te">'+c.e+'</span><span>'+esc(c.s||c.n)+'</span>'; b.setAttribute('aria-label',c.n); nav.appendChild(b);
  });
  var cards=$$('.card'), secs=$$('.sec'), tabs=$$('.tab');
  tabs.forEach(function(t){t.addEventListener('click',function(){goTo($('#s-'+t.dataset.t),-64)})});
  function setCur(k){tabs.forEach(function(t){var on=t.dataset.t===k;t.classList.toggle('cur',on);if(on)t.setAttribute('aria-current','true');else t.removeAttribute('aria-current')})}
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)setCur(e.target.dataset.k)})},{rootMargin:'-30% 0px -60% 0px'});
    secs.forEach(function(s){io.observe(s)});
  }
  setCur(D.cats[0].k);

  /* benefit chips (juice only) */
  var benSel={};
  if(D.bens){
    var bw=$('#bens');
    bw.innerHTML='<span class="lbl">I want:</span>'+D.bens.map(function(b){return '<button class="bchip" type="button" data-b="'+b[0]+'" aria-pressed="false">'+b[1]+' '+esc(b[2])+'</button>'}).join('');
    bw.hidden=false;
    $$('.bchip',bw).forEach(function(c){c.addEventListener('click',function(){
      var on=c.getAttribute('aria-pressed')!=='true'; c.setAttribute('aria-pressed',on); benSel[c.dataset.b]=on; filter();
    })});
  }

  var qEl=$('#q'), hOnly=false;
  function filter(){
    var q=qEl.value.trim().toLowerCase(), n=0, want=Object.keys(benSel).filter(function(k){return benSel[k]});
    cards.forEach(function(c){var r=byId[c.dataset.id];
      var ok=(!q||c.dataset.s.indexOf(q)>-1)&&(!hOnly||r.healthy)&&want.every(function(b){return (r.ben||[]).indexOf(b)>-1});
      c.hidden=!ok;if(ok)n++});
    secs.forEach(function(s){s.hidden=!s.querySelector('.card:not([hidden])')});
    tabs.forEach(function(t){t.hidden=$('#s-'+t.dataset.t).hidden});
    nav.style.setProperty('--n',tabs.filter(function(t){return !t.hidden}).length||1);
    $('#empty').hidden=n>0;
  }
  qEl.addEventListener('input',filter);
  $('#healthyOnly').addEventListener('click',function(){hOnly=!hOnly;this.classList.toggle('on',hOnly);this.setAttribute('aria-pressed',hOnly);filter()});

  /* ---------- LIKES (shared across devices via /api/likes) ---------- */
  var PEOPLE=Likes.PEOPLE, likes=Likes.init(SITE.key,function(){paintLikes();if(dlg.open&&stack.length&&refreshOpen)refreshOpen()});
  function likedBy(id){return Likes.get()[id]||[]}
  function paintLikes(){
    $$('[data-lk]').forEach(function(el){
      el.innerHTML=likedBy(el.dataset.lk).map(function(p){return '<span class="dot" data-p="'+p+'" title="'+p+'">'+p.charAt(0)+'</span>'}).join('');
    });
  }
  paintLikes();

  /* ---------- SHEET ---------- */
  var dlg=$('#sheet'), sin=$('#sheetIn'), stack=[], refreshOpen=null;
  function open(html,c){
    sin.innerHTML=html; sin.parentNode.dataset.c=c||''; dlg.dataset.c=c||'';
    if(!dlg.open){ if(dlg.showModal)dlg.showModal(); else dlg.setAttribute('open',''); }
    sin.scrollTop=0; wire();
  }
  function close(){stack=[]; refreshOpen=null; if(dlg.close)dlg.close(); else dlg.removeAttribute('open')}
  dlg.addEventListener('click',function(e){if(e.target===dlg)close()});
  dlg.addEventListener('close',function(){stack=[];refreshOpen=null});
  function bar(back){return '<div class="sbar">'+(back?'<button class="ibtn" data-back type="button" aria-label="Back">←</button>':'<span></span>')+'<button class="ibtn" data-close type="button" aria-label="Close">✕</button></div>'}
  function wire(){
    $$('[data-close]',sin).forEach(function(b){b.onclick=close});
    $$('[data-back]',sin).forEach(function(b){b.onclick=function(){stack.pop();var prev=stack.pop();if(prev)prev()}});
    $$('[data-open]',sin).forEach(function(b){b.onclick=function(){showRecipe(b.dataset.open,true)}});
  }
  function copy(txt,st){
    var done=function(ok){st.textContent=ok?'Copied':'Could not copy here. Long-press to select.'};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){done(true)},function(){done(false)})}else done(false)}catch(e){done(false)}
  }
  function syncLine(){var st=Likes.status();return '<p class="sync" data-s="'+st+'">'+(st==='off'?'Offline: saved on this device, will sync when back online.':'Shared with the whole family.')+'</p>'}
  function showRecipe(id,fromOther){
    var r=byId[id]; var fn=function(){showRecipe(id,fromOther)}; stack.push(fn);
    refreshOpen=function(){stack.pop();fn()};
    var c=catMap[r.cat], h;
    var likeBox='<div class="likebox"><b>❤️ Who likes this?</b><div class="who">'+PEOPLE.map(function(p){return '<button class="who-b" type="button" data-p="'+p+'" data-like="'+p+'" aria-pressed="'+(likedBy(r.id).indexOf(p)>-1)+'">'+p+'</button>'}).join('')+'</div>'+syncLine()+'</div>';
    var ingH='<h3>'+esc(r.listTitle)+'</h3><ul class="ingl">'+r.ing.map(function(x){return '<li><label><input type="checkbox"><span>'+esc(x)+'</span></label></li>'}).join('')+'</ul>'+
      '<div class="row"><button class="btn" id="cp" type="button">Copy shopping list</button><span class="status" id="cps" aria-live="polite"></span></div>'+
      '<h3>Steps</h3><ol class="steps">'+r.steps.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ol>';
    if(isJuice){
      h=bar(fromOther&&stack.length>1)+'<div class="shero">'+thumb(r)+'</div><div class="sbody">'+
        '<div class="chips"><span class="chip">'+c.e+' '+esc(c.n)+'</span>'+(r.healthy?'<span class="chip g">🌿 Low sugar</span>':'')+'</div>'+
        '<h2>'+esc(r.title)+'</h2><p style="margin:0;color:var(--muted);font-weight:600">'+esc(r.blurb)+'</p>'+
        '<div class="chips">'+(r.ben||[]).map(function(b){return '<span class="chip b">'+benMap[b][1]+' '+esc(benMap[b][2])+'</span>'}).join('')+'</div>'+
        '<div class="chips"><span class="chip">Prep '+esc(r.prep)+'</span><span class="chip">'+esc(r.makes)+'</span></div>'+
        '<div class="press"><small>FILTER</small> '+esc(filterName(r))+'</div>'+likeBox+ingH+
        (r.tip?'<p class="note"><b>Tip:</b> '+esc(r.tip)+'</p>':'')+
        (r.swap?'<p class="note"><b>Adjust:</b> '+esc(r.swap)+'</p>':'')+
        '<p class="disclaim">Benefit tags are general nutrition info, not medical advice. Drink fresh juice within 24 hours.</p></div>';
    }else{
      h=bar(fromOther&&stack.length>1)+'<div class="shero">'+thumb(r)+'</div><div class="sbody">'+
        '<div class="chips"><span class="chip">'+c.e+' '+esc(c.n)+'</span><span class="chip">'+modeLabel(r)+'</span>'+
        (r.healthy?'<span class="chip g">🌿 Healthy</span>':'')+(r.dfree?'<span class="chip g">Dairy-free</span>':'')+'<span class="chip">'+esc(r.level)+'</span></div>'+
        '<h2>'+esc(r.title)+'</h2><p style="margin:0;color:var(--muted);font-weight:600">'+esc(r.blurb)+'</p>'+
        '<div class="chips"><span class="chip">Prep '+esc(r.prep)+'</span><span class="chip">Freeze '+esc(r.freeze)+'</span><span class="chip">Spin '+esc(r.spin)+'</span><span class="chip">'+esc(r.makes)+'</span></div>'+
        '<div class="press"><small>PRESS</small> '+esc(r.program)+'</div>'+likeBox+ingH+
        (r.df?'<p class="note"><b>Dairy-free:</b> '+esc(r.df)+'</p>':'')+
        (r.lite?'<p class="note"><b>Lighter:</b> '+esc(r.lite)+'</p>':'')+
        (r.tip?'<p class="note"><b>Tip:</b> '+esc(r.tip)+'</p>':'')+'</div>';
    }
    var keep=dlg.open?sin.scrollTop:0; open(h,r.cat); if(keep)sin.scrollTop=keep;
    $$('[data-like]',sin).forEach(function(b){b.onclick=function(){
      Likes.toggle(r.id,b.dataset.like); paintLikes();
      b.setAttribute('aria-pressed',likedBy(r.id).indexOf(b.dataset.like)>-1);
    }});
    $('#cp',sin).onclick=function(){copy(r.title+'\n'+r.ing.map(function(x){return '- '+x}).join('\n'),$('#cps',sin))};
  }
  secWrap.addEventListener('click',function(e){
    var c=e.target.closest('.card'); if(c){stack=[];showRecipe(c.dataset.id,false);return}
    var s=e.target.closest('[data-shop]'); if(s){stack=[];showShop(s.dataset.shop)}
  });
  function miniRow(r,extra){
    return '<button class="mini" type="button" data-open="'+r.id+'"><span class="mt">'+thumb(r)+'</span><span><b>'+esc(r.title)+'</b>'+(extra||'')+'</span></button>';
  }
  function showShop(k){
    var fn=function(){showShop(k)}; stack.push(fn); refreshOpen=null;
    var c=catMap[k], list=R.filter(function(r){return r.cat===k}), freq={};
    list.forEach(function(r){r.tags.forEach(function(t){freq[t]=(freq[t]||0)+1})});
    var keys=Object.keys(freq).sort(function(a,b){return freq[b]-freq[a]||L[a].localeCompare(L[b])});
    var h=bar(false)+'<div class="sbody"><h2>'+c.e+' '+esc(c.n)+'</h2><p style="margin:0;color:var(--muted);font-weight:600">Stock these and you can make most of this section. The number shows how many recipes use each item.</p>'+
      '<h3>Shopping list</h3><ul class="ingl">'+keys.map(function(t){return '<li><label><input type="checkbox" data-l="'+esc(L[t])+'"><span>'+esc(L[t])+' <small style="color:var(--muted)">· '+freq[t]+' recipes</small></span></label></li>'}).join('')+
      (SITE.pantry?'<li><label><input type="checkbox" data-l="'+esc(SITE.pantry)+'"><span>'+esc(SITE.pantry)+' <small style="color:var(--muted)">· pantry</small></span></label></li>':'')+'</ul>'+
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
    var fn=function(){showHave()}; stack.push(fn); refreshOpen=null;
    var h=bar(false)+'<div class="sbody"><h2>🧺 What do you have?</h2><p style="margin:0;color:var(--muted);font-weight:600">'+esc(SITE.haveNote)+'</p>'+
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
    R.forEach(function(r){
      if(focus==='healthy'&&!r.healthy)return; if(focus!=='all'&&focus!=='healthy'&&r.cat!==focus)return;
      var m=r.tags.filter(function(t){return sel[t]}); if(!m.length)return;
      rows.push({r:r,m:m,miss:r.tags.filter(function(t){return !sel[t]})});
    });
    rows.sort(function(a,b){return a.miss.length-b.miss.length||b.m.length-a.m.length});
    if(!rows.length){box.innerHTML='<p class="empty">Nothing yet. Add another ingredient.</p>';return}
    var secsH=[['Make it now','you have everything',function(x){return !x.miss.length}],['Almost there','1 or 2 things to grab',function(x){return x.miss.length&&x.miss.length<=2}],['Bigger shop','3+ things missing',function(x){return x.miss.length>2}]];
    var h='';
    secsH.forEach(function(s){var l=rows.filter(s[2]);if(!l.length)return;
      h+='<p class="rh">'+s[0]+' <small>'+s[1]+' ('+l.length+')</small></p>'+l.map(function(x){
        return miniRow(x.r,x.miss.length?'<span class="need">Need: '+esc(x.miss.map(function(t){return L[t]}).join(', '))+'</span>':'<span>✓ You have it all</span>')}).join('');
    });
    box.innerHTML=h; wire();
  }

  var favWho='all';
  function showFav(){
    var fn=function(){showFav()}; stack.push(fn);
    refreshOpen=function(){stack.pop();fn()};
    var list=R.filter(function(r){var l=likedBy(r.id);return favWho==='all'?l.length:l.indexOf(favWho)>-1});
    var h=bar(false)+'<div class="sbody"><h2>❤️ Favorites</h2><p style="margin:0;color:var(--muted);font-weight:600">Pick a person to see their favorites.</p>'+
      '<div class="fchips"><button class="fchip'+(favWho==='all'?' on':'')+'" data-p="all" type="button">Everyone</button>'+
      PEOPLE.map(function(p){return '<button class="fchip'+(favWho===p?' on':'')+'" data-p="'+p+'" type="button">'+p+'</button>'}).join('')+'</div>'+
      syncLine()+
      (list.length?list.map(function(r){return miniRow(r,'<span>'+(favWho==='all'?'❤️ '+esc(likedBy(r.id).join(', ')):esc(catMap[r.cat].n))+'</span>')}).join(''):'<p class="empty">Nothing here yet. Open any recipe and tap your name under ❤️ Who likes this?</p>')+'</div>';
    open(h,SITE.favColor);
    $$('.fchip',sin).forEach(function(b){b.onclick=function(){favWho=b.dataset.p;stack.pop();showFav()}});
  }
  $('#openFav').addEventListener('click',function(){stack=[];showFav()});
  $('#openHave').addEventListener('click',function(){stack=[];showHave()});
  if(location.hash==='#favorites')showFav()
  }
})();
