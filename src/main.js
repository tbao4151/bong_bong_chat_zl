'use strict';
/*
 * Zalo Bong Bóng – bong bóng chat Zalo nổi trên màn hình Windows
 * - Bong bóng kéo thả, tự hút mép, số tin chưa đọc
 * - Bấm để bung khung chat (bên trong là Zalo Web)
 * - Chỉ báo khi được @tag tên (hoặc người/nhóm ưu tiên)
 * - Chụp màn hình nhanh (Ctrl+Alt+S) rồi dán thẳng vào khung chat
 * - Hộp "Tin nhắc tên tôi": danh sách các lần được tag, bấm để mở đúng hội thoại
 * - Bảng vẽ ghi chú lên ảnh trước khi gửi (mũi tên, khung, khoanh, bút, chữ)
 * - Gửi vùng Excel vừa copy thành ảnh (Ctrl+Alt+E)
 * - Bong bóng riêng cho từng nhóm chat vừa @tag bạn và từng người nhắn riêng
 */
const {
  app, BrowserWindow, WebContentsView, ipcMain, screen, Menu, Tray, Notification,
  globalShortcut, desktopCapturer, clipboard, session, shell, nativeImage, dialog
} = require('electron');
const path = require('path');
const fs = require('fs');
const cfg = require('./config');
const mentions = require('./mentions');
const inbox = require('./inbox').createInbox();
const security = require('./security');
const icons = require('./icons');
const navigate = require('./navigate');

const APP_ID = 'vn.bachtung.zalobongbong';
const ZALO_URL = 'https://chat.zalo.me/';
const ZALO_HOST = /^https:\/\/([a-z0-9-]+\.)*zalo\.me(\/|$)/i;
const BUBBLE_PAD = 18;  // chừa chỗ quanh hình cho số đỏ, chấm @ và viền nhấp nháy
const SIZE_MIN = 40, SIZE_MAX = 160;
// Kích thước cửa sổ bong bóng chính = kích thước hình + phần chừa
function bubbleSize() { return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Number(settings && settings.bubbleSize) || 60)); }
function BW() { return bubbleSize() + BUBBLE_PAD; }
const HEADER = 48;      // chiều cao thanh tiêu đề khung chat
const GAP = 10;         // khoảng cách giữa bong bóng và khung chat
const ASSETS = path.join(__dirname, '..', 'assets');
const UI = path.join(__dirname, 'ui');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

let settings = null;
let bubbleWin = null, chatWin = null, zaloView = null, captureWin = null, settingsWin = null, mentionsWin = null, editorWin = null, stackWin = null, tray = null;
let unread = 0, alerting = false, chatOpen = false, capturing = false;
let dragOffset = null, captureImage = null, captureDisplay = null;
app.isQuitting = false;

const uiPrefs = () => ({
  preload: path.join(__dirname, 'ui-preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openChat());
  app.whenReady().then(init);
}

app.on('window-all-closed', () => { /* chạy nền, không thoát */ });
app.on('will-quit', () => globalShortcut.unregisterAll());

function init() {
  settings = cfg.load();
  purgeLegacyNotificationFiles();
  if (Array.isArray(settings.pinnedGroups)) {   // chuyển ghim từ bản 1.4
    const old = settings.pinnedGroups.map((n) => 'g:' + n);
    settings.pinnedBubbles = [...new Set([...(settings.pinnedBubbles || []), ...old])];
    delete settings.pinnedGroups;
    cfg.save(settings);
  }
  Menu.setApplicationMenu(null);
  createBubble();
  createStack();
  createChat();
  createTray();
  registerHotkeys();
  applyAutoStart();
  screen.on('display-removed', snapBubble);
  screen.on('display-metrics-changed', snapBubble);
  setInterval(updateStack, 60 * 1000);   // tự ẩn bong bóng nhóm quá hạn

  if (settings.firstRun) {
    settings.firstRun = false;
    cfg.save(settings);
    setTimeout(() => {
      openChat();
      toast('Quét mã QR để đăng nhập. Sau đó bấm ⋯ → Cài đặt để nhập tên Zalo của bạn.', 15000);
    }, 900);
  }
}

// Remove legacy plaintext previews while preserving the persistent Zalo session.
function purgeLegacyNotificationFiles() {
  for (const name of ['nhac-ten.json', 'tin-rieng.json', 'anh-dai-dien.json']) {
    try { fs.rmSync(path.join(app.getPath('userData'), name), { force: true }); } catch (_) {}
  }
}

/* ---------------- Bong bóng ---------------- */

function createBubble() {
  const wa = screen.getPrimaryDisplay().workArea;
  let { x, y } = settings.bubble;
  if (x == null || y == null || !isOnScreen(x, y)) {
    x = wa.x + wa.width - BW() - 4;
    y = wa.y + Math.round(wa.height * 0.4);
  }
  bubbleWin = new BrowserWindow({
    x, y, width: BW(), height: BW(),
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false,
    fullscreenable: false, skipTaskbar: true, hasShadow: false, alwaysOnTop: true, show: false,
    backgroundColor: '#00000000', title: 'Zalo Bong Bóng',
    webPreferences: uiPrefs()
  });
  bubbleWin.setAlwaysOnTop(true, 'screen-saver');
  bubbleWin.setVisibleOnAllWorkspaces(true);
  bubbleWin.loadFile(path.join(UI, 'bubble.html'));
  bubbleWin.webContents.on('did-finish-load', pushBubbleImage);
  bubbleWin.once('ready-to-show', () => { bubbleWin.showInactive(); pushState(); });
  bubbleWin.on('close', (e) => { if (!app.isQuitting) e.preventDefault(); });
}

// Ảnh hiển thị trên bong bóng chính: logo Zalo, bộ icon có sẵn (tĩnh / động), ảnh hoặc GIF của bạn,
// hoặc kiểu xanh mặc định (không ảnh).
const PRESETS = [
  { id: 'xanh-la', name: 'Xanh lá', file: 'p-xanh-la.png' },
  { id: 'dem', name: 'Tối', file: 'p-dem.png' },
  { id: 'chuong', name: 'Chuông', file: 'p-chuong.png' },
  { id: 'a-cong', name: 'A còng', file: 'p-a-cong.png' },
  { id: 'mat-cuoi', name: 'Mặt cười', file: 'p-mat-cuoi.png' },
  { id: 'banh-rang', name: 'Bánh răng', file: 'p-banh-rang.png' },
  { id: 'dang-go', name: 'Đang gõ', file: 'a-dang-go.gif' },
  { id: 'nhip-song', name: 'Nhịp sóng', file: 'a-nhip-song.gif' },
  { id: 'chuong-lac', name: 'Chuông lắc', file: 'a-chuong-lac.gif' },
  { id: 'banh-rang-quay', name: 'Bánh răng quay', file: 'a-banh-rang-quay.gif' },
  { id: 'meo', name: 'Mèo', file: 'a-meo.gif' },
  { id: 'cun', name: 'Cún', file: 'a-cun.gif' },
  { id: 'tho', name: 'Thỏ', file: 'a-tho.gif' },
  { id: 'ga-con', name: 'Gà con', file: 'a-ga-con.gif' }
];
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const fileUrlCache = new Map();

// Đọc file ảnh thành data URL. GIF/WebP giữ nguyên để còn chuyển động; ảnh tĩnh lớn thì thu nhỏ.
function imageFile(p) {
  try {
    const st = fs.statSync(p);
    const ck = p + '|' + st.mtimeMs;
    if (fileUrlCache.has(ck)) return fileUrlCache.get(ck);
    if (st.size > 5 * 1024 * 1024) return null;   // tối đa 5 MB
    const ext = path.extname(p).toLowerCase();
    const buf = fs.readFileSync(p);
    let out = null;
    if (ext === '.gif' || ext === '.webp') {
      out = { url: 'data:' + MIME[ext] + ';base64,' + buf.toString('base64'), animated: true, hasAlpha: hasTransparency(buf, ext) };
    } else {
      let img = nativeImage.createFromBuffer(buf);
      if (img.isEmpty()) return null;
      const alpha = hasTransparency(buf, ext, img);
      const s = img.getSize();
      const MAXP = 320;   // đủ nét cho cỡ lớn nhất trên màn hình độ phân giải cao
      if (s.width > MAXP || s.height > MAXP) {
        img = s.width >= s.height
          ? img.resize({ width: MAXP, height: Math.round(MAXP * s.height / s.width), quality: 'best' })
          : img.resize({ width: Math.round(MAXP * s.width / s.height), height: MAXP, quality: 'best' });
      }
      out = { url: img.toDataURL(), animated: false, hasAlpha: alpha };   // PNG giữ nguyên nền trong suốt
    }
    fileUrlCache.set(ck, out);
    return out;
  } catch (e) { return null; }
}

// Ảnh có sẵn nền trong suốt không?
function hasTransparency(buf, ext, img) {
  try {
    if (ext === '.gif') {
      for (let i = 0; i < buf.length - 3; i++) {
        if (buf[i] === 0x21 && buf[i + 1] === 0xF9 && buf[i + 2] === 0x04 && (buf[i + 3] & 1)) return true;
      }
      return false;
    }
    if (ext === '.webp') {
      const tag = buf.toString('ascii', 12, 16);
      if (tag === 'VP8X') return !!(buf[20] & 0x10);
      return tag === 'VP8L';
    }
    if (img && !img.isEmpty()) {
      const bm = img.toBitmap();
      for (let i = 3; i < bm.length; i += 16) if (bm[i] < 250) return true;
    }
  } catch (e) { /* bỏ qua */ }
  return false;
}

function presetFile(id) {
  const p = PRESETS.find((x) => x.id === id);
  return p ? path.join(ASSETS, 'presets', p.file) : '';
}

function bubbleImage() {
  const logo = () => imageFile(path.join(ASSETS, 'bubble-zalo.png')) || { url: '', animated: false };
  switch (settings.bubbleStyle) {
    case 'classic': return { url: '', animated: false };
    case 'preset': return (settings.bubblePreset && imageFile(presetFile(settings.bubblePreset))) || logo();
    case 'custom': return (settings.bubbleImagePath && imageFile(settings.bubbleImagePath)) || logo();
    default: return logo();
  }
}

// Đổi kích thước bong bóng chính (giữ nguyên tâm), rồi hút lại vào mép
function applyBubbleSize() {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  const b = bubbleWin.getBounds();
  const W = BW();
  if (b.width !== W) {
    bubbleWin.setBounds({ x: Math.round(b.x + b.width / 2 - W / 2), y: Math.round(b.y + b.height / 2 - W / 2), width: W, height: W });
    snapBubble();
  }
  pushBubbleImage();
}

function setBubbleSize(px) {
  settings.bubbleSize = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(px)));
  cfg.save(settings);
  applyBubbleSize();
}

