/* Family favorites, shared across devices through /api/likes.
   Works offline: changes are kept in localStorage and sent when the server is reachable. */
window.Likes=(function(){
  var PEOPLE=['Julian','Charlyne','Leanne','Noah'];
  var section, data={}, pending=[], state='on', onChange=function(){}, busy=false;
  function key(n){return 'family-likes-'+section+'-'+n}
  function load(n,def){try{return JSON.parse(localStorage.getItem(key(n))||'null')||def}catch(e){return def}}
  function save(){try{localStorage.setItem(key('data'),JSON.stringify(data));localStorage.setItem(key('pending'),JSON.stringify(pending))}catch(e){}}
  function apply(d,op){
    var a=(d[op.id]||[]).filter(function(p){return p!==op.p});
    if(op.on)a.push(op.p);
    if(a.length)d[op.id]=a;else delete d[op.id];
  }
  function setState(s){state=s}
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
  function api(opts){
    return fetch('/api/likes?s='+encodeURIComponent(section),opts).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()});
  }
  /* Send queued changes one by one, then pull the latest state. */
  function sync(){
    if(busy)return; busy=true;
    var chain=Promise.resolve();
    pending.slice().forEach(function(op){
      chain=chain.then(function(){
        return api({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({s:section,id:op.id,p:op.p,on:op.on})})
          .then(function(){pending.shift();save()});
      });
    });
    chain.then(function(){return api()}).then(function(res){
      var next=res.likes||{};
      pending.forEach(function(op){apply(next,op)});
      setState('on');
      if(!same(next,data)){data=next;save();onChange()}else save();
    }).catch(function(){setState('off')}).then(function(){
      busy=false;
      if(pending.length&&state==='on')sync(); /* a toggle arrived mid-sync */
    });
  }
  return {
    PEOPLE:PEOPLE,
    init:function(s,cb){
      section=s; onChange=cb||onChange;
      data=load('data',{}); pending=load('pending',[]);
      sync();
      document.addEventListener('visibilitychange',function(){if(!document.hidden)sync()});
      addEventListener('online',sync);
      setInterval(function(){if(!document.hidden)sync()},30000);
      return data;
    },
    get:function(){return data},
    status:function(){return state},
    toggle:function(id,p){
      if(PEOPLE.indexOf(p)<0)return;
      var on=(data[id]||[]).indexOf(p)<0, op={id:id,p:p,on:on};
      apply(data,op); pending.push(op); save(); sync();
    }
  };
})();
