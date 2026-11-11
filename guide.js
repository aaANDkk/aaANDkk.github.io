'use strict';
(() => {
  const root=document.getElementById('usage');
  if(!root)return;
  const tabs=[...root.querySelectorAll('[role="tab"]')];
  const panels=[...root.querySelectorAll('[role="tabpanel"]')];
  const nav=root.querySelector('.guide-nav');
  const ink=document.createElement('span');
  ink.className='guide-ink';ink.setAttribute('aria-hidden','true');nav.prepend(ink);
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animations=[];
  function placeInk(){
    const tab=tabs.find(item=>item.getAttribute('aria-selected')==='true');
    if(!tab)return;
    ink.style.width=`${tab.offsetWidth}px`;ink.style.height=`${tab.offsetHeight}px`;
    ink.style.transform=`translate(${tab.offsetLeft}px,${tab.offsetTop}px)`;
  }
  function enter(panel){
    animations.forEach(animation=>animation.cancel());animations=[];
    if(reduced())return;
    const items=[...panel.querySelectorAll('.guide-kicker, h3, :scope > p:not(.guide-note), .guide-steps li, .guide-snippet, .guide-note')];
    items.forEach((item,index)=>{
      if(item.animate)animations.push(item.animate([
        {opacity:0,transform:'translateY(12px)'},
        {opacity:1,transform:'translateY(0)'}
      ],{duration:480,delay:index*38,fill:'backwards',easing:'cubic-bezier(.22,1,.36,1)'}));
    });
  }
  function select(tab,focus=false){
    if(tab.getAttribute('aria-selected')==='true')return;
    tabs.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;});
    const panel=panels.find(item=>item.id===tab.getAttribute('aria-controls'));
    panels.forEach(item=>item.hidden=item!==panel);
    if(focus)tab.focus({preventScroll:true});
    placeInk();enter(panel);
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>select(tab));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight' || event.key==='ArrowDown')next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft' || event.key==='ArrowUp')next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=tabs.length-1;
      if(next!==undefined){event.preventDefault();select(tabs[next],true);}
    });
  });
  if(typeof ResizeObserver==='function')new ResizeObserver(placeInk).observe(nav);
  window.addEventListener('resize',placeInk,{passive:true});placeInk();
  if(typeof IntersectionObserver==='function'){
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        enter(panels.find(panel=>!panel.hidden));observer.disconnect();
      }
    },{threshold:.15});observer.observe(nav);
  }
  root.querySelectorAll('[data-guide-copy]').forEach(button=>{
    let reset=0;
    const original=button.textContent;
    button.addEventListener('click',async()=>{
      const content=root.querySelector(`#${button.dataset.guideCopy}`);
      try{
        await navigator.clipboard.writeText(content.textContent);
        clearTimeout(reset);button.textContent='已复制 ✓';button.classList.add('is-copied');
        if(!reduced() && button.animate)button.animate([{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
        reset=setTimeout(()=>{button.textContent=original;button.classList.remove('is-copied');},2200);
        toast('已复制，可粘贴到客户端使用。');
      }catch{toast('复制失败，请长按或选中下方内容手动复制。');}
    });
  });
})();
