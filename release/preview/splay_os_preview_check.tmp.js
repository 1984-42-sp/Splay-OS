
const STORAGE_KEY='splay_os_state_v5_preview_spatial';
const SOURCE_STORAGE_KEY='splay_os_state_v5';
const LEGACY_KEYS=['splay_os_state_v4','splay_os_state_v3','splay_os_state_v2','splay_os_state_v1'];
function uid(p){return p+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}
function nowStr(){return new Date().toLocaleString('ja-JP',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function esc(s){const d=document.createElement('div');d.textContent=s??'';return d.innerHTML}
const labels={note:'Note',memo:'Memo',decision:'Decision',task:'Task',meeting:'Meeting',file:'File / Link'};
const tagCls={note:'tag-note',memo:'tag-memo',decision:'tag-decision',task:'tag-task',meeting:'tag-meeting',file:'tag-file'};
const SHAPE_PALETTE={decision:'rounded',task:'rounded',note:'rounded',memo:'circle',meeting:'rounded',file:'rounded'};
const DEFAULT_RADIUS=50;
const ACCENT_COLORS={mint:{name:'Mint',c:'130,232,184'},cyan:{name:'Cyan',c:'126,217,238'},purple:{name:'Purple',c:'184,168,238'},amber:{name:'Amber',c:'233,201,136'},rose:{name:'Rose',c:'236,154,154'},green:{name:'Green',c:'140,216,150'},blue:{name:'Blue',c:'120,170,230'}};
const WS_ICON_DEFAULTS={Command:'🏠',Strategy:'📈',Meeting:'🤝',Finance:'💰',Research:'🔬',Vault:'🔒'};
const WS_ACCENT_DEFAULTS={Command:'mint',Strategy:'cyan',Meeting:'purple',Finance:'amber',Research:'rose',Vault:'green'};
const ICON_PRESETS=['🏠','📈','🤝','💰','🔬','🔒','🪐','✦','🌙','🌊','🔥','🌿','📦','🧭'];
const decisionStatuses=['未検討','検討中','仮決定','決定','保留','却下'];
const taskStatuses=['TODO','Doing','Waiting','Blocked','Done'];
/* === v0.6.3 Connection / Anchor Editor: additive constants === */
const CONNECTION_TYPES={
  related:{label:'Related',color:'126,217,238',dash:''},
  evidence:{label:'Evidence',color:'130,232,184',dash:''},
  task:{label:'Task',color:'184,168,238',dash:''},
  risk:{label:'Risk',color:'236,154,154',dash:'7,6'},
  decision:{label:'Decision',color:'233,201,136',dash:''},
  file:{label:'File',color:'120,170,230',dash:'2,5'},
  memo:{label:'Memo',color:'244,239,223',dash:''}
};
const CONNECTION_TYPE_KEYS=Object.keys(CONNECTION_TYPES);
const ANCHOR_KEYS=['auto','top','right','bottom','left','center'];
const IMPORTANCE_LEVELS=['低','中','高','最重要'];
const IMPORTANCE_CLASS={'低':'imp-low','中':'imp-mid','高':'imp-high','最重要':'imp-critical'};
const NODE_FIELD_DEFINITIONS={
  note:[{key:'body',label:'Body',kind:'multiline'},{key:'memo',label:'Memo',kind:'multiline'}],
  memo:[{key:'body',label:'Memo',kind:'multiline'}],
  decision:[{key:'theme',label:'Theme',kind:'text'},{key:'status',label:'Status',kind:'status'},{key:'importance',label:'Importance',kind:'chip'},{key:'hypothesis',label:'Hypothesis',kind:'multiline'},{key:'evidence',label:'Evidence',kind:'multiline'},{key:'pros',label:'Pros',kind:'multiline'},{key:'cons',label:'Cons',kind:'multiline'},{key:'risk',label:'Risk',kind:'multiline'},{key:'decision',label:'Decision',kind:'multiline'},{key:'nextCheck',label:'Next Check',kind:'multiline'},{key:'memo',label:'Memo',kind:'multiline'}],
  task:[{key:'name',label:'Task Name',kind:'text'},{key:'status',label:'Status',kind:'status'},{key:'importance',label:'Importance',kind:'chip'},{key:'owner',label:'Owner',kind:'text'},{key:'due',label:'Due',kind:'date'},{key:'memo',label:'Memo',kind:'multiline'}],
  meeting:[{key:'meetingName',label:'Meeting Name',kind:'text'},{key:'date',label:'Date',kind:'date'},{key:'agenda',label:'Agenda',kind:'multiline'},{key:'notes',label:'Notes',kind:'multiline'},{key:'decisions',label:'Decisions',kind:'multiline'},{key:'pending',label:'Pending',kind:'multiline'},{key:'nextActions',label:'Next Actions',kind:'multiline'},{key:'memo',label:'Memo',kind:'multiline'}],
  file:[{key:'name',label:'Name',kind:'text'},{key:'url',label:'URL / Path',kind:'url'},{key:'memo',label:'Memo',kind:'multiline'}]
};
function normalizeShape(shape){return shape==='circle'?'circle':'rounded'}
function ensureNodeShape(n){
  if(!n)return 'rounded';
  n.shape=normalizeShape(n.shape);
  if(typeof n.radius!=='number'||!Number.isFinite(n.radius))n.radius=DEFAULT_RADIUS;
  return n.shape;
}
function defaultPresentation(){return{titleVisible:true,hiddenFields:[],fieldLabels:{},fieldOrder:[]}}
function ensureNodePresentation(n){
  if(!n)return defaultPresentation();
  if(!n.presentation||typeof n.presentation!=='object')n.presentation={};
  const p=n.presentation;
  if(typeof p.titleVisible!=='boolean')p.titleVisible=true;
  if(!Array.isArray(p.hiddenFields))p.hiddenFields=[];
  if(!p.fieldLabels||typeof p.fieldLabels!=='object'||Array.isArray(p.fieldLabels))p.fieldLabels={};
  if(!Array.isArray(p.fieldOrder))p.fieldOrder=[];
  return p;
}
function fieldDefsFor(n){return NODE_FIELD_DEFINITIONS[n?.type]||[]}
function orderedFieldDefs(n){const defs=fieldDefsFor(n),keys=defs.map(d=>d.key),p=ensureNodePresentation(n);const order=p.fieldOrder.filter(k=>keys.includes(k));keys.forEach(k=>{if(!order.includes(k))order.push(k)});return order.map(k=>defs.find(d=>d.key===k)).filter(Boolean)}
function fieldHidden(n,key){return ensureNodePresentation(n).hiddenFields.includes(key)}
function fieldDisplayLabel(n,def){const custom=ensureNodePresentation(n).fieldLabels[def.key];return custom&&custom.trim()?custom.trim():def.label}
function fieldIsEmpty(v){return v==null||String(v).trim()===''}
function renderSurfaceValue(def,value){const text=String(value??'');if(def.kind==='url'&&text.trim()){const safe=esc(text.trim());return `<a href="${safe}" target="_blank">${safe}</a>`}if(def.kind==='multiline')return `<div class="surface-pre">${esc(text)}</div>`;return esc(text)}
let zTop=200;
function defaultState(){
  const wsNames=['Command','Strategy','Meeting','Finance','Research','Vault']; const ws={}; wsNames.forEach(n=>ws[n]=uid('ws'));
  const nodes=[]; const dts=['出店エリア','家賃上限','店舗面積','想定客単価','ソンス風再現度','駐車場要否','金融機関説明方針','候補物件絞り込み条件'];
  dts.forEach((t,i)=>nodes.push({id:uid('node'),type:'decision',workspaceId:ws.Strategy,title:t,x:620+(i%4)*330,y:520+Math.floor(i/4)*230,w:260,h:130,shape:SHAPE_PALETTE.decision,radius:DEFAULT_RADIUS,z:10+i,links:[],connections:[],createdAt:Date.now(),updatedAt:Date.now(),data:{theme:t,status:'未検討',importance:'中',hypothesis:'',evidence:'',pros:'',cons:'',risk:'',decision:'',nextCheck:'',memo:''}}));
  ['次回会議で家賃上限を決める','候補物件を10件に絞る','ソンス風カフェの参考写真を集める','金融機関向け説明資料の骨子を作る'].forEach((t,i)=>nodes.push({id:uid('node'),type:'task',workspaceId:ws.Strategy,title:t,x:720+(i%2)*360,y:1080+Math.floor(i/2)*210,w:260,h:126,shape:SHAPE_PALETTE.task,radius:DEFAULT_RADIUS,z:30+i,links:[],connections:[],createdAt:Date.now(),updatedAt:Date.now(),data:{name:t,status:'TODO',owner:'',due:'',importance:'中',memo:''}}));
  [{name:'物件統合マップ',url:'all_properties_map.html'},{name:'事業計画・融資向け分析レポート',url:'cafe_business_analysis_report.html'},{name:'営業シミュレーション一覧',url:'simulation_index.html'},{name:'カフェ事業ダッシュボード',url:'cafe_business_dashboard.html'}].forEach((f,i)=>nodes.push({id:uid('node'),type:'file',workspaceId:ws.Vault,title:f.name,x:650+(i%2)*360,y:560+Math.floor(i/2)*220,w:260,h:126,shape:SHAPE_PALETTE.file,radius:DEFAULT_RADIUS,z:50+i,links:[],connections:[],createdAt:Date.now(),updatedAt:Date.now(),data:{name:f.name,url:f.url,memo:''}}));
  return {version:'0.6.4',mode:'home',workspaces:Object.entries(ws).map(([name,id])=>({id,name,description:'',icon:WS_ICON_DEFAULTS[name]||'🪐',accentColor:WS_ACCENT_DEFAULTS[name]||'cyan'})),activeWorkspaceId:ws.Strategy,activeNodeId:null,nodes,groups:[],view:{x:-360,y:-290,scale:1},todayFocus:'会議で決める論点を絞り、根拠と未決事項を見える状態にする',logs:[{id:uid('log'),time:nowStr(),text:'Splay OS v0.6.4 Selection / Group Engine 初期化'}],ui:{splayOrb:{x:28,y:null,bottom:28},workspaceOrb:{x:null,y:null,right:28,bottom:28},detailPanel:{}},vaultUnlocked:false,vaultPassword:'1234'};
}
function migrate(st){
  if(!st||!st.workspaces||!st.nodes)return defaultState();
  st.version='0.6.4'; st.view=st.view||{x:-360,y:-290,scale:1}; st.mode=st.mode||'home'; st.ui=st.ui||{};
  st.ui.splayOrb=st.ui.splayOrb||{x:28,bottom:28}; st.ui.workspaceOrb=st.ui.workspaceOrb||{right:28,bottom:28};
  ['minimap','detailPanel'].forEach(k=>{st.ui[k]=st.ui[k]||{}});
  st.workspaces.forEach(ws=>{
    if(typeof ws.description!=='string')ws.description='';
    if(typeof ws.icon!=='string'||!ws.icon.trim())ws.icon=WS_ICON_DEFAULTS[ws.name]||'🪐';
    if(typeof ws.accentColor!=='string'||!ACCENT_COLORS[ws.accentColor])ws.accentColor=WS_ACCENT_DEFAULTS[ws.name]||'cyan';
  });
  st.nodes.forEach((n,i)=>{
    if(typeof n.x!=='number')n.x=520+(i%4)*330; if(typeof n.y!=='number')n.y=520+Math.floor(i/4)*220; if(typeof n.z!=='number')n.z=10+i; if(!Array.isArray(n.links))n.links=[]; if(!n.data)n.data={};
    if(n.type==='file'&&n.data.memo==null)n.data.memo=''; if(n.type==='decision'&&n.data.memo==null)n.data.memo=''; if(n.type==='note'&&n.data.memo==null)n.data.memo=''; if(n.type==='memo'&&n.data.body==null)n.data.body=''; if(!n.w)n.w=260; if(!n.h)n.h=n.type==='memo'?118:126; if(!n.shape)n.shape='rounded'; if(typeof n.radius!=='number'||!Number.isFinite(n.radius))n.radius=DEFAULT_RADIUS; if(!n.links)n.links=[];
    /* v0.6.3 additive migration: connections[] + Task importance */
    if(!Array.isArray(n.connections))n.connections=[];
    n.connections.forEach(c=>{
      if(!c.id)c.id=uid('conn');
      if(!CONNECTION_TYPES[c.type])c.type='related';
      if(typeof c.label!=='string')c.label='';
      if(!ANCHOR_KEYS.includes(c.fromAnchor))c.fromAnchor='auto';
      if(!ANCHOR_KEYS.includes(c.toAnchor))c.toAnchor='auto';
      if(typeof c.style!=='string')c.style='';
    });
    if(n.type==='task'&&!IMPORTANCE_LEVELS.includes(n.data.importance))n.data.importance='中';
    if(n.type==='task'&&n.data.due==null)n.data.due=''; ensureNodeShape(n); ensureNodePresentation(n);
  });
  /* v0.6.4 additive migration: groups[] */
  if(!Array.isArray(st.groups))st.groups=[];
  st.groups=st.groups.filter(g=>Array.isArray(g.nodeIds)&&g.nodeIds.length>0);
  st.groups.forEach(g=>{
    if(!g.id)g.id=uid('grp');
    if(!Array.isArray(g.nodeIds))g.nodeIds=[];
    if(typeof g.name!=='string')g.name='Group';
    if(typeof g.workspaceId!=='string')g.workspaceId='';
  });
  return st;
}
function load(){try{let raw=localStorage.getItem(STORAGE_KEY);if(raw)return migrate(JSON.parse(raw));raw=localStorage.getItem(SOURCE_STORAGE_KEY);if(raw){const cloned=migrate(JSON.parse(raw));localStorage.setItem(STORAGE_KEY,JSON.stringify(cloned));return cloned}for(const k of LEGACY_KEYS){raw=localStorage.getItem(k);if(raw){const migrated=migrate(JSON.parse(raw));localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));return migrated}}return defaultState()}catch(e){return defaultState()}}
let state=load();
if(Array.isArray(state.nodes))state.nodes.forEach(n=>{ensureNodeShape(n);ensureNodePresentation(n)});
state.selectedNodeIds=new Set(); /* v0.6.4: runtime-only, not persisted */
function save(flash=false){const toSave={...state};delete toSave.selectedNodeIds;localStorage.setItem(STORAGE_KEY,JSON.stringify(toSave)); if(flash){const el=document.getElementById('saveState');el.textContent='preview saved · '+nowStr();setTimeout(()=>el.textContent='preview localStorage · autosaved',1300)}}
function log(text){state.logs.unshift({id:uid('log'),time:nowStr(),text}); if(state.logs.length>300)state.logs.pop(); save(); renderLog()}
function count(){let decided=0,considering=0,pending=0,open=0;state.nodes.forEach(n=>{if(n.type==='decision'){if(['決定','仮決定'].includes(n.data.status))decided++;else if(n.data.status==='検討中')considering++;else if(n.data.status==='保留')pending++} if(n.type==='task'&&n.data.status!=='Done')open++});return{decided,considering,pending,open}}
function activeWs(){return state.workspaces.find(w=>w.id===state.activeWorkspaceId)||state.workspaces[0]}
function openWorkspace(id){state.activeWorkspaceId=id;state.mode='workspace';state.activeNodeId=null;closeShapeInspector();save();render();log('Workspaceを開く: '+(activeWs()?.name||''))}
function closeWorkspace(){state.mode='home';state.activeNodeId=null;closeShapeInspector();save();render();}
function addWorkspace(){const name=prompt('Workspace名');if(!name)return;const ws={id:uid('ws'),name:name.trim(),description:'',icon:'🪐',accentColor:'cyan'};state.workspaces.push(ws);state.activeWorkspaceId=ws.id;state.mode='workspace';log('Workspace Created: '+ws.name);save();render()}
function deleteWorkspace(id){
  const ws=state.workspaces.find(w=>w.id===id);
  if(!ws)return;
  showConfirm('「'+ws.name+'」を削除しますか？\nWorkspace内のNodeもすべて削除されます。この操作は元に戻せません。',()=>{
    state.nodes=state.nodes.filter(n=>n.workspaceId!==id);
    state.workspaces=state.workspaces.filter(w=>w.id!==id);
    state.activeWorkspaceId=state.workspaces[0]?.id||null;
    state.mode='home';
    state.activeNodeId=null;
    closeShapeInspector();
    closeWorkspaceSettings();
    document.getElementById('detailPanel').classList.remove('show');
    log('Workspace Deleted: '+ws.name);
    save();render();
  });
}
function createNode(type){const ws=activeWs(); if(!ws){addWorkspace();return} const center=screenToCanvas(innerWidth/2,innerHeight/2); const data={note:{body:'',memo:''},memo:{body:''},decision:{theme:'',status:'未検討',importance:'中',hypothesis:'',evidence:'',pros:'',cons:'',risk:'',decision:'',nextCheck:'',memo:''},task:{name:'',status:'TODO',owner:'',due:'',importance:'中',memo:''},meeting:{meetingName:'',date:'',agenda:'',notes:'',decisions:'',pending:'',nextActions:'',memo:''},file:{name:'',url:'',memo:''}}[type]; const n={id:uid('node'),type,workspaceId:ws.id,title:type==='memo'?'Memo':'新しい'+labels[type],x:center.x-130+Math.random()*80,y:center.y-70+Math.random()*80,w:type==='memo'?220:260,h:type==='memo'?118:126,shape:SHAPE_PALETTE[type]||'rounded',radius:DEFAULT_RADIUS,z:++zTop,links:[],connections:[],createdAt:Date.now(),updatedAt:Date.now(),data,presentation:defaultPresentation()}; state.nodes.push(n); state.activeNodeId=n.id; log('Node追加: ['+labels[type]+'] '+n.title); save(); render(); openDetail(n.id)}
function activeNodes(){const ws=activeWs();return state.nodes.filter(n=>n.workspaceId===ws?.id)}
function nodeTitle(n){if(n.type==='decision')return n.data.theme||n.title;if(n.type==='task')return n.data.name||n.title;if(n.type==='meeting')return n.data.meetingName||n.title;if(n.type==='file')return n.data.name||n.title;if(n.type==='memo')return (n.data.body||'Memo').split('\n')[0].slice(0,28)||'Memo';return n.title}
function nodeIdentityTitle(n){
  if(!n)return 'Node';
  const title=String(n.title||'').trim();
  if(title)return title;
  if(n.type==='memo'){
    const firstLine=String(n.data?.body||'').split('\n')[0].trim().slice(0,48);
    if(firstLine)return firstLine;
    return 'Memo';
  }
  return labels[n.type]||'Node';
}
function openDetail(id){state.activeNodeId=id; const n=state.nodes.find(x=>x.id===id); if(n){n.z=++zTop;ensureNodePresentation(n)} nodeSurfaceMode='view';setNodeSurfaceFocus(false,false); save(); renderNodes(); renderLinks(); renderDetail(); showDetailPanel()}
function closeDetail(){const p=document.getElementById('detailPanel');if(p)p.classList.remove('show','surface-focus','surface-view-mode','surface-edit-mode','focus-array-active','focus-console-active');nodeSurfaceFocused=false;document.body.classList.remove('surface-focus-active','focus-array-active','focus-console-active');hideNodeProjection();state.activeNodeId=null;closeShapeInspector();save();renderNodes();renderLinks()}
function deleteActiveNode(){if(!state.activeNodeId)return; const n=state.nodes.find(x=>x.id===state.activeNodeId); if(!n||!confirm('「'+nodeTitle(n)+'」を削除しますか？'))return; state.nodes.forEach(x=>{x.links=(x.links||[]).filter(id=>id!==n.id); if(Array.isArray(x.connections))x.connections=x.connections.filter(c=>c.targetId!==n.id)}); state.nodes=state.nodes.filter(x=>x.id!==n.id); log('Node削除: '+nodeTitle(n)); state.activeNodeId=null; closeShapeInspector(); save(); render();}
function updateNode(id,key,val,isTitle=false){const n=state.nodes.find(x=>x.id===id);if(!n)return;if(isTitle)n.title=val;else n.data[key]=val;n.updatedAt=Date.now();save();renderNodes();renderLinks();renderMinimap()}
function changeStatus(id,val){const n=state.nodes.find(x=>x.id===id);if(!n)return;const old=n.data.status;n.data.status=val;n.updatedAt=Date.now();if(old!==val)log('ステータス変更: '+nodeTitle(n)+' '+old+' → '+val);save();renderNodes();renderDetail();renderHome()}
function toggleTaskDone(id,e){e.stopPropagation();const n=state.nodes.find(x=>x.id===id);if(!n)return;const old=n.data.status;n.data.status=old==='Done'?'TODO':'Done';n.updatedAt=Date.now();log((n.data.status==='Done'?'タスク完了: ':'タスク未完了へ戻す: ')+nodeTitle(n));save();render();}
function showConfirm(message,onConfirm){
  document.getElementById('confirmMessage').textContent=message;
  const modal=document.getElementById('confirmModal');
  modal.classList.add('show');
  touchFloat(modal);
  const ok=document.getElementById('confirmOk');
  const cancel=document.getElementById('confirmCancel');
  const cleanup=()=>{modal.classList.remove('show');ok.onclick=null;cancel.onclick=null};
  ok.onclick=()=>{cleanup();onConfirm()};
  cancel.onclick=()=>{cleanup()};
}
function closeConfirm(){document.getElementById('confirmModal').classList.remove('show')}

