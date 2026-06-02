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
eval(fs.readFileSync(path.join(__dirname, 'cross-device-session.js'), 'utf8'));
var CrossDeviceSession = window.CrossDeviceSession;
var SESSION_STATUS = window.SESSION_STATUS;
var SESSION_TYPES = window.SESSION_TYPES;
var FederatedSyncManager = window.FederatedSyncManager;
var InMemoryCloudStore = window.InMemoryCloudStore;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var cds = new CrossDeviceSession();
  assertEq(cds.index.length, 0, 'CDS: empty index');
  assertEq(Object.keys(cds.sessions).length, 0, 'CDS: empty sessions');
  var s = cds.getSummary();
  assertEq(s.totalSessions, 0, 'CDS: summary 0');
  assertEq(s.deviceId, 'unknown', 'CDS: unknown device');
}

function testCreate() {
  var cds = new CrossDeviceSession();
  var r = cds.createSession('s1', 'battle', { hp: 100, gold: 50 });
  assertEq(r.success, true, 'CDS: create');
  assertEq(r.sessionId, 's1', 'CDS: id s1');
  var s = cds.getSession('s1');
  assertEq(s.type, 'battle', 'CDS: type battle');
  assertEq(s.status, 'active', 'CDS: status active');
  assertEq(s.state.hp, 100, 'CDS: hp 100');
  assertEq(s.state.gold, 50, 'CDS: gold 50');
  var r2 = cds.createSession('s2');
  assertEq(r2.success, true, 'CDS: default type');
  assertEq(cds.getSession('s2').type, 'battle', 'CDS: default type battle');
  for (var t in SESSION_TYPES) {
    if (Object.prototype.hasOwnProperty.call(SESSION_TYPES, t)) {
      var sid = 's_' + SESSION_TYPES[t];
      var rr = cds.createSession(sid, SESSION_TYPES[t]);
      assertEq(rr.success, true, 'CDS: type ' + SESSION_TYPES[t]);
    }
  }
  var e1 = cds.createSession('', 'battle');
  assertEq(e1.error, 'invalid_session_id', 'CDS: invalid id');
  var e2 = cds.createSession('s1', 'battle');
  assertEq(e2.error, 'session_exists', 'CDS: exists');
  var e3 = cds.createSession('sx', 'invalid_type');
  assertEq(e3.error, 'invalid_type', 'CDS: invalid type');
}

function testUpdate() {
  var cds = new CrossDeviceSession();
  cds.createSession('s1', 'battle', { hp: 100 });
  var r = cds.updateState('s1', { hp: 80, gold: 30 });
  assertEq(r.success, true, 'CDS: update');
  var st = cds.getState('s1');
  assertEq(st.hp, 80, 'CDS: hp 80');
  assertEq(st.gold, 30, 'CDS: gold 30');
  cds.updateState('s1', { hand: ['c1', 'c2'] });
  var st2 = cds.getState('s1');
  assertEq(st2.hand[0], 'c1', 'CDS: hand merged');
  var e1 = cds.updateState('missing', {});
  assertEq(e1.error, 'not_found', 'CDS: update not found');
  var e2 = cds.updateState('s1', null);
  assertEq(e2.error, 'invalid_state', 'CDS: invalid state');
  cds.completeSession('s1');
  var e3 = cds.updateState('s1', { hp: 1 });
  assertEq(e3.error, 'session_inactive', 'CDS: completed inactive');
}

function testCheckpoint() {
  var cds = new CrossDeviceSession();
  cds.createSession('s1', 'battle', { hp: 100 });
  cds.updateState('s1', { hp: 80 });
  cds.updateState('s1', { hp: 50 });
  cds.checkpoint('s1');
  cds.updateState('s1', { hp: 20 });
  var latest = cds.getLatestCheckpoint('s1');
  assertEq(latest.state.hp, 50, 'CDS: checkpoint state');
  var rb = cds.rollbackToCheckpoint('s1');
  assertEq(rb.success, true, 'CDS: rollback');
  assertEq(cds.getState('s1').hp, 50, 'CDS: rolled back to 50');
  cds.checkpoint('s1');
  cds.updateState('s1', { hp: 10 });
  cds.rollbackToCheckpoint('s1', cds.getSession('s1').checkpoints.length - 1);
  var st = cds.getState('s1');
  assertEq(st.hp, 50, 'CDS: rollback to specific index');
  var cds2 = new CrossDeviceSession();
  cds2.createSession('s2');
  var rb2 = cds2.rollbackToCheckpoint('s2');
  assertEq(rb2.error, 'no_checkpoints', 'CDS: no checkpoints');
  var rb3 = cds.rollbackToCheckpoint('s1', 999);
  assertEq(rb3.error, 'invalid_index', 'CDS: invalid index');
  var rb4 = cds.rollbackToCheckpoint('missing');
  assertEq(rb4.error, 'not_found', 'CDS: rollback not found');
  var lc = cds.getLatestCheckpoint('missing');
  assert(lc === null, 'CDS: latest null');
  var cp = cds.checkpoint('missing');
  assertEq(cp.error, 'not_found', 'CDS: checkpoint not found');
}

