
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// ---------- 存储（本机浏览器；不可用时只在本次打开期间有效） ----------
const KEY='kb737_v1';let S;
function norm(o){o=o||{};['done','star','notes','ans','cards','shut','edit','del'].forEach(k=>o[k]=o[k]||{});o.recent=o.recent||[];o.mine=o.mine||[];o.fs=o.fs||16;return o}
try{S=norm(JSON.parse(localStorage.getItem(KEY)))}catch(e){S=norm()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
// ---------- 索引 ----------
const SECS=[],CHS=[];
DATA.topics.forEach(tp=>tp.chapters.forEach(c=>{c.tp=tp;CHS.push(c);c.secs.forEach((s,i)=>{s.key=c.id+':'+i;s.ch=c;s.i=i;s.sid=tp.t+'/'+c.t+'/'+s.t;s.h0=s.h;SECS.push(s)})}));
// ---------- 同步（修改和删除存在仓库 sync.enc，所有设备共用） ----------
const REPO='bruse6275-del/737kb',SKEY='kb737_sync',TKEY='kb737_gh';
let SY;try{SY=JSON.parse(localStorage.getItem(SKEY))||{}}catch(e){SY={}}SY.edit=SY.edit||{};SY.del=SY.del||{};
const saveSY=()=>{try{localStorage.setItem(SKEY,JSON.stringify(SY))}catch(e){}};
const ghTok=()=>{try{return localStorage.getItem(TKEY)||''}catch(e){return ''}};
const b64e=u8=>{let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s)};
const b64d=t=>Uint8Array.from(atob(t.replace(/\s/g,'')),c=>c.charCodeAt(0));
async function encS(o){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},window.__kbkey,new TextEncoder().encode(JSON.stringify(o))));const a=new Uint8Array(12+ct.length);a.set(iv);a.set(ct,12);return b64e(a)}
async function decS(t){const b=b64d(t);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b.subarray(0,12)},window.__kbkey,b.subarray(12))))}
async function ghGet(){const h={Accept:'application/vnd.github+json'};const t=ghTok();if(t)h.Authorization='Bearer '+t;
 const r=await fetch(`https://api.github.com/repos/${REPO}/contents/sync.enc?ref=main&x=${Date.now()}`,{headers:h,cache:'no-store'});
 if(r.status===404)return{st:{edit:{},del:{}},sha:null};if(!r.ok)throw new Error('读取同步失败 '+r.status);
 const j=await r.json();return{st:await decS(j.content),sha:j.sha}}
async function syncPull(quiet){try{const {st}=await ghGet();SY={edit:st.edit||{},del:st.del||{}};saveSY();applyEdits();if(!document.querySelector('.doc.editing'))render();if(!quiet)toast('已同步')}catch(e){if(!quiet)toast('同步失败：'+e.message)}}
async function syncPush(mut,msg){const t=ghTok();if(!t){toast('先点左下「☁ 同步」设置一次');return false}
 for(let k=0;k<3;k++){try{const {st,sha}=await ghGet();st.edit=st.edit||{};st.del=st.del||{};mut(st);
  const body={message:msg||'知识库修改',content:await encS(st),branch:'main'};if(sha)body.sha=sha;
  const r=await fetch(`https://api.github.com/repos/${REPO}/contents/sync.enc`,{method:'PUT',headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify(body)});
  if(r.status===409||r.status===422)continue;if(!r.ok)throw new Error(r.status===401||r.status===403?'令牌无效或没有写权限':'HTTP '+r.status);
  SY={edit:st.edit,del:st.del};saveSY();applyEdits();return true}catch(e){toast('同步失败：'+e.message);return false}}
 toast('同步冲突，请重试');return false}
