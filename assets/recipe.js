/* Recipe page: family favorites, copy shopping list, share. */
(function(){
  var R=window.RECIPE;
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}

  function paint(){
    var liked=Likes.get()[R.id]||[];
    $$('[data-like]').forEach(function(b){b.setAttribute('aria-pressed',liked.indexOf(b.dataset.like)>-1)});
    var st=Likes.status(), s=$('#sync');
    s.dataset.s=st; s.textContent=st==='off'?'Offline: saved on this device, will sync when back online.':'Shared with the whole family.';
  }
  Likes.init(R.section,paint); paint();
  $$('[data-like]').forEach(function(b){b.addEventListener('click',function(){Likes.toggle(R.id,b.dataset.like);paint()})});

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
