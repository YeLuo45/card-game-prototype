'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
})();
eval(fs.readFileSync(path.join(__dirname, 'sync-manager.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'privacy-manager.js'), 'utf8'));
var PrivacyManager = window.PrivacyManager;
var PRIVACY_LEVELS = window.PRIVACY_LEVELS;
var PRIVACY_DATA_CATEGORIES = window.PRIVACY_DATA_CATEGORIES;
var FederatedSyncManager = window.FederatedSyncManager;
var InMemoryCloudStore = window.InMemoryCloudStore;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var pm = new PrivacyManager();
  assertEq(pm.consentGiven, false, 'PM: no consent');
  assertEq(Object.keys(pm.settings).length, 7, 'PM: 7 default categories');
  var summary = pm.getSummary();
  assertEq(summary.consentGiven, false, 'PM: summary no consent');
  assertEq(summary.totalCategories, 7, 'PM: 7 categories');
  assertEq(pm.playerId, 'unknown', 'PM: unknown player');
}

function testConsent() {
  var pm = new PrivacyManager();
  var c = pm.giveConsent();
  assertEq(c.success, true, 'PM: consent given');
  assertEq(pm.hasConsent(), true, 'PM: hasConsent true');
  assertEq(typeof c.consentTimestamp, 'number', 'PM: timestamp set');
  assertEq(c.version, '1.0.0', 'PM: version');
  var r = pm.revokeConsent();
  assertEq(r.success, true, 'PM: consent revoked');
  assertEq(pm.hasConsent(), false, 'PM: hasConsent false');
  // all settings reset to local
  for (var k in pm.settings) {
    if (Object.prototype.hasOwnProperty.call(pm.settings, k)) {
      assertEq(pm.settings[k], 'local', 'PM: ' + k + ' is local');
    }
  }
}

function testSetLevel() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  var r = pm.setPrivacyLevel('identity', 'full');
  assertEq(r.success, true, 'PM: set full');
  assertEq(r.level, 'full', 'PM: level full');
  assertEq(r.previous, 'anonymous', 'PM: previous anonymous');
  // invalid category
  var e1 = pm.setPrivacyLevel('invalid_cat', 'full');
  assertEq(e1.error, 'invalid_category', 'PM: invalid category');
  // invalid level
  var e2 = pm.setPrivacyLevel('identity', 'invalid');
  assertEq(e2.error, 'invalid_level', 'PM: invalid level');
  // all valid categories
  for (var k in PRIVACY_DATA_CATEGORIES) {
    if (Object.prototype.hasOwnProperty.call(PRIVACY_DATA_CATEGORIES, k)) {
      var cat = PRIVACY_DATA_CATEGORIES[k];
      var rr = pm.setPrivacyLevel(cat, 'local');
      assertEq(rr.success, true, 'PM: ' + cat + ' local');
    }
  }
  // get
  var l = pm.getPrivacyLevel('identity');
  assertEq(l, 'local', 'PM: get level');
  var ln = pm.getPrivacyLevel('nonexistent');
  assert(ln === null, 'PM: get null');
  // all settings
  var all = pm.getAllSettings();
  assertEq(Object.keys(all).length, 7, 'PM: 7 settings');
}

function testReset() {
  var pm = new PrivacyManager();
  pm.setPrivacyLevel('identity', 'full');
  pm.setPrivacyLevel('decks', 'full');
  var r = pm.resetToDefaults();
  assertEq(r.success, true, 'PM: reset');
  assertEq(pm.settings.identity, 'anonymous', 'PM: identity back to anonymous');
  assertEq(pm.settings.decks, 'local', 'PM: decks back to local');
}

function testCanShare() {
  var pm = new PrivacyManager();
  assertEq(pm.canShare('identity'), false, 'PM: no consent no share');
  pm.giveConsent();
  // default settings: identity=anonymous, decks=local, stats=full
  assertEq(pm.canShare('identity'), false, 'PM: identity anonymous not full');
  assertEq(pm.canShare('decks'), false, 'PM: decks local not full');
  assertEq(pm.canShare('stats'), true, 'PM: stats full');
  pm.setPrivacyLevel('identity', 'full');
  assertEq(pm.canShare('identity'), true, 'PM: identity full');
}

function testCanShareAnonymously() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  // identity default is anonymous
  assertEq(pm.canShareAnonymously('identity'), true, 'PM: identity anonymous OK');
  assertEq(pm.canShareAnonymously('decks'), false, 'PM: decks local not anon');
  assertEq(pm.canShareAnonymously('stats'), true, 'PM: stats full counts');
  // no consent
  var pm2 = new PrivacyManager();
  assertEq(pm2.canShareAnonymously('identity'), false, 'PM: no consent');
}