const goneOf=s=>!!(SY.del[s.sid]||SY.del['ch:'+s.ch.tp.t+'/'+s.ch.t]||SY.del['tp:'+s.ch.tp.t]);
function applyEdits(){SECS.forEach(s=>{s.h=SY.edit[s.sid]||s.h0;s.ed=!!SY.edit[s.sid];s.gone=goneOf(s);s.txt=s.h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')})}
applyEdits();
const live=a=>a.filter(s=>!s.gone);
const byKey=k=>SECS.find(s=>s.key===k), myNote=id=>S.mine.find(m=>m.id===id);
const TOPICS=()=>[...new Set([...DATA.topics.map(t=>t.t),...S.mine.map(m=>m.topic).filter(Boolean)])];
let route='home',openCh=new Set(JSON.parse(sessionStorage.getItem('kbopen')||'["t0c0"]'));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),1600)}
const prog=arr=>{arr=live(arr);return[arr.filter(s=>S.done[s.key]).length,arr.length]};
const tpSecs=tp=>tp.chapters.flatMap(c=>c.secs);
// ---------- 侧栏 ----------
function renderNav(){
 let h=`<div class="nv ${route==='home'?'on':''}" data-r="home"><span class="ic">⌂</span>总览</div>`;
 DATA.topics.forEach(tp=>{if(!live(tpSecs(tp)).length)return;const [n,t]=prog(tpSecs(tp));
  h+=`<div><div class="tp ${S.shut[tp.id]?'shut':''}" data-shut="${tp.id}"><span>${tp.icon}</span><b>${esc(tp.t)}</b><span class="pg">${n}/${t} ${S.shut[tp.id]?'▸':'▾'}</span></div><div class="tbody">`;
  tp.chapters.forEach(c=>{if(!live(c.secs).length)return;const [n2,t2]=prog(c.secs);
   h+=`<div class="ch ${openCh.has(c.id)?'open':''}"><div class="nv" data-tog="${c.id}"><span class="ic">${openCh.has(c.id)?'▾':'▸'}</span>${esc(c.t)}<span class="pg">${n2}/${t2}</span></div><div class="secs">`+
   live(c.secs).map(s=>`<div class="nv ${S.done[s.key]?'done':''} ${route===s.key?'on':''}" data-r="${s.key}"><span class="dot"></span>${esc(s.t)}${s.ed?' <span style="color:var(--warn)">✎</span>':''}${S.star[s.key]?' <span style="color:#d99a06">★</span>':''}</div>`).join('')+`</div></div>`});
  if(tp.train)h+=`<div class="nv ${route==='train:'+tp.id?'on':''}" data-r="train:${tp.id}"><span class="ic">✎</span>${esc(tp.train.t)}</div>`;
  h+=`</div></div>`});
 h+=`<div><div class="tp ${S.shut.mine?'shut':''}" data-shut="mine"><span>✐</span><b>我的笔记</b><span class="pg">${S.mine.length} ${S.shut.mine?'▸':'▾'}</span></div><div class="tbody">`+
  S.mine.slice().sort((a,b)=>b.upd-a.upd).map(m=>`<div class="nv ${route==='my:'+m.id?'on':''}" data-r="my:${m.id}"><span class="ic">·</span>${esc(m.title||'未命名')}</div>`).join('')+
  `<div class="nv add" data-r="new"><span class="ic">＋</span>新建笔记</div></div></div>`;
 const open=DATA.questions.filter((_,i)=>!(S.ans[i]&&S.ans[i].done)).length;
 h+=`<div class="grp">工具</div><div class="nv ${route==='cards'?'on':''}" data-r="cards"><span class="ic">⧉</span>闪卡自测<span class="pg">${DATA.cards.length}</span></div>
 <div class="nv ${route==='ask'?'on':''}" data-r="ask"><span class="ic">?</span>待确认问题<span class="pg">${open} 待答</span></div>
 <div class="nv ${route==='marks'?'on':''}" data-r="marks"><span class="ic">★</span>批注与收藏</div>`;
 $('#nav').innerHTML=h;
 const [d,t]=prog(SECS);$('#totbar i').style.width=(d/t*100)+'%';
}
$('#nav').onclick=e=>{const x=e.target.closest('[data-shut],[data-tog],[data-r]');if(!x)return;
 if(x.dataset.shut){const k=x.dataset.shut;S.shut[k]=!S.shut[k];if(!S.shut[k])delete S.shut[k];save();renderNav();return}
 if(x.dataset.tog){const id=x.dataset.tog;openCh.has(id)?openCh.delete(id):openCh.add(id);sessionStorage.setItem('kbopen',JSON.stringify([...openCh]));renderNav();return}
 go(x.dataset.r);document.body.classList.remove('nav')};