let wsSettingsId=null;
function openWorkspaceSettings(id){
  const ws=state.workspaces.find(w=>w.id===id)||activeWs();
  if(!ws)return;
  wsSettingsId=ws.id;
  renderWorkspaceSettingsBody();
  const panel=document.getElementById('wsSettingsPanel');
  panel.classList.add('show');
  touchFloat(panel);
}
function closeWorkspaceSettings(){wsSettingsId=null;document.getElementById('wsSettingsPanel').classList.remove('show')}
function renderWorkspaceSettingsBody(){
  const ws=state.workspaces.find(w=>w.id===wsSettingsId);
  const body=document.getElementById('wsSettingsBody');
  if(!ws){body.innerHTML='<p class="hint">Workspaceが選択されていません。</p>';return}
  body.innerHTML=`
    <label>Workspace Name</label>
    <input value="${esc(ws.name)}" oninput="liveSetWorkspaceField('${ws.id}','name',this.value)" onchange="commitWorkspaceField('${ws.id}','name',this.value,'Workspace Renamed')">
    <label>Description</label>
    <textarea placeholder="このWorkspaceの目的やメモ…" oninput="liveSetWorkspaceField('${ws.id}','description',this.value)" onchange="commitWorkspaceField('${ws.id}','description',this.value,'Workspace Description Updated')">${esc(ws.description||'')}</textarea>
    <label>Icon</label>
    <div class="icon-presets">${ICON_PRESETS.map(ic=>`<button type="button" class="${ws.icon===ic?'active-icon':''}" onclick="setWorkspaceIcon('${ws.id}','${ic}')">${ic}</button>`).join('')}</div>
    <input style="margin-top:8px" maxlength="4" placeholder="カスタム絵文字…" value="${ICON_PRESETS.includes(ws.icon)?'':esc(ws.icon||'')}" oninput="liveSetWorkspaceField('${ws.id}','icon',this.value)" onchange="commitWorkspaceField('${ws.id}','icon',this.value,'Workspace Icon Changed')">
    <label>Accent Color</label>
    <div class="accent-grid">${Object.entries(ACCENT_COLORS).map(([key,a])=>`<button type="button" class="accent-swatch ${ws.accentColor===key?'active-accent':''}" style="--sw:${a.c}" title="${a.name}" onclick="setWorkspaceAccent('${ws.id}','${key}')"></button>`).join('')}</div>
    <button type="button" class="danger" style="margin-top:20px" onclick="deleteWorkspace('${ws.id}')">🗑 Delete Workspace</button>
  `;
}
function liveSetWorkspaceField(id,key,value){
  const ws=state.workspaces.find(w=>w.id===id);
  if(!ws)return;
  ws[key]=value;
  save();
  if(key==='name'){renderHome();renderMenus()}
  if(key==='icon'){renderMenus();renderHome()}
}
function commitWorkspaceField(id,key,value,actionLabel){
  const ws=state.workspaces.find(w=>w.id===id);
  if(!ws)return;
  const oldName=ws.name;
  liveSetWorkspaceField(id,key,value);
  if(key==='name'&&oldName!==ws.name)log(actionLabel+': '+oldName+' → '+ws.name);
  else log(actionLabel+': '+ws.name);
  renderWorkspaceSettingsBody();
}
function setWorkspaceIcon(id,icon){
  const ws=state.workspaces.find(w=>w.id===id);
  if(!ws)return;
  ws.icon=icon||'🪐';
  save();log('Workspace Icon Changed: '+ws.name);
  renderMenus();renderHome();renderWorkspaceSettingsBody();
}
function setWorkspaceAccent(id,color){
  const ws=state.workspaces.find(w=>w.id===id);
  if(!ws||!ACCENT_COLORS[color])return;
  ws.accentColor=color;
  save();log('Workspace Color Changed: '+ws.name+' → '+ACCENT_COLORS[color].name);
  applyAccent();renderMenus();renderWorkspaceSettingsBody();renderNodes();
}
function applyAccent(){
  const ws=(state.mode==='workspace')?activeWs():null;
  const key=(ws&&ACCENT_COLORS[ws.accentColor])?ws.accentColor:'cyan';
  document.documentElement.style.setProperty('--ws-accent-rgb',ACCENT_COLORS[key].c);
}
function addLink(fromId,toId){const a=state.nodes.find(n=>n.id===fromId); if(!a||!toId||fromId===toId)return; a.links=a.links||[]; if(!a.links.includes(toId)){a.links.push(toId);log('接続線追加: '+nodeTitle(a)+' → '+nodeTitle(state.nodes.find(n=>n.id===toId)));mirrorLinkToConnection(a,toId);save();renderLinks();renderDetail()}}
function removeLink(fromId,toId){const a=state.nodes.find(n=>n.id===fromId); if(!a)return; a.links=(a.links||[]).filter(id=>id!==toId); unmirrorLinkConnection(a,toId); log('接続線削除: '+nodeTitle(a)); save(); renderLinks(); renderDetail()}
/* === v0.6.3 Connection / Anchor Editor: additive functions === */
function mirrorLinkToConnection(a,toId){
  a.connections=a.connections||[];
  if(a.connections.some(c=>c.targetId===toId))return;
  a.connections.push({id:uid('conn'),targetId:toId,type:'related',label:'',fromAnchor:'auto',toAnchor:'auto',style:'',viaLink:true});
}
function unmirrorLinkConnection(a,toId){
  if(!Array.isArray(a.connections))return;
  a.connections=a.connections.filter(c=>!(c.viaLink&&c.targetId===toId));
}
function addConnection(fromId,targetId,type){
  const a=state.nodes.find(x=>x.id===fromId); if(!a||!targetId||fromId===targetId)return null;
  a.connections=a.connections||[];
  if(a.connections.some(c=>c.targetId===targetId))return null;
  const b=state.nodes.find(x=>x.id===targetId);
  const conn={id:uid('conn'),targetId,type:CONNECTION_TYPES[type]?type:'related',label:'',fromAnchor:'auto',toAnchor:'auto',style:''};
  a.connections.push(conn);
  log('Connection Created: '+nodeTitle(a)+' → '+(b?nodeTitle(b):'?'));
  save();renderLinks();renderDetail();renderMinimap();
  return conn;
}
function removeConnection(fromId,connId){
  const a=state.nodes.find(x=>x.id===fromId); if(!a)return;
  const before=(a.connections||[]).length;
  a.connections=(a.connections||[]).filter(c=>c.id!==connId);
  if(a.connections.length!==before){log('Connection Removed: '+nodeTitle(a));save();renderLinks();renderDetail();renderMinimap()}
}
function updateConnectionField(fromId,connId,key,value){
  const a=state.nodes.find(x=>x.id===fromId); if(!a)return;
  const c=(a.connections||[]).find(x=>x.id===connId); if(!c)return;
  const old=c[key]; if(old===value)return;
  c[key]=value;
  save();
  const logMap={type:'Connection Type Changed',label:'Connection Label Updated',fromAnchor:'Connection Anchor Changed',toAnchor:'Connection Anchor Changed'};
  if(logMap[key])log(logMap[key]+': '+nodeTitle(a));
  renderLinks();renderDetail();renderMinimap();
}
function anchorPoint(n,anchor,towardPoint){
  const w=nodeW(n),h=nodeH(n),cx=n.x+w/2,cy=n.y+h/2;
  if(anchor==='top')return{x:cx,y:n.y};
  if(anchor==='bottom')return{x:cx,y:n.y+h};
  if(anchor==='left')return{x:n.x,y:cy};
  if(anchor==='right')return{x:n.x+w,y:cy};
  if(anchor==='center')return{x:cx,y:cy};
  if(towardPoint){
    const dx=towardPoint.x-cx,dy=towardPoint.y-cy;
    if(Math.abs(dx)>=Math.abs(dy))return dx>=0?{x:n.x+w,y:cy}:{x:n.x,y:cy};
    return dy>=0?{x:cx,y:n.y+h}:{x:cx,y:n.y};
  }
  return{x:cx,y:cy};
}
function nodeCenter(n){return{x:n.x+nodeW(n)/2,y:n.y+nodeH(n)/2}}
/* === v0.6.3.2 Critical Hotfix: Alt+click connection-line selection for Delete-key removal === */
function selectConnectionLine(fromId,connId){selectedConnection={fromId,connId};renderLinks()}
function clearSelectedConnection(){if(!selectedConnection)return;selectedConnection=null;renderLinks()}

