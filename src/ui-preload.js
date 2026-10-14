'use strict';
// Cầu nối an toàn giữa giao diện (bong bóng, khung chat, chụp màn hình, cài đặt) và tiến trình chính
const { contextBridge, ipcRenderer } = require('electron');

const SEND = [
  'bubble:drag-start', 'bubble:drag-move', 'bubble:drag-end', 'bubble:click', 'bubble:menu', 'bubble:mentions',
  'shell:min', 'shell:pin', 'shell:expand', 'shell:mentions', 'shell:excel', 'shell:capture', 'shell:reload', 'shell:menu',
  'capture:done', 'capture:cancel', 'settings:close',
  'stack:mouse', 'stack:open', 'stack:menu', 'stack:close-all',
  'mentions:open', 'mentions:seen-all', 'mentions:clear', 'mentions:close', 'mentions:settings',
  'editor:send', 'editor:copy', 'editor:cancel'
];
const RECV = ['stack:data', 'bubble:image', 'bubble:state', 'bubble:ping', 'shell:state', 'shell:toast', 'capture:image', 'mentions:changed', 'editor:image'];
const INVOKE = ['settings:get', 'settings:save', 'settings:browse-zalo', 'settings:browse-bubble', 'settings:bubble-gallery', 'mentions:list'];

contextBridge.exposeInMainWorld('app', {
  send: (ch, data) => { if (SEND.includes(ch)) ipcRenderer.send(ch, data); },
  on: (ch, cb) => { if (RECV.includes(ch)) ipcRenderer.on(ch, (_e, data) => cb(data)); },
  invoke: (ch, data) => (INVOKE.includes(ch) ? ipcRenderer.invoke(ch, data) : Promise.reject(new Error('blocked')))
});