function go(r,hl){route=r;history.replaceState(null,'','#'+encodeURIComponent(r));render(hl)}
window.onhashchange=()=>{const r=decodeURIComponent(location.hash.slice(1))||'home';if(r!==route){route=r;render()}};
const setTop=(c,a)=>{$('#crumb').innerHTML=c;$('#acts').innerHTML=a||''};
function render(hl){
 $('#main').scrollTop=0;const r=route;
 if(/^t\d+c\d+:\d+$/.test(r)){const s=byKey(r);s&&!s.gone?secView(s,hl):(route='home',homeView())}
 else if(r.startsWith('train:'))trainView(r.slice(6));
 else if(r.startsWith('my:')){const m=myNote(r.slice(3));m?myView(m,hl):(route='home',homeView())}
 else if(r.startsWith('edit:'))editView(r.slice(5));
 else if(r==='new')editView('');
 else({cards:cardsView,ask:askView,marks:marksView,search:searchView}[r]||homeView)(hl);
 renderNav();const on=$('#nav .on');if(on)on.scrollIntoView({block:'nearest'});
}
// ---------- 阅读 ----------
function secView(s,hl){
 openCh.add(s.ch.id);sessionStorage.setItem('kbopen',JSON.stringify([...openCh]));
 S.recent=[s.key,...S.recent.filter(k=>k!==s.key)].slice(0,8);save();
 const L=live(SECS),i=L.indexOf(s),pv=i>=0?L[i-1]:null,nx=i>=0?L[i+1]:null;
 setTop(`${s.ch.tp.icon} ${esc(s.ch.tp.t)} › ${esc(s.ch.t)} › ${esc(s.t)}`,`<button class="tb star ${S.star[s.key]?'act':''}" id="bStar">${S.star[s.key]?'★ 已收藏':'☆ 收藏'}</button> <button class="tb ${S.done[s.key]?'act':''}" id="bDone">${S.done[s.key]?'✓ 已掌握':'○ 标记掌握'}</button> <button class="tb" id="bEdit">✎ 编辑</button> <button class="tb" id="bDel">🗑 删除 ▾</button>`);
 $('#view').innerHTML=`<div class="ps">${esc(s.ch.tp.t)} › ${esc(s.ch.t)} · 第 ${s.i+1}/${s.ch.secs.length} 节</div><h1 class="pt">${esc(s.t)}</h1>
 ${s.ch.intro?`<details class="intro"><summary>本章依据${s.ch.upd?' · 整理于 '+s.ch.upd:''}</summary>${s.ch.intro}</details>`:'<div style="height:10px"></div>'}
 ${s.ed?'<div class="edtag">✎ 已修改 · <a id="bOrig">恢复原文</a></div>':''}
 <div id="delbar" class="edbar" style="display:none"><span>删除后所有设备同步删除，不能恢复</span><button class="tb" data-del="sec">删除本节</button><button class="tb" data-del="ch">删除整章（${s.ch.secs.length} 节）</button><button class="tb" data-del="tp">删除整个专题</button><button class="tb" data-del="x">取消</button></div>
 <div id="edbar" class="edbar" style="display:none"><span>编辑中：直接在下面改文字，可删段落、删图片</span><button class="tb act" id="eSave">保存</button><button class="tb" id="eCancel">取消</button></div>
 <div class="card doc" id="doc">${s.h}</div>
 <div class="card note"><h4>✐ 我的批注（自动保存）</h4><textarea id="nt" placeholder="写下自己的理解、教员讲的要点、飞行中的体会……">${esc(S.notes[s.key]||'')}</textarea><div class="saved" id="sv"></div></div>
 ${pager(pv&&[pv.key,pv.t],nx&&[nx.key,nx.t])}`;
 bindPager();
 $('#bEdit').onclick=()=>{const d=$('#doc');d.contentEditable='true';d.classList.add('editing');$('#edbar').style.display='flex';$('#bEdit').disabled=true;d.querySelectorAll('details').forEach(x=>x.open=true);d.focus()};
 $('#eCancel').onclick=()=>secView(s);
 $('#eSave').onclick=()=>{const d=$('#doc').cloneNode(true);d.querySelectorAll('img[data-img]').forEach(im=>{im.removeAttribute('src');im.removeAttribute('data-ld');im.removeAttribute('style')});const h=d.innerHTML.trim();
  $('#eSave').disabled=true;$('#eSave').textContent='保存中…';
  syncPush(st=>{if(h===s.h0)delete st.edit[s.sid];else st.edit[s.sid]=h},'修改：'+s.t).then(ok=>{if(ok){toast('已保存，所有设备同步');secView(s);renderNav()}else{$('#eSave').disabled=false;$('#eSave').textContent='保存'}})};
 $('#bDel').onclick=()=>{const b=$('#delbar');b.style.display=b.style.display==='none'?'flex':'none'};
 $$('#delbar [data-del]').forEach(b=>b.onclick=()=>{const k=b.dataset.del;if(k==='x'){$('#delbar').style.display='none';return}
  const id=k==='sec'?s.sid:k==='ch'?'ch:'+s.ch.tp.t+'/'+s.ch.t:'tp:'+s.ch.tp.t,name=k==='sec'?'这一节「'+s.t+'」':k==='ch'?'整章「'+s.ch.t+'」':'整个专题「'+s.ch.tp.t+'」';
  if(!confirm('删除'+name+'？\n所有设备同步删除，不能恢复。'))return;
  syncPush(st=>{st.del[id]=Date.now()},'删除：'+name).then(ok=>{if(!ok)return;toast('已删除');const L=live(SECS);const n2=L.find(x=>SECS.indexOf(x)>SECS.indexOf(s))||L[L.length-1];n2?go(n2.key):go('home')})});
 if($('#bOrig'))$('#bOrig').onclick=()=>{if(!confirm('放弃修改，恢复原文？所有设备同步。'))return;syncPush(st=>{delete st.edit[s.sid]},'恢复原文：'+s.t).then(ok=>{if(ok){toast('已恢复原文');secView(s);renderNav()}})};
 $('#bStar').onclick=()=>{S.star[s.key]?delete S.star[s.key]:S.star[s.key]=1;save();secView(s);renderNav()};
 $('#bDone').onclick=()=>{S.done[s.key]?delete S.done[s.key]:S.done[s.key]=1;save();toast(S.done[s.key]?'已标记掌握':'已取消');secView(s);renderNav()};
 let tm;$('#nt').oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>{e.target.value.trim()?S.notes[s.key]=e.target.value:delete S.notes[s.key];save();$('#sv').textContent='已保存 '+new Date().toTimeString().slice(0,5)},400)};
 if(hl)highlight($('#doc'),hl);
}
const pager=(p,n)=>`<div class="pager"><button ${p?'':'disabled'} data-g="${p?p[0]:''}">← 上一节<b>${p?esc(p[1]):''}</b></button><button class="r" ${n?'':'disabled'} data-g="${n?n[0]:''}">下一节 →<b>${n?esc(n[1]):''}</b></button></div>`;
const bindPager=()=>$$('[data-g]').forEach(b=>b.onclick=()=>go(b.dataset.g));
function highlight(root,term){
 const re=new RegExp(reEsc(term),'i'),w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),ns=[];
 while(w.nextNode())if(re.test(w.currentNode.data))ns.push(w.currentNode);
 ns.forEach(n=>{const sp=document.createElement('span');sp.innerHTML=esc(n.data).replace(new RegExp(reEsc(esc(term)),'gi'),m=>`<mark>${m}</mark>`);n.replaceWith(sp)});
 const f=root.querySelector('mark');if(f){f.classList.add('cur');setTimeout(()=>f.scrollIntoView({block:'center'}),60)}
}
function trainView(id){const tp=DATA.topics.find(t=>t.id===id);if(!tp||!tp.train)return homeView();
 setTop(`${tp.icon} ${esc(tp.t)} › ${esc(tp.train.t)}`);
 $('#view').innerHTML=`<h1 class="pt">${esc(tp.train.t)}</h1><div class="ps">知识点贴在科目旁，点开可看原文</div><iframe id="tf"></iframe>`;$('#tf').srcdoc=tp.train.html}