function testLifecycle() {
  var cds = new CrossDeviceSession();
  cds.createSession('s1');
  var p = cds.pauseSession('s1');
  assertEq(p.success, true, 'CDS: pause');
  assertEq(cds.getSession('s1').status, 'paused', 'CDS: paused');
  var p2 = cds.pauseSession('s1');
  assertEq(p2.error, 'not_active', 'CDS: not_active error');
  var r = cds.resumeSession('s1');
  assertEq(r.success, true, 'CDS: resume');
  var r2 = cds.resumeSession('s1');
  assertEq(r2.error, 'not_paused', 'CDS: not_paused error');
  var c = cds.completeSession('s1');
  assertEq(c.success, true, 'CDS: complete');
  assertEq(cds.getSession('s1').status, 'completed', 'CDS: completed');
  var e1 = cds.pauseSession('missing');
  assertEq(e1.error, 'not_found', 'CDS: pause missing');
  var e2 = cds.resumeSession('missing');
  assertEq(e2.error, 'not_found', 'CDS: resume missing');
  var e3 = cds.completeSession('missing');
  assertEq(e3.error, 'not_found', 'CDS: complete missing');
  cds.createSession('s2');
  var a = cds.abandonSession('s2', 'test reason');
  assertEq(a.success, true, 'CDS: abandon');
  assertEq(cds.getSession('s2').status, 'abandoned', 'CDS: abandoned');
  assertEq(cds.index.indexOf('s2') !== -1, true, 'CDS: still in index');
  var a2 = cds.abandonSession('missing');
  assertEq(a2.error, 'not_found', 'CDS: abandon missing');
}

function testList() {
  var cds = new CrossDeviceSession();
  cds.createSession('s1', 'battle');
  cds.createSession('s2', 'shop');
  cds.createSession('s3', 'map');
  cds.pauseSession('s2');
  cds.completeSession('s3');
  var all = cds.listSessions();
  assertEq(all.length, 3, 'CDS: list 3');
  var active = cds.getActiveSessions();
  assertEq(active.length, 1, 'CDS: 1 active');
  assertEq(active[0].id, 's1', 'CDS: active s1');
  var paused = cds.listSessions('paused');
  assertEq(paused.length, 1, 'CDS: 1 paused');
  var completed = cds.listSessions('completed');
  assertEq(completed.length, 1, 'CDS: 1 completed');
  cds.updateState('s1', { x: 1 });
  var list = cds.listSessions();
  assertEq(list[0].id, 's1', 'CDS: most recent first');
}

