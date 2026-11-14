// Offline behavior checks. No network access or copied SVG files required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
class Element {
  constructor() { this.children=[]; this.dataset={}; this.style={}; this.hidden=false; this.value=''; this.attributes={}; this.listeners={}; this.classList={add(){},remove(){},toggle(){}}; }
  setAttribute(k,v){this.attributes[k]=v;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
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
  createDocumentFragment(){return new Element();},listeners:{},body:new Element(),
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
  run('render()');assert.equal(document.getElementById('grid').children[0].children[0].style.animation,'none','filtering must not replay card entrance motion');
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
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../playground.js'),'utf8'),sandbox);
  const getDesign=()=>JSON.parse(storage.get('qure-playground-v1'));
  const node=id=>document.getElementById(id);
  const input=(id,value)=>{const element=node(id);element.value=value;for(const handler of element.listeners.input||[])handler();};
  assert.equal(getDesign().groups[0].name,'Proxy');assert.equal(getDesign().groups[1].name,'Adblock');
  assert.equal(getDesign().groups.length,15);
  if (process.env.QURE_SOURCE_DIR) for (const group of getDesign().groups) assert.ok(fs.existsSync(path.join(process.env.QURE_SOURCE_DIR,group.path)),`preset icon exists: ${group.path}`);
  const originalIcon=getDesign().groups[0].path;
  node('chosen-icon').click();assert.equal(node('icon-dialog').open,true);
  node('icon-picker').querySelectorAll('button')[0].click();
  assert.equal(getDesign().groups[0].path,originalIcon,'picker stages a choice without applying');
  node('close-icon-dialog').click();assert.equal(getDesign().groups[0].path,originalIcon,'cancel preserves previous icon');
  node('chosen-icon').click();node('icon-picker').querySelectorAll('button')[0].click();node('apply-icon').click();
  assert.equal(getDesign().groups[0].path,'icon/svg/common/ChatGPT.svg');assert.equal(node('icon-dialog').open,false);
  node('add-group').click();assert.equal(getDesign().groups.length,16);
  input('group-name','Custom Group');node('group-route').value='DIRECT';node('group-route').onchange();
  assert.equal(getDesign().groups[15].name,'Custom Group');assert.equal(getDesign().groups[15].route,'DIRECT');
  document.dispatchEvent(new CustomEvent('qure-try-icon',{detail:'icon/svg/common/Claude.svg'}));
  assert.equal(getDesign().groups[15].path,'icon/svg/common/Claude.svg');
  node('group-up').click();assert.equal(getDesign().groups[14].name,'Custom Group');
  node('group-down').click();assert.equal(getDesign().groups[15].name,'Custom Group');
  node('studio-dark').click();assert.equal(getDesign().theme,'dark');assert.equal(node('clash-window').dataset.theme,'dark');
  node('remove-group').click();assert.equal(getDesign().groups.length,15);
  for(let i=0;i<15;i++)node('remove-group').click();
  assert.equal(getDesign().groups.length,0);assert.equal(node('editor-empty').hidden,false);
  node('add-first').click();assert.equal(getDesign().groups.length,1);
  node('confirm-reset').click();assert.equal(getDesign().groups.length,15);
  input('group-name','Saved locally');
  node('group-route').value='DIRECT';node('group-route').onchange();
  const savedDesign=storage.get('qure-playground-v1');
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../playground.js'),'utf8'),sandbox);
  assert.equal(node('group-name').value,'Saved locally','persisted design survives reinitialization');
  assert.equal(getDesign().groups[0].route,'DIRECT');
  storage.set('qure-playground-v1',JSON.stringify({version:1,groups:[{name:'Bad',path:'https://evil.test/a.svg',route:'Proxy'}]}));
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../playground.js'),'utf8'),sandbox);
  assert.equal(getDesign().groups.length,15,'invalid local data falls back to defaults');
  storage.set('qure-playground-v1',savedDesign);
  failTree=true; const fallback=await run('getIcons()'); assert.equal(fallback.fallback,true);assert.equal(fallback.icons.length,4);
  failAll=true;await run('sync()');assert.equal(run('state.icons.length'),4,'failed refresh preserves loaded icons');assert.equal(document.getElementById('error').hidden,false);
  assert.equal(run('makeIcon("docs/test.svg")'),null);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.ok(!/export-design|import-design/.test(html),'setup file controls removed');
  assert.ok(!/exportDesign|application\/json/.test(fs.readFileSync(path.join(__dirname,'../playground.js'),'utf8')),'setup file handlers removed');
  assert.ok(html.includes('guide-json-url'),'real icon set subscription remains available');
  assert.ok(!/favorite|收藏/.test(html),'favorite feature removed');
  for(const id of elements.keys())assert.ok(html.includes(`id="${id}"`),`DOM element ${id} exists`);
  console.log('PASS: gallery search/sort, source fallback, preview drag/zoom/pinch, studio presets, add/delete/rename/reorder, apply icon, theme, empty state, restore, local data validation, local persistence, DOM references.');
})().catch(error=>{console.error(error);process.exitCode=1;});
