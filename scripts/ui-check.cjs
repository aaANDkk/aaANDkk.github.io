const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const document={activeElement:null,listeners:{}};
class Node {
  constructor(){this.children=[];this.style={};this.attrs={};this.listeners={};this.hidden=false;this.textContent='';const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)};}
  setAttribute(k,v){this.attrs[k]=v;}
  append(...nodes){this.children.push(...nodes);}
  after(node){this.afterNode=node;}
  addEventListener(type,fn){(this.listeners[type] ||= []).push(fn);}
  dispatchEvent(event){if(event.type==='change')this.onchange?.(event);for(const fn of this.listeners[event.type]||[])fn(event);}
  focus(){document.activeElement=this;}
  closest(){return null;}
  contains(target){return target===this || this.children.some(child=>child.contains?.(target));}
  getBoundingClientRect(){return {bottom:80};}
  click(){this.onclick?.();}
}
const select=new Node();select.id='group-route';select.options=['Proxy','DIRECT','REJECT'].map(text=>({textContent:text,value:text}));select.value='DIRECT';
Object.defineProperty(select,'selectedIndex',{get(){return select.options.findIndex(option=>option.value===select.value);}});
document.querySelectorAll=selector=>selector==='select'?[select]:[];
document.createElement=document.createElementNS=()=>new Node();
document.addEventListener=(type,fn)=>{(document.listeners[type] ||= []).push(fn);};
document.dispatchEvent=event=>{for(const fn of document.listeners[event.type]||[])fn(event);};
const window={innerHeight:800,addEventListener(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../ui.js'),'utf8'),{document,window,Event,setTimeout,clearTimeout});
const wrapper=select.afterNode;
const [trigger,panel]=wrapper.children;
const items=panel.children[0].children;
assert.equal(trigger.children[0].textContent,'DIRECT');
trigger.click();assert.equal(panel.hidden,false);assert.equal(trigger.attrs['aria-expanded'],'true');assert.equal(document.activeElement,items[1]);
const key=key=>{for(const fn of panel.listeners.keydown||[])fn({key,preventDefault(){},stopPropagation(){}});};
key('End');assert.equal(document.activeElement,items[2]);
let changes=0;select.onchange=()=>changes++;
items[2].click();assert.equal(select.value,'REJECT');assert.equal(changes,1);assert.equal(panel.hidden,true);assert.equal(document.activeElement,trigger);
trigger.click();key('Home');assert.equal(document.activeElement,items[0]);key('Escape');assert.equal(panel.hidden,true);assert.equal(document.activeElement,trigger);
trigger.click();document.dispatchEvent({type:'pointerdown',target:new Node()});assert.equal(panel.hidden,true);
select.value='Proxy';document.dispatchEvent({type:'qure-form-updated'});assert.equal(trigger.children[0].textContent,'Proxy');
trigger.click();key('ArrowUp');assert.equal(document.activeElement,items[2]);key('Tab');assert.equal(panel.hidden,true);
console.log('PASS: custom menu selection, keyboard navigation, Escape/Tab, click-away, focus return, native change events, model synchronization.');
