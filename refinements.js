'use strict';
(() => {
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.topbar');
  const nav = header?.querySelector('nav');
  const links = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
  const sections = links.map(link=>document.querySelector(link.getAttribute('href')));
  let activeLink = null;
  let hoveredLink = null;
  let queued = false;
  if (header && nav) {
    const ink = document.createElement('span'); ink.className='nav-ink'; ink.setAttribute('aria-hidden','true'); nav.prepend(ink);
    const progress = document.createElement('span'); progress.className='reading-progress'; progress.setAttribute('aria-hidden','true'); header.append(progress);
    function placeInk(target) {
      ink.classList.toggle('is-visible',Boolean(target));
      if (!target) return;
      ink.style.width=`${target.offsetWidth}px`;
      ink.style.height=`${target.offsetHeight}px`;
      ink.style.transform=`translate(${target.offsetLeft}px,${target.offsetTop}px)`;
    }
    links.forEach(link=>{
      link.addEventListener('pointerenter',()=>{hoveredLink=link;placeInk(link);});
      link.addEventListener('focus',()=>placeInk(link));
      link.addEventListener('blur',()=>placeInk(activeLink));
    });
    nav.addEventListener('pointerleave',()=>{hoveredLink=null;placeInk(activeLink);});
    function updateHeader() {
      queued=false;
      header.classList.toggle('is-scrolled',window.scrollY>18);
      const max=document.documentElement.scrollHeight-window.innerHeight;
      progress.style.transform=`scaleX(${max>0 ? Math.min(1,Math.max(0,window.scrollY/max)) : 0})`;
      let current=null;
      sections.forEach((section,index)=>{if(section && section.getBoundingClientRect().top<=150)current=links[index];});
      if(current!==activeLink){
        activeLink=current;
        links.forEach(link=>{link.classList.toggle('is-current',link===current);if(link===current)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
      }
      placeInk(hoveredLink||activeLink);
    }
    window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateHeader);}},{passive:true});
    window.addEventListener('resize',updateHeader);
    updateHeader();
  }
  // The highlight moves independently; buttons and the document never move.
  document.querySelectorAll('.tabs').forEach(tabs=>{
    const ink=document.createElement('span');ink.className='tab-ink';ink.setAttribute('aria-hidden','true');tabs.prepend(ink);tabs.classList.add('has-tab-ink');
    const position=()=>{
      const selected=tabs.querySelector('button.active');if(!selected)return;
      ink.style.width=`${selected.offsetWidth}px`;ink.style.height=`${selected.offsetHeight}px`;ink.style.transform=`translate(${selected.offsetLeft}px,${selected.offsetTop}px)`;
    };
    tabs.querySelectorAll('button').forEach(button=>button.addEventListener('click',position));
    if(typeof ResizeObserver==='function')new ResizeObserver(position).observe(tabs);
    position();
  });
  const hero=document.querySelector('.hero-art');
  if(hero){
    const flow=document.createElement('div');flow.className='hero-flow';flow.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++){const layer=document.createElement('i');layer.className=`flow-layer flow-layer-${i+1}`;flow.append(layer);}
    const field=document.createElement('div');field.className='hero-field';field.setAttribute('aria-hidden','true');
    for(let i=0;i<18;i++){
      const stroke=document.createElement('i');stroke.style.left=`${(i*37+9)%95}%`;stroke.style.top=`${(i*29+4)%92}%`;
      stroke.style.setProperty('--stroke-delay',`${-(i%7)*1.3}s`);stroke.style.setProperty('--stroke-length',`${i%3===0 ? 34 : i%3===1 ? 20 : 7}px`);field.append(stroke);
    }
    hero.prepend(flow,field);
    let onScreen=true;
    const pause=()=>hero.classList.toggle('field-paused',!onScreen || document.hidden);
    if(typeof IntersectionObserver==='function'){
      const observer=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;pause();},{rootMargin:'80px'});
      observer.observe(hero);
    }
    document.addEventListener('visibilitychange',pause);
    pause();
  }
  // Animate only the initial heading, never the filter results or layout dimensions.
  const heading=document.querySelector('#hero-title');
  if(heading && !reduced() && typeof heading.animate==='function'){
    heading.querySelectorAll('.title-line').forEach((line,index)=>line.animate([
      {opacity:0,transform:'translateY(16px)',filter:'blur(4px)'},
      {opacity:1,transform:'translateY(0)',filter:'blur(0)'}
    ],{duration:850,delay:120+index*120,fill:'backwards',easing:'cubic-bezier(.2,.8,.2,1)'}));
  }
})();
