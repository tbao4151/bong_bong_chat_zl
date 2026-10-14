'use strict';
// Lưu tin nhắn riêng (1-1) gần đây để hiện bong bóng từng người – file tin-rieng.json
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const KEEP_DAYS = 7;
let people = null;   // { [tên]: { name, count, lastAt, lastNid, lastText } }

function file() { return path.join(app.getPath('userData'), 'tin-rieng.json'); }

function load() {
  if (people) return people;
  try { people = JSON.parse(fs.readFileSync(file(), 'utf8')) || {}; } catch (e) { people = {}; }
  prune();
  return people;
}

function prune() {
  const limit = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
  Object.keys(people).forEach((k) => { if (!people[k] || people[k].lastAt < limit) delete people[k]; });
  const keys = Object.keys(people);
  if (keys.length > 100) {
    keys.sort((a, b) => people[a].lastAt - people[b].lastAt).slice(0, keys.length - 100).forEach((k) => delete people[k]);
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(people), 'utf8');
  } catch (e) { /* bỏ qua */ }
}

function add(name, text, nid) {
  load();
  name = String(name || '').trim().slice(0, 120);
  if (!name) return null;
  const p = people[name] || { name, count: 0, lastAt: 0, lastNid: '', lastText: '' };
  p.count += 1;
  p.lastAt = Date.now();
  p.lastNid = nid || '';
  p.lastText = String(text || '').trim().slice(0, 500);
  people[name] = p;
  prune();
  save();
  return p;
}

function list() { load(); prune(); return Object.values(people); }

function markSeen(name) {
  load();
  const p = people[name];
  if (p && p.count) { p.count = 0; save(); }
}

function markAll() {
  load();
  let changed = false;
  Object.values(people).forEach((p) => { if (p.count) { p.count = 0; changed = true; } });
  if (changed) save();
}

module.exports = { add, list, markSeen, markAll };