// ---------- 我的笔记 ----------
function mdLite(t){
 const L=esc(t).split('\n');let h='',ul=0;
 const inl=s=>s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`(.+?)`/g,'<code>$1</code>');
 L.forEach(l=>{const m=l.match(/^\s*[-*•]\s+(.*)/),n=l.match(/^\s*\d+[.、)]\s*(.*)/);
  if(m||n){if(!ul){h+='<ul>';ul=1}h+='<li>'+inl((m||n)[1])+'</li>';return}
  if(ul){h+='</ul>';ul=0}
  if(/^#{1,3}\s/.test(l))h+='<h3>'+inl(l.replace(/^#+\s/,''))+'</h3>';
  else if(/^&gt;\s?/.test(l))h+='<blockquote>'+inl(l.replace(/^&gt;\s?/,''))+'</blockquote>';
  else if(l.trim())h+='<p>'+inl(l)+'</p>'});
 return h+(ul?'</ul>':'');
}
const fmt=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function myView(m,hl){
 setTop(`✐ 我的笔记 › ${esc(m.title||'未命名')}`,`<button class="tb" id="bEd">✎ 编辑</button>`);
 $('#view').innerHTML=`<div class="ps">${m.topic?`<span class="tag">${esc(m.topic)}</span>`:''}创建 ${fmt(m.created)} · 更新 ${fmt(m.upd)}</div><h1 class="pt">${esc(m.title||'未命名')}</h1><div style="height:12px"></div><div class="card doc" id="doc">${mdLite(m.body)||'<p style="color:var(--mute)">（空）</p>'}</div>`;
 $('#bEd').onclick=()=>go('edit:'+m.id);if(hl)highlight($('#doc'),hl);
}
function editView(id){
 const m=myNote(id)||{id:'',title:'',topic:'',body:''};
 setTop(`✐ ${id?'编辑笔记':'新建笔记'}`);
 $('#view').innerHTML=`<div class="card ed"><input id="et" placeholder="标题，例如：单发复飞要点" value="${esc(m.title)}">
 <div class="row"><span style="white-space:nowrap;color:var(--mute);font-size:14px">专题</span><input id="eg" list="tps" placeholder="选已有专题或输入新专题，如：性能、特情、系统" value="${esc(m.topic)}"><datalist id="tps">${TOPICS().map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div>
 <textarea id="eb" placeholder="内容……\n\n支持简单格式：\n- 开头加「- 」是列表\n## 开头是小标题\n**加粗**\n> 开头是引用（原文）">${esc(m.body)}</textarea>
 <div class="hint">建议注明出处，例如「运行总手册 12.12.9」。内容只保存在本机浏览器，记得定期「⇅ 备份」。</div>
 <div class="btns"><button class="btn p" id="es">保存</button><button class="btn" id="ec">取消</button>${id?'<button class="btn w" id="ex" style="margin-left:auto">删除</button>':''}</div></div>`;
 $('#et').focus();
 $('#es').onclick=()=>{const now=Date.now(),v={title:$('#et').value.trim()||'未命名',topic:$('#eg').value.trim(),body:$('#eb').value,upd:now};
  let n=myNote(id);if(n)Object.assign(n,v);else{n=Object.assign({id:'m'+now.toString(36),created:now},v);S.mine.push(n)}save();toast('已保存');go('my:'+n.id)};
 $('#ec').onclick=()=>go(id?'my:'+id:'home');
 if(id)$('#ex').onclick=()=>{if(confirm('删除这条笔记？删除后不能恢复（除非有备份）。')){S.mine=S.mine.filter(x=>x.id!==id);save();toast('已删除');go('home')}};
}
// ---------- 搜索 ----------
let lastQ='';
$('#q').oninput=e=>{lastQ=e.target.value.trim();lastQ?go('search',lastQ):go('home')};
$('#q').onkeydown=e=>{if(e.key==='Enter'){const a=$('.res a');if(a)a.click()}if(e.key==='Escape'){e.target.value='';lastQ='';go('home')}};
function searchView(q){
 q=q||lastQ;if(!q)return homeView();setTop('搜索：'+esc(q));
 const lq=q.toLowerCase(),H=[],cnt=(t)=>t.toLowerCase().split(lq).length-1;
 live(SECS).forEach(s=>{const c=cnt(s.txt)+(s.t.toLowerCase().includes(lq)?5:0);if(c)H.push({k:s.key,where:s.ch.tp.t+' › '+s.ch.t,t:s.t,txt:s.txt,c})});
 S.mine.forEach(m=>{const all=m.title+' '+m.body,c=cnt(all)+(m.title.toLowerCase().includes(lq)?5:0);if(c)H.push({k:'my:'+m.id,where:'我的笔记'+(m.topic?' · '+m.topic:''),t:m.title,txt:m.body.replace(/[#*>`]/g,'').replace(/\s+/g,' '),c:c+2})});
 Object.entries(S.notes).forEach(([k,n])=>{if(n.toLowerCase().includes(lq)){const s=byKey(k);if(s)H.push({k,where:'批注 · '+s.ch.t,t:s.t,txt:n,c:1})}});
 DATA.cards.forEach(c=>{if((c[0]+c[1]).toLowerCase().includes(lq))H.push({k:'cards',where:'闪卡 · '+c[2],t:c[0],txt:c[1],c:0})});
 H.sort((a,b)=>b.c-a.c);
 const snip=t=>{const i=Math.max(0,t.toLowerCase().indexOf(lq)),a=Math.max(0,i-40);return esc((a?'…':'')+t.slice(a,i+q.length+80)).replace(new RegExp(reEsc(esc(q)),'gi'),m=>`<mark>${m}</mark>`)+'…'};
 $('#view').innerHTML=`<h1 class="pt">搜索「${esc(q)}」</h1><div class="ps">${H.length} 条结果 · 回车打开第一条 · Esc 清除</div><div class="card res">${H.map(h=>`<a data-k="${h.k}"><small>${esc(h.where)}</small><b>${esc(h.t)}</b><br><span>${snip(h.txt)}</span></a>`).join('')||'<span style="color:var(--mute)">没有找到，换个说法试试。</span>'}</div>`;
 $$('.res a').forEach(a=>a.onclick=()=>go(a.dataset.k,a.dataset.k==='cards'?'':q));
}
// ---------- 总览 ----------
function homeView(){
 setTop('总览');const [d,t]=prog(SECS),known=Object.values(S.cards).filter(v=>v===2).length,open=DATA.questions.filter((_,i)=>!(S.ans[i]&&S.ans[i].done)).length;
 const rec=S.recent.map(byKey).filter(s=>s&&!s.gone),next=live(SECS).find(s=>!S.done[s.key]);
 const ups=[...CHS.filter(c=>c.upd).map(c=>({d:c.upd,t:c.t,w:c.tp.t,k:c.id+':0'})),...S.mine.map(m=>({d:fmt(m.upd),t:m.title,w:'我的笔记',k:'my:'+m.id}))].sort((a,b)=>b.d.localeCompare(a.d)).slice(0,8);
 $('#view').innerHTML=`<h1 class="pt">737 飞行知识库</h1><div class="ps">按专题整理 · 断网可用 · 进度、批注和自己的笔记保存在本机浏览器 · 版本 ${DATA.built}</div>
 <div class="stat"><div><b>${d}/${t}</b><small>已掌握小节</small></div><div><b>${known}/${DATA.cards.length}</b><small>闪卡记住</small></div><div><b>${S.mine.length}</b><small>我的笔记</small></div><div><b style="color:var(--warn)">${open}</b><small>待确认问题</small></div></div>
 ${next?`<div class="card" style="display:flex;align-items:center;gap:14px;cursor:pointer" data-k="${next.key}"><div style="font-size:26px">▶</div><div><small style="color:var(--mute)">继续学习</small><br><b>${esc(next.ch.tp.t)} › ${esc(next.ch.t)} › ${esc(next.t)}</b></div></div>`:''}
 ${DATA.topics.map(tp=>`<h3 style="margin:22px 0 10px">${tp.icon} ${esc(tp.t)} <small style="color:var(--mute);font-weight:400;font-size:13px">${esc(tp.sub)}</small></h3><div class="grid">`+
   tp.chapters.map(c=>{const [n,t]=prog(c.secs);return `<div class="tile" data-k="${c.id}:0"><b>${esc(c.t)}</b><small>${t} 节${c.upd?' · '+c.upd:''}</small><div class="bar"><i style="width:${n/t*100}%"></i></div></div>`}).join('')+
   (tp.train?`<div class="tile" data-k="train:${tp.id}"><b>✎ ${esc(tp.train.t)}</b><small>原文可展开</small></div>`:'')+`</div>`).join('')}
 <h3 style="margin:22px 0 10px">✐ 我的笔记</h3><div class="grid">${S.mine.slice().sort((a,b)=>b.upd-a.upd).slice(0,5).map(m=>`<div class="tile" data-k="my:${m.id}"><b>${esc(m.title)}</b><small>${m.topic?esc(m.topic)+' · ':''}${fmt(m.upd)}</small></div>`).join('')}<div class="tile" data-k="new" style="border-style:dashed;text-align:center"><span class="ic">＋</span><b>新建笔记</b><small>任何专题都可以记</small></div></div>
 <div class="grid" style="margin-top:16px"><div class="card list"><b>最近更新</b>${ups.map(u=>`<a data-k="${u.k}">${esc(u.t)}<small>${esc(u.w)} · ${u.d}</small></a>`).join('')}</div>
 <div class="card list"><b>最近看过</b>${rec.map(s=>`<a data-k="${s.key}">${esc(s.t)}<small>${esc(s.ch.t)}</small></a>`).join('')||'<p style="color:var(--mute)">还没有</p>'}</div></div>
 <p style="color:var(--mute);font-size:13px">快捷键：<b>/</b> 搜索　<b>← →</b> 翻节　<b>M</b> 标记掌握　<b>S</b> 收藏　<b>N</b> 新建笔记</p>`;
 $$('#view [data-k]').forEach(a=>a.onclick=()=>go(a.dataset.k));
}
// ---------- 闪卡 ----------
let deck=[],ci=0,cf=sessionStorage.getItem('kbcf')||'';
function cardsView(mode){
 setTop('闪卡自测');
 if(mode||!deck.length){let all=DATA.cards.map((c,i)=>i).filter(i=>!cf||DATA.cards[i][2]===cf);if(mode==='weak')all=all.filter(i=>S.cards[i]!==2);if(mode==='shuf')all.sort(()=>Math.random()-.5);deck=all.length?all:DATA.cards.map((c,i)=>i);ci=0}
 const i=deck[ci],c=DATA.cards[i],k=Object.values(S.cards).filter(v=>v===2).length,tps=[...new Set(DATA.cards.map(c=>c[2]))];
 $('#view').innerHTML=`<h1 class="pt">闪卡自测</h1><div class="ps">${tps.length>1?`<select class="sel" id="cfs"><option value="">全部专题</option>${tps.map(t=>`<option ${t===cf?'selected':''}>${esc(t)}</option>`).join('')}</select> `:''}第 ${ci+1}/${deck.length} 张 · 已记住 ${k}/${DATA.cards.length} <span class="tag">${esc(c[2])}</span>${S.cards[i]===2?'<span class="pill ok">记住了</span>':S.cards[i]===1?'<span class="pill">再看看</span>':''}</div>
 <div class="fc" id="fc"><div class="in"><div class="f">${esc(c[0])}</div><div class="b">${esc(c[1])}</div></div></div>
 <div class="btns"><button class="btn" id="cp">← 上一张</button><button class="btn w" id="c1">再看看</button><button class="btn g" id="c2">记住了 ✓</button><button class="btn" id="cn">下一张 →</button></div>
 <div class="btns" style="margin-top:14px"><button class="btn" id="cs">⤮ 打乱</button><button class="btn" id="cw">只练没记住的</button><button class="btn" id="ca">全部</button><button class="btn" id="cr">清空记录</button></div>`;
 const fc=$('#fc');fc.onclick=()=>fc.classList.toggle('flip');const mv=d=>{ci=(ci+d+deck.length)%deck.length;cardsView()};
 $('#cp').onclick=()=>mv(-1);$('#cn').onclick=()=>mv(1);$('#c1').onclick=()=>{S.cards[i]=1;save();mv(1)};$('#c2').onclick=()=>{S.cards[i]=2;save();mv(1)};
 $('#cs').onclick=()=>cardsView('shuf');$('#cw').onclick=()=>cardsView('weak');$('#ca').onclick=()=>cardsView('all');
 $('#cr').onclick=()=>{if(confirm('清空闪卡记录？')){S.cards={};save();cardsView('all')}};
 if($('#cfs'))$('#cfs').onchange=e=>{cf=e.target.value;sessionStorage.setItem('kbcf',cf);cardsView('all')};
}
// ---------- 待确认 ----------
function askView(){
 setTop('待确认问题');const tps=[...new Set(DATA.questions.map(q=>q[2]))];
 $('#view').innerHTML=`<h1 class="pt">待确认问题</h1><div class="ps">收到答复就记在这里，勾选「已答复」后会从待办数里扣掉</div>`+tps.map(tp=>`<h3>${esc(tp)}</h3>`+DATA.questions.map((q,i)=>[q,i]).filter(([q])=>q[2]===tp).map(([q,i])=>{const a=S.ans[i]||{};return `<div class="card qq ${a.done?'done':''}"><b>${esc(q[0])}</b>${a.done?'<span class="pill ok">已答复</span>':'<span class="pill">待答</span>'}<div class="src">相关：${esc(q[1])}</div><textarea data-i="${i}" placeholder="答复内容 / 答复人 / 日期">${esc(a.t||'')}</textarea><label><input type="checkbox" data-d="${i}" ${a.done?'checked':''}> 已答复</label></div>`}).join('')).join('')+
 `<div class="btns"><button class="btn p" id="cpy">复制未答复的问题清单</button></div>`;
 $$('.qq textarea').forEach(t=>t.oninput=()=>{const i=t.dataset.i;S.ans[i]=Object.assign(S.ans[i]||{},{t:t.value});save()});
 $$('[data-d]').forEach(c=>c.onchange=()=>{const i=c.dataset.d;S.ans[i]=Object.assign(S.ans[i]||{},{done:c.checked});save();askView();renderNav()});
 $('#cpy').onclick=()=>{const L=DATA.questions.filter((_,i)=>!(S.ans[i]&&S.ans[i].done));const t='以下问题请技术室帮忙确认：\n'+L.map((q,i)=>`${i+1}. ${q[0]}（${q[1]}）`).join('\n');
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast('已复制'),()=>prompt('复制下面的内容：',t))};
}
// ---------- 批注与收藏 ----------
function marksView(){
 setTop('批注与收藏');const ns=Object.entries(S.notes).map(([k,n])=>[byKey(k),n]).filter(x=>x[0]),st=Object.keys(S.star).map(byKey).filter(Boolean);
 $('#view').innerHTML=`<h1 class="pt">批注与收藏</h1><div class="ps">${ns.length} 条批注 · ${st.length} 个收藏</div>`+
 `<div class="card list"><b>★ 收藏</b>${st.map(s=>`<a data-k="${s.key}">${esc(s.t)}<small>${esc(s.ch.tp.t)} › ${esc(s.ch.t)}</small></a>`).join('')||'<p style="color:var(--mute)">在任一小节点「☆ 收藏」</p>'}</div>`+
 (ns.map(([s,n])=>`<div class="card"><a style="cursor:pointer;color:var(--acc)" data-k="${s.key}">${esc(s.ch.t)} › ${esc(s.t)} →</a><p style="white-space:pre-wrap;margin:8px 0 0">${esc(n)}</p></div>`).join('')||'<div class="card" style="color:var(--mute)">还没有批注。在任一小节底部写下自己的理解，会自动汇总到这里。</div>');
 const eds=SECS.filter(x=>x.ed&&!x.gone);
 $('#view').insertAdjacentHTML('beforeend',`<div class="card list"><b>✎ 修改过的小节</b>${eds.map(x=>`<a data-k="${x.key}">${esc(x.t)}<small>${esc(x.ch.tp.t)} › ${esc(x.ch.t)}</small></a>`).join('')||'<p style="color:var(--mute)">在任一小节点「✎ 编辑」可直接修改内容</p>'}</div>
`);
 $$('#view [data-k]').forEach(a=>a.onclick=()=>go(a.dataset.k));
}
// ---------- 设置 / 备份 ----------
function applyPrefs(){document.body.classList.toggle('dark',!!S.dark);document.documentElement.style.setProperty('--fs',S.fs+'px')}
$('#bSync').onclick=()=>{const t=ghTok();
 const v=prompt((t?'已设置同步。\n留空直接点确定 = 立即同步；输入新令牌 = 更换；输入 off = 本机停用。':'设置同步（每台设备一次）：\n在 GitHub 网页 Settings › Developer settings › Fine-grained tokens 新建令牌，仓库只选 737kb，权限 Contents 选 Read and write，复制后粘贴到这里。\n不设置也能看到别的设备的删除和修改，但本机不能删改。')+'\n','');
 if(v===null)return;const x=v.trim();if(x==='off'){localStorage.removeItem(TKEY);toast('本机已停用同步写入');return}
 if(x){localStorage.setItem(TKEY,x)}syncPull()};
$('#bTheme').onclick=()=>{S.dark=!S.dark;save();applyPrefs()};
$('#bFont').onclick=()=>{S.fs=S.fs>=19?14:S.fs+1;save();applyPrefs();toast('字号 '+S.fs)};
$('#bData').onclick=()=>{
 if(confirm('确定 = 导出备份（进度、批注、我的笔记、答复）\n取消 = 从备份文件恢复')){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));a.download='737知识库备份_'+fmt(Date.now())+'.json';a.click();toast('已导出')
 }else $('#imp').click()};
$('#imp').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{S=norm(JSON.parse(t))}catch(x){return toast('文件不对')}save();applyPrefs();go('home');toast('已恢复')});e.target.value=''};
$('#menu').onclick=()=>document.body.classList.toggle('nav');$('#mask').onclick=()=>document.body.classList.remove('nav');
document.addEventListener('keydown',e=>{
 if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)||e.metaKey||e.ctrlKey)return;
 const k=e.key.toLowerCase();
 if(k==='/'){e.preventDefault();$('#q').focus();return}
 if(k==='n'){go('new');e.preventDefault();return}
 if(route==='cards'){if(k===' '){e.preventDefault();$('#fc').classList.toggle('flip')}if(k==='arrowright')$('#cn').click();if(k==='arrowleft')$('#cp').click();return}
 const s=byKey(route);if(s){const L=live(SECS),i=L.indexOf(s);if(k==='arrowright'&&L[i+1])go(L[i+1].key);if(k==='arrowleft'&&i>0)go(L[i-1].key);if(k==='m')$('#bDone').click();if(k==='s')$('#bStar').click()}
});
const LZ={};function lazyImg(h){if(LZ[h])return LZ[h];return LZ[h]=fetch('i/'+h+'.bin').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(b,0,12)},window.__kbkey,new Uint8Array(b,12))).then(p=>URL.createObjectURL(new Blob([p],{type:'image/jpeg'}))).catch(e=>{delete LZ[h];throw e})}
const IO=('IntersectionObserver' in window)?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){IO.unobserve(e.target);loadLz(e.target)}}),{rootMargin:'1200px 0px'}):null;
function loadLz(i){const v=DATA.imgs[i.dataset.img]||'';lazyImg(v.slice(1)).then(u=>{i.src=u;i.style.minHeight=''},()=>{i.alt='截图需联网加载';delete i.dataset.ld})}
function fillImgs(){$$('#view img[data-img]').forEach(i=>{if(i.dataset.ld)return;const v=DATA.imgs[i.dataset.img]||'';if(v[0]==='@'){i.dataset.ld=1;i.alt='截图加载中…';i.style.minHeight='120px';if(IO)IO.observe(i);else loadLz(i)}else if(!i.src||i.src===location.href){i.src=v}})}
new MutationObserver(fillImgs).observe(document.getElementById('view'),{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('.doc.editing'))return;const i=e.target.closest('.doc img[data-img],.doc details.orig img');if(i){$('#zimg').src=i.src;$('#zoom').style.display='block'}else if(e.target.closest('#zoom'))$('#zoom').style.display='none'});
applyPrefs();route=decodeURIComponent(location.hash.slice(1))||'home';if(route==='search')route='home';render();
setTimeout(()=>syncPull(true),300);
