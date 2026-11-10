'use strict';
(() => {
  const el = id => document.getElementById(id);
  const KEY = 'qure-playground-v1';
  const routes = ['Proxy','自动选择','DIRECT','REJECT','香港节点','日本节点','新加坡节点','美国节点'];
  const iconPath = (name, category = 'common') => `icon/svg/${category}/${name}.svg`;
  const defaults = () => [
    ['Proxy','Proxy','自动选择'], ['Adblock','AdBlock','REJECT'],
    ['YouTube','YouTube','Proxy'], ['Netflix','Netflix','Proxy'],
    ['Disney+','Disney','Proxy'], ['Spotify','Spotify','Proxy'],
    ['Telegram','Telegram','Proxy'], ['AI Services','ChatGPT','美国节点'],
    ['Apple','Apple','DIRECT'], ['Microsoft','Microsoft','DIRECT'],
    ['Hong Kong','Hong_Kong','香港节点','flag'], ['Japan','Japan','日本节点','flag'],
    ['Singapore','Singapore','新加坡节点','flag'], ['United States','United_States','美国节点','flag'],
    ['Final','Final','Proxy']
  ].map(([name,icon,route,category]) => ({name,path:iconPath(icon,category),route}));
  function validateDesign(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.groups) || value.groups.length > 100) throw new Error('需要版本为 1、最多 100 个分组的 Qure 搭配文件。');
    const groups = value.groups.map(group => {
      if (!group || typeof group.name !== 'string' || !group.name.trim() || group.name.length > 48 || typeof group.path !== 'string' || !makeIcon(group.path) || !routes.includes(group.route)) throw new Error('文件包含无效的分组名称、图标路径或预览路由。');
      return {name:group.name.trim(),path:group.path,route:group.route};
    });
    return {groups,theme:value.theme === 'dark' ? 'dark' : 'light'};
  }
  let design = {groups:defaults(),theme:'light'};
  try { const saved = localStorage.getItem(KEY); if (saved) design = validateDesign(JSON.parse(saved)); } catch {}
  let selected = design.groups.length ? 0 : -1;
  let page = 0;
  let pendingPath = null;
  const PAGE = 24;
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify({version:1,...design})); el('studio-save-state').textContent = '已自动保存'; }
    catch { el('studio-save-state').textContent = '本次会话有效 · 可导出保留'; }
  }
  function resolveIcon(path) { return state.icons.find(icon => icon.path === path) || makeIcon(path); }
  function iconImage(icon, size) {
    const img = document.createElement('img');
    img.src = icon.image; img.alt = ''; img.width = img.height = size; img.loading = 'lazy';
    img.addEventListener('error', () => { img.hidden = true; const note = document.createElement('span'); note.className = 'studio-image-error'; note.textContent = '◇'; img.after(note); }, {once:true});
    return img;
  }
  function renderGroups() {
    el('group-count').textContent = String(design.groups.length).padStart(2,'0');
    const fragment = document.createDocumentFragment();
    design.groups.forEach((group,index) => {
      const row = document.createElement('button'); row.type = 'button'; row.className = `strategy-row${index === selected ? ' active' : ''}`; row.setAttribute('aria-pressed',String(index === selected)); row.setAttribute('aria-label',`编辑 ${group.name}`);
      const image = document.createElement('span'); image.className = 'strategy-image'; image.append(iconImage(resolveIcon(group.path),34));
      const text = document.createElement('span'); text.className = 'strategy-text';
      const name = document.createElement('strong'); name.textContent = group.name;
      const route = document.createElement('span'); route.textContent = `Select · ${group.route}`;
      text.append(name,route);
      const kind = document.createElement('span'); kind.className = 'strategy-kind'; kind.textContent = '选择';
      const arrow = document.createElement('span'); arrow.className = 'strategy-arrow'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden','true');
      row.append(image,text,kind,arrow); row.onclick = () => {
        selected = index;
        el('group-list').querySelectorAll('.strategy-row').forEach((item,i)=>{item.classList.toggle('active',i===selected);item.setAttribute('aria-pressed',String(i===selected));});
        renderEditor(); animateEditor();
      };
      fragment.append(row);
    });
    if (!design.groups.length) { const empty = document.createElement('p'); empty.className = 'studio-no-groups'; empty.textContent = '你的画布已准备好。添加一个策略组，开始试搭。'; fragment.append(empty); }
    el('group-list').replaceChildren(fragment);
    el('add-group').disabled = design.groups.length >= 100;
  }
  function renderEditor() {
    const group = design.groups[selected];
    el('editor-fields').hidden = !group; el('editor-empty').hidden = Boolean(group);
    if (!group) { el('editor-title').textContent = '从第一组开始'; return; }
    el('editor-title').textContent = '编辑策略组';
    el('group-name').value = group.name; el('group-route').value = group.route;
    el('group-up').disabled = selected <= 0; el('group-down').disabled = selected >= design.groups.length - 1;
    const icon = resolveIcon(group.path);
    const name = document.createElement('span'); name.textContent = icon.name.replace(/_/g,' ');
    const badge = document.createElement('small'); badge.textContent = state.icons.length && !state.icons.some(item => item.path === group.path) ? '源图标已移除，可重新选择' : (icon.category === 'flag' ? '地区与旗帜' : '品牌与服务');
    const text = document.createElement('div'); text.append(name,badge);
    const cue = document.createElement('span'); cue.className = 'chosen-icon-cue'; cue.textContent = '更换图标 ↗';
    el('chosen-icon').replaceChildren(iconImage(icon,64),text,cue);
    document.dispatchEvent(new Event('qure-form-updated'));
    renderPicker();
  }
  function pickerIcons() {
    const source = state.icons.length ? state.icons : [...new Map(defaults().map(group => [group.path,makeIcon(group.path)])).values()];
    const words = el('picker-search').value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const category = el('picker-category').value || 'all';
    return source.filter(icon => (category === 'all' || icon.category === category) && words.every(word => `${icon.name} ${icon.label || ''}`.toLowerCase().includes(word))).sort((a,b) => a.name.localeCompare(b.name,'en',{numeric:true}));
  }
  function renderPicker() {
    const icons = pickerIcons(); const pages = Math.max(1,Math.ceil(icons.length/PAGE)); page = Math.min(page,pages-1);
    const group = design.groups[selected];
    const fragment = document.createDocumentFragment();
    icons.slice(page*PAGE,(page+1)*PAGE).forEach(icon => {
      const chosen = (pendingPath || group?.path) === icon.path;
      const button = document.createElement('button'); button.className = `picker-item${chosen ? ' selected' : ''}`; button.title = icon.label ? `${icon.name} · ${icon.label}` : icon.name; button.setAttribute('aria-label',`选择 ${icon.name}`); button.setAttribute('aria-pressed',String(chosen));
      const name = document.createElement('span'); name.textContent = icon.name.replace(/_/g,' ');
      button.append(iconImage(icon,38),name); button.onclick = () => {
        pendingPath = icon.path;
        for (const item of el('icon-picker').querySelectorAll('button')) { item.classList.remove('selected'); item.setAttribute('aria-pressed','false'); }
        button.classList.add('selected'); button.setAttribute('aria-pressed','true'); renderPending();
      };
      fragment.append(button);
    });
    if (!icons.length) { const empty = document.createElement('p'); empty.className = 'picker-empty'; empty.textContent = '没有匹配图标，试试其他名称。'; fragment.append(empty); }
    el('icon-picker').replaceChildren(fragment);
    el('picker-status').textContent = `${icons.length} 枚 · ${page+1} / ${pages}${!state.icons.length ? ' · 预设图标' : ''}`;
    el('picker-prev').disabled = page === 0; el('picker-next').disabled = page >= pages-1;
  }
  function animateEditor() {
    if (!reducedMotion() && typeof el('editor-fields').animate === 'function') el('editor-fields').animate([{opacity:.45,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function renderPending() {
    const icon = pendingPath && resolveIcon(pendingPath);
    if (!icon) { el('pending-icon').textContent = '选择一枚图标'; el('apply-icon').disabled = true; return; }
    const name = document.createElement('span'); name.textContent = icon.name.replace(/_/g,' ');
    el('pending-icon').replaceChildren(iconImage(icon,32),name);
    el('apply-icon').disabled = false;
  }
  function openIconPicker() {
    const group = design.groups[selected]; if (!group) return;
    pendingPath = group.path;
    el('icon-dialog-description').textContent = `正在为 ${group.name} 挑选图标。选好后点击应用，确认这次搭配。`;
    renderPicker(); renderPending();
    el('icon-dialog').showModal();
    el('picker-search').focus({preventScroll:true});
  }
  function addGroup() {
    if (design.groups.length >= 100) { toast('最多可添加 100 个策略组。'); return; }
    let number = 1; while (design.groups.some(group => group.name === `New Group ${number}`)) number++;
    design.groups.push({name:`New Group ${number}`,path:iconPath('Proxy'),route:'Proxy'});
    selected = design.groups.length-1; save(); renderGroups(); renderEditor();
    el('group-list').scrollTop = el('group-list').scrollHeight;
    el('group-name').focus({preventScroll:true}); el('group-name').select();
  }
  function removeGroup() {
    if (!design.groups[selected]) return;
    design.groups.splice(selected,1); selected = Math.min(selected,design.groups.length-1);
    save(); renderGroups(); renderEditor();
    toast('策略组已移除。');
  }
  function moveGroup(direction) {
    const next = selected+direction;
    if (selected < 0 || next < 0 || next >= design.groups.length) return;
    [design.groups[selected],design.groups[next]] = [design.groups[next],design.groups[selected]];
    selected = next; save(); renderGroups(); renderEditor();
  }
  function useIcon(path) {
    if (!makeIcon(path)) return;
    if (!design.groups.length) addGroup();
    design.groups[selected].path = path; save(); renderGroups(); renderEditor();
  }
  function setTheme(theme) {
    design.theme = theme;
    el('clash-window').dataset.theme = theme;
    el('studio-light').setAttribute('aria-pressed',String(theme === 'light'));
    el('studio-dark').setAttribute('aria-pressed',String(theme === 'dark'));
    save();
  }
  function exportDesign() {
    const blob = new Blob([JSON.stringify({version:1,...design},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'qure-icon-combination.json'; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
    toast('搭配文件已导出，包含分组和图标链接路径。');
  }
  el('add-group').onclick = el('add-first').onclick = addGroup;
  el('remove-group').onclick = removeGroup;
  el('group-up').onclick = () => moveGroup(-1); el('group-down').onclick = () => moveGroup(1);
  el('group-name').addEventListener('input', () => {
    const group = design.groups[selected]; if (!group) return;
    group.name = el('group-name').value.trim() || 'Untitled'; save(); renderGroups();
  });
  el('group-name').addEventListener('blur', () => { if (design.groups[selected]) el('group-name').value = design.groups[selected].name; });
  el('group-route').onchange = () => { if (design.groups[selected]) { design.groups[selected].route = el('group-route').value; save(); renderGroups(); } };
  el('picker-search').oninput = el('picker-category').onchange = () => { page = 0; renderPicker(); };
  el('picker-prev').onclick = () => { if (page > 0) { page--; renderPicker(); } };
  el('picker-next').onclick = () => { page++; renderPicker(); };
  el('inspect-group-icon').onclick = () => { const group = design.groups[selected]; if (group) showPreview(resolveIcon(group.path)); };
  el('chosen-icon').onclick = openIconPicker;
  el('close-icon-dialog').onclick = () => el('icon-dialog').close();
  el('apply-icon').onclick = () => {
    if (!pendingPath) return;
    useIcon(pendingPath); el('icon-dialog').close(); animateEditor(); toast('图标已应用，搭配已自动保存。');
  };
  el('icon-dialog').addEventListener('close',()=>{pendingPath=null;});
  el('studio-light').onclick = () => setTheme('light'); el('studio-dark').onclick = () => setTheme('dark');
  el('export-design').onclick = exportDesign;
  el('import-design').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 256*1024) throw new Error('搭配文件不能超过 256 KB。');
      const imported = validateDesign(JSON.parse(await file.text()));
      // Retain a downloadable backup before replacing an existing design.
      if (design.groups.length) exportDesign();
      design = imported; selected = design.groups.length ? 0 : -1; page = 0;
      setTheme(design.theme); renderGroups(); renderEditor(); toast('搭配已导入。原搭配已导出备份。');
    } catch (error) { toast(`导入失败：${error.message}`); }
    finally { event.target.value = ''; }
  };
  el('reset-design').onclick = () => el('studio-confirm').showModal();
  el('cancel-reset').onclick = () => el('studio-confirm').close();
  el('confirm-reset').onclick = () => { design.groups = defaults(); selected = 0; page = 0; save(); renderGroups(); renderEditor(); el('studio-confirm').close(); toast('已恢复预设策略组。'); };
  document.addEventListener('qure-icons-updated', () => { renderGroups(); renderEditor(); });
  document.addEventListener('qure-try-icon', event => {
    useIcon(event.detail);
    el('playground').scrollIntoView({behavior:reducedMotion() ? 'instant' : 'smooth',block:'start'});
    toast(`已应用到 ${design.groups[selected].name}，可在此更换目标分组。`);
  });
  setTheme(design.theme); renderGroups(); renderEditor();
})();