function testRedactLocal() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('decks', 'local');
  var r = pm.redactForCloud({ playerId: 'p1', cards: ['a', 'b'] }, 'decks');
  assertEq(r.redacted, true, 'PM: local redacted');
  assertEq(r.level, 'local', 'PM: local level');
  assert(r.data === null, 'PM: local data null');
}

function testRedactAnonymous() {
  var pm = new PrivacyManager(null, { playerId: 'alice' });
  pm.giveConsent();
  // identity default anonymous
  var r = pm.redactForCloud({ playerId: 'alice', playerName: 'Alice', score: 100 }, 'identity');
  assertEq(r.redacted, true, 'PM: anon redacted');
  assertEq(r.level, 'anonymous', 'PM: anon level');
  assertEq(r.data.playerId.indexOf('h'), 0, 'PM: playerId hashed');
  assertEq(r.data.playerName.indexOf('anon_'), 0, 'PM: playerName anon');
  assertEq(r.data.score, 100, 'PM: score preserved');
  // stats anonymous
  pm.setPrivacyLevel('stats', 'anonymous');
  var r2 = pm.redactForCloud({ playerId: 'alice', wins: 10 }, 'stats');
  assertEq(r2.redacted, true, 'PM: stats anon');
  assertEq(r2.data.playerId.indexOf('h'), 0, 'PM: stats playerId hashed');
  // decks anonymous
  pm.setPrivacyLevel('decks', 'anonymous');
  var r3 = pm.redactForCloud({ playerId: 'alice', playerName: 'Alice', cards: ['c1'] }, 'decks');
  assertEq(r3.data.playerName, 'anon', 'PM: decks anon name');
}

function testRedactFull() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('identity', 'full');
  var r = pm.redactForCloud({ playerId: 'p1', name: 'A' }, 'identity');
  assertEq(r.redacted, false, 'PM: full not redacted');
  assertEq(r.level, 'full', 'PM: full level');
  assertEq(r.data.playerId, 'p1', 'PM: full data preserved');
}

function testRedactErrors() {
  var pm = new PrivacyManager();
  var r1 = pm.redactForCloud(null, 'identity');
  assertEq(r1.redacted, false, 'PM: null data');
  assertEq(r1.reason, 'invalid_data', 'PM: invalid reason');
  var r2 = pm.redactForCloud({}, 'invalid_cat');
  assertEq(r2.reason, 'unknown_category', 'PM: unknown category');
  var r3 = pm.redactForCloud('not obj', 'identity');
  assertEq(r3.redacted, false, 'PM: string data');
}

function testBatchRedact() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('identity', 'full');
  pm.setPrivacyLevel('decks', 'local');
  var r = pm.batchRedact({
    identity: { playerId: 'p1' },
    decks: { cards: ['a'] },
    stats: { wins: 5 }
  });
  assertEq(r.success, true, 'PM: batch success');
  assertEq(r.results.identity.level, 'full', 'PM: identity full');
  assertEq(r.results.decks.level, 'local', 'PM: decks local');
  assertEq(r.results.stats.level, 'full', 'PM: stats full');
  // errors
  var e1 = pm.batchRedact(null);
  assertEq(e1.error, 'invalid_input', 'PM: batch null');
}

function testShouldUpload() {
  var pm = new PrivacyManager();
  assertEq(pm.shouldUpload('identity'), false, 'PM: no consent');
  pm.giveConsent();
  // default: identity=anonymous, decks=local, stats=full
  assertEq(pm.shouldUpload('identity'), true, 'PM: identity anon uploads');
  assertEq(pm.shouldUpload('decks'), false, 'PM: decks local not upload');
  assertEq(pm.shouldUpload('stats'), true, 'PM: stats full upload');
}

