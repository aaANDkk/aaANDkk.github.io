// Offline behavior checks. No network access or copied SVG files required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
class Element {
  constructor() { this.children=[]; this.dataset={}; this.style={}; this.hidden=false; this.value=''; this.attributes={}; this.listeners={}; this.classList={add(){},remove(){},toggle(){}}; }
  setAttribute(k,v){this.attributes[k]=v;}
  append(...children){for(const c of children)if(c?.isFragment)this.children.push(...c.children);else this.children.push(c);}
  replaceChildren(...children){this.children=[];this.append(...children);}
  querySelector(){return new Element();}
  querySelectorAll(selector){const result=[];const visit=node=>{for(const child of node.children||[]){if(selector==='button' && child.tagName==='BUTTON')result.push(child);visit(child);}};visit(this);return result;}
  addEventListener(type,handler){(this.listeners[type] ||= []).push(handler);}
  setPointerCapture(){}
  focus(){}
  select(){}
  scrollIntoView(){}
  after(){}
  click(){if(this.onclick)this.onclick();}
  remove(){}
  getBoundingClientRect(){return {left:0,top:0,width:400,height:300};}
  showModal(){this.open=true;}
  close(){this.open=false;for(const handler of this.listeners.close||[])handler();}
}
const elements = new Map();
const document = {
  getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},
  querySelectorAll(){return [];},createElement(tag){const element=new Element();element.tagName=tag.toUpperCase();return element;},
  createDocumentFragment(){const fragment=new Element();fragment.isFragment=true;return fragment;},listeners:{},body:new Element(),
  addEventListener(type,handler){(this.listeners[type] ||= []).push(handler);},
  dispatchEvent(event){for(const handler of this.listeners[event.type]||[])handler(event);},hidden:false
};
const fixtures = ['icon/svg/common/Claude.svg','icon/svg/common/ChatGPT.svg','icon/svg/flag/Japan.svg','icon/svg/flag/United_States.svg','docs/assets/overview.svg'];
let failTree=false,failAll=false;
const storage = new Map();
const viewport = {scrollX:0,scrollY:640,scrollTo(position){this.scrollX=position.left;this.scrollY=position.top;}};
const sandbox = {
  window:viewport,requestAnimationFrame:callback=>callback(),
  document,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setInterval(){},setTimeout(){},clearTimeout(){},console,URL,AbortSignal,Event,CustomEvent,Blob,
  fetch:async url=>{
    if(failAll)throw new Error('offline');
    if(url.includes('README.md'))return {ok:true,text:async()=>'<img src="Japan.svg" width="56" alt="日本">'};
    if(url.includes('api.github.com')){if(failTree)throw new Error('rate limit');return {ok:true,json:async()=>({tree:fixtures.map(path=>({path,type:'blob',sha:'abc123'}))})};}
    return {ok:true,json:async()=>({icons:fixtures.map(p=>({url:`https://raw.githubusercontent.com/aaANDkk/Qure_Style_SVG/main/${p}`}))})};
  }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),sandbox);
