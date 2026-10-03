/* Recipe page: favorites (family or household profiles), cooked log, copy shopping list, share. */
(function(){
  var R=window.RECIPE;
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

  var who=$('.who');
  function renderWho(){
    var mode=Likes.mode(), people=Likes.people(), liked=Likes.get()[R.id]||[];
    if(mode==='signedout'){who.innerHTML='<a class="btn" href="/account/">Sign in to save favorites</a>';return}
    if(mode==='noprofiles'){who.innerHTML='<a class="btn" href="/account/">Add your family to save favorites</a>';return}
    if(mode==='loading'){who.innerHTML='<span class="muted">Loading…</span>';return}
    who.innerHTML=people.map(function(p,i){return '<button class="who-b" type="button" data-p="'+(mode==='family'?p:'')+'" data-i="'+(i%4)+'" data-like="'+p.replace(/"/g,'&quot;')+'" aria-pressed="'+(liked.indexOf(p)>-1)+'">'+p.replace(/</g,'&lt;')+'</button>'}).join('')+
      (mode==='account'?'<button class="who-b made" type="button" id="made">✅ We made this</button>':'');
  }
  function paint(){
    renderWho();
    var st=Likes.status(), s=$('#sync'), mode=Likes.mode();
    s.dataset.s=st;
    s.textContent=mode==='account'?'Saved to your household.':mode==='family'?(st==='off'?'Offline: saved on this device, will sync when back online.':'Shared with the whole family.'):'';
  }
  Likes.init(R.section,paint); paint();
  who.addEventListener('click',function(e){
    var b=e.target.closest('[data-like]'); if(b){Likes.toggle(R.id,b.dataset.like);paint();return}
    var m=e.target.closest('#made');
    if(m&&window.RFNAuth){m.disabled=true;RFNAuth.cooked(R.appliance+'/'+R.id).then(function(res){m.textContent=res&&res.error?'Could not save, try again':'✅ Logged. Nice cooking!';m.disabled=!!(res&&!res.error)})}
  });

  function copy(txt,st){
    var done=function(ok){st.textContent=ok?'Copied':'Could not copy here. Long-press to select.'};
    try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){done(true)},function(){done(false)})}else done(false)}catch(e){done(false)}
  }
  $('#cp').addEventListener('click',function(){copy(R.title+'\n'+R.ing.map(function(x){return '- '+x}).join('\n'),$('#cps'))});

  var sh=$('[data-share]');
  if(sh){
    var box=sh.closest('.share');
    sh.addEventListener('click',function(){
      var d={title:box.dataset.shareTitle,url:box.dataset.shareUrl};
      if(window.track)track('share',{network:'native',recipe:R.id});
      if(navigator.share)navigator.share(d).catch(function(){});
      else copy(d.url,sh), sh.textContent='Link copied';
    });
  }
})();

/* Cook mode: keep the screen awake while cooking (Screen Wake Lock API; hidden where unsupported). */
(function(){
  var b=document.getElementById('cookmode'); if(!b||!('wakeLock' in navigator))return;
  var lock=null; b.hidden=false;
  function set(on){b.setAttribute('aria-pressed',String(on));b.textContent=on?'🍳 Cook mode on: screen stays awake':'🍳 Cook mode: keep screen on'}
  b.addEventListener('click',function(){
    if(lock){lock.release();lock=null;set(false);return}
    navigator.wakeLock.request('screen').then(function(l){lock=l;set(true);l.addEventListener('release',function(){if(lock===l){lock=null;if(document.visibilityState==='visible')set(false)}})}).catch(function(){b.textContent='Cook mode isn’t available here'});
    if(window.track)try{track('cook_mode')}catch(e){}
  });
  // The lock drops when the tab is hidden; take it back when the cook returns.
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&b.getAttribute('aria-pressed')==='true'&&!lock)navigator.wakeLock.request('screen').then(function(l){lock=l}).catch(function(){})});
})();
