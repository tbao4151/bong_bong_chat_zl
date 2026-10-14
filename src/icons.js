'use strict';
// Avatars are cached in memory only. No unencrypted local avatar database.
const MAX = 150;
const store = new Map();

function get(key) {
  const entry = store.get(key);
  return entry ? entry.url : '';
}
function set(key, url) {
  if (!key || !url) return false;
  const before = store.get(key);
  if (before && before.url === url) return false;
  store.delete(key);
  store.set(key, { url, at: Date.now() });
  while (store.size > MAX) store.delete(store.keys().next().value);
  return true;
}
function clear() { store.clear(); }
module.exports = { get, set, clear };
