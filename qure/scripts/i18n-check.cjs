const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../i18n.js'), 'utf8');
function setup(saved, blocked=false) {
  const storage = new Map(saved ? [['qure-language',saved]] : []);
  const nodes = new Map();
  function node(id, text='', attributes={}) {
    const item={id,textContent:text,children:[],dataset:{},attributes,listeners:{},
      setAttribute(key,value){this.attributes[key]=value;},
      getAttribute(key){return this.attributes[key];},
      addEventListener(type,fn){this.listeners[type]=fn;}};
    nodes.set(id,item);return item;
  }
  const nav=node('nav','图标库');nav.dataset.i18n='图标库';
  const option=node('option','自动选择');option.dataset.i18n='自动选择';option.value='自动选择';
  const search=node('search','',{'data-i18n-placeholder':'搜索图标、品牌或地区…'});search.value='My custom query';
  const status=node('status','找到 128 枚图标 · 已展示 84 枚');
  const sync=node('sync-label','已同步 12:34');
  node('toast','SVG 源码已复制。');
  const toggle=node('language-toggle');
  let events=0;
  const document={documentElement:{lang:'zh-CN'},getElementById:id=>nodes.get(id),
    querySelectorAll(selector){if(selector==='[data-i18n]')return [nav,option];if(selector==='[data-i18n-placeholder]')return [search];return [];},
    dispatchEvent(){events++;}};
  const sandbox={window:{},document,Event,localStorage:{
    getItem(key){if(blocked)throw Error('blocked');return storage.get(key);},
    setItem(key,value){if(blocked)throw Error('blocked');storage.set(key,value);}}};
  vm.runInNewContext(source,sandbox);
  return {api:sandbox.window.QureI18n,document,nav,option,search,status,sync,toggle,storage,get events(){return events;}};
}
const app=setup();
assert.equal(app.api.language,'zh');
app.toggle.listeners.click();
assert.equal(app.document.documentElement.lang,'en');
assert.equal(app.nav.textContent,'Icons');
assert.equal(app.search.attributes.placeholder,'Search icons, brands or regions…');
assert.equal(app.status.textContent,'Found 128 icons · Showing 84');
assert.equal(app.sync.textContent,'Synced 12:34');
assert.equal(app.option.textContent,'Auto select');
assert.equal(app.option.value,'自动选择','translated option labels must preserve stored route values');
assert.equal(app.search.value,'My custom query','language changes must preserve user input');
assert.equal(app.api.t('编辑 {0}','My group'), 'Edit My group');
assert.equal(app.storage.get('qure-language'),'en');
assert.equal(setup('en').nav.textContent,'Icons','restore the saved language at startup');
app.toggle.listeners.click();
assert.equal(app.status.textContent,'找到 128 枚图标 · 已展示 84 枚');
assert.equal(app.nav.textContent,'图标库');
assert.equal(app.events,3,'one update event per language application');
const privateMode=setup(null,true);privateMode.api.setLanguage('en');assert.equal(privateMode.nav.textContent,'Icons');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.ok(html.indexOf('src="i18n.js"')<html.indexOf('src="app.js"'));
assert.ok(html.includes('value="自动选择"'));
console.log('PASS: language switching, translated messages and attributes, saved preference, storage denied, stable route values and user input.');