function testGetUploadable() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('identity', 'full');
  pm.setPrivacyLevel('decks', 'local');
  var result = pm.getUploadableData({
    identity: { playerId: 'p1' },
    decks: { cards: ['a'] },
    stats: { wins: 5 }
  });
  assertEq(typeof result.identity, 'object', 'PM: identity uploaded');
  assertEq(typeof result.decks, 'undefined', 'PM: decks skipped');
  assertEq(typeof result.stats, 'object', 'PM: stats uploaded');
}

function testPublish() {
  var sharedCloud = new InMemoryCloudStore();
  var fsm = new FederatedSyncManager({ cloudStore: sharedCloud });
  var pm = new PrivacyManager(fsm, { playerId: 'p1' });
  // no consent
  var r0 = pm.publishToCloud({ identity: { x: 1 } });
  assertEq(r0.error, 'no_consent', 'PM: no consent publish');
  // with consent
  pm.giveConsent();
  var r1 = pm.publishToCloud({ identity: { x: 1 }, decks: { y: 2 } });
  assertEq(r1.success, true, 'PM: publish success');
  // no sync
  var pm2 = new PrivacyManager(null);
  pm2.giveConsent();
  var r2 = pm2.publishToCloud({ identity: { x: 1 } });
  assertEq(r2.error, 'no_sync', 'PM: no sync');
  // empty data
  pm.setPrivacyLevel('identity', 'local');
  pm.setPrivacyLevel('stats', 'local');
  pm.setPrivacyLevel('decks', 'local');
  var r3 = pm.publishToCloud({ identity: {}, stats: {}, decks: {} });
  assertEq(r3.success, true, 'PM: empty data success');
  assertEq(r3.uploaded, 0, 'PM: 0 uploaded');
}

function testAuditLog() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('identity', 'full');
  pm.setPrivacyLevel('decks', 'local');
  var log = pm.getAuditLog();
  assert(log.length >= 3, 'PM: audit log has entries');
  var types = log.map(function (e) { return e.action; });
  assert(types.indexOf('consent_given') !== -1, 'PM: consent in log');
  assert(types.indexOf('privacy_changed') !== -1, 'PM: privacy change in log');
  var limited = pm.getAuditLog(2);
  assertEq(limited.length, 2, 'PM: audit log limit');
}

function testExportImport() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('identity', 'full');
  var exp = pm.exportSettings();
  assertEq(typeof exp, 'string', 'PM: export string');
  var parsed = JSON.parse(exp);
  assertEq(parsed.format, 'privacy-settings-v1', 'PM: format');
  var pm2 = new PrivacyManager();
  var imp = pm2.importSettings(exp);
  assertEq(imp.success, true, 'PM: import');
  assertEq(pm2.settings.identity, 'full', 'PM: imported setting');
  assertEq(pm2.consentGiven, true, 'PM: imported consent');
  // errors
  var e1 = pm2.importSettings(null);
  assertEq(e1.error, 'invalid_input', 'PM: import null');
  var e2 = pm2.importSettings('not json');
  assertEq(e2.error, 'parse_error', 'PM: import bad json');
  var e3 = pm2.importSettings('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'PM: import bad format');
}

function testClear() {
  var pm = new PrivacyManager();
  pm.giveConsent();
  pm.setPrivacyLevel('identity', 'full');
  var c = pm.clear();
  assertEq(c.success, true, 'PM: clear');
  assertEq(pm.consentGiven, false, 'PM: consent cleared');
  assertEq(pm.auditLog.length, 0, 'PM: log cleared');
  assertEq(pm.settings.identity, 'anonymous', 'PM: reset to default');
}

function testConstants() {
  assertEq(PRIVACY_LEVELS.ANONYMOUS, 'anonymous', 'PM: LEVELS.ANONYMOUS');
  assertEq(PRIVACY_DATA_CATEGORIES.STATS, 'stats', 'PM: CATS.STATS');
}

testEmpty();
testConsent();
testSetLevel();
testReset();
testCanShare();
testCanShareAnonymously();
testRedactLocal();
testRedactAnonymous();
testRedactFull();
testRedactErrors();
testBatchRedact();
testShouldUpload();
testGetUploadable();
testPublish();
testAuditLog();
testExportImport();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