function pushBubbleImage() {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  const im = bubbleImage();
  bubbleWin.webContents.send('bubble:image', {
    url: im.url, animated: im.animated, mode: settings.bubbleAnimate || 'always',
    shape: settings.bubbleShape === 'free' ? 'free' : 'circle', size: bubbleSize(),
    removeBg: settings.bubbleShape === 'free' && !!settings.bubbleRemoveBg
  });
}

function isOnScreen(x, y) {
  return screen.getAllDisplays().some((d) => {
    const b = d.workArea;
    return x >= b.x - 20 && y >= b.y - 20 && x < b.x + b.width && y < b.y + b.height;
  });
}

function snapBubble() {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  const [x, y] = bubbleWin.getPosition();
  const W = BW();
  const d = screen.getDisplayNearestPoint({ x: x + W / 2, y: y + W / 2 });
  const wa = d.workArea;
  const left = x + W / 2 < wa.x + wa.width / 2;
  const nx = left ? wa.x + 4 : wa.x + wa.width - W - 4;
  const ny = Math.min(Math.max(y, wa.y + 4), wa.y + wa.height - W - 4);
  bubbleWin.setPosition(nx, ny);
  settings.bubble = { x: nx, y: ny };
  cfg.save(settings);
  if (chatOpen) placeChat();
  updateStack();
}

ipcMain.on('bubble:drag-start', (e, d) => {
  if (e.sender !== bubbleWin.webContents) return;
  dragOffset = { ox: Number(d && d.ox) || BW() / 2, oy: Number(d && d.oy) || BW() / 2 };
});
ipcMain.on('bubble:drag-move', (e) => {
  if (!dragOffset || e.sender !== bubbleWin.webContents) return;
  const p = screen.getCursorScreenPoint();
  bubbleWin.setPosition(Math.round(p.x - dragOffset.ox), Math.round(p.y - dragOffset.oy));
  if (chatOpen) placeChat();
  updateStack();
});
ipcMain.on('bubble:drag-end', (e) => { if (e.sender !== bubbleWin.webContents) return; dragOffset = null; snapBubble(); });
// Bấm bong bóng chính: mở khung chat ở trang chủ (nếu bật trong Cài đặt)
function mainBubbleToggle() {
  const opening = !chatOpen;
  toggleChat();
  if (opening && settings.mainOpensHome) goHome(false);
}
ipcMain.on('bubble:click', (e) => { if (e.sender === bubbleWin.webContents) mainBubbleToggle(); });
ipcMain.on('bubble:menu', (e) => { if (e.sender === bubbleWin.webContents) buildMenu().popup({ window: bubbleWin }); });

/* ---------------- Khung chat (Zalo Web) ---------------- */

function chromeUA() {
  // Giả lập trình duyệt Chrome thường để Zalo Web hoạt động đầy đủ
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' +
    process.versions.chrome + ' Safari/537.36';
}

function createChat() {
  chatWin = new BrowserWindow({
    width: settings.chat.w, height: settings.chat.h, minWidth: 340, minHeight: 420,
    frame: false, show: false, skipTaskbar: true, alwaysOnTop: true, resizable: true,
    maximizable: false, fullscreenable: false, backgroundColor: '#ffffff', title: 'Zalo',
    webPreferences: uiPrefs()
  });
  chatWin.setAlwaysOnTop(true, 'floating');
  chatWin.loadFile(path.join(UI, 'shell.html'));
  chatWin.webContents.on('did-finish-load', pushState);

  const ses = session.fromPartition('persist:zalo');
  ses.setUserAgent(chromeUA());
  // Deny camera, microphone, screen and clipboard-read by default.
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const origin = details && details.requestingUrl;
    callback(security.isAllowedZaloPermission(wc, zaloView && zaloView.webContents, permission, origin, details));
  });
  ses.setPermissionCheckHandler((wc, permission, requestingOrigin, details) =>
    security.isAllowedZaloPermission(wc, zaloView && zaloView.webContents, permission, requestingOrigin, details));

  zaloView = new WebContentsView({
    webPreferences: {
      partition: 'persist:zalo',
      preload: path.join(__dirname, 'zalo-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false
    }
  });
  chatWin.contentView.addChildView(zaloView);
  layoutZalo();

  chatWin.on('resize', layoutZalo);
  chatWin.on('resized', () => {
    const [w, h] = chatWin.getSize();
    settings.chat = { w, h };
    cfg.save(settings);
  });
  chatWin.on('blur', onChatBlur);
  chatWin.on('focus', () => { chatWin.__hadFocus = true; });
  watchOutsideClick();
  chatWin.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); hideChat(); } });

  const wc = zaloView.webContents;
  wc.on('page-title-updated', (_e, title) => updateUnread(title));
  wc.setWindowOpenHandler(({ url }) => {
    if (security.isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!ZALO_HOST.test(url)) { e.preventDefault(); if (security.isSafeExternalUrl(url)) shell.openExternal(url); }
  });
  wc.loadURL(ZALO_URL);
}

