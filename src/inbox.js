'use strict';
// Ephemeral inbox: content stays only in process memory; nothing is written to disk.
function createInbox({ now = () => Date.now(), maxConversations = 100 } = {}) {
  const conversations = new Map();
  const recent = new Map();

  function add({ group = '', sender = '', text = '', nid = '', tagged = false } = {}) {
    const name = String(group || sender).trim().slice(0, 120);
    if (!name) return null;
    const kind = group ? 'g' : 'p';
    const at = now();
    const message = String(text || '').slice(0, 500);
    const author = String(sender || '').slice(0, 120);
    const signature = JSON.stringify([kind, name, author, message]);
    // Zalo Web can call both Notification and ServiceWorker.showNotification.
    if (recent.has(signature) && at - recent.get(signature) < 1500) return null;
    recent.set(signature, at);
    for (const [key, time] of recent) if (at - time > 3000) recent.delete(key);

    const key = kind + ':' + name;
    const value = conversations.get(key) || {
      key, kind, name, count: 0, total: 0, lastAt: 0,
      lastNid: '', lastSender: '', lastText: '', tagged: false
    };
    value.count++;
    value.total++;
    value.lastAt = at;
    value.lastNid = String(nid || '').slice(0, 40);
    value.lastSender = author;
    value.lastText = message;
    value.tagged = Boolean(tagged) || (value.count > 1 && value.tagged);
    conversations.delete(key);
    conversations.set(key, value);
    while (conversations.size > maxConversations) conversations.delete(conversations.keys().next().value);
    return { ...value };
  }

  function list() { return [...conversations.values()].map((value) => ({ ...value })); }
  function markSeen(key) {
    const item = conversations.get(key);
    if (item) { item.count = 0; item.tagged = false; }
  }
  function markAll() {
    for (const item of conversations.values()) { item.count = 0; item.tagged = false; }
  }
  function clear() { conversations.clear(); recent.clear(); }
  return { add, list, markSeen, markAll, clear };
}
module.exports = { createInbox };
