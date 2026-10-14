'use strict';
// Chạy trong trang Zalo Web: bắt thông báo của Zalo để app tự lọc (chỉ báo khi được tag)
// và nhớ từng thông báo để sau này bấm vào là mở đúng hội thoại.
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('__zaloBubble', {
  notify: (title, body, nid, icon) => ipcRenderer.send('zalo:notify', {
    title: String(title || '').slice(0, 300),
    body: String(body || '').slice(0, 1000),
    nid: String(nid || '').slice(0, 40),
    icon: typeof icon === 'string' && icon.length < 300000 ? icon : ''
  }),
  icon: (nid, data) => ipcRenderer.send('zalo:icon', {
    nid: String(nid || '').slice(0, 40),
    data: typeof data === 'string' && data.length < 300000 ? data : ''
  })
});

function inject() {
  try {
    // Never instrument authentication or unrelated Zalo subdomains.
    if (window.location.origin !== 'https://chat.zalo.me') return;
    var bridge = window.__zaloBubble;
    var store = {}, order = [], seq = 0;

    function send(title, options) {
      var nid = Date.now().toString(36) + '-' + (seq++);
      var icon = (options && (options.icon || options.image)) || '';
      if (icon && typeof icon !== 'string') icon = String(icon);
      var direct = /^(https?:|data:image\/)/i.test(icon) ? icon : '';
      try { bridge.notify(title, options && options.body, nid, direct); } catch (e) { /* bỏ qua */ }
      // Ảnh dạng blob: chỉ trang web đọc được -> đổi sang data URL rồi gửi riêng
      if (icon && !direct && /^blob:/i.test(icon)) {
        try {
          fetch(icon).then(function (r) { return r.blob(); }).then(function (b) {
            var fr = new FileReader();
            fr.onload = function () { try { bridge.icon(nid, fr.result); } catch (e) { /* bỏ qua */ } };
            fr.readAsDataURL(b);
          }).catch(function () {});
        } catch (e) { /* bỏ qua */ }
      }
      return nid;
    }

    function FakeNotification(title, options) {
      var self = Object.create(FakeNotification.prototype);
      var listeners = {};
      self.title = title;
      self.body = (options && options.body) || '';
      self.data = options && options.data;
      self.tag = (options && options.tag) || '';
      self.onclick = null; self.onclose = null; self.onshow = null; self.onerror = null;
      self.close = function () {};
      self.addEventListener = function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); };
      self.removeEventListener = function (type, fn) {
        listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; });
      };
      self.__listeners = listeners;
      var nid = send(title, options);
      store[nid] = self;
      order.push(nid);
      if (order.length > 300) delete store[order.shift()];
      return self;
    }
    Object.defineProperty(FakeNotification, 'permission', { get: function () { return 'granted'; } });
    FakeNotification.requestPermission = function (cb) {
      if (typeof cb === 'function') cb('granted');
      return Promise.resolve('granted');
    };
    window.Notification = FakeNotification;

    // Gọi lại đúng hành động "bấm vào thông báo" của Zalo (thường là mở hội thoại đó)
    window.__zbClick = function (nid) {
      var n = store[nid];
      if (!n) return false;
      var ev = { type: 'click', target: n, currentTarget: n, preventDefault: function () {}, stopPropagation: function () {} };
      var done = false;
      try { if (typeof n.onclick === 'function') { n.onclick.call(n, ev); done = true; } } catch (e) { /* bỏ qua */ }
      (n.__listeners.click || []).forEach(function (fn) { try { fn.call(n, ev); done = true; } catch (e) { /* bỏ qua */ } });
      return done;
    };

    if (window.ServiceWorkerRegistration && ServiceWorkerRegistration.prototype) {
      ServiceWorkerRegistration.prototype.showNotification = function (title, options) {
        send(title, options);
        return Promise.resolve();
      };
    }
  } catch (e) { /* bỏ qua */ }
}

webFrame.executeJavaScript('(' + inject.toString() + ')();');
