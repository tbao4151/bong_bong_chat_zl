'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createInbox } = require('../src/inbox');
const { isZaloOrigin, isAllowedZaloPermission, isSafeExternalUrl } = require('../src/security');

test('each new direct message creates or refreshes one bubble', () => {
  let t = 10000;
  const inbox = createInbox({ now: () => t });
  inbox.add({ sender: 'An', text: 'Hello', nid: '1' });
  t += 2000;
  inbox.add({ sender: 'An', text: 'New', nid: '2' });
  assert.equal(inbox.list().length, 1);
  assert.equal(inbox.list()[0].count, 2);
  assert.equal(inbox.list()[0].kind, 'p');
  inbox.markSeen('p:An');
  assert.equal(inbox.list()[0].count, 0);
});

test('all group messages produce bubbles; mention highlighting is separate', () => {
  const inbox = createInbox();
  inbox.add({ group: 'Lop 9', sender: 'Minh', text: 'Chao', tagged: false });
  inbox.add({ group: 'HSG', sender: 'Lan', text: '@An', tagged: true });
  const items = inbox.list();
  assert.equal(items.length, 2);
  assert.equal(items[0].tagged, false);
  assert.equal(items[1].tagged, true);
});

test('duplicate notification channels within 1.5 seconds do not duplicate count', () => {
  let t = 1000;
  const inbox = createInbox({ now: () => t });
  inbox.add({ sender: 'A', text: 'Hi' });
  t += 100;
  assert.equal(inbox.add({ sender: 'A', text: 'Hi' }), null);
  assert.equal(inbox.list()[0].count, 1);
  t += 2000;
  inbox.add({ sender: 'A', text: 'Hi' });
  assert.equal(inbox.list()[0].count, 2);
});

test('bubbles never persist by themselves and clear in memory', () => {
  const inbox = createInbox();
  inbox.add({ sender: 'A', text: 'private' });
  inbox.markAll();
  assert.equal(inbox.list()[0].count, 0);
  inbox.clear();
  assert.deepEqual(inbox.list(), []);
});

test('permission policy restricts to first-party Zalo main frame', () => {
  const wc = { getURL: () => 'https://chat.zalo.me/' };
  assert.equal(isAllowedZaloPermission(wc, wc, 'notifications', 'https://chat.zalo.me/', { isMainFrame: true }), true);
  assert.equal(isAllowedZaloPermission(wc, wc, 'clipboard-sanitized-write', 'https://chat.zalo.me'), true);
  for (const perm of ['media', 'clipboard-read', 'display-capture', 'openExternal']) {
    assert.equal(isAllowedZaloPermission(wc, wc, perm, 'https://chat.zalo.me'), false);
  }
  assert.equal(isAllowedZaloPermission(wc, wc, 'notifications', 'https://evil.test'), false);
  assert.equal(isAllowedZaloPermission(wc, wc, 'notifications', 'https://chat.zalo.me', { isMainFrame: false }), false);
  assert.equal(isAllowedZaloPermission({}, wc, 'notifications', 'https://chat.zalo.me'), false);
  assert.equal(isZaloOrigin('https://chat.zalo.me.evil.test'), false);
  assert.equal(isSafeExternalUrl('file:///C:/Windows'), false);
  assert.equal(isSafeExternalUrl('https://example.com'), true);
});
