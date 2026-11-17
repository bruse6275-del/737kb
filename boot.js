/* 737 飞行知识库：解密数据后启动。数据加密存放（AES-GCM，PBKDF2-SHA256），密码只在本机使用。 */
(function(){
var KEYK='kb737_key', ITER=210000;
var b64d=function(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
var b64e=function(u){var s='';u=new Uint8Array(u);for(var i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
var lock=document.getElementById('lock'),msg=document.getElementById('lmsg'),pw=document.getElementById('lpw');
function show(m){lock.style.display='flex';if(m)msg.textContent=m;setTimeout(function(){pw.focus()},50)}
var enc=null;
function getEnc(){return enc?Promise.resolve(enc):fetch('data.enc?'+Date.now(),{cache:'no-cache'}).catch(function(){return fetch('data.enc')}).then(function(r){if(!r.ok)throw new Error('load');return r.json()}).then(function(j){enc=j;return j})}
function decrypt(key,j){return crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(j.iv)},key,b64d(j.ct)).then(function(buf){return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text()})}
function start(txt){
  window.DATA=JSON.parse(txt);lock.style.display='none';
  try{var prev=localStorage.getItem('kb737_ver');localStorage.setItem('kb737_ver',DATA.built+'#'+enc.v);if(prev&&prev!==DATA.built+'#'+enc.v)setTimeout(function(){var t=document.getElementById('toast');if(t){t.textContent='已更新到最新版本 '+DATA.built;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2500)}},800)}catch(e){}
  var s=document.createElement('script');s.src='app.js?'+enc.v;document.body.appendChild(s);
}
function tryCached(){
  var k;try{k=JSON.parse(localStorage.getItem(KEYK)||'null')}catch(e){}
  return getEnc().then(function(j){
    if(!k||k.salt!==j.salt)return show();
    return crypto.subtle.importKey('raw',b64d(k.raw),'AES-GCM',false,['decrypt']).then(function(key){return decrypt(key,j)}).then(start,function(){show('请重新输入密码')});
  },function(){show('数据加载失败：请联网后再打开一次')});
}
function unlock(){
  var p=pw.value;if(!p)return;msg.textContent='正在解锁…';
  getEnc().then(function(j){
    return crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveKey']).then(function(base){
      return crypto.subtle.deriveKey({name:'PBKDF2',salt:b64d(j.salt),iterations:ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},true,['decrypt']);
    }).then(function(key){
      return decrypt(key,j).then(function(txt){
        return crypto.subtle.exportKey('raw',key).then(function(raw){try{localStorage.setItem(KEYK,JSON.stringify({salt:j.salt,raw:b64e(raw)}))}catch(e){}start(txt)});
      });
    });
  }).catch(function(){msg.textContent='密码不对，再试一次';pw.select()});
}
document.getElementById('lbtn').onclick=unlock;
pw.addEventListener('keydown',function(e){if(e.key==='Enter')unlock()});
window.kbCheckUpdate=function(){
  var t=document.getElementById('toast');if(t){t.textContent='正在检查更新…';t.classList.add('show')}
  Promise.all(['./','index.html','boot.js','app.js','data.enc','sw.js'].map(function(u){return fetch(u,{cache:'reload'})})).then(function(){
    if(navigator.serviceWorker&&navigator.serviceWorker.controller){caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return /^kb737-/.test(k)}).map(function(k){return caches.delete(k)}))}).then(function(){location.reload()})}else location.reload();
  },function(){if(t){t.textContent='没有网络，继续使用本机版本';setTimeout(function(){t.classList.remove('show')},2000)}});
};
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').then(function(r){r.update()}).catch(function(){});
tryCached();
})();
