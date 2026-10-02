/* Site-wide hooks driven by data/site.json (window.SITE_CONFIG).
   Everything here is off until switched on: consent, analytics, ads, email popup.
   window.track(name, props) is always safe to call. */
(function(){
  var C=window.SITE_CONFIG||{}, KEY='rfn-consent', queue=[];
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function get(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}
  function set(v){try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}}
  function load(src,attrs){var s=document.createElement('script');s.src=src;s.async=true;for(var k in attrs||{})s.setAttribute(k,attrs[k]);document.head.appendChild(s);return s}

  var A=C.analytics||{}, AD=C.ads||{}, needConsent=!!(C.consent&&C.consent.enabled&&(A.enabled||AD.enabled));

  /* ---------- analytics ---------- */
  var sink=null;
  window.track=function(name,props){
    if(sink)sink(name,props||{}); else queue.push([name,props||{}]);
  };
  function startAnalytics(){
    if(!A.enabled||sink)return;
    if(A.provider==='plausible'&&A.plausibleDomain){
      window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};
      load('https://plausible.io/js/script.tagged-events.js',{'data-domain':A.plausibleDomain,defer:''});
      sink=function(n,p){window.plausible(n,{props:p})};
    }else if(A.provider==='ga4'&&A.ga4Id){
      window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
      gtag('js',new Date());gtag('config',A.ga4Id);load('https://www.googletagmanager.com/gtag/js?id='+A.ga4Id);
      sink=function(n,p){gtag('event',n,p)};
    }
    if(sink)queue.splice(0).forEach(function(e){sink(e[0],e[1])});
  }

  /* ---------- ads: slots reserve their space in CSS, so nothing shifts when they fill ---------- */
  function startAds(personalised){
    if(!AD.enabled||!AD.client||AD.provider!=='adsense')return;
    var slots=$$('[data-ad]'); if(!slots.length)return;
    if(!personalised){(window.adsbygoogle=window.adsbygoogle||[]).requestNonPersonalizedAds=1}
    load('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+AD.client,{crossorigin:'anonymous'});
    slots.forEach(function(s){
      var id=(AD.slots||{})[s.dataset.ad]; if(!id)return;
      var ins=document.createElement('ins');ins.className='adsbygoogle';ins.style.display='block';
      ins.setAttribute('data-ad-client',AD.client);ins.setAttribute('data-ad-slot',id);ins.setAttribute('data-ad-format','auto');ins.setAttribute('data-full-width-responsive','true');
      s.appendChild(ins);(window.adsbygoogle=window.adsbygoogle||[]).push({});
    });
  }

  /* ---------- consent ---------- */
  function apply(c){ if(c.analytics)startAnalytics(); if(AD.enabled)startAds(!!c.ads); }
  function banner(){
    if($('.consent'))return;
    var b=document.createElement('div'); b.className='consent'; b.setAttribute('role','dialog'); b.setAttribute('aria-label','Cookie choices');
    b.innerHTML='<p><b>Cookies?</b> We use '+(A.enabled?'analytics':'')+(A.enabled&&AD.enabled?' and ':'')+(AD.enabled?'ads':'')+' to keep this site free. <a href="/privacy/">Privacy policy</a></p>'+
      '<div class="row"><button class="btn" data-c="all" type="button">Accept</button><button class="btn ghost" data-c="none" type="button">Only necessary</button></div>';
    document.body.appendChild(b);
    $$('[data-c]',b).forEach(function(x){x.onclick=function(){
      var all=x.dataset.c==='all', c={analytics:all,ads:all,at:Date.now()}; set(c); b.remove(); apply(c);
    }});
  }
  if(needConsent){ var saved=get(); if(saved)apply(saved); else banner(); }
  else if(A.enabled||AD.enabled){ apply({analytics:true,ads:true}); }
  document.addEventListener('click',function(e){ if(e.target.closest('[data-consent-open]')){ if(needConsent)banner(); } });

  /* ---------- tracking hooks ---------- */
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-aff]'); if(a)track('affiliate_click',{product:a.dataset.aff,where:a.dataset.where||''});
    var s=e.target.closest('[data-track="share"]'); if(s)track('share',{network:s.dataset.net});
    var p=e.target.closest('[data-buy]'); if(p)track('checkout_start',{product:p.dataset.buy});
  });
  document.addEventListener('submit',function(e){
    var f=e.target.closest('.signup-f'); if(!f)return;
    track('signup',{source:(f.querySelector('[name=source]')||{}).value||''});
    try{localStorage.setItem('rfn-joined','1')}catch(err){}
  });

  /* ---------- email popup ---------- */
  var E=C.email||{};
  if(E.enabled&&E.popup&&E.popup.enabled){
    var seen=false; try{seen=localStorage.getItem('rfn-joined')||sessionStorage.getItem('rfn-pop')}catch(err){}
    var box=$('.signup');
    if(!seen&&box)setTimeout(function(){
      try{sessionStorage.setItem('rfn-pop','1')}catch(err){}
      var d=document.createElement('dialog'); d.className='sheet pop';
      d.innerHTML='<div class="sheet-in"><div class="sbar"><span></span><button class="ibtn" type="button" aria-label="Close">✕</button></div><div class="sbody">'+box.innerHTML.replace(/id="em-/g,'id="pop-em-').replace(/for="em-/g,'for="pop-em-')+'</div></div>';
      document.body.appendChild(d); d.querySelector('.ibtn').onclick=function(){d.close()};
      if(d.showModal)d.showModal();
    },(E.popup.delaySeconds||40)*1000);
  }
})();
