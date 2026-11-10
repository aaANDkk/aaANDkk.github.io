'use strict';
(() => {
  const canvas=document.createElement('canvas');
  canvas.className='ambient-canvas';canvas.setAttribute('aria-hidden','true');
  document.body.prepend(canvas);
  const ctx=canvas.getContext('2d');
  if(!ctx){canvas.remove();return;}
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors=['#c0a16d','#c5b08d','#a9ae93','#b89576','#cfbb98'];
  let width=0,height=0,particles=[],frame=0,last=0;
  function measure(){
    const nextWidth=window.innerWidth,nextHeight=window.innerHeight;
    if(nextWidth===width && nextHeight===height)return;
    width=nextWidth;height=nextHeight;
    const ratio=Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(2000000/Math.max(1,width*height)));
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    const count=Math.max(24,Math.min(90,Math.round(width*height/17000)));
    if(!particles.length)particles=Array.from({length:count},(_,i)=>({x:Math.random()*width,y:Math.random()*height,length:14+Math.random()*36,thickness:3+Math.random()*3,speed:9+Math.random()*15,color:colors[i%colors.length],phase:Math.random()*Math.PI*2}));
  }
  function draw(time,delta){
    ctx.clearRect(0,0,width,height);
    particles.forEach(p=>{
      p.x+=p.speed*delta*.85;p.y-=p.speed*delta*.53;
      if(p.x>width+70)p.x=-70;
      if(p.y<-70)p.y=height+70;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-Math.PI/6);
      ctx.globalAlpha=.16+.13*(1+Math.sin(time*.00065+p.phase))/2;
      ctx.fillStyle=p.color;
      ctx.beginPath();ctx.roundRect(-p.length/2,-p.thickness/2,p.length,p.thickness,p.thickness/2);ctx.fill();
      if(p.length>35){ctx.globalAlpha*=.55;ctx.beginPath();ctx.roundRect(-p.length/2+7,7,p.length*.4,3,1.5);ctx.fill();}
      ctx.restore();
    });
  }
  function tick(time){
    frame=0;
    if(document.hidden || motion.matches)return;
    draw(time,last ? Math.min((time-last)/1000,.05) : 0);last=time;
    frame=requestAnimationFrame(tick);
  }
  function resume(){
    cancelAnimationFrame(frame);frame=0;last=0;
    if(motion.matches){draw(0,0);return;}
    if(!document.hidden)frame=requestAnimationFrame(tick);
  }
  let resizeFrame=0;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{measure();draw(0,0);});},{passive:true});
  document.addEventListener('visibilitychange',resume);
  motion.addEventListener('change',resume);
  measure();draw(0,0);resume();
})();
