'use strict';
// Lưu danh sách "Tin nhắc tên tôi" (giữ 7 ngày gần nhất) vào file nhac-ten.json
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const KEEP_DAYS = 7;
const MAX_ITEMS = 300;
let items = null;

function file() { return path.join(app.getPath('userData'), 'nhac-ten.json'); }

function prune() {
  const limit = Date.now() - KEEP_DAYS * 24 * 3600 * 1000;
  items = items.filter((m) => m.at >= limit).slice(-MAX_ITEMS);
}

function load() {
  if (items) return items;
  try { items = JSON.parse(fs.readFileSync(file(), 'utf8')); if (!Array.isArray(items)) items = []; }
  catch (e) { items = []; }
  prune();
  return items;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(items), 'utf8');
  } catch (e) { /* bỏ qua */ }
}

// Zalo thường gửi thông báo nhóm dạng: tiêu đề = tên nhóm, nội dung = "Người gửi: tin nhắn"
function parse(title, body) {
  const m = /^([^:\n]{1,60}):\s*([\s\S]*)$/.exec(body || '');
  if (m) return { group: title, sender: m[1].trim(), text: m[2].trim() };
  return { group: '', sender: title, text: (body || '').trim() };
}

function add(title, body, nid) {
  load();
  const p = parse(title, body);
  const m = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    nid: nid || '', at: Date.now(), seen: false,
    group: p.group.slice(0, 120), sender: p.sender.slice(0, 120), text: p.text.slice(0, 500)
  };
  items.push(m);
  prune();
  save();
  return m;
}

function list() { load(); prune(); return items.slice().reverse(); }

function get(id) { load(); return items.find((m) => m.id === id) || null; }

function markSeen(id) { const m = get(id); if (m && !m.seen) { m.seen = true; save(); } return m; }

function markGroupSeen(group) {
  load();
  let changed = false;
  items.forEach((m) => { if (m.group === group && !m.seen) { m.seen = true; changed = true; } });
  if (changed) save();
}

function markAll() { load(); items.forEach((m) => { m.seen = true; }); save(); }

function clear() { items = []; save(); }

function unseenCount() {
  load();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  return items.filter((m) => !m.seen && m.at >= start.getTime()).length;
}

module.exports = { add, list, get, markSeen, markGroupSeen, markAll, clear, unseenCount, parse };