const run = expression=>vm.runInContext(expression,sandbox);
(async()=>{
  // Drain initial data sync and asynchronous name index reads.
  for(let i=0;i<20;i++)await Promise.resolve();
  assert.equal(run('state.icons.length'),4,'exclude non-icon SVGs');
  assert.equal(run('state.icons[0].image.includes("abc123")'),true,'version SVG requests by content SHA');
  run('state.query="claude"'); assert.equal(run('filtered().length'),1);
  run('render()');assert.equal(document.getElementById('grid').children[0].style.animation,'none','filtering must not replay card entrance motion');
  run('state.query="日本"'); assert.equal(run('filtered()[0].name'),'Japan');
  run('state.query="";state.category="flag"'); assert.equal(run('filtered().length'),2);
  run('state.category="all";state.sort="za"'); assert.equal(run('filtered()[0].name'),'United_States');
  run('changeCategory("flag")');assert.equal(viewport.scrollY,640,'category change preserves viewport position');
  run('changeCategory("all")');assert.equal(viewport.scrollY,640);
  run('state.query="no match";render()');document.getElementById('reset').click();assert.equal(run('filtered().length'),4,'reset still works when all category is already active');
  run('showPreview(state.icons[0]);document.getElementById("zoom").value=320;setZoom()'); assert.equal(document.getElementById('preview-image').style.width,'320px');
  document.getElementById('zoom-in').click();assert.equal(Number(document.getElementById('zoom').value),384);
  document.getElementById('zoom-out').click();assert.equal(Number(document.getElementById('zoom').value),320);
  const stage=document.getElementById('preview-stage');
  const fire=(type,event)=>{for(const handler of stage.listeners[type]||[])handler({preventDefault(){},pointerType:'mouse',button:0,...event});};
  run('resetView()');
  fire('pointerdown',{pointerId:1,clientX:200,clientY:150});
  fire('pointermove',{pointerId:1,clientX:250,clientY:170});
  assert.equal(run('view.x'),50); assert.equal(run('view.y'),20);
  fire('pointerup',{pointerId:1}); assert.equal(run('view.pointers.size'),0);
  run('resetView();zoomAt(360,{x:100,y:0})');
  assert.equal(run('view.x'),-100,'wheel zoom preserves point under cursor');
  run('resetView()');
  fire('pointerdown',{pointerId:1,clientX:100,clientY:150});
  fire('pointerdown',{pointerId:2,clientX:300,clientY:150});
  fire('pointermove',{pointerId:2,clientX:320,clientY:150});
  assert.equal(Number(document.getElementById('zoom').value),198,'pinch zoom uses finger distance');
  assert.equal(run('view.x'),10,'pinch follows midpoint');
  fire('pointercancel',{pointerId:1});fire('pointercancel',{pointerId:2});
  assert.equal(run('view.pointers.size'),0);
  run('zoomAt(99999)');assert.equal(Number(document.getElementById('zoom').value),1024);
  run('resetView();stepPreview(1)');assert.equal(run('state.current.name'),'ChatGPT');
  failTree=true; const fallback=await run('getIcons()'); assert.equal(fallback.fallback,true);assert.equal(fallback.icons.length,4);
  failTree=false;
  let clearedCaches=0;
  sandbox.caches={keys:async()=>['qure-v1'],delete:async()=>{clearedCaches++;return true;}};
  document.getElementById('refresh-cache').click();
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(clearedCaches,1,'refresh cache button clears browser Cache Storage');
  assert.equal(run('state.cacheBust > 0'),true,'refresh cache sets cache-busting timestamp');
  assert.equal(run('state.icons[0].image.includes("raw.githubusercontent.com") && state.icons[0].image.includes("&t=")'),true,'refresh cache bypasses CDN cache with timestamped raw URLs');
  assert.equal(document.getElementById('refresh-cache').disabled,false,'refresh cache button re-enables after completion');
  failAll=true;await run('sync()');assert.equal(run('state.icons.length'),4,'failed refresh preserves loaded icons');assert.equal(document.getElementById('error').hidden,false);
  failAll=false;

  // Verify incremental #more append keeps existing card nodes untouched.
  const bulk=Array.from({length:120},(_,i)=>({path:`icon/svg/common/Icon${i}.svg`,type:'blob',sha:`sha${i}`}));
  const bulkElements=new Map();
  const bulkDocument={
    getElementById(id){if(!bulkElements.has(id))bulkElements.set(id,new Element());return bulkElements.get(id);},
    querySelectorAll(){return [];},createElement(tag){const e=new Element();e.tagName=tag.toUpperCase();return e;},
    createDocumentFragment(){const f=new Element();f.isFragment=true;return f;},listeners:{},body:new Element(),
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},dispatchEvent(){},hidden:false
  };
  let workerStale=true;
  const bulkSandbox={
    window:{scrollX:0,scrollY:0,scrollTo(){}},requestAnimationFrame:cb=>cb(),document:bulkDocument,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setInterval(){},setTimeout(){},clearTimeout(){},console,URL,AbortSignal,Event,CustomEvent,Blob,
    fetch:async url=>{
      if(url.includes('README.md'))return {ok:true,text:async()=>''};
      if(url.includes('qure-tree'))return {ok:true,json:async()=>({syncedAt:100,tree:fixtures.map(p=>({path:p,type:'blob',sha:'old'}))})};
      if(url.includes('api.github.com'))return {ok:true,json:async()=>({tree:workerStale?fixtures.map(p=>({path:p,type:'blob',sha:'old'})):bulk})};
      return {ok:true,json:async()=>({icons:[]})};
    }
  };
  vm.createContext(bulkSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),bulkSandbox);
  for(let i=0;i<20;i++)await Promise.resolve();
  workerStale=false;
  bulkDocument.getElementById('refresh-cache').click();
  for(let i=0;i<30;i++)await Promise.resolve();
  const gridEl=bulkDocument.getElementById('grid');
  assert.equal(gridEl.children.length,84,'initial page shows PAGE_SIZE cards');
  const firstCardRef=gridEl.children[0];
  bulkDocument.getElementById('more').click();
  assert.equal(gridEl.children.length,120,'load more appends remaining icons');
  assert.equal(gridEl.children[0],firstCardRef,'load more preserves existing card DOM nodes');

  // Reopen in a new session sharing localStorage; even if GitHub fails and Worker returns stale cache, keep refreshed icons & cacheBust.
  const reloadElements=new Map();
  const reloadDocument={
    getElementById(id){if(!reloadElements.has(id))reloadElements.set(id,new Element());return reloadElements.get(id);},
    querySelectorAll(){return [];},createElement(tag){const e=new Element();e.tagName=tag.toUpperCase();return e;},
    createDocumentFragment(){const f=new Element();f.isFragment=true;return f;},listeners:{},body:new Element(),
    addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);},dispatchEvent(){},hidden:false
  };
  const reloadSandbox={
    window:{scrollX:0,scrollY:0,scrollTo(){}},requestAnimationFrame:cb=>cb(),document:reloadDocument,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    setInterval(){},setTimeout(){},clearTimeout(){},console,URL,AbortSignal,Event,CustomEvent,Blob,
    fetch:async url=>{
      if(url.includes('README.md'))return {ok:true,text:async()=>''};
      if(url.includes('qure-tree'))return {ok:true,json:async()=>({syncedAt:100,tree:fixtures.map(p=>({path:p,type:'blob',sha:'old'}))})};
      if(url.includes('api.github.com'))throw new Error('rate limit');
      return {ok:true,json:async()=>({icons:[]})};
    }
  };
  vm.createContext(reloadSandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),reloadSandbox);
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(vm.runInContext('state.icons.length',reloadSandbox),120,'reopening preserves refreshed icon count over stale Worker cache');
  assert.equal(vm.runInContext('state.cacheBust > 0 && state.icons[0].image.includes("&t=")',reloadSandbox),true,'reopening preserves cache-busting raw URLs');
  assert.equal(run('makeIcon("docs/test.svg")'),null);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(!fs.existsSync(path.join(__dirname,'../playground.js')),'playground script removed');
  assert.ok(!/id="playground"|id="try-icon"|id="clash-window"/.test(html),'playground DOM removed');
  assert.ok(html.includes('guide-json-url'),'real icon set subscription remains available');
  assert.ok(!/favorite|收藏/.test(html),'favorite feature removed');
  for(const id of elements.keys())assert.ok(html.includes(`id="${id}"`),`DOM element ${id} exists`);
  console.log('PASS: gallery search/sort, source fallback, preview drag/zoom/pinch, playground removed, DOM references.');
})().catch(error=>{console.error(error);process.exitCode=1;});
