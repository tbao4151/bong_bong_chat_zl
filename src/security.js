'use strict';

const ZALO_ORIGIN = 'https://chat.zalo.me';

function isZaloOrigin(value) {
  try { return new URL(value).origin === ZALO_ORIGIN; } catch (_) { return false; }
}

function isAllowedZaloPermission(wc, expectedContents, permission, origin, details = {}) {
  if (!expectedContents || wc !== expectedContents) return false;
  if (!['notifications', 'clipboard-sanitized-write'].includes(permission)) return false;
  if (!isZaloOrigin(wc.getURL())) return false;
  if (!isZaloOrigin(origin)) return false;
  // Explicitly reject cross-origin subframes, even when the top frame is Zalo.
  if (details && details.isMainFrame === false) return false;
  if (details && details.requestingUrl && !isZaloOrigin(details.requestingUrl)) return false;
  if (details && details.securityOrigin && !isZaloOrigin(details.securityOrigin)) return false;
  return true;
}

function isSafeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_) { return false; }
}
module.exports = { isZaloOrigin, isAllowedZaloPermission, isSafeExternalUrl };