function layoutZalo() {
  if (!chatWin || !zaloView) return;
  const [w, h] = chatWin.getContentSize();
  zaloView.setBounds({ x: 0, y: HEADER, width: w, height: Math.max(0, h - HEADER) });
}

function placeChat() {
  if (!chatWin || !bubbleWin) return;
  const b = bubbleWin.getBounds();
  const [w, h] = chatWin.getSize();
  const wa = screen.getDisplayNearestPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 }).workArea;
  const bubbleOnRight = b.x + b.width / 2 > wa.x + wa.width / 2;
  let x = bubbleOnRight ? b.x - w - GAP : b.x + b.width + GAP;
  let y = b.y;
  x = Math.max(wa.x, Math.min(x, wa.x + wa.width - w));
  y = Math.max(wa.y, Math.min(y, wa.y + wa.height - h));
  chatWin.setBounds({ x, y, width: w, height: h });
  layoutZalo();
}

function openChat() {
  if (!chatWin) return;
  setTimeout(ensureChatFocus, 120);
  if (bubbleWin && !bubbleWin.isVisible()) bubbleWin.showInactive();
  placeChat();
  chatWin.show();
  chatWin.focus();
  zaloView.webContents.focus();
  chatOpen = true;
  alerting = false;
  pushState();
}

function hideChat() {
  if (!chatWin) return;
  chatWin.__hadFocus = false;
  chatWin.hide();
  chatOpen = false;
  pushState();
}

function toggleChat() { openedKey = ''; chatOpen ? hideChat() : openChat(); }

// Windows đôi khi không cho cửa sổ nhận focus; khi đó khung chat sẽ không tự thu lúc bấm ra ngoài.
function ensureChatFocus() {
  if (!chatOpen || !chatWin || chatWin.isDestroyed() || chatWin.isFocused()) return;
  chatWin.setAlwaysOnTop(false);
  chatWin.setAlwaysOnTop(true, 'floating');
  chatWin.focus();
  if (zaloView) zaloView.webContents.focus();
}

// Dự phòng: nếu khung chat không có focus mà người dùng đã bấm ra ngoài thì vẫn thu lại
let outsideTimer = null;
function watchOutsideClick() {
  clearInterval(outsideTimer);
  outsideTimer = setInterval(() => {
    if (!chatOpen || settings.pinChat || capturing || !chatWin || chatWin.isDestroyed()) return;
    if (chatWin.isFocused() || (stackWin && !stackWin.isDestroyed() && stackWin.isFocused()) || (bubbleWin && bubbleWin.isFocused())) return;
    const anyOwnFocused = BrowserWindow.getAllWindows().some((w) => !w.isDestroyed() && w.isFocused());
    if (!anyOwnFocused && chatWin.__hadFocus) hideChat();
  }, 700);
}

function onChatBlur() {
  if (settings.pinChat || capturing || !chatOpen) return;
  setTimeout(() => {
    if (!chatOpen || capturing || settings.pinChat || !chatWin || chatWin.isFocused()) return;
    // Bấm vào bong bóng thì để bong bóng tự xử lý (tránh đóng rồi mở lại)
    const p = screen.getCursorScreenPoint();
    const b = bubbleWin.getBounds();
    if (p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height) return;
    if (stackHot) return;   // đang bấm vào một bong bóng nhỏ khác: để bong bóng đó xử lý
    hideChat();
  }, 200);
}

const fromShell = (e) => chatWin && e.sender === chatWin.webContents;
ipcMain.on('shell:min', (e) => { if (fromShell(e)) hideChat(); });
ipcMain.on('shell:pin', (e) => { if (!fromShell(e)) return; settings.pinChat = !settings.pinChat; cfg.save(settings); pushState(); });
ipcMain.on('shell:capture', (e) => { if (fromShell(e)) setTimeout(startCapture, 120); });
ipcMain.on('shell:reload', (e) => { if (fromShell(e) && zaloView) zaloView.webContents.reload(); });
ipcMain.on('shell:menu', (e) => { if (fromShell(e)) buildMenu().popup({ window: chatWin }); });
ipcMain.on('shell:expand', (e) => { if (fromShell(e)) openZaloPc(); });

/* ---------------- Mở rộng: mở ứng dụng Zalo PC ---------------- */

