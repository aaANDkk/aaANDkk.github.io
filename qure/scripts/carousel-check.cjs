const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const names=['DeepSeek','Twitter','Notion','Anime','GitLab','AdBlock','Bahamut','Cloudflare','Reddit','Discord','Steam','Linear','Obsidian','Twitch'];
const image={dataset:{feature:'DeepSeek'},parentElement:{listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setAttribute(){}}};
const label={textContent:'DeepSeek'};
const hero={querySelectorAll:()=>[image,{dataset:{feature:'Cloudflare'}},{dataset:{feature:'Antigravity'}}],getBoundingClientRect:()=>({top:0,bottom:500})};
const document={hidden:false,getElementById:id=>id==='showcase-selected-icon'?image:label,querySelector:s=>s==='.hero-art'?hero:null,addEventListener(){}};
const activeUrls=new Set();let next=0,requests=0,tick,interval;
const sandbox={document,window:{innerHeight:800,matchMedia:()=>({matches:false})},state:{icons:names.map(name=>({name,category:'common',image:`https://example.test/${name}.svg`}))},RAW:'https://example.test/',Blob,AbortSignal,
  URL:{createObjectURL(){const url=`blob:cached-${++next}`;activeUrls.add(url);return url;},revokeObjectURL:url=>activeUrls.delete(url)},
  Image:class{async decode(){return;}},
  fetch:async url=>{requests++;return {ok:!url.includes('/GitLab.svg'),text:async()=>'<svg xmlns="http://www.w3.org/2000/svg"></svg>'};},
  setInterval(fn,ms){tick=fn;interval=ms;return 1;}
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../hero-carousel.js'),'utf8'),sandbox);
(async()=>{
  await new Promise(setImmediate);
  assert.equal(activeUrls.size,10,'retain exactly ten decoded SVG URLs');
  assert.equal(interval,1500);
  assert.equal(image.dataset.preloaded,'true');
  const networkRequests=requests;
  const shown=new Set();
  for(let i=0;i<20;i++){tick();shown.add(image.dataset.feature);assert.ok(image.src.startsWith('blob:'));}
  assert.equal(shown.size,10,'cycle only the ten cached icons');
  assert.equal(requests,networkRequests,'rotation never requests another SVG');
  for(const name of ['Twitter','Anime','AdBlock','Bahamut'])assert.ok(shown.has(name),`new rotation icon: ${name}`);
  assert.ok(!shown.has('Cloudflare'),'exclude icons already visible');
  assert.ok(!shown.has('GitLab'),'skip failed downloads and use a reserve');
  assert.ok(![...shown].some(name=>/Taiwan|United_|Japan/.test(name)),'no flags enter pool');
  const current=label.textContent;image.parentElement.listeners.pointerenter();tick();assert.equal(label.textContent,current);image.parentElement.listeners.pointerleave();
  document.hidden=true;tick();assert.equal(label.textContent,current);
  console.log('PASS: ten decoded memory-cached SVGs, 1500ms interval, no rotation network requests, duplicate exclusion, failed-source reserve, no flags, hover/visibility pause.');
})().catch(error=>{console.error(error);process.exitCode=1;});
