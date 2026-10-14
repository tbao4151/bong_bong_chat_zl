'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }

test('desktop entrypoint keeps Zalo in sandbox without privileged clipboard or screen APIs', () => {
  const main = source('src/main.js');
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.doesNotMatch(main, /desktopCapturer|clipboard\.read|clipboard\.write|startCapture|sendExcelRange/);
  assert.match(main, /app\.setPath\('userData',.*Zalo Bong Bong Secure/);
  assert.match(main, /confirmExternalLink\(url\)/);
});

test('no plaintext chat-notification databases remain', () => {
  for (const file of ['src/inbox.js', 'src/icons.js', 'src/mentions.js']) {
    assert.doesNotMatch(source(file), /writeFileSync|appendFileSync|createWriteStream/);
  }
});

test('build is pinned and does not ship obsolete builder', () => {
  const manifest = JSON.parse(source('package.json'));
  const lock = JSON.parse(source('package-lock.json'));
  assert.equal(manifest.devDependencies.electron, '44.7.2');
  assert.equal(manifest.devDependencies['@electron/packager'], '20.3.0');
  assert.equal(manifest.devDependencies['electron-builder'], undefined);
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].version, manifest.version);
});