function zaloPcCandidates() {
  const env = process.env;
  const list = [];
  if (settings.zaloPcPath) list.push(settings.zaloPcPath);
  if (env.LOCALAPPDATA) {
    list.push(path.join(env.LOCALAPPDATA, 'Programs', 'Zalo', 'Zalo.exe'));
    list.push(path.join(env.LOCALAPPDATA, 'Zalo', 'Zalo.exe'));
  }
  if (env.ProgramFiles) list.push(path.join(env.ProgramFiles, 'Zalo', 'Zalo.exe'));
  if (env['ProgramFiles(x86)']) list.push(path.join(env['ProgramFiles(x86)'], 'Zalo', 'Zalo.exe'));
  if (env.APPDATA) list.push(path.join(env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Zalo.lnk'));
  if (env.ProgramData) list.push(path.join(env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Zalo.lnk'));
  if (env.USERPROFILE) list.push(path.join(env.USERPROFILE, 'Desktop', 'Zalo.lnk'));
  if (env.PUBLIC) list.push(path.join(env.PUBLIC, 'Desktop', 'Zalo.lnk'));
  return list;
}

function findZaloPc() {
  return zaloPcCandidates().find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } }) || '';
}

async function pickZaloPc(parent) {
  const r = await dialog.showOpenDialog(parent || null, {
    title: 'Chọn file Zalo.exe (hoặc shortcut Zalo)',
    properties: ['openFile'],
    filters: [{ name: 'Ứng dụng Zalo', extensions: ['exe', 'lnk'] }]
  });
  if (r.canceled || !r.filePaths.length) return '';
  settings.zaloPcPath = r.filePaths[0];
  cfg.save(settings);
  return settings.zaloPcPath;
}

async function openZaloPc() {
  let p = findZaloPc();
  if (!p) {
    const r = await dialog.showMessageBox({
      type: 'question',
      title: 'Mở ứng dụng Zalo',
      message: 'Không tìm thấy ứng dụng Zalo PC trên máy.',
      detail: 'Bạn có thể chỉ đường dẫn tới file Zalo.exe (hoặc shortcut Zalo ngoài Desktop), hoặc mở Zalo trên trình duyệt.',
      buttons: ['Chọn file Zalo…', 'Mở trên trình duyệt', 'Hủy'],
      defaultId: 0, cancelId: 2, noLink: true
    });
    if (r.response === 1) { hideChat(); shell.openExternal(ZALO_URL); return; }
    if (r.response !== 0) return;
    p = await pickZaloPc();
    if (!p) return;
  }
  hideChat();
  const err = await shell.openPath(p);
  if (err) {
    dialog.showMessageBox({
      type: 'warning', title: 'Mở ứng dụng Zalo',
      message: 'Không mở được Zalo PC.',
      detail: 'Đường dẫn: ' + p + '\nLỗi: ' + err + '\nVào Cài đặt để chọn lại file Zalo.exe.',
      buttons: ['Đóng'], noLink: true
    });
  }
}

function toast(text, ms) {
  if (chatWin && !chatWin.isDestroyed()) chatWin.webContents.send('shell:toast', { text, ms: ms || 5000 });
}

/* ---------------- Tin chưa đọc & thông báo ---------------- */

function updateUnread(title) {
  const m = /^\((\d+)\+?\)/.exec(String(title || '').trim());
  const n = m ? parseInt(m[1], 10) : 0;
  if (n !== unread) {
    const before = unread;
    unread = n;
    if (n === 0) {
      alerting = false;
      // Zalo báo đã đọc hết (đọc trong khung chat, trên điện thoại hay Zalo PC) -> xóa số trên các bong bóng nhỏ
      if (before > 0) markEverythingRead();
    }
    pushState();
  }
}

function markEverythingRead() {
  inbox.markAll();
  mentions.markAll();
  updateStack();
}

function norm(s) { return String(s || '').toLowerCase(); }

function tagKeys() {
  const keys = [];
  if (settings.myName) keys.push('@' + norm(settings.myName.trim()));
  (settings.tagKeywords || []).forEach((k) => { k = norm(k).trim(); if (k) keys.push(k); });
  return keys;
}

function isTagged(text) { return tagKeys().some((k) => text.includes(k)); }

function isPriority(text) {
  return (settings.priorityNames || []).some((n) => { n = norm(n).trim(); return n && text.includes(n); });
}

ipcMain.on('zalo:notify', (e, d) => {
  if (!zaloView || e.sender !== zaloView.webContents || !security.isZaloOrigin(e.sender.getURL())) return;
  handleZaloNotification(String((d && d.title) || ''), String((d && d.body) || ''), String((d && d.nid) || ''), String((d && d.icon) || ''));
});

/* ---------------- Ảnh đại diện cho bong bóng ---------------- */

const iconCache = new Map();          // nguồn ảnh -> data URL đã thu nhỏ
const nidKey = new Map();             // mã thông báo -> key bong bóng (để gắn ảnh đến sau)

async function resolveIcon(src) {
  if (!src) return '';
  if (iconCache.has(src)) return iconCache.get(src);
  let img = null;
  try {
    if (/^data:image\//i.test(src)) img = nativeImage.createFromDataURL(src);
    else if (/^https:\/\//i.test(src)) {
      // Only fetch avatars from Zalo-owned domains, with a strict size limit.
      const host = new URL(src).hostname.toLowerCase();
      if (!/(^|\.)(zalo\.me|zadn\.vn)$/.test(host)) return '';
      const res = await session.fromPartition('persist:zalo').fetch(src, { signal: AbortSignal.timeout(5000) });
      const len = Number(res.headers.get('content-length') || 0);
      if (!res.ok || (len && len > 2 * 1024 * 1024)) return '';
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 2 * 1024 * 1024) return '';
      img = nativeImage.createFromBuffer(buf);
    }
  } catch (e) { img = null; }
  if (!img || img.isEmpty()) return '';
  const url = img.resize({ width: 96, height: 96, quality: 'best' }).toDataURL();
  iconCache.set(src, url);
  if (iconCache.size > 300) iconCache.delete(iconCache.keys().next().value);
  return url;
}

function rememberIcon(key, src) {
  if (!settings.useAvatars || !key || !src) return;
  resolveIcon(src).then((url) => { if (url && icons.set(key, url)) updateStack(); });
}

ipcMain.on('zalo:icon', (e, d) => {
  if (!zaloView || e.sender !== zaloView.webContents || !security.isZaloOrigin(e.sender.getURL()) || !d) return;
  const key = nidKey.get(String(d.nid || ''));
  if (key) rememberIcon(key, String(d.data || ''));
});

function handleZaloNotification(title, body, nid, icon) {
  const text = norm(title + '\n' + body);
  const pk = mentions.parse(title, body);
  const bubbleKey = pk.group ? 'g:' + pk.group : 'p:' + pk.sender;
  if (nid) { nidKey.set(nid, bubbleKey); if (nidKey.size > 300) nidKey.delete(nidKey.keys().next().value); }
  if (icon) rememberIcon(bubbleKey, icon);
  const tagged = isTagged(text);
  const prio = isPriority(text);
  if (tagged && (settings.myName || (settings.tagKeywords || []).length)) {
    mentions.add(title, body, nid); // transient, not saved to disk
  }
  const parsed = mentions.parse(title, body);
  // Every incoming notification creates a bubble, not only @mentions.
  if (!(chatOpen && chatWin.isFocused())) {
    inbox.add({ group: parsed.group, sender: parsed.sender, text: parsed.text, nid, tagged });
  }
  pushState();
  let show = false;
  if (settings.notifyMode === 'all') show = true;
  else if (settings.notifyMode === 'tag') show = tagged || prio || (!settings.myName && tagKeys().length === 0);
  if (!show) return;
  if (chatOpen && chatWin.isFocused()) return;

  alerting = true;
  pushState();
  if (bubbleWin && !bubbleWin.isDestroyed()) {
    bubbleWin.webContents.send('bubble:ping', { sound: !settings.muted, tagged });
  }
  if (Notification.isSupported()) {
    const n = new Notification({
      title: tagged ? 'Bạn được nhắc tên – ' + title : title,
      body: settings.hidePreview ? 'Có tin nhắn mới' : body,
      silent: true,
      icon: path.join(ASSETS, 'icon.png')
    });
    n.on('click', () => openChatAt(nid, title));
    n.show();
  }
}

// Mở khung chat và nhảy tới đúng hội thoại của thông báo (nếu Zalo Web còn nhớ)
let homeDirty = false;   // true khi khung chat đang ở một hội thoại cụ thể do app mở hộ

// Về trang chủ Zalo Web (danh sách hội thoại)
function goHome(force) {
  if (!zaloView) return;
  if (!force && !homeDirty) return;
  homeDirty = false;
  openedKey = '';
  zaloView.webContents.loadURL(ZALO_URL);
  toast('Đang về trang chủ Zalo…', 2500);
}

// Mở khung chat và vào đúng hội thoại: ưu tiên tìm theo TÊN trong Zalo Web,
// không được thì thử "bấm lại" thông báo gốc, cuối cùng báo tên để bạn tự mở.
let navSeq = 0;
function openChatAt(nid, name) {
  openChat();
  homeDirty = true;
  if (!zaloView) return;
  const wc = zaloView.webContents;
  const seq = ++navSeq;
  const hint = () => { if (seq === navSeq && name) toast('Không tự mở được. Hãy mở hội thoại "' + name + '".', 7000); };
  const byNid = () => {
    if (!nid) return Promise.resolve(false);
    return wc.executeJavaScript('window.__zbClick ? window.__zbClick(' + JSON.stringify(nid) + ') : false', true).catch(() => false);
  };
  setTimeout(() => {
    if (seq !== navSeq) return;
    const byName = name ? wc.executeJavaScript(navigate.script(name), true).catch(() => false) : Promise.resolve(false);
    byName
      .then((ok) => (ok ? ok : byNid()))
      .then((ok) => { if (!ok) hint(); })
      .catch(hint);
  }, 40);
}

/* ---------------- Hộp "Tin nhắc tên tôi" ---------------- */

function placeNear(win) {
  const b = bubbleWin.getBounds();
  const [w, h] = win.getSize();
  const wa = screen.getDisplayNearestPoint({ x: b.x + b.width / 2, y: b.y + b.height / 2 }).workArea;
  const right = b.x + b.width / 2 > wa.x + wa.width / 2;
  let x = right ? b.x - w - GAP : b.x + b.width + GAP;
  let y = b.y;
  x = Math.max(wa.x, Math.min(x, wa.x + wa.width - w));
  y = Math.max(wa.y, Math.min(y, wa.y + wa.height - h));
  win.setBounds({ x, y, width: w, height: h });
}

function openMentions() {
  if (mentionsWin && !mentionsWin.isDestroyed()) { mentionsWin.show(); mentionsWin.focus(); return; }
  hideChat();
  mentionsWin = new BrowserWindow({
    width: 400, height: 560, minWidth: 340, minHeight: 360,
    frame: false, show: false, skipTaskbar: true, alwaysOnTop: true, resizable: true,
    maximizable: false, fullscreenable: false, backgroundColor: '#FFFFFF', title: 'Tin nhắc tên tôi',
    webPreferences: uiPrefs()
  });
  mentionsWin.setAlwaysOnTop(true, 'floating');
  placeNear(mentionsWin);
  mentionsWin.loadFile(path.join(UI, 'mentions.html'));
  mentionsWin.once('ready-to-show', () => { mentionsWin.show(); mentionsWin.focus(); });
  mentionsWin.on('blur', () => {
    setTimeout(() => {
      if (mentionsWin && !mentionsWin.isDestroyed() && !mentionsWin.isFocused()) mentionsWin.close();
    }, 200);
  });
  mentionsWin.on('closed', () => { mentionsWin = null; });
}

function closeMentions() { if (mentionsWin && !mentionsWin.isDestroyed()) mentionsWin.close(); }

const fromMentions = (e) => mentionsWin && !mentionsWin.isDestroyed() && e.sender === mentionsWin.webContents;

ipcMain.handle('mentions:list', (e) => {
  if (!mentionsWin || e.sender !== mentionsWin.webContents) throw new Error('forbidden');
  const items = mentions.list().map((m) => settings.hidePreview ? { ...m, text: '' } : m);
  return { items, hasName: !!settings.myName };
});
ipcMain.on('mentions:open', (e, id) => {
  if (!fromMentions(e)) return;
  const m = mentions.markSeen(String(id || ''));
  closeMentions();
  pushState();
  if (m) openChatAt(m.nid, m.group || m.sender); else openChat();
});
ipcMain.on('mentions:seen-all', (e) => { if (fromMentions(e)) { mentions.markAll(); pushState(); } });
ipcMain.on('mentions:clear', (e) => { if (fromMentions(e)) { mentions.clear(); pushState(); } });
ipcMain.on('mentions:close', (e) => { if (fromMentions(e)) closeMentions(); });
ipcMain.on('mentions:settings', (e) => { if (fromMentions(e)) { closeMentions(); openSettings(); } });
ipcMain.on('shell:mentions', (e) => { if (fromShell(e)) openMentions(); });
ipcMain.on('bubble:mentions', (e) => { if (e.sender === bubbleWin.webContents) openMentions(); });

/* ---------------- Bong bóng từng nhóm có tag bạn & từng người nhắn riêng ---------------- */

const SB = 52;          // đường kính bong bóng nhỏ
const SSTEP = 66;       // khoảng cách giữa các bong bóng
const STACK_W = 330;    // rộng cửa sổ (chứa cả thẻ xem trước)
const dismissed = {};   // key -> thời điểm bị đóng
let stackItems = [];
let lastStackKey = '';
let stackHot = false;        // chuột đang ở trên một bong bóng nhỏ
let openedKey = '';          // bong bóng nhỏ vừa mở khung chat

function createStack() {
  stackWin = new BrowserWindow({
    width: STACK_W, height: 120, frame: false, transparent: true, resizable: false, movable: false,
    minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true, hasShadow: false,
    alwaysOnTop: true, focusable: true, show: false, backgroundColor: '#00000000',
    webPreferences: uiPrefs()
  });
  stackWin.setAlwaysOnTop(true, 'screen-saver');
  stackWin.setVisibleOnAllWorkspaces(true);
  stackWin.setIgnoreMouseEvents(true, { forward: true });
  stackWin.loadFile(path.join(UI, 'stack.html'));
  stackWin.webContents.on('did-finish-load', () => { lastStackKey = ''; updateStack(); });
  stackWin.on('close', (e) => { if (!app.isQuitting) e.preventDefault(); });
}

function pinnedSet() { return new Set(settings.pinnedBubbles || []); }

function blank(kind, name) {
  return { key: kind + ':' + name, kind, name, count: 0, total: 0, lastAt: 0, lastNid: '', lastSender: '', lastText: '', tagged: false };
}

function bubbleList() {
  const now = Date.now();
  const hideMs = (Number(settings.groupAutoHide) || 0) * 60000;
  const pinned = pinnedSet();
  const map = new Map();

  inbox.list().forEach((item) => {
    if (item.kind === 'g' && !settings.groupBubbles) return;
    if (item.kind === 'p' && !settings.peopleBubbles) return;
    map.set(item.key, item);
  });
  pinned.forEach((key) => {
    const kind = key.slice(0, 1), name = key.slice(2);
    if ((kind === 'g' && !settings.groupBubbles) || (kind === 'p' && !settings.peopleBubbles)) return;
    if (!map.has(key) && name) map.set(key, blank(kind, name));
  });

  const arr = [...map.values()]
    .map((it) => ({ ...it, pinned: pinned.has(it.key) }))
    .filter((it) => {
      if (it.pinned) return true;
      if (chatOpen && it.key === openedKey) return true;          // đang xem hội thoại này thì giữ bong bóng
      if (!it.count && settings.hideReadBubbles) return false;      // tùy chọn: đã đọc hết -> ẩn bong bóng
      return (dismissed[it.key] || 0) < it.lastAt && (!hideMs || now - it.lastAt < hideMs);
    });
  arr.sort((x, y) => (y.pinned - x.pinned) || (y.lastAt - x.lastAt));
  return arr.slice(0, Math.max(1, Number(settings.groupMax) || 5));
}

function updateStack() {
  if (!stackWin || stackWin.isDestroyed() || !bubbleWin || bubbleWin.isDestroyed()) return;
  stackItems = bubbleList();
  if (!stackItems.length || !bubbleWin.isVisible() || capturing) { stackWin.hide(); lastStackKey = ''; return; }
  const b = bubbleWin.getBounds();
  const cx = b.x + b.width / 2;
  const wa = screen.getDisplayNearestPoint({ x: cx, y: b.y + b.height / 2 }).workArea;
  const side = cx > wa.x + wa.width / 2 ? 'right' : 'left';
  const colCenter = side === 'right' ? STACK_W - 14 - SB / 2 : 14 + SB / 2;
  let h = 12 + stackItems.length * SSTEP + 40;
  let y = b.y + b.height;
  if (y + h > wa.y + wa.height) y = Math.max(wa.y, b.y - h);   // hết chỗ phía dưới thì xếp lên trên
  h = Math.min(h, wa.y + wa.height - y);
  const bounds = { x: Math.round(cx - colCenter), y: Math.round(y), width: STACK_W, height: Math.round(h) };
  const nb = stackWin.getBounds();
  if (nb.x !== bounds.x || nb.y !== bounds.y || nb.height !== bounds.height) stackWin.setBounds(bounds);
  const now = Date.now();
  const payload = {
    side, size: SB, step: SSTEP,
    groups: stackItems.map((it) => ({
      key: it.key, kind: it.kind, name: it.name, count: it.count, total: it.total, pinned: it.pinned,
      avatar: settings.useAvatars ? icons.get(it.key) : '',
      sender: it.lastSender, text: settings.hidePreview ? '' : it.lastText,
      tagged: !!it.tagged, at: it.lastAt, fresh: it.count > 0 && now - it.lastAt < 15000
    }))
  };
  const key = JSON.stringify(payload);
  if (key !== lastStackKey) {
    lastStackKey = key;
    stackWin.webContents.send('stack:data', payload);
    if (payload.groups.some((g) => g.fresh)) setTimeout(updateStack, 15500);   // tắt hiệu ứng "mới"
  }
  if (!stackWin.isVisible()) stackWin.showInactive();
}

function findItem(key) { return stackItems.find((x) => x.key === key) || bubbleList().find((x) => x.key === key); }

function openBubble(key) {
  // Bấm lại đúng bong bóng đang mở thì thu khung chat lại (giống bong bóng chính)
  if (chatOpen && openedKey === key) { hideChat(); return; }
  const it = findItem(key);
  const kind = key.slice(0, 1), name = key.slice(2);
  inbox.markSeen(key);
  if (kind === 'g') mentions.markGroupSeen(name);
  pushState();
  openChatAt(it ? it.lastNid : '', name);
  openedKey = key;
  if (!it || !it.lastNid) toast('Mở hội thoại "' + name + '" để xem tin.', 7000);
}

function togglePinBubble(key) {
  const list = settings.pinnedBubbles || [];
  settings.pinnedBubbles = list.includes(key) ? list.filter((k) => k !== key) : list.concat([key]).slice(-20);
  cfg.save(settings);
  updateStack();
}

function dismissBubble(key) {
  dismissed[key] = Date.now();
  if ((settings.pinnedBubbles || []).includes(key)) {
    settings.pinnedBubbles = settings.pinnedBubbles.filter((k) => k !== key);
    cfg.save(settings);
  }
  updateStack();
}

function dismissAllBubbles() {
  const now = Date.now();
  stackItems.forEach((it) => { if (!it.pinned) dismissed[it.key] = now; });
  updateStack();
}

function setBubbleKind(kind, on) {
  if (kind === 'g') settings.groupBubbles = on; else settings.peopleBubbles = on;
  cfg.save(settings);
  updateStack();
}

function bubbleMenu(key) {
  const kind = key.slice(0, 1), name = key.slice(2);
  const pinned = (settings.pinnedBubbles || []).includes(key);
  return Menu.buildFromTemplate([
    { label: (kind === 'g' ? 'Mở nhóm "' : 'Mở chat với "') + name + '"', click: () => openBubble(key) },
    { label: pinned ? 'Bỏ ghim bong bóng' : 'Ghim bong bóng (không tự ẩn)', click: () => togglePinBubble(key) },
    { label: 'Đánh dấu đã đọc', click: () => {
      inbox.markSeen(key);
      if (kind === 'g') mentions.markGroupSeen(name);
      pushState();
    } },
    { label: 'Đóng bong bóng này', click: () => dismissBubble(key) },
    { type: 'separator' },
    { label: 'Đóng tất cả bong bóng (trừ bong bóng đã ghim)', click: dismissAllBubbles },
    kind === 'g'
      ? { label: 'Tắt bong bóng nhóm', click: () => setBubbleKind('g', false) }
      : { label: 'Tắt bong bóng người nhắn riêng', click: () => setBubbleKind('p', false) }
  ]);
}

const fromStack = (e) => stackWin && !stackWin.isDestroyed() && e.sender === stackWin.webContents;
ipcMain.on('stack:mouse', (e, inside) => {
  if (!fromStack(e)) return;
  stackHot = !!inside;
  if (inside) stackWin.setIgnoreMouseEvents(false);
  else stackWin.setIgnoreMouseEvents(true, { forward: true });
});
ipcMain.on('stack:open', (e, key) => { if (fromStack(e)) openBubble(String(key || '')); });
ipcMain.on('stack:menu', (e, key) => { if (fromStack(e)) bubbleMenu(String(key || '')).popup({ window: bubbleWin }); });
ipcMain.on('stack:close-all', (e) => { if (fromStack(e)) dismissAllBubbles(); });

/* ---------------- Chụp màn hình nhanh ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startCapture() {
  if (capturing) return;
  capturing = true;
  if (chatWin) chatWin.hide();
  if (bubbleWin) bubbleWin.hide();
  if (stackWin) stackWin.hide();
  await sleep(250);
  try {
    const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const sf = d.scaleFactor || 1;
    const size = { width: Math.round(d.bounds.width * sf), height: Math.round(d.bounds.height * sf) };
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
    const src = sources.find((s) => String(s.display_id) === String(d.id)) || sources[0];
    if (!src || src.thumbnail.isEmpty()) throw new Error('no-source');
    captureImage = src.thumbnail;
    captureDisplay = d;

    captureWin = new BrowserWindow({
      x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height,
      frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
      fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, enableLargerThanScreen: true,
      show: false, backgroundColor: '#000000', webPreferences: uiPrefs()
    });
    captureWin.setAlwaysOnTop(true, 'screen-saver');
    captureWin.loadFile(path.join(UI, 'capture.html'));
    captureWin.webContents.once('did-finish-load', () => {
      const jpg = 'data:image/jpeg;base64,' + captureImage.toJPEG(90).toString('base64');
      captureWin.webContents.send('capture:image', jpg);
    });
    captureWin.once('ready-to-show', () => {
      captureWin.setBounds(d.bounds);
      captureWin.show();
      captureWin.focus();
    });
    captureWin.on('closed', () => { captureWin = null; if (capturing) finishCapture(false); });
  } catch (err) {
    finishCapture(false);
  }
}

ipcMain.on('capture:done', (e, r) => {
  if (!captureWin || e.sender !== captureWin.webContents || !captureImage || !captureDisplay) return finishCapture(false);
  const ratio = captureImage.getSize().width / captureDisplay.bounds.width;
  const img = captureImage.getSize();
  const rect = {
    x: Math.max(0, Math.round(r.x * ratio)),
    y: Math.max(0, Math.round(r.y * ratio)),
    width: Math.round(r.w * ratio),
    height: Math.round(r.h * ratio)
  };
  rect.width = Math.min(rect.width, img.width - rect.x);
  rect.height = Math.min(rect.height, img.height - rect.y);
  if (rect.width < 4 || rect.height < 4) return finishCapture(false);
  const cropped = captureImage.crop(rect);
  const sf = captureDisplay.scaleFactor || 1;
  finishCapture(false);
  openEditor(cropped, sf, 'Ảnh chụp màn hình');
});

ipcMain.on('capture:cancel', (e) => { if (captureWin && e.sender === captureWin.webContents) finishCapture(false); });

function finishCapture() {
  if (!capturing) return;
  capturing = false;
  if (captureWin && !captureWin.isDestroyed()) captureWin.close();
  captureImage = null;
  captureDisplay = null;
  if (bubbleWin) bubbleWin.showInactive();
  updateStack();
}

// Dán ảnh đang có trong bộ nhớ tạm vào khung chat
function pasteImageToChat() {
  openChat();
  setTimeout(() => {
    zaloView.webContents.focus();
    zaloView.webContents.paste();
    toast('Ảnh đã được dán. Nếu chưa thấy, mở đúng hội thoại rồi nhấn Ctrl+V.', 6000);
  }, 400);
}

/* ---------------- Bảng vẽ ghi chú ---------------- */

let editorImage = null;

function openEditor(img, scaleFactor, label) {
  if (!img || img.isEmpty()) return;
  if (editorWin && !editorWin.isDestroyed()) editorWin.close();
  editorImage = { url: img.toDataURL(), label: label || 'Ảnh' };
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const wa = d.workArea;
  const size = img.getSize();
  const sf = scaleFactor || d.scaleFactor || 1;
  const TOOLBAR = 112;
  const w = Math.round(Math.min(wa.width * 0.9, Math.max(720, size.width / sf + 48)));
  const h = Math.round(Math.min(wa.height * 0.9, Math.max(460, size.height / sf + TOOLBAR + 48)));
  editorWin = new BrowserWindow({
    x: Math.round(wa.x + (wa.width - w) / 2), y: Math.round(wa.y + (wa.height - h) / 2), width: w, height: h,
    minWidth: 640, minHeight: 400, title: 'Ghi chú lên ảnh – Zalo Bong Bóng', alwaysOnTop: true,
    autoHideMenuBar: true, backgroundColor: '#2B343B', show: false,
    icon: path.join(ASSETS, 'icon.png'), webPreferences: uiPrefs()
  });
  editorWin.setMenu(null);
  editorWin.loadFile(path.join(UI, 'editor.html'));
  editorWin.webContents.once('did-finish-load', () => {
    if (editorWin && editorImage) editorWin.webContents.send('editor:image', editorImage);
  });
  editorWin.once('ready-to-show', () => { editorWin.show(); editorWin.focus(); });
  editorWin.on('closed', () => { editorWin = null; editorImage = null; });
}

const fromEditor = (e) => editorWin && !editorWin.isDestroyed() && e.sender === editorWin.webContents;

function imageFromEditor(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return null;
  const img = nativeImage.createFromDataURL(dataUrl);
  return img.isEmpty() ? null : img;
}

ipcMain.on('editor:send', (e, dataUrl) => {
  if (!fromEditor(e)) return;
  const img = imageFromEditor(dataUrl);
  if (!img) return;
  clipboard.writeImage(img);
  editorWin.close();
  pasteImageToChat();
});
ipcMain.on('editor:copy', (e, dataUrl) => {
  if (!fromEditor(e)) return;
  const img = imageFromEditor(dataUrl);
  if (!img) return;
  clipboard.writeImage(img);
  editorWin.close();
});
ipcMain.on('editor:cancel', (e) => { if (fromEditor(e)) editorWin.close(); });

/* ---------------- Gửi vùng Excel vừa copy thành ảnh ---------------- */

// Excel thường đặt sẵn ảnh của vùng copy vào bộ nhớ tạm. Nếu không có, vẽ lại bảng từ HTML.
async function htmlTableToImage(html) {
  html = String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '');
  const page = '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:">' +
    '<style>html,body{margin:0;background:#fff}#w{display:inline-block;padding:8px;font-family:Calibri,Arial,sans-serif}' +
    'table{border-collapse:collapse}td,th{border:1px solid #BFBFBF}</style></head><body><div id="w">' + html + '</div></body></html>';
  const win = new BrowserWindow({
    show: false, width: 1600, height: 1200, useContentSize: true,
    webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page));
    const r = await win.webContents.executeJavaScript(
      '(() => { const b = document.getElementById("w").getBoundingClientRect(); return { w: Math.ceil(b.width), h: Math.ceil(b.height) }; })()');
    const w = Math.min(Math.max(r.w, 20), 4000), h = Math.min(Math.max(r.h, 20), 4000);
    win.setContentSize(w, h);
    await sleep(300);
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: w, height: h });
    return img.isEmpty() ? null : img;
  } catch (e) {
    return null;
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

async function sendExcelRange() {
  let img = clipboard.readImage();
  if (img.isEmpty()) {
    const html = clipboard.readHTML();
    if (/<table/i.test(html)) img = await htmlTableToImage(html);
  }
  if (!img || img.isEmpty()) {
    dialog.showMessageBox({
      type: 'info', title: 'Gửi vùng Excel',
      message: 'Chưa có vùng Excel nào được copy.',
      detail: 'Bôi đen vùng cần gửi trong Excel, nhấn Ctrl+C, rồi bấm lại nút này (hoặc ' +
        (prettyKey(settings.hotkeyExcel) || 'phím tắt') + ').',
      buttons: ['Đã hiểu'], noLink: true
    });
    return;
  }
  hideChat();
  openEditor(img, 1, 'Vùng Excel');
}

ipcMain.on('shell:excel', (e) => { if (fromShell(e)) sendExcelRange(); });

/* ---------------- Menu, khay hệ thống, phím tắt ---------------- */

function prettyKey(acc) { return String(acc || '').replace(/Control/g, 'Ctrl').replace(/CommandOrControl/g, 'Ctrl'); }

function setMode(m) { settings.notifyMode = m; cfg.save(settings); pushState(); }

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: chatOpen ? 'Thu gọn khung chat' : 'Mở khung chat', click: toggleChat },
    { label: 'Tin nhắc tên tôi' + (mentions.unseenCount() ? '   (' + mentions.unseenCount() + ' chưa xem)' : ''), click: () => setTimeout(openMentions, 120) },
    { label: 'Mở rộng: mở ứng dụng Zalo PC', click: () => openZaloPc() },
    { label: 'Gửi vùng Excel vừa copy' + (settings.hotkeyExcel ? '   (' + prettyKey(settings.hotkeyExcel) + ')' : ''), click: () => sendExcelRange() },
    { label: 'Chụp màn hình nhanh' + (settings.hotkeyCapture ? '   (' + prettyKey(settings.hotkeyCapture) + ')' : ''), click: () => setTimeout(startCapture, 150) },
    { type: 'separator' },
    {
      label: 'Thông báo', submenu: [
        { label: 'Chỉ khi được tag tên', type: 'radio', checked: settings.notifyMode === 'tag', click: () => setMode('tag') },
        { label: 'Mọi tin nhắn', type: 'radio', checked: settings.notifyMode === 'all', click: () => setMode('all') },
        { label: 'Tắt thông báo', type: 'radio', checked: settings.notifyMode === 'off', click: () => setMode('off') }
      ]
    },
    { label: 'Bong bóng cho mọi tin nhóm', type: 'checkbox', checked: !!settings.groupBubbles, click: (i) => setBubbleKind('g', i.checked) },
    {
      label: 'Kích thước bong bóng', submenu: [
        { label: 'Nhỏ', type: 'radio', checked: bubbleSize() <= 52, click: () => setBubbleSize(48) },
        { label: 'Vừa', type: 'radio', checked: bubbleSize() > 52 && bubbleSize() <= 72, click: () => setBubbleSize(60) },
        { label: 'Lớn', type: 'radio', checked: bubbleSize() > 72 && bubbleSize() <= 104, click: () => setBubbleSize(88) },
        { label: 'Rất lớn', type: 'radio', checked: bubbleSize() > 104, click: () => setBubbleSize(128) },
        { type: 'separator' },
        { label: 'To hơn  (+8)', click: () => setBubbleSize(bubbleSize() + 8) },
        { label: 'Nhỏ hơn  (−8)', click: () => setBubbleSize(bubbleSize() - 8) }
      ]
    },
    { label: 'Giữ nguyên hình (không cắt tròn, giữ nền trong suốt)', type: 'checkbox', checked: settings.bubbleShape === 'free', click: (i) => { settings.bubbleShape = i.checked ? 'free' : 'circle'; cfg.save(settings); pushBubbleImage(); } },
    { label: 'Tự xóa nền trắng / nền một màu của hình', type: 'checkbox', checked: !!settings.bubbleRemoveBg, click: (i) => { settings.bubbleRemoveBg = i.checked; if (i.checked) settings.bubbleShape = 'free'; cfg.save(settings); pushBubbleImage(); } },
    { label: 'Ẩn bong bóng nhỏ khi đã đọc', type: 'checkbox', checked: !!settings.hideReadBubbles, click: (i) => { settings.hideReadBubbles = i.checked; cfg.save(settings); updateStack(); } },
    { label: 'Bong bóng người nhắn riêng', type: 'checkbox', checked: !!settings.peopleBubbles, click: (i) => setBubbleKind('p', i.checked) },
    { label: 'Tắt âm', type: 'checkbox', checked: settings.muted, click: (i) => { settings.muted = i.checked; cfg.save(settings); pushState(); } },
    { label: 'Giữ khung chat luôn mở', type: 'checkbox', checked: settings.pinChat, click: (i) => { settings.pinChat = i.checked; cfg.save(settings); pushState(); } },
    { label: 'Khởi động cùng Windows', type: 'checkbox', checked: settings.autoStart, click: (i) => { settings.autoStart = i.checked; cfg.save(settings); applyAutoStart(); } },
    { type: 'separator' },
    { label: 'Cài đặt…', click: openSettings },
    { label: 'Đánh dấu tất cả đã đọc', click: () => { markEverythingRead(); pushState(); } },
    { label: 'Về trang chủ Zalo', click: () => { openChat(); goHome(true); } },
    { label: 'Tải lại Zalo', click: () => zaloView && zaloView.webContents.reload() },
    { label: 'Thoát', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
}

