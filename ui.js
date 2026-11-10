'use strict';
(() => {
  const enhanced = [];
  let opened = null;
  const names = {sort:'排序方式','group-route':'预览路由','picker-category':'图标分类'};
  function closeMenu(restore = false) {
    if (!opened) return;
    const control = opened; opened = null;
    control.panel.hidden = true;
    control.trigger.setAttribute('aria-expanded','false');
    control.wrapper.classList.remove('is-open');
    if (restore) control.trigger.focus({preventScroll:true});
  }
  document.querySelectorAll('select').forEach(select => {
    const wrapper = document.createElement('div'); wrapper.className = 'custom-select';
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'select-trigger'; trigger.setAttribute('role','combobox'); trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-haspopup','listbox');
    const value = document.createElement('span');
    const chevron = document.createElementNS('http://www.w3.org/2000/svg','svg'); chevron.setAttribute('viewBox','0 0 20 20'); chevron.setAttribute('aria-hidden','true');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d','m6 8 4 4 4-4'); chevron.append(path);
    trigger.append(value,chevron);
    const panel = document.createElement('div'); panel.id = `${select.id}-options`; panel.className = 'select-menu'; panel.setAttribute('role','listbox'); panel.setAttribute('aria-label',names[select.id] || '选择选项'); panel.hidden = true;
    const scroller = document.createElement('div'); scroller.className='select-menu-scroll'; panel.append(scroller);
    trigger.setAttribute('aria-controls',panel.id);
    const items = [...select.options].map((option,index) => {
      const item = document.createElement('button'); item.type='button'; item.className='select-option'; item.id=`${select.id}-option-${index}`; item.setAttribute('role','option'); item.tabIndex=-1; item.textContent=option.textContent; item.disabled=option.disabled;
      item.onclick=()=>{ select.value=option.value; refresh(); closeMenu(true); select.dispatchEvent(new Event('change',{bubbles:true})); };
      scroller.append(item); return item;
    });
    const control = {wrapper,trigger,panel,items};
    function focusItem(item) {
      if (!item) return;
      item.focus({preventScroll:true});
      const top = item.offsetTop - scroller.offsetTop;
      if (Number.isFinite(top)) {
        if (top < scroller.scrollTop) scroller.scrollTop=top;
        else if (top+item.offsetHeight > scroller.scrollTop+scroller.clientHeight) scroller.scrollTop=top+item.offsetHeight-scroller.clientHeight;
      }
    }
    function refresh() {
      const index = Math.max(0,select.selectedIndex);
      value.textContent = select.options[index]?.textContent || '';
      trigger.setAttribute('aria-label',`${names[select.id] || '选项'}：${value.textContent}`);
      trigger.disabled = select.disabled;
      items.forEach((item,i)=>{item.setAttribute('aria-selected',String(i===index));item.classList.toggle('selected',i===index);});
    }
    function openMenu(last = false) {
      if (opened === control) { closeMenu(); return; }
      closeMenu(); refresh(); panel.hidden=false; wrapper.classList.add('is-open'); trigger.setAttribute('aria-expanded','true'); opened=control;
      // Keep menus inside small dialogs instead of clipping against their bottom edge.
      const rect = trigger.getBoundingClientRect();
      const room = Math.min(window.innerHeight,wrapper.closest('dialog')?.getBoundingClientRect().bottom || window.innerHeight) - rect.bottom;
      const above = (rect.top ?? rect.bottom-42) - (wrapper.closest('dialog')?.getBoundingClientRect().top || 0);
      const upwards = room < Math.min(items.length*36+16,320) && above > room;
      wrapper.classList.toggle('opens-up',upwards);
      scroller.style.maxHeight=`${Math.max(72,Math.min(320,(upwards ? above : room)-22))}px`;
      focusItem(items[last ? items.length-1 : Math.max(0,select.selectedIndex)] || items[0]);
    }
    trigger.onclick=()=>openMenu();
    trigger.addEventListener('keydown',event=>{
      if (event.key==='ArrowDown' || event.key==='ArrowUp') {event.preventDefault();openMenu(event.key==='ArrowUp');}
    });
    let typed='',typedTimer;
    panel.addEventListener('keydown',event=>{
      const index = items.indexOf(document.activeElement);
      let next=null;
      if(event.key==='ArrowDown')next=(index+1)%items.length;
      if(event.key==='ArrowUp')next=(index-1+items.length)%items.length;
      if(event.key==='Home')next=0;
      if(event.key==='End')next=items.length-1;
      if(next!==null){event.preventDefault();focusItem(items[next]);}
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu(true);}
      if(event.key==='Tab')closeMenu(true);
      if(event.key.length===1 && event.key!==' ' && !event.ctrlKey && !event.metaKey){
        typed+=event.key.toLowerCase();clearTimeout(typedTimer);typedTimer=setTimeout(()=>typed='',700);
        focusItem(items.find(item=>item.textContent.toLowerCase().startsWith(typed)));
      }
    });
    wrapper.append(trigger,panel); select.after(wrapper); select.classList.add('native-select-enhanced'); select.tabIndex=-1; select.setAttribute('aria-hidden','true');
    select.addEventListener('change',refresh); enhanced.push(refresh); refresh();
  });
  document.addEventListener('pointerdown',event=>{if(opened && !opened.wrapper.contains(event.target))closeMenu();});
  document.addEventListener('qure-form-updated',()=>enhanced.forEach(refresh=>refresh()));
  window.addEventListener('resize',()=>closeMenu());
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('close',()=>closeMenu());
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)dialog.close();
    });
  });
})();
