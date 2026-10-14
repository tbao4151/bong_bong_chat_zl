'use strict';
// Lưu / đọc cài đặt vào file cai-dat.json trong thư mục dữ liệu của app
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  firstRun: true,
  bubble: { x: null, y: null },
  chat: { w: 420, h: 640 },
  myName: '',                       // Tên Zalo của bạn, dùng để nhận biết khi bị @tag
  notifyMode: 'tag',                // 'tag' = chỉ khi được tag | 'all' = mọi tin | 'off' = tắt
  tagKeywords: ['nhắc đến bạn', 'đã nhắc bạn'],
  priorityNames: [],                // Người / nhóm luôn được báo
  hidePreview: true,                  // don't show private content on screen by default,
  muted: false,
  pinChat: false,
  autoStart: false,                    // user must explicitly enable Windows startup,
  hotkeyToggle: 'Control+Alt+Z',
  bubbleStyle: 'logo',              // 'logo' | 'classic' (xanh) | 'preset' (icon có sẵn) | 'custom' (ảnh/GIF của bạn)
  bubbleImagePath: '',
  bubblePreset: '',                 // id icon có sẵn khi bubbleStyle = 'preset'
  bubbleAnimate: 'always',          // GIF động: 'always' = luôn chạy | 'onNew' = chỉ chạy khi có tin mới
  bubbleShape: 'circle',            // 'circle' = cắt tròn | 'free' = giữ nguyên hình, nền trong suốt
  bubbleRemoveBg: false,            // tự xóa nền trắng / một màu liền mép ảnh (khi giữ nguyên hình)
  bubbleSize: 60,                   // cỡ hình bong bóng chính (40–160 px)
  groupBubbles: true,               // Bong bóng cho từng nhóm có tin nhắn mới
  peopleBubbles: true,              // Bong bóng cho từng người nhắn riêng
  useAvatars: false,                // Tắt tải avatar mặc định, có thể bật thủ công
  mainOpensHome: true,              // Bấm bong bóng chính -> về trang chủ Zalo
  hideReadBubbles: false,           // false = đọc xong vẫn giữ bong bóng, chỉ mất số
  groupMax: 5,                      // tổng số bong bóng tối đa (nhóm + người)
  groupAutoHide: 120,               // phút; 0 = không tự ẩn
  pinnedBubbles: [],                // 'g:Tên nhóm' hoặc 'p:Tên người'
  zaloPcPath: ''                    // Đường dẫn Zalo PC (để trống = tự tìm)
};

function file() {
  return path.join(app.getPath('userData'), 'cai-dat.json');
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    return {
      ...clone(DEFAULTS),
      ...raw,
      bubble: { ...DEFAULTS.bubble, ...(raw.bubble || {}) },
      chat: { ...DEFAULTS.chat, ...(raw.chat || {}) }
    };
  } catch (e) {
    return clone(DEFAULTS);
  }
}

function save(s) {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify(s, null, 2), 'utf8');
  } catch (e) { /* bỏ qua lỗi ghi */ }
}

module.exports = { load, save, DEFAULTS };