function createTray() {
  const img = nativeImage.createFromPath(path.join(ASSETS, 'tray.png'));
  tray = new Tray(img);
  tray.on('click', () => mainBubbleToggle());
  updateTray();
}

function updateTray() {
  if (!tray) return;
  tray.setToolTip(unread ? 'Zalo Bong Bóng – ' + unread + ' tin chưa đọc' : 'Zalo Bong Bóng');
  tray.setContextMenu(buildMenu());
}

function registerHotkeys() {
  globalShortcut.unregisterAll();
  const errors = [];
  const reg = (acc, fn, label) => {
    if (!acc) return;
    let ok = false;
    try { ok = globalShortcut.register(acc, fn); } catch (e) { ok = false; }
    if (!ok) errors.push(label + ' (' + prettyKey(acc) + ')');
  };
  reg(settings.hotkeyCapture, () => startCapture(), 'Chụp màn hình');
  reg(settings.hotkeyToggle, () => mainBubbleToggle(), 'Mở/thu khung chat');
  reg(settings.hotkeyExcel, () => sendExcelRange(), 'Gửi vùng Excel');
  return errors;
}

function applyAutoStart() {
  if (app.isPackaged && process.platform === 'win32') {
    app.setLoginItemSettings({ openAtLogin: !!settings.autoStart });
  }
}

