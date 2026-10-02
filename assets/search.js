/* Site-wide search with an appliance filter. Reads /search-index.json once. */
(function(){
  function $(s){return document.querySelector(s)}
  function $$(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  var idx=[], app='', q=$('#sq'), res=$('#sres'), count=$('#scount'), A=window.APPLIANCES||{};
  var params=new URLSearchParams(location.search); q.value=params.get('q')||''; app=params.get('a')||'';
  $$('.afilter .pill').forEach(function(b){b.classList.toggle('on',b.dataset.a===app)});
  function run(){
    var words=q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hits=idx.filter(function(r){return (!app||r.a===app)&&words.every(function(w){return r.s.indexOf(w)>-1})});
    var shown=hits.slice(0,60);
    res.innerHTML=shown.map(function(r){
      return '<a class="card" href="'+r.u+'"><div class="thumb"><img src="'+r.i+'" alt="" loading="lazy"'+(r.cdn?' data-cdn="'+r.cdn+'"':'')+' data-emo="'+r.e+'"><span class="mode">'+esc(A[r.a]||'')+'</span></div><div class="cb"><p class="ct">'+esc(r.t)+'</p><div class="cm">'+esc(r.c)+'</div></div></a>';
    }).join('');
    count.textContent=(words.length||app)?hits.length+' recipe'+(hits.length===1?'':'s')+(hits.length>60?' (showing 60)':''):idx.length+' recipes';
    var u=new URL(location.href); if(q.value)u.searchParams.set('q',q.value);else u.searchParams.delete('q'); if(app)u.searchParams.set('a',app);else u.searchParams.delete('a');
    history.replaceState(null,'',u);
  }
  q.addEventListener('input',run);
  $$('.afilter .pill').forEach(function(b){b.addEventListener('click',function(){app=b.dataset.a;$$('.afilter .pill').forEach(function(x){x.classList.toggle('on',x===b)});run()})});
  fetch('/search-index.json').then(function(r){return r.json()}).then(function(d){idx=d;run()}).catch(function(){count.textContent='Search is unavailable offline.'});
})();
