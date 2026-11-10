'use strict';

// SVGs always come from the source repository, never a bundled snapshot.
const REPO = 'aaANDkk/Qure_Style_SVG';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
const INTERVAL = 5 * 60 * 1000;
const PAGE_SIZE = 84;
const $ = id => document.getElementById(id);
const state = { icons: [], category: 'all', query: '', sort: 'az', limit: PAGE_SIZE, current: null, busy: false, synced: 0 };
let toastTimer;
let firstGridRender = true;
const labelCache = new Map();
const view = { x: 0, y: 0, pointers: new Map() };

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}
function makeIcon(path, revision = '') {
  const match = /^icon\/svg\/(common|flag)\/([^/]+)\.svg$/i.exec(path);
  if (!match) return null;
  const url = RAW + path.split('/').map(encodeURIComponent).join('/');
  return { path, name: match[2], label: labelCache.get(path), category: match[1].toLowerCase(), url, image: `${url}?v=${encodeURIComponent(revision)}` };
}
async function request(url) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? '请求频率受限，请稍后重试。' : `图标源返回 ${response.status}。`);
  return response.json();
}
async function getIcons() {
  try {
    const tree = await request(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('图标目录不完整。');
    const icons = tree.tree.filter(x => x.type === 'blob').map(x => makeIcon(x.path, x.sha)).filter(Boolean);
    if (!icons.length) throw new Error('图标目录为空。');
    return { icons, fallback: false };
  } catch (error) {
    // The public subscription manifest avoids GitHub API rate limits.
    const manifest = await request(`${RAW}Other/Qure-Style-SVG.json?t=${Date.now()}`);
    if (!Array.isArray(manifest.icons)) throw error;
    const stamp = Date.now();
    const icons = manifest.icons.map(item => {
      if (typeof item.url !== 'string' || !item.url.startsWith(RAW)) return null;
      try { return makeIcon(decodeURIComponent(item.url.slice(RAW.length).split('?')[0]), stamp); }
      catch { return null; }
    }).filter(Boolean);
    if (!icons.length) throw new Error('订阅清单中没有有效图标。');
    return { icons, fallback: true };
  }
}
async function sync(manual = false) {
  if (state.busy) return;
  state.busy = true;
  $('refresh').disabled = true;
  $('retry').disabled = true;
  $('sync-label').textContent = '正在同步…';
  if (!state.icons.length) {
    $('status').textContent = '正在获取最新图标…';
    $('grid').replaceChildren(...Array.from({length: 21}, () => { const item = document.createElement('div'); item.className = 'skeleton'; return item; }));
  }
  $('grid').setAttribute('aria-busy', 'true');
  try {
    const result = await getIcons();
    state.icons = [...new Map(result.icons.map(icon => [icon.path, icon])).values()];
    state.synced = Date.now();
    $('error').hidden = true;
    $('all-count').textContent = state.icons.length.toLocaleString();
    $('sync-label').textContent = result.fallback ? '订阅清单 · 备用连接' : `已同步 ${new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'})}`;
    render();
    refreshFeatured();
    document.dispatchEvent(new Event('qure-icons-updated'));
    loadLabels();
    if (state.current) {
      const updated = state.icons.find(icon => icon.path === state.current.path);
      if (updated) { state.current = updated; $('preview-image').src = updated.image; }
    }
    if (manual) toast(result.fallback ? '已从订阅清单刷新；新增图标以清单更新为准。' : '已经是图标库的最新版本。');
  } catch (error) {
    $('error').hidden = false;
    $('error-message').textContent = `请检查到 GitHub 和原始素材服务器的网络连接。${error.message || '连接超时。'}`;
    $('sync-label').textContent = '连接未完成';
    if (state.icons.length) { render(); $('status').textContent += ' · 更新失败，保留本次已加载列表'; }
    else { $('grid').replaceChildren(); $('status').textContent = '未加载图标'; }
  } finally {
    state.busy = false;
    $('grid').setAttribute('aria-busy', 'false');
    $('refresh').disabled = false;
    $('retry').disabled = false;
  }
}
function filtered() {
  const words = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return state.icons.filter(icon =>
    (state.category === 'all' || icon.category === state.category) &&
    words.every(word => `${icon.name} ${icon.label || ''} ${icon.category === 'flag' ? '旗帜 地区 国家' : '品牌 服务'}`.toLowerCase().includes(word))
  ).sort((a,b) => (state.sort === 'za' ? -1 : 1) * a.name.localeCompare(b.name, 'en', {numeric:true}));
}
let labelsLoaded = false;
async function loadLabels() {
  if (labelsLoaded) return;
  const results = await Promise.allSettled(['common', 'flag'].map(async category => {
    const response = await fetch(`${RAW}icon/svg/${category}/README.md`, {cache:'no-cache', signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('名称索引不可用');
    const text = await response.text();
    const labels = new Map();
    for (const match of text.matchAll(/<img\s+src="([^"\n]+\.svg)"[^>]*\salt="([^"\n]+)"/g)) {
      try { labels.set(`icon/svg/${category}/${decodeURIComponent(match[1])}`, match[2]); } catch {}
    }
    return labels;
  }));
  labelsLoaded = results.every(result => result.status === 'fulfilled');
  for (const result of results) if (result.status === 'fulfilled') {
    for (const [path, label] of result.value) labelCache.set(path, label);
    for (const icon of state.icons) icon.label = result.value.get(icon.path) || icon.label;
  }
  if (state.query) render();
  document.dispatchEvent(new Event('qure-icons-updated'));
}
function render() {
  const animate = firstGridRender;
  firstGridRender = false;
  const icons = filtered();
  const fragment = document.createDocumentFragment();
  for (const [index, icon] of icons.slice(0, state.limit).entries()) {
    const card = document.createElement('article'); card.className = 'icon-card'; card.style.animationDelay = `${Math.min(index % PAGE_SIZE, 20) * 16}ms`;
    if (!animate) card.style.animation = 'none';
    const open = document.createElement('button'); open.className = 'icon-open'; open.type = 'button'; open.setAttribute('aria-label', `放大查看 ${icon.label || icon.name}`);
    const img = document.createElement('img'); img.src = icon.image; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 57; img.height = 57;
    img.onerror = () => { const failed = document.createElement('span'); failed.className = 'image-failed'; failed.textContent = '加载失败'; img.replaceWith(failed); };
    const name = document.createElement('span'); name.className = 'icon-name'; name.textContent = icon.name.replace(/_/g,' '); name.title = icon.label ? `${icon.label} · ${icon.name}` : icon.name;
    open.append(img, name); open.onclick = () => showPreview(icon);
    card.append(open); fragment.append(card);
  }
  $('grid').replaceChildren(fragment);
  $('empty').hidden = Boolean(icons.length) || !state.icons.length;
  $('more').hidden = icons.length <= state.limit;
  $('status').textContent = `找到 ${icons.length.toLocaleString()} 枚图标${icons.length > state.limit ? ` · 已展示 ${state.limit} 枚` : ''}`;
    $('empty').querySelector('h3').textContent = '还没有找到这枚图标';
    $('empty').querySelector('p').textContent = '试试其他名称，或切换分类。';
}
function refreshFeatured() {
  document.querySelectorAll('[data-feature]').forEach(img => {
    if (img.dataset.preloaded === 'true') return;
    const icon = state.icons.find(i => i.name.toLowerCase() === img.dataset.feature.toLowerCase() && i.category === (img.dataset.group || 'common'));
    if (icon) img.src = icon.image;
  });
}
function showPreview(icon) {
  view.pointers.clear();
  state.current = icon;
  $('preview-title').textContent = icon.name.replace(/_/g,' ');
  $('preview-category').textContent = icon.category === 'flag' ? 'REGIONS & FLAGS / 地区与旗帜' : 'BRANDS & SERVICES / 品牌与服务';
  $('preview-path').textContent = icon.path;
  $('preview-image').alt = icon.label || icon.name;
  $('preview-image').hidden = false;
  $('preview-image-error').hidden = true;
  $('preview-image').src = icon.image;
  $('source-link').href = `https://github.com/${REPO}/blob/${BRANCH}/${icon.path.split('/').map(encodeURIComponent).join('/')}`;
  resetView();
  const list = filtered();
  const index = list.findIndex(item => item.path === icon.path);
  $('preview-position').textContent = index < 0 ? '精选图标' : `${index + 1} / ${list.length}`;
  $('previous').disabled = $('next').disabled = list.length < 2;
  if (typeof $('preview-image').animate === 'function' && !reducedMotion()) $('preview-image').animate([{opacity:0},{opacity:1}],{duration:240});
  if (!$('preview').open) $('preview').showModal();
}
function setZoom() {
  const size = Math.max(48, Math.min(1024, Number($('zoom').value) || 180));
  $('zoom').value = size;
  $('preview-image').style.width = `${size}px`;
  $('preview-image').style.height = `${size}px`;
  $('zoom-value').textContent = `${size}px`;
  applyPan();
}
function applyPan() { $('preview-image').style.transform = `translate(${view.x}px, ${view.y}px)`; }
function resetView() { view.x = view.y = 0; $('zoom').value = 180; setZoom(); }
function zoomAt(size, anchor = {x:0, y:0}) {
  const previous = Math.max(48,Math.min(1024,Number($('zoom').value) || 180));
  const next = Math.max(48, Math.min(1024, Math.round(size)));
  const ratio = next / previous;
  view.x = anchor.x - (anchor.x - view.x) * ratio;
  view.y = anchor.y - (anchor.y - view.y) * ratio;
  $('zoom').value = next; setZoom();
}
function canvasPoint(x, y) {
  const rect = $('preview-stage').getBoundingClientRect();
  return {x:x - rect.left - rect.width / 2, y:y - rect.top - rect.height / 2};
}
function stepPreview(direction) {
  const list = filtered();
  if (!list.length) return;
  const index = list.findIndex(icon => icon.path === state.current?.path);
  showPreview(list[(index + direction + list.length) % list.length]);
}
function reducedMotion() { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; }
function installCanvas() {
  const stage = $('preview-stage');
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    zoomAt(Number($('zoom').value) * Math.exp(-Math.max(-80, Math.min(80, event.deltaY)) * .008), canvasPoint(event.clientX, event.clientY));
  }, {passive:false});
  stage.addEventListener('dblclick', resetView);
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    view.pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    stage.classList.add('dragging');
    stage.focus({preventScroll:true});
  });
  stage.addEventListener('pointermove', event => {
    if (!view.pointers.has(event.pointerId)) return;
    const before = [...view.pointers.values()];
    const old = view.pointers.get(event.pointerId);
    view.pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
    const after = [...view.pointers.values()];
    if (before.length === 1) { view.x += event.clientX - old.x; view.y += event.clientY - old.y; }
    else if (before.length === 2) {
      const midpoint = points => ({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
      const distance = points => Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
      const prevMid = midpoint(before), nextMid = midpoint(after), prevDistance = distance(before);
      if (prevDistance > 1) zoomAt(Number($('zoom').value) * distance(after) / prevDistance, canvasPoint(prevMid.x,prevMid.y));
      view.x += nextMid.x - prevMid.x; view.y += nextMid.y - prevMid.y;
    }
    applyPan();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) stage.addEventListener(type, event => {
    view.pointers.delete(event.pointerId);
    if (!view.pointers.size) stage.classList.remove('dragging');
  });
  $('preview').addEventListener('close', () => { view.pointers.clear(); stage.classList.remove('dragging'); });
}
async function copyText(value, success) {
  try { await navigator.clipboard.writeText(value); toast(success); }
  catch { toast('浏览器未允许复制，请检查剪贴板权限。'); }
}
async function copySvg() {
  if (!state.current) return;
  $('copy-svg').disabled = true;
  try {
    const response = await fetch(state.current.image,{signal:AbortSignal.timeout(18000)});
    if (!response.ok) throw new Error('下载失败');
    await copyText(await response.text(),'SVG 源码已复制。');
  } catch { toast('源码获取失败，请检查网络后重试。'); }
  finally { $('copy-svg').disabled = false; }
}
async function copyLink() {
  if (!state.current) return;
  try { await navigator.clipboard.writeText(state.current.url); toast('链接已复制，可直接用于配置文件。'); }
  catch { toast('浏览器未允许复制，请手动复制下面的链接。'); $('preview-path').textContent = state.current.url; const range = document.createRange(); range.selectNodeContents($('preview-path')); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
}
async function download() {
  if (!state.current) return;
  const icon = state.current;
  $('download').disabled = true;
  try {
    const response = await fetch(icon.image, {signal:AbortSignal.timeout(18000)});
    if (!response.ok) throw new Error('下载失败');
    const blob = new Blob([await response.text()], {type:'image/svg+xml'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${icon.name}.svg`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('SVG 已准备下载。');
  } catch { toast('下载失败，请检查网络后重试。'); }
  finally { $('download').disabled = false; }
}
function changeCategory(category) {
  if (state.category === category) return;
  const position = {left:window.scrollX, top:window.scrollY};
  state.category = category; state.limit = PAGE_SIZE;
  document.querySelectorAll('[data-category]').forEach(tab => { const active = tab.dataset.category === category; tab.classList.toggle('active',active); tab.setAttribute('aria-pressed',String(active)); });
  render();
  // Suppress layout anchoring and any pending CSS smooth-scroll for this update.
  const restore = () => window.scrollTo({...position,behavior:'instant'});
  restore();
  requestAnimationFrame(restore);
}
document.querySelectorAll('[data-category]').forEach(button => button.onclick = () => {
  if (state.category === button.dataset.category) return;
  changeCategory(button.dataset.category);
});
document.querySelectorAll('[data-bg]').forEach(button => button.onclick = () => {
  $('preview-stage').dataset.bg = button.dataset.bg;
  document.querySelectorAll('[data-bg]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
});
$('search').oninput = event => { state.query = event.target.value; state.limit = PAGE_SIZE; render(); };
$('sort').onchange = event => { state.sort = event.target.value; render(); };
$('refresh').onclick = $('retry').onclick = () => sync(true);
$('more').onclick = () => { state.limit += PAGE_SIZE; render(); };
$('reset').onclick = () => { state.query = ''; $('search').value = ''; if (state.category === 'all') render(); else document.querySelector('[data-category="all"]').click(); };
$('zoom').oninput = () => { const value=Number($('zoom').value); if(value>=48 && value<=1024)setZoom(); };
$('zoom').onchange = setZoom;
$('zoom').addEventListener('blur',setZoom);
$('zoom-in').onclick = () => zoomAt((Number($('zoom').value)||180)*1.2);
$('zoom-out').onclick = () => zoomAt((Number($('zoom').value)||180)/1.2);
$('close').onclick = () => $('preview').close();
$('preview').addEventListener('click', event => { const rect = $('preview').getBoundingClientRect(); if (event.target === $('preview') && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) $('preview').close(); });
$('preview-image').onerror = () => { $('preview-image').hidden = true; $('preview-image-error').hidden = false; };
$('preview-image').onload = () => { $('preview-image').hidden = false; $('preview-image-error').hidden = true; };
$('copy').onclick = copyLink;
$('try-icon').onclick = () => { if (state.current) { $('preview').close(); document.dispatchEvent(new CustomEvent('qure-try-icon',{detail:state.current.path})); } };
$('download').onclick = download;
$('previous').onclick = () => stepPreview(-1);
$('next').onclick = () => stepPreview(1);
$('reset-view').onclick = resetView;
$('copy-svg').onclick = copySvg;
$('copy-config').onclick = () => { if (state.current) copyText(`icon: "${state.current.url}"`, '配置片段已复制，可粘贴到策略组配置。'); };
installCanvas();
document.addEventListener('keydown', event => {
  if (!$('preview').open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const actions = {ArrowLeft:()=>stepPreview(-1),ArrowRight:()=>stepPreview(1),'+':()=>zoomAt(Number($('zoom').value)*1.2),'=':()=>zoomAt(Number($('zoom').value)*1.2),'-':()=>zoomAt(Number($('zoom').value)/1.2),'0':resetView};
  if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
});
document.addEventListener('keydown', event => { if (event.key === '/' && !$('preview').open && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !event.ctrlKey && !event.metaKey) { event.preventDefault(); $('search').focus(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - state.synced >= INTERVAL) sync(); });
setInterval(() => { if (!document.hidden) sync(); }, INTERVAL);
document.querySelectorAll('[data-feature]').forEach(img => { img.src = `${RAW}icon/svg/${img.dataset.group || 'common'}/${encodeURIComponent(img.dataset.feature)}.svg`; });
sync();

// Exhibition motion stays optional and never blocks browsing or data loading.
if (typeof IntersectionObserver === 'function' && !reducedMotion()) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  }), {threshold:.08});
  document.querySelectorAll('.hero-copy, .hero-art, .section-heading, .search-row, .filter-row, .closing').forEach((element,index) => {
    element.classList.add('reveal'); element.style.transitionDelay = `${index < 2 ? index * 120 : 0}ms`; observer.observe(element);
  });
}
document.querySelectorAll('.hero-art').forEach(art => {
  art.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || reducedMotion()) return;
    const rect = art.getBoundingClientRect();
    art.style.setProperty('--tilt-x', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 9}deg`);
    art.style.setProperty('--tilt-y', `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 7}deg`);
  });
  art.addEventListener('pointerleave', () => { art.style.setProperty('--tilt-x','0deg'); art.style.setProperty('--tilt-y','0deg'); });
});
document.querySelectorAll('[data-feature]').forEach(img => {
  const tile = img.parentElement;
  tile.setAttribute('role','button'); tile.setAttribute('tabindex','0'); tile.setAttribute('aria-label',`预览 ${img.alt}`);
  const open = () => { const icon = state.icons.find(item => item.name.toLowerCase() === img.dataset.feature.toLowerCase() && item.category === (img.dataset.group || 'common')); if (icon) showPreview(icon); else toast('图标库正在连接，请稍后再试。'); };
  tile.onclick = open;
  tile.addEventListener('keydown',event=>{if(event.key === 'Enter' || event.key === ' '){event.preventDefault();open();}});
});