function pushState() {
  const state = {
    unread, alerting, open: chatOpen, muted: settings.muted, mode: settings.notifyMode,
    pinned: settings.pinChat, captureKey: prettyKey(settings.hotkeyCapture), excelKey: prettyKey(settings.hotkeyExcel),
    mentions: mentions.unseenCount()
  };
  if (mentionsWin && !mentionsWin.isDestroyed()) mentionsWin.webContents.send('mentions:changed');
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.webContents.send('bubble:state', state);
  if (chatWin && !chatWin.isDestroyed()) chatWin.webContents.send('shell:state', state);
  updateTray();
  updateStack();
}

/* ---------------- Cửa sổ cài đặt ---------------- */

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 520, height: 720, minWidth: 420, minHeight: 500, title: 'Cài đặt – Zalo Bong Bóng',
    autoHideMenuBar: true, alwaysOnTop: true, backgroundColor: '#F4F6F8',
    icon: path.join(ASSETS, 'icon.png'), webPreferences: uiPrefs()
  });
  settingsWin.setMenu(null);
  settingsWin.loadFile(path.join(UI, 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

const fromSettings = (e) => settingsWin && !settingsWin.isDestroyed() && e.sender === settingsWin.webContents;
ipcMain.handle('settings:get', (e) => {
  if (!fromSettings(e)) throw new Error('forbidden');
  return ({
  myName: settings.myName,
  notifyMode: settings.notifyMode,
  tagKeywords: (settings.tagKeywords || []).join('\n'),
  priorityNames: (settings.priorityNames || []).join('\n'),
  hidePreview: settings.hidePreview,
  muted: settings.muted,
  pinChat: settings.pinChat,
  autoStart: settings.autoStart,
  hotkeyCapture: settings.hotkeyCapture,
  hotkeyToggle: settings.hotkeyToggle,
  hotkeyExcel: settings.hotkeyExcel,
  bubbleStyle: settings.bubbleStyle,
  bubblePreset: settings.bubblePreset,
  bubbleAnimate: settings.bubbleAnimate,
  bubbleShape: settings.bubbleShape,
  bubbleRemoveBg: !!settings.bubbleRemoveBg,
  bubbleSize: bubbleSize(),
  groupBubbles: settings.groupBubbles,
  peopleBubbles: settings.peopleBubbles,
  useAvatars: settings.useAvatars,
  mainOpensHome: settings.mainOpensHome,
  hideReadBubbles: settings.hideReadBubbles,
  groupMax: settings.groupMax,
  groupAutoHide: settings.groupAutoHide,
  bubbleImagePath: settings.bubbleImagePath,
  zaloPcPath: settings.zaloPcPath,
  zaloPcFound: findZaloPc()
  });
});

ipcMain.handle('settings:save', (e, s) => {
  if (!fromSettings(e)) throw new Error('forbidden');
  s = s || {};
  const lines = (v) => String(v || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 50);
  settings.myName = String(s.myName || '').trim().replace(/^@/, '').slice(0, 80);
  settings.notifyMode = ['tag', 'all', 'off'].includes(s.notifyMode) ? s.notifyMode : 'tag';
  settings.tagKeywords = lines(s.tagKeywords);
  settings.priorityNames = lines(s.priorityNames);
  settings.hidePreview = !!s.hidePreview;
  settings.muted = !!s.muted;
  settings.pinChat = !!s.pinChat;
  settings.autoStart = !!s.autoStart;
  settings.hotkeyCapture = String(s.hotkeyCapture || '').trim().slice(0, 40);
  settings.hotkeyToggle = String(s.hotkeyToggle || '').trim().slice(0, 40);
  settings.zaloPcPath = String(s.zaloPcPath || '').trim().slice(0, 500);
  settings.hotkeyExcel = String(s.hotkeyExcel || '').trim().slice(0, 40);
  settings.bubbleStyle = ['logo', 'classic', 'preset', 'custom'].includes(s.bubbleStyle) ? s.bubbleStyle : 'logo';
  settings.bubblePreset = PRESETS.some((p) => p.id === s.bubblePreset) ? s.bubblePreset : '';
  settings.bubbleImagePath = String(s.bubbleImagePath || '').trim().slice(0, 500);
  settings.bubbleAnimate = s.bubbleAnimate === 'onNew' ? 'onNew' : 'always';
  settings.bubbleShape = s.bubbleShape === 'free' ? 'free' : 'circle';
  settings.bubbleRemoveBg = !!s.bubbleRemoveBg;
  settings.bubbleSize = Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(Number(s.bubbleSize) || 60)));
  settings.groupBubbles = !!s.groupBubbles;
  settings.peopleBubbles = !!s.peopleBubbles;
  settings.useAvatars = !!s.useAvatars;
  settings.mainOpensHome = !!s.mainOpensHome;
  settings.hideReadBubbles = !!s.hideReadBubbles;
  settings.groupMax = [3, 5, 8].includes(Number(s.groupMax)) ? Number(s.groupMax) : 5;
  settings.groupAutoHide = [30, 60, 120, 240, 0].includes(Number(s.groupAutoHide)) ? Number(s.groupAutoHide) : 120;
  const errors = registerHotkeys();
  cfg.save(settings);
  applyAutoStart();
  pushState();
  applyBubbleSize();
  return { ok: errors.length === 0, errors };
});

