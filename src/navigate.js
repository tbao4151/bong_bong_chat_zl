'use strict';
// Mở đúng hội thoại trong Zalo Web theo TÊN (người hoặc nhóm).
// Cách 1: bấm vào tên trong danh sách hội thoại đang hiện.
// Cách 2: gõ tên vào ô "Tìm kiếm" của Zalo Web rồi bấm kết quả trùng tên.
// Trả về 'list' | 'search' | false. Chạy trong trang Zalo Web (main world).

function script(name) {
  return '(' + navigate.toString() + ')(' + JSON.stringify(String(name || '')) + ')';
}

/* eslint-disable no-undef */
function navigate(name) {
  return (async function () {
    var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    var target = norm(name);
    if (!target) return false;
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var visible = function (el) {
      var r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    var cls = function (el) {
      var c = el.className;
      if (c && typeof c === 'object' && 'baseVal' in c) c = c.baseVal;
      return String(c || '') + ' ' + String(el.id || '');
    };
    function fire(el) {
      var r = el.getBoundingClientRect();
      var o = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (t) {
        var E = t.indexOf('pointer') === 0 && window.PointerEvent ? PointerEvent : MouseEvent;
        el.dispatchEvent(new E(t, o));
      });
    }
    // Nhanh: chỉ duyệt các đoạn chữ (text node) trùng đúng tên, không đọc chữ của cả khối lớn
    function ok(el, exclude) {
      if (!el || el.closest('input,textarea,[contenteditable="true"]')) return false;
      if (exclude && (el.contains(exclude) || exclude.contains(el))) return false;
      return visible(el);
    }
    function candidates(exclude, deep) {
      var out = [];
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (t) { return norm(t.nodeValue) === target ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
      });
      var t;
      while ((t = w.nextNode())) { if (ok(t.parentElement, exclude)) out.push(t.parentElement); }
      if (out.length || !deep) return out;
      // Tên bị tách thành nhiều đoạn (ví dụ kết quả tìm kiếm tô đậm phần trùng): kiểm tra khối nhỏ
      var first = target.charAt(0);
      var w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function (x) { return norm(x.nodeValue).charAt(0) === first || target.indexOf(norm(x.nodeValue)) === 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
      });
      while ((t = w2.nextNode())) {
        var el = t.parentElement;
        for (var up = 0; up < 3 && el; up++, el = el.parentElement) {
          var tx = el.textContent;
          if (tx.length > target.length + 6) break;
          if (norm(tx) === target) { if (ok(el, exclude) && out.indexOf(el) < 0) out.push(el); break; }
        }
      }
      return out;
    }
    function score(el) {
      var s = 0, p = el;
      for (var i = 0; i < 10 && p && p !== document.body; i++, p = p.parentElement) {
        var c = cls(p);
        if (/conv|msg-item|chat-item|item|list|search|result|friend|contact/i.test(c)) s += 2;
        if (p.getAttribute && (p.getAttribute('data-id') || p.getAttribute('data-convid') || p.getAttribute('anim-data-id'))) s += 3;
        if (/header|title-bar|chat-box|message|bubble|profile/i.test(c)) s -= 4;
      }
      return s;
    }
    function clickBest(exclude, deep) {
      var c = candidates(exclude, deep);
      if (!c.length) return false;
      c.sort(function (a, b) { return score(b) - score(a); });
      if (score(c[0]) < 0) return false;
      fire(c[0]);
      return true;
    }
    function findSearch() {
      return Array.prototype.slice.call(document.querySelectorAll('input')).find(function (x) {
        return visible(x) && /tìm|search/i.test((x.placeholder || '') + ' ' + (x.getAttribute('aria-label') || ''));
      });
    }

    // Thử ngay trong danh sách hội thoại đang hiện
    if (clickBest()) return 'list';
    // Chờ Zalo Web hiện giao diện (tối đa ~6 giây, ví dụ ngay sau khi tải lại trang)
    for (var i = 0; i < 60 && !findSearch(); i++) {
      await sleep(100);
      if (i % 5 === 4 && clickBest()) return 'list';
    }
    await sleep(120);
    if (clickBest()) return 'list';

    var input = findSearch();
    if (!input) return false;
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    input.focus();
    fire(input);
    setter.call(input, name);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    for (var k = 0; k < 30; k++) {
      await sleep(120);
      if (clickBest(input, k >= 1)) { await sleep(150); try { input.blur(); } catch (e) { /* bỏ qua */ } return 'search'; }
    }
    // Không thấy: xóa ô tìm kiếm cho gọn
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    try { input.blur(); } catch (e) { /* bỏ qua */ }
    return false;
  })();
}

module.exports = { script };