function nodeW(n){
  const w = Number(n && n.w);
  return Math.max(88, Number.isFinite(w) && w > 0 ? w : (n && n.type === 'memo' ? 220 : 260));
}
function nodeH(n){
  const h = Number(n && n.h);
  return Math.max(72, Number.isFinite(h) && h > 0 ? h : (n && n.type === 'memo' ? 118 : 126));
}
function hashId(id){let h=0;const s=String(id||'');for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return Math.abs(h)}
function shapeRadius(n,w,h){
  const shape=normalizeShape(n&&n.shape);
  const radius=(n&&typeof n.radius==='number'&&Number.isFinite(n.radius))?n.radius:DEFAULT_RADIUS;
  if(shape==='circle') return '50%';
  return Math.round(10+(radius/100)*46)+'px';
}
function cycleShape(shape){return normalizeShape(shape)==='circle'?'rounded':'circle'}
function setNodeShape(id,shape){
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  n.shape=normalizeShape(shape);
  if(typeof n.radius!=='number'||!Number.isFinite(n.radius))n.radius=DEFAULT_RADIUS;
  if(n.shape==='circle'){
    const m=Math.max(nodeW(n),nodeH(n));
    n.w=m; n.h=m;
  }
  n.updatedAt=Date.now();
  log('Node Shape Changed: '+nodeTitle(n)+' -> '+n.shape);
  save();renderNodes();renderLinks();renderMinimap();renderDetail();
  refreshShapeInspectorIfOpen(id);
}
function updateNodeSize(id,key,value){
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  const v=Math.max(key==='w'?88:72, Number(value)||0);
  n[key]=v;
  n.updatedAt=Date.now();
  save();renderNodes();renderLinks();renderMinimap();
  refreshShapeInspectorIfOpen(id);
}
let shapeInspectorNodeId=null;
function openShapeInspector(id){
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  shapeInspectorNodeId=id;
  state.activeNodeId=id;
  renderNodes();renderLinks();
  renderShapeInspectorBody(id);
  positionShapeInspector(id);
  const panel=document.getElementById('shapeInspector');
  panel.classList.add('show');
  touchFloat(panel);
}
function closeShapeInspector(){
  shapeInspectorNodeId=null;
  document.getElementById('shapeInspector').classList.remove('show');
}
function refreshShapeInspectorIfOpen(id){
  if(shapeInspectorNodeId===id){
    positionShapeInspector(id);
    renderShapeInspectorBody(id);
  }
}
function positionShapeInspector(id){
  const el=document.querySelector(`.node[data-id="${id}"]`);
  const panel=document.getElementById('shapeInspector');
  if(!el||!panel)return;
  const r=el.getBoundingClientRect();
  const pw=236,ph=panel.offsetHeight||320;
  let left=r.right+14, top=r.top;
  if(left+pw>innerWidth-8) left=r.left-pw-14;
  if(left<8) left=8;
  if(top+ph>innerHeight-8) top=innerHeight-ph-8;
  if(top<8) top=8;
  panel.style.left=left+'px'; panel.style.top=top+'px'; panel.style.right='auto'; panel.style.bottom='auto';
}
function renderShapeInspectorBody(id){
  const n=state.nodes.find(x=>x.id===id);
  const body=document.getElementById('shapeInspectorBody');
  if(!n){closeShapeInspector();return}
  ensureNodeShape(n);
  const shapes=[['rounded','Rounded'],['circle','Circle']];
  const current=normalizeShape(n.shape);
  const radius=(typeof n.radius==='number')?n.radius:DEFAULT_RADIUS;
  const radiusDisabled=(current==='circle');
  body.innerHTML=`
    <label>Shape</label>
    <div class="shape-grid">${shapes.map(([s,l])=>`<button type="button" class="${s===current?'active-shape':''}" onclick="setNodeShape('${id}','${s}')">${l}</button>`).join('')}</div>
    <label>Radius</label>
    <input type="range" min="0" max="100" value="${radius}" ${radiusDisabled?'disabled':''} oninput="liveSetRadius('${id}',this.value)" onchange="commitNodeRadius('${id}',this.value)">
    <label>Size</label>
    <div class="two">
      <div><label>Width</label><input type="number" min="88" value="${Math.round(nodeW(n))}" oninput="liveResizeFromInspector('${id}','w',this.value)" onchange="commitResizeFromInspector('${id}','w',this.value)"></div>
      <div><label>Height</label><input type="number" min="72" value="${Math.round(nodeH(n))}" oninput="liveResizeFromInspector('${id}','h',this.value)" onchange="commitResizeFromInspector('${id}','h',this.value)"></div>
    </div>`;
}
function liveSetRadius(id,value){
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  n.radius=Math.max(0,Math.min(100,Number(value)||0));
  renderNodes();renderLinks();renderMinimap();
}
function commitNodeRadius(id,value){
  liveSetRadius(id,value);
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  n.updatedAt=Date.now();
  log('Node Radius変更: '+nodeTitle(n)+' → '+Math.round(n.radius));
  save();
}
function liveResizeFromInspector(id,key,value){
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  n[key]=Math.max(key==='w'?88:72,Number(value)||0);
  if(n.shape==='circle'){const m=Math.max(nodeW(n),nodeH(n));n.w=m;n.h=m;}
  renderNodes();renderLinks();renderMinimap();
}
function commitResizeFromInspector(id,key,value){
  liveResizeFromInspector(id,key,value);
  const n=state.nodes.find(x=>x.id===id);
  if(!n)return;
  n.updatedAt=Date.now();
  log('Nodeサイズ変更(Object Editor): '+nodeTitle(n)+' '+Math.round(nodeW(n))+'×'+Math.round(nodeH(n)));
  save();
}