ipcMain.handle('settings:browse-zalo', async (e) => fromSettings(e) ? pickZaloPc(settingsWin) : '');
ipcMain.handle('settings:browse-bubble', async (e) => {
  if (!fromSettings(e)) return { path: '' };
  const r = await dialog.showOpenDialog(settingsWin || null, {
    title: 'Chọn ảnh cho bong bóng',
    properties: ['openFile'],
    filters: [{ name: 'Ảnh hoặc GIF động', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico'] }]
  });
  if (r.canceled || !r.filePaths.length) return { path: '' };
  const p = r.filePaths[0];
  const im = imageFile(p);
  if (!im) return { path: '', error: 'Không đọc được ảnh này (hoặc ảnh lớn hơn 5 MB).' };
  return { path: p, url: im.url, animated: im.animated, hasAlpha: !!im.hasAlpha };
});

ipcMain.handle('settings:bubble-gallery', (e) => {
  if (!fromSettings(e)) throw new Error('forbidden');
  return ({
  logo: (imageFile(path.join(ASSETS, 'bubble-zalo.png')) || {}).url || '',
  presets: PRESETS.map((p) => {
    const im = imageFile(presetFile(p.id)) || {};
    return { id: p.id, name: p.name, url: im.url || '', animated: !!im.animated };
  }),
  custom: settings.bubbleImagePath ? (imageFile(settings.bubbleImagePath) || null) : null
  });
});

ipcMain.on('settings:close', (e) => {
  if (settingsWin && e.sender === settingsWin.webContents) settingsWin.close();
});
