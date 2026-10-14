'use strict';
// Lưu ảnh đại diện (đã thu nhỏ) cho từng người / nhóm – file anh-dai-dien.json
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const MAX = 150;
let store = null;   // { [key]: { url: dataURL, at } }
let timer = null;

function file() { return path.join(app.getPath('userData'), 'anh-dai-dien.json'); }

function load() {
  if (store) return store;
  try { store = JSON.parse(fs.readFileSync(file(), 'utf8')) || {}; } catch (e) { store = {}; }
  return store;
}

function saveSoon() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      const keys = Object.keys(store);
      if (keys.length > MAX) keys.sort((a, b) => store[a].at - store[b].at).slice(0, keys.length - MAX).forEach((k) => delete store[k]);
      fs.mkdirSync(path.dirname(file()), { recursive: true });
      fs.writeFileSync(file(), JSON.stringify(store), 'utf8');
    } catch (e) { /* bỏ qua */ }
  }, 1500);
}

function get(key) { load(); return (store[key] && store[key].url) || ''; }

function set(key, url) {
  load();
  if (!key || !url) return false;
  if (store[key] && store[key].url === url) { store[key].at = Date.now(); return false; }
  store[key] = { url, at: Date.now() };
  saveSoon();
  return true;
}

function clear() { store = {}; saveSoon(); }

module.exports = { get, set, clear };
