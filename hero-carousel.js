'use strict';
(() => {
  const image=document.getElementById('showcase-selected-icon');
  const label=document.getElementById('showcase-selected-name');
  const hero=document.querySelector('.hero-art');
  if(!image || !label || !hero)return;
  // Only common icons are considered: no flags, including Taiwan, can enter this pool.
  const candidates=['DeepSeek','Twitter','Notion','Anime','GitLab','AdBlock','Bahamut','Cloudflare','Reddit','Discord','Steam','Linear','Obsidian','Twitch'];
  const visible=new Set([...hero.querySelectorAll('[data-feature]')].filter(node=>node!==image).map(node=>node.dataset.feature.toLowerCase()));
  const names=candidates.filter(name=>!visible.has(name.toLowerCase())).slice(0,14);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let cache=[],index=0,loading=false,held=false,signature='';
  let timer=0;
  function source(name){return state.icons.find(icon=>icon.category==='common' && icon.name===name)?.image || `${RAW}icon/svg/common/${encodeURIComponent(name)}.svg`;}
  function sourceSignature(){return names.map(name=>`${name}:${source(name)}`).join('|');}
  async function prepare(name){
    const response=await fetch(source(name),{cache:'force-cache',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('Icon preload failed');
    const text=await response.text();
    if(!/<svg[\s>]/i.test(text))throw new Error('Not an SVG');
    const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
    const decoded=new Image();
    try{
      decoded.src=url;
      await decoded.decode();
      return {name,url,decoded};
    }catch(error){URL.revokeObjectURL(url);throw error;}
  }
  function show(record,animate=true){
    image.dataset.feature=record.name;
    image.dataset.preloaded='true';
    image.dataset.group='common';
    image.src=record.url;image.alt=record.name;
    label.textContent=record.name;
    image.parentElement.setAttribute('aria-label',`预览 ${record.name}`);
    if(animate && !reduced.matches && typeof image.animate==='function')image.animate([{opacity:.55,scale:.97},{opacity:1,scale:1}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function advance(){
    if(cache.length<2 || document.hidden || reduced.matches || held || loading || document.querySelector('dialog[open]'))return;
    const box=hero.getBoundingClientRect();
    if(box.bottom<0 || box.top>window.innerHeight)return;
    index=(index+1)%cache.length;
    show(cache[index]);
  }
  async function preload(){
    if(loading)return;
    loading=true;
    const prepared=[];let next=0;
    const planned=names.slice(0,10);
    // Four parallel requests; failed assets are replaced by reserve candidates.
    async function worker(){
      while(next<planned.length){
        const name=planned[next++];
        try{
          const record=await prepare(name);
          prepared.push(record);
        }catch{/* A broken image is never displayed. Keep the existing decoded image. */}
      }
    }
    await Promise.all(Array.from({length:4},worker));
    for(const name of names.slice(10)){
      if(prepared.length>=10)break;
      try{prepared.push(await prepare(name));}catch{/* Try the next reserve. */}
    }
    if(prepared.length){
      prepared.sort((a,b)=>names.indexOf(a.name)-names.indexOf(b.name));
      const previous=cache;
      cache=prepared;index=0;
      show(cache[0],false);
      // Blob URLs keep SVG bytes and the decoded images in session memory only.
      previous.forEach(record=>URL.revokeObjectURL(record.url));
    }
    signature=sourceSignature();loading=false;
    if(!timer && cache.length>1)timer=setInterval(advance,1500);
  }
  image.parentElement.addEventListener('pointerenter',()=>held=true);
  image.parentElement.addEventListener('pointerleave',()=>held=false);
  image.parentElement.addEventListener('focus',()=>held=true);
  image.parentElement.addEventListener('blur',()=>held=false);
  document.addEventListener('qure-icons-updated',()=>{if(signature && !loading && sourceSignature()!==signature)preload();});
  preload();
})();