function render(){document.getElementById('homeView').classList.toggle('show',state.mode==='home');document.getElementById('canvasWrap').classList.toggle('show',state.mode==='workspace');document.getElementById('minimap').classList.toggle('show',state.mode==='workspace');document.getElementById('hudSub').textContent=state.mode==='workspace'?(activeWs()?.name||'Workspace')+' · Canvas':'Decision Canvas · v0.6.4';applyAccent();renderHome();renderCanvas();renderMenus();renderLog();renderVault();positionOrbs();if(state.mode!=='workspace')clearSelection();}
function renderHome(){
  const recent=state.logs.slice(0,5);
  const lastWs=state.workspaces.find(w=>w.id===state.activeWorkspaceId);
  document.getElementById('homeView').innerHTML=`<div class="home-simple">
    <div class="home-block">
      <h2>Today's Focus</h2>
      <p>${esc(state.todayFocus)}</p>
    </div>
    <div class="home-block">
      <h2>Recent Activity</h2>
      <div class="home-activity">${recent.length?recent.map(l=>`<div class="log-entry"><span class="log-time">${esc(l.time)}</span><span>${esc(l.text)}</span></div>`).join(''):'<div class="hint">まだ記録がありません。</div>'}</div>
    </div>
    <div class="home-block home-continue">
      <h2>Continue</h2>
      ${lastWs?`<button class="primary" onclick="openWorkspace('${lastWs.id}')">${esc(lastWs.icon||'🪐')} ${esc(lastWs.name)} へ戻る</button>`:`<button class="primary" onclick="toggleWorkspaceMenu(true)">Workspaceを選ぶ</button>`}
    </div>
  </div>`;
}
function renderCanvas(){if(state.mode!=='workspace')return;applyView();renderNodes();renderLinks();renderMinimap()}
function renderNodes(){
  const layer=document.getElementById('nodeLayer');
  /* v0.6.4: redraw Group bounding boxes before nodes */
  layer.querySelectorAll('.group-bbox,.group-label').forEach(x=>x.remove());
  renderGroupBoxes(layer);
  /* clear existing node elements */
  layer.querySelectorAll('.node').forEach(x=>x.remove());
  activeNodes().forEach(n=>{
    const el=document.createElement('div');
    ensureNodeShape(n);
    const shapeCls='shape-'+normalizeShape(n.shape);
    const impCls=(n.type==='decision'||n.type==='task')?(' '+(IMPORTANCE_CLASS[n.data.importance]||'imp-mid')):'';
    /* v0.6.4: add 'selected' class when in selectedNodeIds */
    const isSelected=state.selectedNodeIds&&state.selectedNodeIds.has(n.id);
    const isFaded=state.activeNodeId&&n.id!==state.activeNodeId&&!isSelected;
    el.className='node '+shapeCls+impCls
      +' '+(n.id===state.activeNodeId?'active ':'')
      +(isSelected?'selected ':'')
      +(isFaded?'faded':'')
      +((resizeNode&&resizeNode.id===n.id)?' node-resizing':'');
    const w=nodeW(n),h=nodeH(n);
    el.style.left=n.x+'px';el.style.top=n.y+'px';el.style.width=w+'px';el.style.height=h+'px';el.style.minHeight='0';el.style.borderRadius=shapeRadius(n,w,h);el.style.zIndex=n.z||1;el.dataset.id=n.id;
    let sub=''; if(n.type==='decision')sub='重要度: '+(n.data.importance||'-'); if(n.type==='task')sub=(n.data.owner?'担当: '+n.data.owner:'担当未設定'); if(n.type==='meeting')sub=n.data.date||'日付未設定'; if(n.type==='file')sub=n.data.url||'パス未設定'; if(n.type==='note')sub=(n.data.body||'本文未入力').slice(0,50); if(n.type==='memo')sub=(n.data.body||'Memo未入力').slice(0,80);
    const impBadge=(n.type==='decision'||n.type==='task')?`<span class="importance-badge ${IMPORTANCE_CLASS[n.data.importance]||'imp-mid'}">${esc(n.data.importance||'中')}</span>`:'';
    const dueSt=taskDueState(n);
    const dueDot=dueSt?`<span class="due-dot due-${dueSt}" title="${esc(dueStateLabel(dueSt))}"></span>`:'';
    const dueBadge=(dueSt&&w>=150)?`<span class="due-badge due-${dueSt}">${esc(dueStateLabel(dueSt))}</span>`:'';
    el.innerHTML=`${n.type==='task'?`<div class="task-check ${n.data.status==='Done'?'done':''}" title="完了切替">${n.data.status==='Done'?'✓':'○'}</div>`:''}${dueDot}<span class="type ${tagCls[n.type]}">${labels[n.type]}</span>${impBadge}<div class="node-title">${esc(nodeTitle(n))}</div><div class="node-sub">${esc(sub)}</div>${(n.data.status?`<span class="pill">${esc(n.data.status)}</span>`:'')}${dueBadge}<span class="node-shape-handle" title="Object Editorを開く"></span><span class="node-resize-handle" title="Nodeサイズ変更"></span>`;
    el.addEventListener('pointerdown',ev=>startNodeDrag(ev,n.id));
    el.querySelector('.node-resize-handle').addEventListener('pointerdown',ev=>startNodeResize(ev,n.id));
    el.querySelector('.node-shape-handle').addEventListener('click',ev=>{ev.stopPropagation();openShapeInspector(n.id)});
    el.addEventListener('dblclick',ev=>{ev.stopPropagation();openDetail(n.id)});
    el.addEventListener('click',ev=>{
      if(ev.altKey)return;
      if(ev.target.classList.contains('task-check')){toggleTaskDone(n.id,ev);return}
      if(ev.target.classList.contains('node-resize-handle')||ev.target.classList.contains('node-shape-handle'))return;
      /* v0.6.4: Shift+Click = multi-select toggle */
      if(ev.shiftKey){toggleNodeSelection(n.id);return;}
      openDetail(n.id);
    });
    layer.appendChild(el);
  });
  if(shapeInspectorNodeId)positionShapeInspector(shapeInspectorNodeId);
}
/* === v0.6.3: Task due-date visualization helpers (additive) === */
function taskDueState(n){
  if(n.type!=='task')return null;
  if(n.data.status==='Done')return 'done';
  const due=n.data.due;
  if(!due)return 'none';
  const d=new Date(due+'T00:00:00'); if(isNaN(d.getTime()))return 'none';
  const today=new Date(); today.setHours(0,0,0,0);
  const diffDays=Math.round((d-today)/86400000);
  if(diffDays<0)return 'overdue';
  if(diffDays===0)return 'today';
  if(diffDays<=3)return 'soon';
  return 'ok';
}
function dueStateLabel(st){return {none:'期限なし',ok:'余裕あり',soon:'期限3日以内',today:'今日',overdue:'期限切れ',done:'完了'}[st]||''}
function renderLinks(){const svg=document.getElementById('linkSvg');svg.innerHTML='';const ns='http://www.w3.org/2000/svg';
  const makePath=(d,color,alpha,width,dash,cls)=>{const p=document.createElementNS(ns,'path');p.setAttribute('d',d);p.setAttribute('fill','none');p.setAttribute('stroke',`rgba(${color},${alpha})`);p.setAttribute('stroke-width',width);p.setAttribute('stroke-linecap','round');p.setAttribute('stroke-linejoin','round');if(dash)p.setAttribute('stroke-dasharray',dash);if(cls)p.setAttribute('class',cls);return p};
  activeNodes().forEach(a=>{
    const connTargetIds=new Set((a.connections||[]).map(c=>c.targetId));
    (a.links||[]).forEach(id=>{
      if(connTargetIds.has(id))return;
      const b=state.nodes.find(n=>n.id===id&&n.workspaceId===a.workspaceId);if(!b)return;
      const ax=a.x+nodeW(a)/2,ay=a.y+nodeH(a)/2,bx=b.x+nodeW(b)/2,by=b.y+nodeH(b)/2;const mx=(ax+bx)/2;
      const d=`M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`;
      svg.appendChild(makePath(d,'126,217,238',.16,8,'',''));
      svg.appendChild(makePath(d,'126,217,238',.52,1.7,'',''));
    });
  });
  activeNodes().forEach(a=>{
    (a.connections||[]).forEach(c=>{
      const b=state.nodes.find(n=>n.id===c.targetId&&n.workspaceId===a.workspaceId); if(!b)return;
      const aCenter=nodeCenter(a),bCenter=nodeCenter(b);
      const p1=anchorPoint(a,c.fromAnchor||'auto',bCenter);
      const p2=anchorPoint(b,c.toAnchor||'auto',aCenter);
      const mx=(p1.x+p2.x)/2;
      const ct=CONNECTION_TYPES[c.type]||CONNECTION_TYPES.related;
      const d=`M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
      const isSelected=selectedConnection&&selectedConnection.fromId===a.id&&selectedConnection.connId===c.id;
      svg.appendChild(makePath(d,ct.color,isSelected?.35:.18,isSelected?12:9,ct.dash,''));
      svg.appendChild(makePath(d,ct.color,isSelected?1:(c.type==='memo'?.58:.72),isSelected?(c.type==='memo'?2.9:3.6):(c.type==='memo'?1.4:2.1),ct.dash,isSelected?'conn-line-selected':''));
      const hitPath=document.createElementNS(ns,'path');
      hitPath.setAttribute('class','conn-hit-path');
      hitPath.setAttribute('d',d);
      hitPath.setAttribute('fill','none');
      hitPath.setAttribute('stroke','rgba(0,0,0,0)');
      hitPath.setAttribute('stroke-width','18');
      hitPath.addEventListener('click',ev=>{if(!ev.altKey)return;ev.stopPropagation();selectConnectionLine(a.id,c.id)});
      svg.appendChild(hitPath);
      if(c.label){
        const lx=(p1.x+p2.x)/2,ly=(p1.y+p2.y)/2;
        const g=document.createElementNS(ns,'g');
        const txt=document.createElementNS(ns,'text');
        txt.setAttribute('class','conn-label-chip');txt.setAttribute('text-anchor','middle');txt.setAttribute('x',lx);txt.setAttribute('y',ly+3.5);
        txt.textContent=c.label;
        const padX=10,approxW=Math.max(24,c.label.length*6.6);
        const rect=document.createElementNS(ns,'rect');
        rect.setAttribute('class','conn-label-bg');rect.setAttribute('x',lx-approxW/2-padX/2);rect.setAttribute('y',ly-12);rect.setAttribute('width',approxW+padX);rect.setAttribute('height',22);rect.setAttribute('rx',11);
        g.appendChild(rect);g.appendChild(txt);svg.appendChild(g);
      }
    });
  });
  if(connDrag&&connDrag.previewPath)svg.appendChild(connDrag.previewPath);
}
function renderMenus(){renderSplayMenu();renderWorkspaceMenu();}
function renderSplayMenu(){const items=[['🏠 Home',()=>closeWorkspace()],['＋ Decision',()=>createNode('decision')],['＋ Task',()=>createNode('task')],['＋ Note',()=>createNode('note')],['＋ Memo',()=>createNode('memo')],['🔒 Vault',()=>toggleVault()],['📜 Log',()=>toggleLog()],['⇩ Export',()=>exportJSON()],['⇧ Import',()=>document.getElementById('importFile').click()],['⚙ Reset',()=>resetAll()]];makeOrbMenu('splayMenu','splayOrb',items)}
function renderWorkspaceMenu(){
  const items=state.workspaces.map(ws=>[(ws.icon||'🪐')+' '+ws.name,()=>openWorkspace(ws.id)]);
  items.push(['＋ New Workspace',()=>addWorkspace()]);
  items.push(['📝 Workspace Settings',()=>openWorkspaceSettings(state.activeWorkspaceId||state.workspaces[0]?.id)]);
  items.push(['🗑 Delete Workspace',()=>deleteWorkspace(state.activeWorkspaceId||state.workspaces[0]?.id),'orb-item-danger']);
  items.push(['✕ Close Workspace',()=>closeWorkspace()]);
  makeOrbMenu('workspaceMenu','workspaceOrb',items);
}
function makeOrbMenu(menuId,orbId,items){const m=document.getElementById(menuId);m.innerHTML='';const o=document.getElementById(orbId).getBoundingClientRect();m.style.left=o.left+'px';m.style.top=o.top+'px';const radius=92;items.forEach((it,i)=>{const angle=(-145+(i*(260/Math.max(1,items.length-1))))*Math.PI/180;let x=Math.cos(angle)*radius,y=Math.sin(angle)*radius; if(o.left+x<8)x=8-o.left;if(o.left+x+165>innerWidth)x=innerWidth-o.left-170;if(o.top+y<8)y=8-o.top;if(o.top+y+44>innerHeight)y=innerHeight-o.top-50;const el=document.createElement('div');el.className='orb-item';if(it[2])el.classList.add(it[2]);el.style.left=x+'px';el.style.top=y+'px';el.style.animationDelay=(i*18)+'ms';el.textContent=it[0];el.onmouseenter=()=>{el.style.zIndex=++zTop;document.querySelectorAll('.orb-item').forEach(x=>x.classList.toggle('hover-front',x===el))};el.onmouseleave=()=>el.classList.remove('hover-front');el.onclick=()=>{hideMenus();it[1]()};m.appendChild(el)})}
function hideMenus(){document.getElementById('splayMenu').classList.remove('show');document.getElementById('workspaceMenu').classList.remove('show')}
function toggleWorkspaceMenu(force){const m=document.getElementById('workspaceMenu');document.getElementById('splayMenu').classList.remove('show');renderWorkspaceMenu();m.classList.toggle('show',force===true?true:undefined);touchFloat(document.getElementById('workspaceOrb'))}
function toggleSplayMenu(){const m=document.getElementById('splayMenu');document.getElementById('workspaceMenu').classList.remove('show');renderSplayMenu();m.classList.toggle('show');touchFloat(document.getElementById('splayOrb'))}
function renderDetail(){
  const n=state.nodes.find(x=>x.id===state.activeNodeId);
  const body=document.getElementById('detailBody');
  if(!body)return;
  if(!n){body.innerHTML='';hideNodeProjection();return}
  ensureNodeShape(n);
  ensureNodePresentation(n);
  const titleEl=document.getElementById('detailTitle');
  const contextEl=document.getElementById('surfaceContext');
  const modeBtn=document.getElementById('surfaceModeBtn');
  const focusBtn=document.getElementById('surfaceFocusBtn');
  const identityTitle=nodeIdentityTitle(n);
  if(titleEl)titleEl.textContent=identityTitle;
  if(contextEl)contextEl.textContent=[activeWs()?.name||'Workspace',labels[n.type]||n.type,identityTitle].join(' / ');
  if(modeBtn){modeBtn.textContent=nodeSurfaceMode==='view'?'Edit':'View';modeBtn.title=nodeSurfaceMode==='view'?'Switch to edit mode':'Switch to view mode'}
  if(focusBtn){focusBtn.textContent=nodeSurfaceFocused?'Canvas':'Focus';focusBtn.title=nodeSurfaceFocused?'Return to floating surface':'Focus surface'}
  syncNodeSurfaceClasses();
  body.innerHTML=nodeSurfaceMode==='edit'?renderNodeSurfaceEdit(n):renderNodeSurfaceView(n);
  syncDetailPanelBody();
  updateNodeProjection();
}
function focusSafeClass(value){return String(value||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'node'}
function focusTypeGlyph(type){return {task:'+',decision:'<>',note:'~',memo:'o',meeting:'::',file:'/'}[type]||'*'}
function focusFieldAsSatellite(def){return def.kind==='status'||def.kind==='chip'||def.kind==='date'||def.key==='owner'}
function focusVisibleFieldDefs(n){return orderedFieldDefs(n).filter(def=>!fieldHidden(n,def.key)&&!fieldIsEmpty(n.data?.[def.key]))}
function focusConnectionItems(n){
  const wsId=n.workspaceId,seen=new Set(),items=[];
  const push=(id,dir,label='')=>{if(!id||id===n.id||seen.has(id))return;const target=state.nodes.find(x=>x.id===id&&x.workspaceId===wsId);if(!target)return;seen.add(id);items.push({id,dir,label,title:nodeTitle(target)})};
  (n.connections||[]).forEach(c=>push(c.targetId,'out',c.label||c.type||''));
  (n.links||[]).forEach(id=>push(id,'out','link'));
  state.nodes.forEach(src=>{if(!src||src.workspaceId!==wsId||src.id===n.id)return;(src.connections||[]).forEach(c=>{if(c.targetId===n.id)push(src.id,'in',c.label||c.type||'')});(src.links||[]).forEach(id=>{if(id===n.id)push(src.id,'in','link')})});
  return items.slice(0,9);
}
function renderFocusSatellite(item,i){return `<span class="focus-satellite sat-${esc(focusSafeClass(item.key||item.label))}" style="--sat-delay:${Math.min(i*34,170)}ms"><span>${esc(item.label)}</span><b>${esc(item.value)}</b></span>`}
function renderFocusNodeCore(n){
  return `<section class="focus-node-core type-${esc(focusSafeClass(n.type))}" aria-label="Node Core"><div class="focus-core-orbits" aria-hidden="true"><span></span><span></span><span></span></div><div class="focus-core-glyph" aria-hidden="true">${esc(focusTypeGlyph(n.type))}</div><div class="focus-core-title">${esc(nodeIdentityTitle(n))}</div><div class="focus-core-base" aria-hidden="true"></div></section>`;
}
function renderFocusConnectionSatellite(n,items){
  if(!items.length)return '';
  return `<section class="focus-connection-satellite focus-field-pane kind-connection"><div class="focus-pane-label">Connected</div><div class="focus-connection-list">${items.map(item=>`<div class="focus-connection-item"><span>${item.dir==='in'?'IN':'OUT'}</span><b>${esc(item.title)}</b>${item.label?`<em>${esc(item.label)}</em>`:''}</div>`).join('')}</div></section>`;
}
function renderFocusFieldPane(n,def,i){
  const value=n.data?.[def.key];
  const label=fieldDisplayLabel(n,def);
  const wide=def.kind==='multiline'||String(value||'').length>95;
  return `<section class="focus-field-pane surface-field-${esc(def.kind)} kind-${esc(focusSafeClass(def.kind))} ${wide?'pane-wide':''}" style="--pane-delay:${Math.min(i*38,220)}ms"><div class="focus-pane-label">${esc(label)}</div><div class="focus-pane-value ${def.kind==='multiline'?'surface-pre':''}">${renderSurfaceValue(def,value)}</div></section>`;
}
function renderFocusNodeArray(n){
  const visibleDefs=focusVisibleFieldDefs(n);
  const connectionItems=focusConnectionItems(n);
  const satellites=visibleDefs.filter(focusFieldAsSatellite).slice(0,5).map(def=>({key:def.key,label:fieldDisplayLabel(n,def),value:n.data?.[def.key]}));
  if(connectionItems.length)satellites.push({key:'connections',label:'Links',value:String(connectionItems.length)});
  const paneDefs=visibleDefs.filter(def=>!focusFieldAsSatellite(def));
  const panes=paneDefs.map((def,i)=>renderFocusFieldPane(n,def,i)).join('');
  return `<div class="surface-mode-body surface-view focus-array"><div class="focus-array-stage"><div class="focus-optical-field" aria-hidden="true"></div><div class="focus-array-context" aria-hidden="true">Holographic Node Array</div>${renderFocusNodeCore(n)}${satellites.length?`<div class="focus-satellite-ring">${satellites.map(renderFocusSatellite).join('')}</div>`:''}<div class="focus-data-spine" aria-hidden="true"><span></span></div><div class="focus-field-grid">${panes}${renderFocusConnectionSatellite(n,connectionItems)}</div></div></div>`;
}
function renderNodeSurfaceView(n){
  if(nodeSurfaceFocused)return renderFocusNodeArray(n);
  const p=ensureNodePresentation(n);
  const defs=orderedFieldDefs(n).filter(def=>!fieldHidden(n,def.key)&&!fieldIsEmpty(n.data?.[def.key]));
  const chips=[];
  const fields=[];
  defs.forEach(def=>{
    const value=n.data[def.key];
    const label=fieldDisplayLabel(n,def);
    if(def.kind==='status'||def.kind==='chip')chips.push(`<span class="surface-chip"><span class="chip-label">${esc(label)}</span>${esc(value)}</span>`);
    else fields.push(`<section class="surface-field surface-field-${esc(def.kind)}"><div class="surface-field-label">${esc(label)}</div><div class="surface-field-value">${renderSurfaceValue(def,value)}</div></section>`);
  });
  const title=p.titleVisible?`<div class="surface-view-title">${esc(nodeTitle(n))}</div>`:'';
  const empty=(!fields.length&&!chips.length&&!title)?'<div class="surface-empty">No visible content yet.</div>':'';
  return `<div class="surface-mode-body surface-view"><div class="surface-main-pane">${title}${chips.length?`<div class="surface-chip-row">${chips.join('')}</div>`:''}${fields.join('')}${empty}</div><aside class="surface-system-pane">${renderNodeSystemSummary(n)}</aside></div>`;
}
function renderNodeSurfaceEdit(n){
  let html=`<label>Title</label><input value="${esc(n.title)}" oninput="updateNode('${n.id}','title',this.value,true)">`;
  if(n.type==='note')html+=field(n,'body','Body','textarea')+field(n,'memo','Memo','textarea');
  if(n.type==='memo')html+=field(n,'body','Memo','textarea');
  if(n.type==='decision')html+=field(n,'theme','Theme')+selectStatus(n,decisionStatuses)+selectField(n,'importance','Importance',IMPORTANCE_LEVELS)+field(n,'hypothesis','Hypothesis','textarea')+field(n,'evidence','Evidence','textarea')+`<div class="two">${field(n,'pros','Pros','textarea')}${field(n,'cons','Cons','textarea')}</div>`+field(n,'risk','Risk','textarea')+field(n,'decision','Decision','textarea')+field(n,'nextCheck','Next Check','textarea')+field(n,'memo','Memo','textarea');
  if(n.type==='task')html+=field(n,'name','Task Name')+selectStatus(n,taskStatuses)+selectImportance(n)+`<div class="two">${field(n,'owner','Owner')}${field(n,'due','Due','date')}</div>`+field(n,'memo','Memo','textarea');
  if(n.type==='meeting')html+=field(n,'meetingName','Meeting Name')+field(n,'date','Date','date')+field(n,'agenda','Agenda','textarea')+field(n,'notes','Notes','textarea')+field(n,'decisions','Decisions','textarea')+field(n,'pending','Pending','textarea')+field(n,'nextActions','Next Actions','textarea')+field(n,'memo','Memo','textarea');
  if(n.type==='file')html+=field(n,'name','Name')+field(n,'url','URL / Path')+field(n,'memo','Memo','textarea')+(n.data.url?`<p><a href="${esc(n.data.url)}" target="_blank">${esc(n.data.url)}</a></p>`:'');
  const systemHtml=renderNodeSystemSummary(n)+renderPresentationSettings(n)+connectionEditor(n);
  return `<div class="surface-mode-body surface-edit"><div class="surface-main-pane">${html}</div><aside class="surface-system-pane">${systemHtml}</aside></div>`;
}
function renderNodeSystemSummary(n){
  const status=n.data?.status||'';
  const importance=(n.type==='decision'||n.type==='task')?(n.data?.importance||''):'';
  return `<section class="surface-system-card"><div class="surface-field-label">Node System</div><div class="surface-system-row"><span>Type</span><b>${esc(labels[n.type]||n.type)}</b></div>${status?`<div class="surface-system-row"><span>Status</span><b>${esc(status)}</b></div>`:''}${importance?`<div class="surface-system-row"><span>Importance</span><b>${esc(importance)}</b></div>`:''}<div class="surface-system-row"><span>Shape</span><b>${esc(normalizeShape(n.shape))}</b></div></section>`;
}
function renderPresentationSettings(n){
  const p=ensureNodePresentation(n);
  const defs=orderedFieldDefs(n);
  return `<details class="presentation-settings"><summary>Surface presentation</summary>
    <label class="presentation-title-row"><input type="checkbox" ${p.titleVisible?'checked':''} onchange="setPresentationTitleVisible('${n.id}',this.checked)"> Show node title in View Mode</label>
    <div class="presentation-list">${defs.map(def=>`<div class="presentation-field">
      <label><input type="checkbox" ${fieldHidden(n,def.key)?'':'checked'} onchange="setPresentationFieldVisible('${n.id}','${def.key}',this.checked)"> ${esc(def.label)}</label>
      <input type="text" value="${esc(p.fieldLabels[def.key]||'')}" placeholder="${esc(def.label)}" oninput="setPresentationFieldLabel('${n.id}','${def.key}',this.value,false)">
      <div class="presentation-buttons"><button type="button" onclick="movePresentationField('${n.id}','${def.key}',-1)">Up</button><button type="button" onclick="movePresentationField('${n.id}','${def.key}',1)">Down</button><button type="button" onclick="resetPresentationFieldLabel('${n.id}','${def.key}')">Label reset</button></div>
    </div>`).join('')}</div>
    <div class="presentation-reset-row"><button type="button" onclick="resetPresentationOrder('${n.id}')">Reset field order</button></div>
  </details>`;
}
function syncNodeSurfaceClasses(){
  const p=document.getElementById('detailPanel');
  const isEdit=nodeSurfaceMode==='edit',isView=!isEdit,isFocus=!!nodeSurfaceFocused;
  if(p){
    p.classList.toggle('surface-view-mode',isView);
    p.classList.toggle('surface-edit-mode',isEdit);
    p.classList.toggle('focus-array-active',isFocus&&isView);
    p.classList.toggle('focus-console-active',isFocus&&isEdit);
  }
  document.body.classList.toggle('focus-array-active',isFocus&&isView);
  document.body.classList.toggle('focus-console-active',isFocus&&isEdit);
}
function toggleSurfaceMode(mode){nodeSurfaceMode=mode||(nodeSurfaceMode==='view'?'edit':'view');syncNodeSurfaceClasses();renderDetail()}
function toggleNodeSurfaceFocus(force){setNodeSurfaceFocus(force==null?!nodeSurfaceFocused:!!force,true)}
function setNodeSurfaceFocus(focus,rerender=true){
  const p=document.getElementById('detailPanel');
  const enteringFocus=!!focus&&!nodeSurfaceFocused;
  if(enteringFocus){nodeSurfaceMode='view';hideMenus();}
  nodeSurfaceFocused=!!focus;
  document.body.classList.toggle('surface-focus-active',nodeSurfaceFocused);
  if(p){
    p.classList.add('surface-transitioning');
    setTimeout(()=>p.classList.remove('surface-transitioning'),480);
    p.classList.toggle('surface-focus',nodeSurfaceFocused);
    if(nodeSurfaceFocused)p.classList.add('show');else applyDetailPanelState();
  }
  syncNodeSurfaceClasses();
  syncDetailPanelBody();
  updateNodeProjection();
  if(rerender)renderDetail();
}
function updatePresentation(id,mutator,rerender=true){const n=state.nodes.find(x=>x.id===id);if(!n)return;const p=ensureNodePresentation(n);mutator(p,n);n.updatedAt=Date.now();save();if(rerender)renderDetail()}
function setPresentationTitleVisible(id,checked){updatePresentation(id,p=>p.titleVisible=!!checked)}
function setPresentationFieldVisible(id,key,visible){updatePresentation(id,p=>{p.hiddenFields=p.hiddenFields.filter(k=>k!==key);if(!visible)p.hiddenFields.push(key)})}
function setPresentationFieldLabel(id,key,value,rerender=true){updatePresentation(id,p=>{if(value&&value.trim())p.fieldLabels[key]=value;else delete p.fieldLabels[key]},rerender)}
function resetPresentationFieldLabel(id,key){updatePresentation(id,p=>{delete p.fieldLabels[key]})}
function movePresentationField(id,key,dir){updatePresentation(id,(p,n)=>{const keys=fieldDefsFor(n).map(d=>d.key);const order=p.fieldOrder.filter(k=>keys.includes(k));keys.forEach(k=>{if(!order.includes(k))order.push(k)});const i=order.indexOf(key),j=Math.max(0,Math.min(order.length-1,i+dir));if(i>=0&&i!==j){const tmp=order[i];order[i]=order[j];order[j]=tmp}p.fieldOrder=order})}
function resetPresentationOrder(id){updatePresentation(id,p=>p.fieldOrder=[])}
function activeNodeElement(){return Array.from(document.querySelectorAll('.node')).find(el=>el.dataset.id===state.activeNodeId)||null}
function hideNodeProjection(){const proj=document.getElementById('nodeProjection');if(proj)proj.classList.remove('show','projection-focus','projection-boost');document.querySelectorAll('.node.surface-source').forEach(el=>el.classList.remove('surface-source'));const panel=document.getElementById('detailPanel');if(panel)panel.classList.remove('receiver-left','receiver-right')}
function updateNodeProjection(){
  const proj=document.getElementById('nodeProjection'),outer=document.getElementById('projectionOuterBeam'),flow=document.getElementById('projectionFlowPath'),core=document.getElementById('projectionCorePath'),plane=document.getElementById('projectionPlane'),ring=document.getElementById('projectorRing'),receiver=document.getElementById('surfaceReceiver'),panel=document.getElementById('detailPanel');
  if(!proj||!outer||!flow||!core||!plane||!ring||!receiver||!panel||!panel.classList.contains('show')||!state.activeNodeId){hideNodeProjection();return}
  const nodeEl=activeNodeElement();
  if(!nodeEl){hideNodeProjection();return}
  const nr=nodeEl.getBoundingClientRect();
  if(nr.right<0||nr.left>innerWidth||nr.bottom<0||nr.top>innerHeight){hideNodeProjection();return}
  document.querySelectorAll('.node.surface-source').forEach(el=>el.classList.toggle('surface-source',el===nodeEl));
  const pr=panel.getBoundingClientRect();
  const sx=nr.left+nr.width/2,sy=nr.top+nr.height/2;
  const floatingSide=sx < pr.left+pr.width/2 ? 'left':'right';
  const side=nodeSurfaceFocused?'focus':floatingSide;
  let ex,ey;
  if(nodeSurfaceFocused&&nodeSurfaceMode==='view'){const base=panel.querySelector('.focus-core-base')||panel.querySelector('.focus-node-core');if(base){const br=base.getBoundingClientRect();ex=br.left+br.width/2;ey=br.top+br.height*.72}else{ex=pr.left+pr.width/2;ey=pr.top+pr.height*.42}}else if(nodeSurfaceFocused){ex=pr.left+pr.width/2;ey=pr.bottom-34}else if(side==='left'){ex=pr.left+18;ey=Math.max(pr.top+76,Math.min(pr.bottom-42,sy))}else{ex=pr.right-18;ey=Math.max(pr.top+76,Math.min(pr.bottom-42,sy))}
  const dx=ex-sx,dy=ey-sy,len=Math.max(1,Math.hypot(dx,dy));
  if(len<8){hideNodeProjection();return}
  const c1x=sx+dx*.34,c1y=sy+dy*.08,c2x=ex-dx*.22,c2y=ey-dy*.12;
  const d=`M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${ex} ${ey}`;
  [outer,flow,core].forEach(path=>path.setAttribute('d',d));
  const nx=-dy/len,ny=dx/len,w1=nodeSurfaceFocused?18:12,w2=nodeSurfaceFocused?92:54;
  plane.setAttribute('points',`${sx+nx*w1},${sy+ny*w1} ${ex+nx*w2},${ey+ny*w2} ${ex-nx*w2},${ey-ny*w2} ${sx-nx*w1},${sy-ny*w1}`);
  ring.style.left=sx+'px';ring.style.top=sy+'px';
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  receiver.style.left=ex+'px';receiver.style.top=ey+'px';receiver.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
  const accent=activeWs()?ACCENT_COLORS[activeWs().accentColor]?.c:null;
  if(accent){panel.style.setProperty('--surface-accent',`rgba(${accent},.74)`);document.documentElement.style.setProperty('--ws-accent-rgb',accent)}
  panel.classList.toggle('receiver-left',side==='left');panel.classList.toggle('receiver-right',side==='right');
  proj.classList.toggle('projection-focus',nodeSurfaceFocused);
  proj.classList.add('show','projection-boost');
  clearTimeout(window.__projectionBoostTimer);window.__projectionBoostTimer=setTimeout(()=>proj.classList.remove('projection-boost'),420);
}
function field(n,key,label,type='input'){const v=n.data[key]??'';return `<div><label>${label}</label>${type==='textarea'?`<textarea oninput="updateNode('${n.id}','${key}',this.value)">${esc(v)}</textarea>`:`<input type="${type}" value="${esc(v)}" oninput="updateNode('${n.id}','${key}',this.value)">`}</div>`}
function selectField(n,key,label,opts){return `<div><label>${label}</label><select onchange="updateNode('${n.id}','${key}',this.value)">${opts.map(o=>`<option ${o===(n.data[key]||'')?'selected':''}>${o}</option>`).join('')}</select></div>`}
function selectStatus(n,opts){return `<div><label>ステータス</label><select onchange="changeStatus('${n.id}',this.value)">${opts.map(o=>`<option ${o===(n.data.status||'')?'selected':''}>${o}</option>`).join('')}</select></div>`}
/* v0.6.3: Task importance with dedicated Activity Log entry */
function selectImportance(n){return `<div><label>重要度</label><select onchange="changeImportance('${n.id}',this.value)">${IMPORTANCE_LEVELS.map(o=>`<option ${o===(n.data.importance||'中')?'selected':''}>${o}</option>`).join('')}</select></div>`}
function changeImportance(id,val){const n=state.nodes.find(x=>x.id===id);if(!n)return;const old=n.data.importance;n.data.importance=val;n.updatedAt=Date.now();if(old!==val&&n.type==='task')log('Task Importance Changed: '+nodeTitle(n)+' '+old+' → '+val);save();renderNodes();renderDetail();renderMinimap()}
function connectionEditor(n){const others=activeNodes().filter(x=>x.id!==n.id);return `<label>接続線</label><div class="connection-editor"><select id="linkSelect">${others.map(o=>`<option value="${o.id}">${esc(nodeTitle(o))}</option>`).join('')}</select><button onclick="addLink('${n.id}',document.getElementById('linkSelect').value)">接続</button></div><div class="tag-row">${(n.links||[]).map(id=>{const o=state.nodes.find(x=>x.id===id);return o?`<button onclick="removeLink('${n.id}','${id}')">× ${esc(nodeTitle(o))}</button>`:''}).join('')}</div>`+connectionListEditor(n,others)}
/* === v0.6.3 Connection / Anchor Editor: additive Connection list UI === */
function connectionListEditor(n,others){
  const conns=n.connections||[];
  let html=`<label>Connection Editor</label><div class="connection-editor"><select id="connNewSelect">${others.map(o=>`<option value="${o.id}">${esc(nodeTitle(o))}</option>`).join('')}</select><button onclick="addConnection('${n.id}',document.getElementById('connNewSelect').value,'related')">＋ Connection</button></div>`;
  if(!conns.length){html+='<div class="hint">まだConnectionはありません。Canvas上でAlt+Drag、または上の「＋ Connection」から追加できます。</div>';return html}
  html+='<div class="connection-list">'+conns.map(c=>{
    const target=state.nodes.find(x=>x.id===c.targetId);
    const typeOpts=CONNECTION_TYPE_KEYS.map(k=>`<option value="${k}" ${c.type===k?'selected':''}>${CONNECTION_TYPES[k].label}</option>`).join('');
    const fromOpts=ANCHOR_KEYS.map(k=>`<option value="${k}" ${c.fromAnchor===k?'selected':''}>${k}</option>`).join('');
    const toOpts=ANCHOR_KEYS.map(k=>`<option value="${k}" ${c.toAnchor===k?'selected':''}>${k}</option>`).join('');
    return `<div class="connection-row">
      <div class="crow-head"><span>→ ${esc(target?nodeTitle(target):'(削除済み)')}</span><button class="danger" onclick="removeConnection('${n.id}','${c.id}')">🗑 Remove Connection</button></div>
      <div class="crow-grid">
        <div><label>Type</label><select onchange="updateConnectionField('${n.id}','${c.id}','type',this.value)">${typeOpts}</select></div>
        <div><label>Label</label><input value="${esc(c.label||'')}" oninput="updateConnectionField('${n.id}','${c.id}','label',this.value)"></div>
        <div><label>From Anchor</label><select onchange="updateConnectionField('${n.id}','${c.id}','fromAnchor',this.value)">${fromOpts}</select></div>
        <div><label>To Anchor</label><select onchange="updateConnectionField('${n.id}','${c.id}','toAnchor',this.value)">${toOpts}</select></div>
      </div>
    </div>`;
  }).join('')+'</div>';
  return html;
}
function renderLog(){document.getElementById('logList').innerHTML=state.logs.slice(0,80).map(l=>`<div class="log-entry"><span class="log-time">${esc(l.time)}</span><span>${esc(l.text)}</span></div>`).join('')}
function renderVault(){const body=document.getElementById('vaultBody');const files=state.nodes.filter(n=>n.type==='file');body.innerHTML=`<div class="vault-list">${files.map(n=>`<div class="vault-item"><div><b>${esc(n.data.name||n.title)}</b><br><a href="${esc(n.data.url||'#')}" target="_blank">${esc(n.data.url||'未設定')}</a><div class="hint">${esc(n.data.memo||'')}</div></div><button onclick="openWorkspace('${n.workspaceId}');openDetail('${n.id}')">編集</button></div>`).join('')}</div>`}
function addVaultLink(){const name=prompt('資料名');if(!name)return;const url=prompt('URL / 相対パス')||'';const vault=state.workspaces.find(w=>w.name==='Vault')||activeWs();state.nodes.push({id:uid('node'),type:'file',workspaceId:vault.id,title:name,x:600+Math.random()*360,y:540+Math.random()*240,z:++zTop,links:[],createdAt:Date.now(),updatedAt:Date.now(),w:260,h:126,shape:SHAPE_PALETTE.file,radius:DEFAULT_RADIUS,connections:[],data:{name,url,memo:''},presentation:defaultPresentation()});log('Vault資料追加: '+name);save();render()}
function applyView(){const c=document.getElementById('canvas');c.style.transform=`translate(${state.view.x}px,${state.view.y}px) scale(${state.view.scale})`;applySpatialParallax();updateNodeProjection()}
function screenToCanvas(x,y){return{x:(x-state.view.x)/state.view.scale,y:(y-state.view.y)/state.view.scale}}
function zoomBy(delta,clientX=innerWidth/2,clientY=innerHeight/2){const before=screenToCanvas(clientX,clientY);state.view.scale=Math.max(.35,Math.min(1.9,state.view.scale+delta));state.view.x=clientX-before.x*state.view.scale;state.view.y=clientY-before.y*state.view.scale;save();applyView();renderMinimap()}
function resetView(){state.view={x:-360,y:-290,scale:1};save();applyView();renderMinimap()}
let pan=null,drag=null,resizeNode=null,dragOrb=null,dragFloat=null,resizeFloat=null;
let connDrag=null; /* v0.6.3: Alt+Drag connection creation state */
let selectedConnection=null; /* v0.6.3.2: Alt+click selected connection line, for Delete-key removal */
let selectionDrag=null; /* v0.6.4: Shift+Drag range selection state */
let nodeSurfaceMode='view';
let nodeSurfaceFocused=false;

let ctrlCreate=null;
function showCreateMenuAt(clientX,clientY,canvasPoint){
  const m=document.getElementById('createMenu');
  m.innerHTML='';
  [['Decision','decision'],['Task','task'],['Note','note'],['Memo','memo']].forEach(([label,type])=>{
    const b=document.createElement('button'); b.textContent='＋ '+label; b.onclick=()=>{createNodeAt(type,canvasPoint.x,canvasPoint.y);m.classList.remove('show')}; m.appendChild(b);
  });
  m.style.left=Math.min(clientX,innerWidth-330)+'px'; m.style.top=Math.min(clientY,innerHeight-70)+'px'; m.classList.add('show'); touchFloat(m);
}
function createNodeAt(type,x,y){
  const ws=activeWs(); if(!ws){addWorkspace();return}
  const data={note:{body:'',memo:''},memo:{body:''},decision:{theme:'',status:'未検討',importance:'中',hypothesis:'',evidence:'',pros:'',cons:'',risk:'',decision:'',nextCheck:'',memo:''},task:{name:'',status:'TODO',owner:'',due:'',importance:'中',memo:''},meeting:{meetingName:'',date:'',agenda:'',notes:'',decisions:'',pending:'',nextActions:'',memo:''},file:{name:'',url:'',memo:''}}[type];
  const n={id:uid('node'),type,workspaceId:ws.id,title:type==='memo'?'Memo':'新しい'+labels[type],x:x-130,y:y-70,w:type==='memo'?220:260,h:type==='memo'?118:126,shape:SHAPE_PALETTE[type]||'rounded',radius:DEFAULT_RADIUS,z:++zTop,links:[],connections:[],createdAt:Date.now(),updatedAt:Date.now(),data,presentation:defaultPresentation()};
  state.nodes.push(n); state.activeNodeId=n.id; log('CtrlドラッグでNode追加: ['+labels[type]+'] '+nodeTitle(n)); save(); render(); openDetail(n.id);
}

document.getElementById('canvasWrap').addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?.1:-.1,e.clientX,e.clientY)},{passive:false});
document.getElementById('canvasWrap').addEventListener('pointerdown',e=>{
  if(e.target.id!=='canvasWrap'&&e.target.id!=='canvas'&&e.target.id!=='linkSvg')return;
  if(e.ctrlKey){const p=screenToCanvas(e.clientX,e.clientY);ctrlCreate={sx:e.clientX,sy:e.clientY,cx:p.x,cy:p.y,ghost:document.createElement('div')};ctrlCreate.ghost.className='drag-ghost';document.body.appendChild(ctrlCreate.ghost);e.preventDefault();return}
  /* v0.6.4: Shift+Drag = range selection */
  if(e.shiftKey){
    e.preventDefault();
    selectionDrag={sx:e.clientX,sy:e.clientY};
    const rect=document.getElementById('selectionRect');
    rect.style.left=e.clientX+'px';rect.style.top=e.clientY+'px';rect.style.width='0px';rect.style.height='0px';rect.style.display='block';
    return;
  }
  /* normal click clears selection */
  if(!e.shiftKey)clearSelection();
  pan={x:e.clientX,y:e.clientY,vx:state.view.x,vy:state.view.y};
  closeDetail();
});
window.addEventListener('pointermove',e=>{
  if(connDrag){updateConnectionDragPreview(e.clientX,e.clientY);return}
  if(ctrlCreate){const x=Math.min(ctrlCreate.sx,e.clientX),y=Math.min(ctrlCreate.sy,e.clientY),w=Math.abs(e.clientX-ctrlCreate.sx),h=Math.abs(e.clientY-ctrlCreate.sy);Object.assign(ctrlCreate.ghost.style,{left:x+'px',top:y+'px',width:Math.max(24,w)+'px',height:Math.max(24,h)+'px'});return}
  /* v0.6.4: range selection rectangle display */
  if(selectionDrag){
    const x=Math.min(selectionDrag.sx,e.clientX),y=Math.min(selectionDrag.sy,e.clientY),w=Math.abs(e.clientX-selectionDrag.sx),h=Math.abs(e.clientY-selectionDrag.sy);
    const rect=document.getElementById('selectionRect');
    rect.style.left=x+'px';rect.style.top=y+'px';rect.style.width=w+'px';rect.style.height=h+'px';
    return;
  }
  if(pan){state.view.x=pan.vx+e.clientX-pan.x;state.view.y=pan.vy+e.clientY-pan.y;applyView();renderMinimap()}
  if(drag){
    const p=screenToCanvas(e.clientX,e.clientY);
    /* v0.6.4: Batch move delta calculations */
    if(drag.isBatch&&state.selectedNodeIds&&state.selectedNodeIds.size>0){
      const dx=p.x-drag.lastCx, dy=p.y-drag.lastCy;
      drag.lastCx=p.x; drag.lastCy=p.y;
      state.selectedNodeIds.forEach(sid=>{
        const sn=state.nodes.find(x=>x.id===sid);
        if(sn){sn.x+=dx;sn.y+=dy;}
      });
    } else {
      const n=state.nodes.find(x=>x.id===drag.id);
      if(n){n.x=p.x-drag.ox;n.y=p.y-drag.oy;}
    }
    renderNodes();renderLinks();renderMinimap();updateSelectionToolbar();
  }
  if(resizeNode){const n=state.nodes.find(x=>x.id===resizeNode.id);if(n){const p=screenToCanvas(e.clientX,e.clientY);n.w=Math.max(88,p.x-n.x-resizeNode.dx);n.h=Math.max(72,p.y-n.y-resizeNode.dy);if(n.shape==='circle'){const m=Math.max(nodeW(n),nodeH(n));n.w=m;n.h=m;}renderNodes();renderLinks();renderMinimap();if(shapeInspectorNodeId===n.id)renderShapeInspectorBody(n.id);}}
  if(dragOrb){const el=dragOrb.el;el.style.left=(e.clientX-dragOrb.ox)+'px';el.style.top=(e.clientY-dragOrb.oy)+'px';el.style.right='auto';el.style.bottom='auto';renderMenus();}
  if(dragFloat){const el=dragFloat.el;let left=e.clientX-dragFloat.ox,top=e.clientY-dragFloat.oy;if(dragFloat.key==='detailPanel'){const r=el.getBoundingClientRect();left=Math.max(8,Math.min(innerWidth-Math.min(96,r.width),left));top=Math.max(8,Math.min(innerHeight-48,top));}el.style.left=left+'px';el.style.top=top+'px';el.style.right='auto';el.style.bottom='auto';if(dragFloat.key==='detailPanel')syncDetailPanelBody();}
  if(resizeFloat){const el=resizeFloat.el;let w=Math.max(resizeFloat.minW,e.clientX-resizeFloat.left),h=Math.max(resizeFloat.minH,e.clientY-resizeFloat.top);if(resizeFloat.key==='detailPanel'){w=Math.min(w,Math.max(resizeFloat.minW,innerWidth-resizeFloat.left-8));h=Math.min(h,Math.max(resizeFloat.minH,innerHeight-resizeFloat.top-8));}if(resizeFloat.aspect){const m=Math.max(w,h);w=m;h=m}el.style.width=w+'px';el.style.height=h+'px';el.classList.add('float-resizing');if(resizeFloat.key==='detailPanel')syncDetailPanelBody();}
});
window.addEventListener('pointerup',e=>{
  if(connDrag){finishConnectionDrag(e.clientX,e.clientY);return}
  if(ctrlCreate){const dist=Math.hypot(e.clientX-ctrlCreate.sx,e.clientY-ctrlCreate.sy);const p=screenToCanvas(e.clientX,e.clientY);ctrlCreate.ghost.remove(); if(dist>18)showCreateMenuAt(e.clientX,e.clientY,{x:(ctrlCreate.cx+p.x)/2,y:(ctrlCreate.cy+p.y)/2}); ctrlCreate=null; return}
  /* v0.6.4: complete range selection */
  if(selectionDrag){
    const rect=document.getElementById('selectionRect');
    const r=rect.getBoundingClientRect();
    rect.style.display='none';
    const dist=Math.hypot(e.clientX-selectionDrag.sx,e.clientY-selectionDrag.sy);
    selectionDrag=null;
    if(dist>8)finishRangeSelection(r);
    return;
  }
  if(pan){save();pan=null}
  if(drag){
    if(drag.isBatch){
      state.selectedNodeIds.forEach(sid=>{const sn=state.nodes.find(x=>x.id===sid);if(sn){sn.updatedAt=Date.now();}});
      log('複数Node一括移動: '+state.selectedNodeIds.size+'個');
    } else {
      const n=state.nodes.find(x=>x.id===drag.id);
      if(n)log('Node移動: '+nodeTitle(n));
    }
    save();drag=null;updateSelectionToolbar();
  }
  if(resizeNode){const n=state.nodes.find(x=>x.id===resizeNode.id);if(n){n.updatedAt=Date.now();log('Nodeサイズ変更: '+nodeTitle(n)+' '+Math.round(nodeW(n))+'×'+Math.round(nodeH(n)));}save();const rid=resizeNode.id;resizeNode=null;renderNodes();renderLinks();renderMinimap();refreshShapeInspectorIfOpen(rid)}
  if(dragOrb){const id=dragOrb.el.id==='splayOrb'?'splayOrb':'workspaceOrb';state.ui[id]={...(state.ui[id]||{}),x:parseFloat(dragOrb.el.style.left),y:parseFloat(dragOrb.el.style.top),w:parseFloat(dragOrb.el.style.width)||undefined,h:parseFloat(dragOrb.el.style.height)||undefined};save();dragOrb=null}
  if(dragFloat){const key=dragFloat.key;state.ui[key]={...(state.ui[key]||{}),x:parseFloat(dragFloat.el.style.left),y:parseFloat(dragFloat.el.style.top),w:parseFloat(dragFloat.el.style.width)||undefined,h:parseFloat(dragFloat.el.style.height)||undefined};save();dragFloat.el.classList.remove('float-dragging');document.body.style.userSelect='';if(key==='detailPanel'){ensureDetailPanelInViewport();updateNodeProjection();}dragFloat=null}
  if(resizeFloat){const key=resizeFloat.key;state.ui[key]={...(state.ui[key]||{}),x:parseFloat(resizeFloat.el.style.left)||state.ui[key]?.x,y:parseFloat(resizeFloat.el.style.top)||state.ui[key]?.y,w:parseFloat(resizeFloat.el.style.width),h:parseFloat(resizeFloat.el.style.height)};resizeFloat.el.classList.remove('float-resizing');save();if(key==='detailPanel'){ensureDetailPanelInViewport();updateNodeProjection();}resizeFloat=null}
});
function startNodeDrag(e,id){
  if(e.altKey){startConnectionDrag(e,id);return}
  if(e.target.classList.contains('task-check')||e.target.classList.contains('node-resize-handle')||e.target.classList.contains('node-shape-handle'))return;
  const n=state.nodes.find(x=>x.id===id);if(!n)return;
  n.z=++zTop;
  /* v0.6.4: if node is selected and we have multi selection, drag as a batch */
  const inSelection=state.selectedNodeIds&&state.selectedNodeIds.has(id)&&state.selectedNodeIds.size>1;
  if(inSelection){
    const p=screenToCanvas(e.clientX,e.clientY);
    drag={id,isBatch:true,lastCx:p.x,lastCy:p.y};
  } else {
    if(!e.shiftKey){state.activeNodeId=id;}
    const p=screenToCanvas(e.clientX,e.clientY);
    drag={id,isBatch:false,ox:p.x-n.x,oy:p.y-n.y};
    if(!e.shiftKey){renderNodes();renderLinks();renderDetail();showDetailPanel();}
  }
  e.stopPropagation();
}
/* === v0.6.3: Alt + Drag Connection creation === */
function startConnectionDrag(e,fromId){
  e.preventDefault();e.stopPropagation();
  const ns='http://www.w3.org/2000/svg';
  const previewPath=document.createElementNS(ns,'path');
  previewPath.setAttribute('class','conn-preview-line');
  connDrag={fromId,hoverId:null,previewPath};
  const el=document.querySelector(`.node[data-id="${fromId}"]`);
  if(el)el.classList.add('conn-source-active');
  updateConnectionDragPreview(e.clientX,e.clientY);
}
function updateConnectionDragPreview(clientX,clientY){
  if(!connDrag)return;
  const a=state.nodes.find(x=>x.id===connDrag.fromId); if(!a)return;
  const cursor=screenToCanvas(clientX,clientY);
  const p1=anchorPoint(a,'auto',cursor);
  const mx=(p1.x+cursor.x)/2;
  connDrag.previewPath.setAttribute('d',`M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${cursor.y}, ${cursor.x} ${cursor.y}`);
  renderLinks();
  let hoverEl=document.elementFromPoint(clientX,clientY);
  while(hoverEl&&!hoverEl.classList?.contains('node'))hoverEl=hoverEl.parentElement;
  const hoverId=(hoverEl&&hoverEl.dataset.id!==connDrag.fromId)?hoverEl.dataset.id:null;
  if(connDrag.hoverId!==hoverId){
    document.querySelectorAll('.node.conn-target-hover').forEach(x=>x.classList.remove('conn-target-hover'));
    if(hoverId){const t=document.querySelector(`.node[data-id="${hoverId}"]`); if(t)t.classList.add('conn-target-hover')}
    connDrag.hoverId=hoverId;
  }
}
function finishConnectionDrag(clientX,clientY){
  if(!connDrag)return;
  const fromId=connDrag.fromId;
  let hoverEl=document.elementFromPoint(clientX,clientY);
  while(hoverEl&&!hoverEl.classList?.contains('node'))hoverEl=hoverEl.parentElement;
  const targetId=hoverEl?hoverEl.dataset.id:null;
  cancelConnectionDrag();
  if(targetId&&targetId!==fromId)addConnection(fromId,targetId,'related');
  else renderLinks();
}
function cancelConnectionDrag(){
  if(!connDrag)return;
  document.querySelectorAll('.node.conn-source-active,.node.conn-target-hover').forEach(x=>x.classList.remove('conn-source-active','conn-target-hover'));
  connDrag=null;
  renderLinks();
}
function startNodeResize(e,id){const n=state.nodes.find(x=>x.id===id);if(!n)return;n.z=++zTop;state.activeNodeId=id;const p=screenToCanvas(e.clientX,e.clientY);resizeNode={id,dx:p.x-(n.x+nodeW(n)),dy:p.y-(n.y+nodeH(n))};e.stopPropagation();e.preventDefault()}
function makeOrbDraggable(el,toggle){el.addEventListener('click',e=>{if(Math.abs((e.clientX-(el._downX||e.clientX)))<4&&Math.abs((e.clientY-(el._downY||e.clientY)))<4)toggle();});el.addEventListener('pointerdown',e=>{touchFloat(el);el._downX=e.clientX;el._downY=e.clientY;const r=el.getBoundingClientRect();dragOrb={el,ox:e.clientX-r.left,oy:e.clientY-r.top};e.stopPropagation()})}

function makeFloatingDraggable(el,key){
  el.addEventListener('pointerdown',e=>{if(e.target.classList.contains('float-resize-handle'))return;touchFloat(el);const r=el.getBoundingClientRect();dragFloat={el,key,ox:e.clientX-r.left,oy:e.clientY-r.top};el.classList.add('float-dragging')});
}
function attachResizeHandle(el,key,aspect=false,opts={}){
  if(!el||el.querySelector('.float-resize-handle'))return;
  const h=document.createElement('span');h.className='float-resize-handle';h.title='サイズ変更';el.appendChild(h);
  h.addEventListener('pointerdown',e=>{if(key==='detailPanel'&&nodeSurfaceFocused)return;e.stopPropagation();touchFloat(el);const r=el.getBoundingClientRect();resizeFloat={el,key,aspect,left:r.left,top:r.top,minW:opts.minW??(aspect?44:58),minH:opts.minH??(aspect?44:32)};});
}
function applyFloatState(id,key,defaults={}){const el=document.getElementById(id);if(!el)return;const st=state.ui[key]||{};if(st.x!=null){el.style.left=st.x+'px';el.style.top=(st.y??defaults.y??24)+'px';el.style.right='auto';el.style.bottom='auto'} if(st.w)el.style.width=st.w+'px'; if(st.h)el.style.height=st.h+'px'}
function initFloatingControls(){
  [['minimap','minimap',false]].forEach(([id,key,aspect])=>{const el=document.getElementById(id); if(!el)return; makeFloatingDraggable(el,key); attachResizeHandle(el,key,aspect); el.addEventListener('pointerdown',()=>touchFloat(el));});
  initDetailPanelControls();
  ['splayOrb','workspaceOrb'].forEach(id=>attachResizeHandle(document.getElementById(id),id,true));
}

function positionOrbs(){[['splayOrb',state.ui.splayOrb],['workspaceOrb',state.ui.workspaceOrb]].forEach(([id,pos])=>{const el=document.getElementById(id); if(pos.x!=null){el.style.left=pos.x+'px';el.style.top=(pos.y??(innerHeight-94))+'px';el.style.right='auto';el.style.bottom='auto'}else{el.style.left='auto';el.style.top='auto';el.style.right=(pos.right??28)+'px';el.style.bottom=(pos.bottom??28)+'px'} if(pos.w)el.style.width=pos.w+'px'; if(pos.h)el.style.height=pos.h+'px'});applyFloatState('minimap','minimap');ensureDetailPanelInViewport()}
function touchFloat(el){if(!el)return;zTop++;document.querySelectorAll('[data-float]').forEach(x=>{x.classList.toggle('dimmed',x!==el)});el.classList.add('active');el.style.zIndex=zTop;clearTimeout(window.__dimTimer);window.__dimTimer=setTimeout(()=>{document.querySelectorAll('[data-float]').forEach(x=>x.classList.remove('dimmed','active'))},1000)}
function showDetailPanel(){const p=document.getElementById('detailPanel');p.classList.add('show');applyDetailPanelState();touchFloat(p);updateNodeProjection()}
function initDetailPanelControls(){const p=document.getElementById('detailPanel');if(!p||p.dataset.detailReady)return;p.dataset.detailReady='1';const head=p.querySelector('.panel-head');head.addEventListener('pointerdown',e=>{if(nodeSurfaceFocused)return;if(e.target.closest('button,a,input,textarea,select'))return;touchFloat(p);const r=p.getBoundingClientRect();dragFloat={el:p,key:'detailPanel',ox:e.clientX-r.left,oy:e.clientY-r.top,minW:300,minH:240,headerOnly:true};p.classList.add('float-dragging');document.body.style.userSelect='none';e.preventDefault();e.stopPropagation()});attachResizeHandle(p,'detailPanel',false,{minW:300,minH:240})}
function applyDetailPanelState(){const p=document.getElementById('detailPanel');if(!p||nodeSurfaceFocused)return;const st=state.ui.detailPanel||{};if(st.w)p.style.width=Math.max(300,Math.min(st.w,innerWidth-16))+'px';if(st.h)p.style.height=Math.max(240,Math.min(st.h,innerHeight-16))+'px';if(st.x!=null){p.style.left=st.x+'px';p.style.top=(st.y??92)+'px';p.style.right='auto';p.style.bottom='auto'}ensureDetailPanelInViewport()}
function syncDetailPanelBody(){const p=document.getElementById('detailPanel');const body=document.getElementById('detailBody');if(!p||!body)return;const r=p.getBoundingClientRect();const head=p.querySelector('.panel-head');const headH=head?head.getBoundingClientRect().height:62;const available=Math.min(r.height||innerHeight-r.top-16,innerHeight-r.top-16)-headH;body.style.maxHeight=Math.max(140,available-2)+'px';updateNodeProjection()}
function ensureDetailPanelInViewport(){const p=document.getElementById('detailPanel');if(!p||!p.classList.contains('show')||nodeSurfaceFocused){if(nodeSurfaceFocused)syncDetailPanelBody();return;}let r=p.getBoundingClientRect();let w=Math.min(Math.max(r.width||470,300),innerWidth-16),h=Math.min(Math.max(r.height||240,240),innerHeight-16);if(Math.abs(w-r.width)>1)p.style.width=w+'px';if(p.style.height&&Math.abs(h-r.height)>1)p.style.height=h+'px';r=p.getBoundingClientRect();let left=r.left,top=r.top;const maxLeft=Math.max(8,innerWidth-Math.min(96,r.width));const maxTop=Math.max(8,innerHeight-48);left=Math.max(8,Math.min(left,maxLeft));top=Math.max(8,Math.min(top,maxTop));if(Math.abs(left-r.left)>1||Math.abs(top-r.top)>1){p.style.left=left+'px';p.style.top=top+'px';p.style.right='auto';p.style.bottom='auto';state.ui.detailPanel={...(state.ui.detailPanel||{}),x:left,y:top,w:parseFloat(p.style.width)||undefined,h:parseFloat(p.style.height)||undefined};save()}syncDetailPanelBody()}
function renderMinimap(){
  const m=document.getElementById('minimap');
  if(state.mode!=='workspace')return;
  m.querySelectorAll('.mini-node,.mini-center,.mini-cross-x,.mini-cross-y').forEach(x=>x.remove());
  const r=m.getBoundingClientRect();
  const mw=Math.max(42,r.width),mh=Math.max(42,r.height);
  const center=screenToCanvas(innerWidth/2,innerHeight/2);
  const scale=Math.min(mw/2600,mh/1800);
  const selectedIds=state.selectedNodeIds instanceof Set?state.selectedNodeIds:new Set(state.selectedNodeIds||[]);
  const activeId=state.activeNodeId;
  const toMini=n=>({x:mw/2+(n.x+nodeW(n)/2-center.x)*scale,y:mh/2+(n.y+nodeH(n)/2-center.y)*scale});
  const miniSvg=document.getElementById('miniConnSvg');
  if(miniSvg){miniSvg.innerHTML='';miniSvg.setAttribute('viewBox',`0 0 ${mw} ${mh}`);miniSvg.setAttribute('preserveAspectRatio','none')}
  if(miniSvg){
    const ns='http://www.w3.org/2000/svg';
    activeNodes().forEach(a=>{
      (a.connections||[]).forEach(c=>{
        const b=state.nodes.find(x=>x.id===c.targetId&&x.workspaceId===a.workspaceId);if(!b)return;
        const p1=toMini(a),p2=toMini(b),ct=CONNECTION_TYPES[c.type]||CONNECTION_TYPES.related;
        const active=a.id===activeId||b.id===activeId;
        const selected=selectedIds.has(a.id)||selectedIds.has(b.id);
        const line=document.createElementNS(ns,'line');
        line.setAttribute('x1',p1.x);line.setAttribute('y1',p1.y);line.setAttribute('x2',p2.x);line.setAttribute('y2',p2.y);
        line.setAttribute('class','mini-conn-line'+(active?' mini-conn-active':'')+(!active&&selected?' mini-conn-selected':'')+` mini-conn-${focusSafeClass(c.type||'related')}`);
        line.setAttribute('stroke',active?`rgba(${ct.color},.42)`:'rgba(96,150,165,.24)');
        line.setAttribute('stroke-width',active?'1.05':selected?'.85':'.65');
        line.setAttribute('vector-effect','non-scaling-stroke');
        miniSvg.appendChild(line);
      })
    })
  }
  activeNodes().forEach(n=>{
    const d=document.createElement('div');
    const shape=normalizeShape(n.shape),isCircle=shape==='circle',isActive=n.id===activeId,isSelected=selectedIds.has(n.id);
    let w=Math.max(8,nodeW(n)*scale),h=Math.max(6,nodeH(n)*scale);
    if(isCircle){const s=Math.min(18,Math.max(8,w,h));w=s;h=s}else{w=Math.min(30,w);h=Math.min(19,h)}
    d.className='mini-node mini-shape-'+shape+(isActive?' mini-active':'')+(isSelected?' mini-selected':'')+(n.type==='task'&&String(n.data?.status||'').toLowerCase().includes('done')?' mini-done':'');
    d.style.width=w+'px';d.style.height=h+'px';d.style.borderRadius=isCircle?'50%':shapeRadius(n,w,h);
    const p=toMini(n);d.style.left=p.x+'px';d.style.top=p.y+'px';
    m.appendChild(d);
  });
  const v=document.getElementById('miniView');
  v.style.left=(mw/2-(innerWidth/state.view.scale*scale)/2)+'px';
  v.style.top=(mh/2-(innerHeight/state.view.scale*scale)/2)+'px';
  v.style.width=(innerWidth/state.view.scale*scale)+'px';
  v.style.height=(innerHeight/state.view.scale*scale)+'px';
  const reticle=document.createElement('div');
  reticle.className='mini-center';
  m.appendChild(reticle);
}
function togglePalette(){const p=document.getElementById('palette');p.classList.toggle('show');touchFloat(p);renderCommands();setTimeout(()=>document.getElementById('paletteInput').focus(),30)}
function renderCommands(){const q=(document.getElementById('paletteInput').value||'').toLowerCase();const cmds=[['Home',()=>closeWorkspace()],['Open Vault',()=>toggleVault()],['Activity Log',()=>toggleLog()],['New Workspace',()=>addWorkspace()],['Workspace Settings',()=>openWorkspaceSettings(state.activeWorkspaceId||state.workspaces[0]?.id)],['Add Decision',()=>createNode('decision')],['Add Task',()=>createNode('task')],['Add Note',()=>createNode('note')],['Add Memo',()=>createNode('memo')],['Export JSON',()=>exportJSON()],['Import JSON',()=>document.getElementById('importFile').click()],...state.workspaces.map(w=>['Workspace: '+w.name,()=>openWorkspace(w.id)]),...state.nodes.map(n=>['Node: '+nodeTitle(n),()=>{openWorkspace(n.workspaceId);openDetail(n.id)}])].filter(c=>c[0].toLowerCase().includes(q));document.getElementById('commandList').innerHTML=cmds.slice(0,40).map((c,i)=>`<div class="command-item" data-i="${i}">${esc(c[0])}</div>`).join('');document.querySelectorAll('.command-item').forEach((el,i)=>el.onclick=()=>{document.getElementById('palette').classList.remove('show');cmds[i][1]()})}
document.getElementById('paletteInput').addEventListener('input',renderCommands);document.getElementById('paletteInput').addEventListener('keydown',e=>{if(e.key==='Enter'){const first=document.querySelector('.command-item');if(first)first.click()}})
function toggleLog(){const p=document.getElementById('logDrawer');p.classList.toggle('show');touchFloat(p)}
function toggleVault(){const p=document.getElementById('vaultPanel');p.classList.toggle('show');renderVault();touchFloat(p)}
function exportJSON(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='splay_os_v064_selection_group_'+Date.now()+'.json';a.click();log('JSON Export')}
function importJSON(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{state=migrate(JSON.parse(ev.target.result));log('JSON Import');save();render()}catch(err){alert('Import失敗')}};r.readAsText(f);e.target.value=''}
function resetAll(){if(confirm('初期状態に戻しますか？')){state=defaultState();if(Array.isArray(state.nodes))state.nodes.forEach(n=>{ensureNodeShape(n);ensureNodePresentation(n)});save();render()}}
window.addEventListener('keydown',e=>{
  const tag=(document.activeElement?.tagName||'').toLowerCase();
  const typing=['input','textarea','select'].includes(tag);
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();togglePalette();return}
  if(e.key==='Escape'){
    if(connDrag){cancelConnectionDrag();return}
    if(selectedConnection){clearSelectedConnection();return}
    const palette=document.getElementById('palette');
    if(palette.classList.contains('show')){palette.classList.remove('show');return}
    if(nodeSurfaceFocused){setNodeSurfaceFocus(false,true);return}
    const detail=document.getElementById('detailPanel');
    if(detail.classList.contains('show')){closeDetail();return}
    /* v0.6.4: Escape clears selection */
    if(state.selectedNodeIds&&state.selectedNodeIds.size>0){clearSelection();return}
    hideMenus();
    document.getElementById('createMenu').classList.remove('show');
    document.getElementById('moveToMenu').classList.remove('show');
    closeShapeInspector();closeWorkspaceSettings();closeConfirm();
    return;
  }
  if(!typing&&selectedConnection&&(e.key==='Delete'||e.key==='Backspace')){
    e.preventDefault();removeConnection(selectedConnection.fromId,selectedConnection.connId);selectedConnection=null;return;
  }
  /* v0.6.4: Delete/Backspace on selected nodes (when no connection selected) */
  if(!typing&&!selectedConnection&&(e.key==='Delete'||e.key==='Backspace')){
    if(state.selectedNodeIds&&state.selectedNodeIds.size>0){e.preventDefault();deleteSelected();return;}
  }
  if(typing)return;
  if(e.key.toLowerCase()==='n')createNode('note');
  if(e.key.toLowerCase()==='m')createNode('memo');
  if(e.key.toLowerCase()==='w')toggleWorkspaceMenu(true);
  if(e.key.toLowerCase()==='l')toggleLog();
});

/* === v0.6.4 Selection / Group Engine: additive helper functions === */
/* --- Selection core --- */
function toggleNodeSelection(id){
  if(!state.selectedNodeIds)state.selectedNodeIds=new Set();
  if(state.selectedNodeIds.has(id))state.selectedNodeIds.delete(id);
  else state.selectedNodeIds.add(id);
  renderNodes();updateSelectionToolbar();
}
function clearSelection(){
  if(state.selectedNodeIds)state.selectedNodeIds.clear();
  document.getElementById('selectionToolbar').classList.remove('show');
  document.getElementById('moveToMenu').classList.remove('show');
  renderNodes();
}
function updateSelectionToolbar(){
  const sel=state.selectedNodeIds;
  const tb=document.getElementById('selectionToolbar');
  if(!sel||sel.size===0){tb.classList.remove('show');return}
  /* position toolbar near centroid of selected nodes */
  const nodes=activeNodes().filter(n=>sel.has(n.id));
  if(!nodes.length){tb.classList.remove('show');return}
  document.getElementById('selCount').textContent=sel.size;
  tb.classList.add('show');
  /* centroid in screen coords */
  let cx=0,cy=0;
  nodes.forEach(n=>{
    cx+=(n.x+nodeW(n)/2)*state.view.scale+state.view.x;
    cy+=(n.y+nodeH(n)/2)*state.view.scale+state.view.y;
  });
  cx/=nodes.length; cy/=nodes.length;
  const tw=tb.offsetWidth||280,th=tb.offsetHeight||40;
  const tx=Math.max(8,Math.min(innerWidth-tw-8,cx-tw/2));
  const ty=Math.max(8,Math.min(innerHeight-th-8,cy-th/2-60));
  tb.style.left=tx+'px';tb.style.top=ty+'px';
}
/* --- Range selection --- */
function finishRangeSelection(screenRect){
  if(!state.selectedNodeIds)state.selectedNodeIds=new Set();
  activeNodes().forEach(n=>{
    /* convert node bounds to screen coords */
    const sx=n.x*state.view.scale+state.view.x;
    const sy=n.y*state.view.scale+state.view.y;
    const sw=nodeW(n)*state.view.scale;
    const sh=nodeH(n)*state.view.scale;
    /* check overlap with rubber-band rect */
    if(sx<screenRect.right&&sx+sw>screenRect.left&&sy<screenRect.bottom&&sy+sh>screenRect.top){
      state.selectedNodeIds.add(n.id);
    }
  });
  renderNodes();updateSelectionToolbar();
}
/* --- Group rendering --- */
function renderGroupBoxes(layer){
  const ws=activeWs(); if(!ws)return;
  const wsGroups=(state.groups||[]).filter(g=>g.workspaceId===ws.id);
  wsGroups.forEach(g=>{
    const nodes=state.nodes.filter(n=>g.nodeIds.includes(n.id)&&n.workspaceId===ws.id);
    if(!nodes.length)return;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    nodes.forEach(n=>{minX=Math.min(minX,n.x);minY=Math.min(minY,n.y);maxX=Math.max(maxX,n.x+nodeW(n));maxY=Math.max(maxY,n.y+nodeH(n));});
    const pad=18;
    const box=document.createElement('div');
    box.className='group-bbox';
    box.style.left=(minX-pad)+'px';box.style.top=(minY-pad)+'px';
    box.style.width=(maxX-minX+pad*2)+'px';box.style.height=(maxY-minY+pad*2)+'px';
    layer.appendChild(box);
    const lbl=document.createElement('div');
    lbl.className='group-label';
    lbl.textContent=g.name||'Group';
    lbl.style.left=(minX-pad+6)+'px';lbl.style.top=(minY-pad-14)+'px';
    layer.appendChild(lbl);
  });
}
/* --- Group operations --- */
function nodeGroup(nodeId){return(state.groups||[]).find(g=>g.nodeIds.includes(nodeId))||null;}
function groupNodes(groupId){const g=(state.groups||[]).find(g=>g.id===groupId);return g?state.nodes.filter(n=>g.nodeIds.includes(n.id)):[];}
function groupSelected(){
  if(!state.selectedNodeIds||state.selectedNodeIds.size<2){alert('2つ以上のNodeを選択してGroupを作成してください。');return;}
  const ws=activeWs(); if(!ws)return;
  const nodeIds=[...state.selectedNodeIds];
  const g={id:uid('grp'),name:'Group '+(state.groups.length+1),nodeIds,workspaceId:ws.id,createdAt:Date.now()};
  /* remove these nodes from any existing groups */
  nodeIds.forEach(id=>{state.groups=state.groups.map(gr=>({...gr,nodeIds:gr.nodeIds.filter(nid=>nid!==id)}));});
  state.groups=state.groups.filter(gr=>gr.nodeIds.length>1);
  state.groups.push(g);
  log('Group作成: '+g.name+' ('+nodeIds.length+'個)');
  save();renderNodes();renderLinks();
}
function ungroupSelected(){
  if(!state.selectedNodeIds||state.selectedNodeIds.size===0)return;
  const ids=[...state.selectedNodeIds];
  let disbanded=0;
  state.groups=state.groups.filter(g=>{
    const overlap=g.nodeIds.some(id=>ids.includes(id));
    if(overlap){disbanded++;return false;}
    return true;
  });
  if(disbanded>0)log('Group解除: '+disbanded+'グループ');
  save();renderNodes();renderLinks();
}
/* --- Batch delete --- */
function deleteSelected(){
  if(!state.selectedNodeIds||state.selectedNodeIds.size===0)return;
  const count=state.selectedNodeIds.size;
  showConfirm(count+'個のNodeを削除しますか？\nこの操作は元に戻せません。',()=>{
    const toDelete=[...state.selectedNodeIds];
    toDelete.forEach(id=>{
      state.nodes.forEach(x=>{x.links=(x.links||[]).filter(l=>l!==id);if(Array.isArray(x.connections))x.connections=x.connections.filter(c=>c.targetId!==id);});
      state.groups=state.groups.map(g=>({...g,nodeIds:g.nodeIds.filter(nid=>nid!==id)})).filter(g=>g.nodeIds.length>0);
    });
    state.nodes=state.nodes.filter(n=>!toDelete.includes(n.id));
    if(toDelete.includes(state.activeNodeId))state.activeNodeId=null;
    log(count+'個のNode一括削除');
    clearSelection();
    save();render();
  });
}
/* --- Move to workspace --- */
function showMoveToMenu(e){
  const menu=document.getElementById('moveToMenu');
  if(menu.classList.contains('show')){menu.classList.remove('show');return;}
  menu.innerHTML='';
  const ws=activeWs();
  state.workspaces.filter(w=>w.id!==ws?.id).forEach(w=>{
    const b=document.createElement('button');
    b.textContent=(w.icon||'🪐')+' '+w.name;
    b.onclick=()=>{moveSelectedToWorkspace(w.id);menu.classList.remove('show');};
    menu.appendChild(b);
  });
  if(!menu.children.length){const p=document.createElement('div');p.style.cssText='font-size:11px;color:var(--dim);padding:6px 8px';p.textContent='他のWorkspaceがありません';menu.appendChild(p);}
  /* position near button */
  const br=e.target.getBoundingClientRect();
  menu.style.left=br.left+'px';
  menu.style.top=(br.bottom+6)+'px';
  menu.classList.add('show');
}
function moveSelectedToWorkspace(targetWsId){
  if(!state.selectedNodeIds||state.selectedNodeIds.size===0)return;
  const ids=[...state.selectedNodeIds];
  ids.forEach(id=>{
    const n=state.nodes.find(x=>x.id===id);
    if(n){
      const oldWs=n.workspaceId;
      n.workspaceId=targetWsId;
      /* remove cross-workspace connections */
      n.connections=(n.connections||[]).filter(c=>{
        const t=state.nodes.find(x=>x.id===c.targetId);
        return !t||t.workspaceId===targetWsId;
      });
      n.links=(n.links||[]).filter(lid=>{
        const t=state.nodes.find(x=>x.id===lid);
        return !t||t.workspaceId===targetWsId;
      });
      /* remove from groups in old workspace */
      state.groups=state.groups.map(g=>({...g,nodeIds:g.nodeIds.filter(nid=>nid!==id)})).filter(g=>g.nodeIds.length>0);
    }
  });
  const targetWs=state.workspaces.find(w=>w.id===targetWsId);
  log(ids.length+'個のNodeを'+targetWs?.name+'へ移動');
  clearSelection();
  save();render();
}

function spatialSeeded(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function fitSpatialCanvas(canvas,w,h){const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));canvas.style.width=w+'px';canvas.style.height=h+'px';const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return ctx}
function drawSpatialStars(){const canvas=document.getElementById('spatialStars');if(!canvas)return;const w=innerWidth,h=innerHeight,ctx=fitSpatialCanvas(canvas,w,h),rnd=spatialSeeded(912764);ctx.clearRect(0,0,w,h);const clusters=[{x:.24,y:.18,r:.18,p:.28},{x:.50,y:.16,r:.22,p:.24},{x:.76,y:.18,r:.20,p:.22},{x:.50,y:.43,r:.18,p:.18},{x:.67,y:.70,r:.22,p:.08}];const count=Math.min(2200,Math.max(1100,Math.round(w*h/1050)));for(let i=0;i<count;i++){let x=rnd()*w,y=rnd()*h;if(rnd()<.58){const c=clusters[Math.floor(rnd()*clusters.length)];const a=rnd()*Math.PI*2;const rr=Math.pow(rnd(),1.9)*c.r*Math.max(w,h);x=c.x*w+Math.cos(a)*rr;y=c.y*h+Math.sin(a)*rr*.62}if(x<0||x>w||y<0||y>h)continue;const size=rnd()<.08?1.25+rnd()*1.2:.35+rnd()*1.05;const cool=rnd();const alpha=.22+rnd()*.68;ctx.beginPath();ctx.fillStyle=cool>.72?`rgba(110,210,255,${alpha})`:cool>.5?`rgba(165,150,255,${alpha*.8})`:`rgba(235,252,255,${alpha})`;ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();if(size>1.7){ctx.shadowBlur=10;ctx.shadowColor='rgba(100,235,255,.55)';ctx.fill();ctx.shadowBlur=0}}ctx.globalCompositeOperation='lighter';for(let i=0;i<140;i++){const x=(.16+rnd()*.72)*w,y=(.06+rnd()*.76)*h;ctx.fillStyle=`rgba(40,185,220,${.025+rnd()*.055})`;ctx.beginPath();ctx.ellipse(x,y,18+rnd()*74,1+rnd()*3,rnd()*Math.PI,0,Math.PI*2);ctx.fill()}ctx.globalCompositeOperation='source-over'}
function drawSpatialGround(){const svg=document.getElementById('spatialGround');if(!svg)return;const w=innerWidth,h=innerHeight,ns='http://www.w3.org/2000/svg';svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML='';const vx=w*.5,hy=h*.435;const add=(name,attrs)=>{const el=document.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));svg.appendChild(el);return el};for(let i=-20;i<=20;i++){const bottomX=vx+i*w/20;const op=i===0?.08:(i%5===0?.24:.13);add('line',{x1:vx,y1:hy,x2:bottomX,y2:h+60,stroke:`rgba(40,185,220,${op})`,'stroke-width':i%5===0?1.1:.65,'stroke-linecap':'round'})}for(let i=1;i<=34;i++){const t=i/34;const y=hy+(h-hy)*Math.pow(t,1.72);const half=w*(.035+.78*t);const major=i%5===0;add('line',{x1:vx-half,y1:y,x2:vx+half,y2:y,stroke:`rgba(100,235,255,${major?.22:.10})`,'stroke-width':major?1.05:.55,'stroke-linecap':'round'})}for(let i=0;i<5;i++){const rx=w*(.15+i*.10),ry=h*(.035+i*.026),cy=hy+h*(.18+i*.085);add('ellipse',{cx:vx,cy,rx,ry,fill:'none',stroke:`rgba(100,235,255,${.13-i*.012})`,'stroke-width':i===2?1.1:.75,'stroke-dasharray':i%2?'9 18':'','stroke-linecap':'round'})}add('line',{x1:0,y1:hy,x2:w,y2:hy,stroke:'rgba(100,235,255,.18)','stroke-width':1});for(let i=0;i<5;i++){const x=vx+(i-2)*w*.19,y=hy+h*(.31+i*.08);add('circle',{cx:x,cy:y,r:i===2?2.1:1.5,fill:'rgba(210,255,255,.75)',stroke:'rgba(100,235,255,.3)','stroke-width':12,'stroke-opacity':.08})}}
function drawSpatialParticles(){const canvas=document.getElementById('spatialParticles');if(!canvas)return;const w=innerWidth,h=innerHeight,ctx=fitSpatialCanvas(canvas,w,h),rnd=spatialSeeded(41733),hy=h*.435;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';for(let i=0;i<150;i++){const t=Math.pow(rnd(),.55);const y=hy+(h-hy)*t;const spread=w*(.05+.72*t);const x=w*.5+(rnd()-.5)*spread*2;if(x<0||x>w)continue;const a=.12+rnd()*.42;const r=.45+rnd()*1.4;ctx.fillStyle=`rgba(100,235,255,${a})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}for(let i=0;i<7;i++){const t=.25+rnd()*.65;const x=w*.5+(rnd()-.5)*w*.78*t,y=hy+(h-hy)*t;const g=ctx.createRadialGradient(x,y,0,x,y,22+rnd()*30);g.addColorStop(0,'rgba(210,255,255,.42)');g.addColorStop(.2,'rgba(100,235,255,.18)');g.addColorStop(1,'rgba(100,235,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,48,0,Math.PI*2);ctx.fill()}ctx.globalCompositeOperation='source-over'}
function initSpatialEnvironment(){drawSpatialStars();drawSpatialGround();drawSpatialParticles();applySpatialParallax()}
function applySpatialParallax(){if(!state||!state.view)return;const clamp=(v,m)=>Math.max(-m,Math.min(m,v));document.documentElement.style.setProperty('--spx',clamp(state.view.x,900)+'px');document.documentElement.style.setProperty('--spy',clamp(state.view.y,700)+'px');document.documentElement.style.setProperty('--sps',state.view.scale||1)}
makeOrbDraggable(document.getElementById('splayOrb'),toggleSplayMenu);makeOrbDraggable(document.getElementById('workspaceOrb'),()=>toggleWorkspaceMenu());initFloatingControls();
window.addEventListener('resize',()=>{initSpatialEnvironment();renderMenus();renderMinimap();positionOrbs();ensureDetailPanelInViewport();updateNodeProjection();if(shapeInspectorNodeId)positionShapeInspector(shapeInspectorNodeId)});
initSpatialEnvironment();render();save();