function testTransfer() {
  var cds = new CrossDeviceSession(null, { deviceId: 'devA' });
  cds.createSession('s1', 'battle', { hp: 100, gold: 50 });
  cds.updateState('s1', { hp: 80 });
  var ser = cds.serializeForTransfer('s1');
  assertEq(typeof ser, 'string', 'CDS: serialize string');
  var parsed = JSON.parse(ser);
  assertEq(parsed.format, 'cross-device-session-v1', 'CDS: format');
  assertEq(parsed.sourceDevice, 'devA', 'CDS: source devA');
  var cds2 = new CrossDeviceSession(null, { deviceId: 'devB' });
  var imp = cds2.importFromTransfer(ser);
  assertEq(imp.success, true, 'CDS: import success');
  assertEq(imp.fromDevice, 'devA', 'CDS: from devA');
  var imported = cds2.getSession('s1');
  assertEq(imported.state.hp, 80, 'CDS: imported hp');
  var imp2 = cds2.importFromTransfer(ser);
  assertEq(imp2.success, true, 'CDS: re-import');
  var e1 = cds2.importFromTransfer(null);
  assertEq(e1.error, 'invalid_input', 'CDS: import null');
  var e2 = cds2.importFromTransfer('not json');
  assertEq(e2.error, 'parse_error', 'CDS: import parse error');
  var e3 = cds2.importFromTransfer('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'CDS: import bad format');
  var e4 = cds2.importFromTransfer('{"format":"cross-device-session-v1"}');
  assertEq(e4.error, 'invalid_session', 'CDS: import no session');
  var e5 = cds.serializeForTransfer('missing');
  assertEq(e5.error, 'not_found', 'CDS: serialize missing');
}

function testExpire(cb) {
  var cds = new CrossDeviceSession(null, { defaultTtl: 50 });
  cds.createSession('s1');
  cds.createSession('s2');
  setTimeout(function () {
    var r = cds.expireOldSessions();
    assertEq(r.success, true, 'CDS: expire success');
    assertEq(r.expired.length, 2, 'CDS: 2 expired');
    var s1 = cds.getSession('s1');
    assertEq(s1 && s1.status, 'expired', 'CDS: s1 expired');
    if (cb) cb();
  }, 150);
}

function testMaxSessions() {
  var cds = new CrossDeviceSession(null, { maxSessions: 2 });
  cds.createSession('s1', 'battle');
  cds.createSession('s2', 'shop');
  cds.createSession('s3', 'map');
  var summary = cds.getSummary();
  assertEq(summary.totalSessions <= 2, true, 'CDS: max enforced');
  var abandoned = cds.listSessions('abandoned');
  assert(abandoned.length >= 1, 'CDS: oldest abandoned');
}

function testHistory() {
  var cds = new CrossDeviceSession(null, { deviceId: 'dev1' });
  cds.createSession('s1');
  cds.updateState('s1', { x: 1 });
  cds.pauseSession('s1');
  cds.resumeSession('s1');
  var h = cds.getHistory('s1');
  assertEq(h.length >= 4, true, 'CDS: history has events');
  var h2 = cds.getHistory('s1', 2);
  assertEq(h2.length, 2, 'CDS: history limit 2');
  var h3 = cds.getHistory('missing');
  assert(h3 === null, 'CDS: history null');
}

function testCloudSync() {
  var sharedCloud = new InMemoryCloudStore();
  var fsm = new FederatedSyncManager({ cloudStore: sharedCloud });
  var cds = new CrossDeviceSession(fsm);
  cds.createSession('s1', 'battle', { hp: 100 });
  var pub = cds.syncToCloud('s1');
  assertEq(pub.success, true, 'CDS: syncToCloud session');
  var fsm2 = new FederatedSyncManager({ cloudStore: sharedCloud });
  var cds2 = new CrossDeviceSession(fsm2);
  var load = cds2.loadFromCloud('s1');
  assertEq(load.success, true, 'CDS: loadFromCloud');
  assertEq(cds2.getSession('s1').state.hp, 100, 'CDS: loaded hp');
  var cds3 = new CrossDeviceSession(null);
  var ns1 = cds3.syncToCloud();
  assertEq(ns1.error, 'no_sync', 'CDS: no_sync');
  var ns2 = cds3.loadFromCloud();
  assertEq(ns2.error, 'no_sync', 'CDS: no_sync load');
  cds.createSession('s2', 'shop');
  var bulk = cds.syncToCloud();
  assertEq(bulk.success, true, 'CDS: bulk sync');
  var cds4 = new CrossDeviceSession(fsm2);
  var bulkLoad = cds4.loadFromCloud();
  assertEq(bulkLoad.success, true, 'CDS: bulk load');
}

function testAutoCheckpoint() {
  var cds = new CrossDeviceSession(null, { checkpointInterval: 10 });
  cds.createSession('s1');
  var s1 = cds.startAutoCheckpoint('s1');
  assertEq(s1.success, true, 'CDS: startAutoCheckpoint');
  assertEq(s1.interval, 10, 'CDS: interval');
  var s2 = cds.startAutoCheckpoint('s1');
  assertEq(s2.error, 'already_running', 'CDS: already running');
  var st1 = cds.stopAutoCheckpoint('s1');
  assertEq(st1.success, true, 'CDS: stop');
  var st2 = cds.stopAutoCheckpoint('s1');
  assertEq(st2.error, 'not_running', 'CDS: not running');
  var s3 = cds.startAutoCheckpoint();
  assertEq(s3.error, 'invalid_session_id', 'CDS: invalid id');
}

function testClear() {
  var cds = new CrossDeviceSession();
  cds.createSession('s1');
  cds.createSession('s2');
  var c = cds.clear();
  assertEq(c.success, true, 'CDS: clear');
  assertEq(cds.index.length, 0, 'CDS: clear index');
}

function testConstants() {
  assertEq(SESSION_STATUS.ACTIVE, 'active', 'CDS: STATUS.ACTIVE');
  assertEq(SESSION_TYPES.BATTLE, 'battle', 'CDS: TYPES.BATTLE');
}

testEmpty();
testCreate();
testUpdate();
testCheckpoint();
testLifecycle();
testList();
testTransfer();
testMaxSessions();
testHistory();
testCloudSync();
testAutoCheckpoint();
testClear();
testConstants();
testExpire(function () {
  console.log('\n===== Summary =====');
  console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
  console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
  if (failed > 0) process.exit(1);
});
