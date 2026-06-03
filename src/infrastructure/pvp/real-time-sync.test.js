'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'real-time-sync.js'), 'utf8'));
var RealTimeSync = window.RealTimeSync;
var SYNC_STATE = window.SYNC_STATE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var r = new RealTimeSync();
  assertEq(r.getSession('any'), null, 'RS: 0');
  var s = r.getSummary();
  assertEq(s.totalSessions, 0, 'RS: 0 sessions');
}

function testCreateSession() {
  var r = new RealTimeSync();
  var s = r.createSession('s1');
  assertEq(s.success, true, 'RS: create');
  assertEq(s.session.state, 'connected', 'RS: connected');
  // errors
  var e1 = r.createSession(null);
  assertEq(e1.error, 'invalid_id', 'RS: null');
  var e2 = r.createSession('s1');
  assertEq(e2.error, 'already_exists', 'RS: dup');
}

function testJoinLeave() {
  var r = new RealTimeSync();
  r.createSession('s1');
  var j = r.joinSession('s1', 'p1');
  assertEq(j.success, true, 'RS: join');
  var j2 = r.joinSession('s1', 'p1');
  assertEq(j2.error, 'already_joined', 'RS: dup');
  var l = r.leaveSession('s1', 'p1');
  assertEq(l.success, true, 'RS: leave');
  var l2 = r.leaveSession('s1', 'p1');
  assertEq(l2.error, 'not_joined', 'RS: not joined');
  // not found
  var j3 = r.joinSession('not_in', 'p1');
  assertEq(j3.error, 'not_found', 'RS: not found');
}

function testBroadcast() {
  var r = new RealTimeSync();
  r.createSession('s1');
  var b = r.broadcast('s1', { type: 'play_card', card: 'c1' });
  assertEq(b.success, true, 'RS: broadcast');
  assertEq(b.seq, 1, 'RS: seq 1');
  // errors
  var e1 = r.broadcast('s1', null);
  assertEq(e1.error, 'invalid_action', 'RS: null action');
  var e2 = r.broadcast('not_in', {});
  assertEq(e2.error, 'not_found', 'RS: not found');
  // state updates to syncing
  assertEq(r.getSessionState('s1'), 'syncing', 'RS: syncing');
}

function testReceive() {
  var r = new RealTimeSync();
  r.createSession('s1');
  var rec = r.receive('s1', {}, 50);
  assertEq(rec.success, true, 'RS: receive');
  // in_sync after low latency
  assertEq(r.getSessionState('s1'), 'in_sync', 'RS: in_sync');
  // high latency
  r.receive('s1', {}, 500);
  assertEq(r.getSessionState('s1'), 'syncing', 'RS: syncing (lag)');
  var stats = r.getLatencyStats();
  assertEq(stats.samples, 2, 'RS: 2 samples');
  // errors
  var e1 = r.receive('not_in', {});
  assertEq(e1.error, 'not_found', 'RS: not found');
}

function testDetectConflict() {
  var r = new RealTimeSync();
  var actions = [
    { targetId: 'card-1', value: 'play', ts: Date.now() },
    { targetId: 'card-1', value: 'attack', ts: Date.now() + 10 }
  ];
  var c = r.detectConflict('s1', actions);
  assertEq(c.conflict, true, 'RS: conflict');
  assertEq(c.conflicts.length, 1, 'RS: 1 conflict');
  // no conflict
  var actions2 = [
    { targetId: 'card-1', value: 'play', ts: 1 },
    { targetId: 'card-1', value: 'play', ts: 2 }  // same value
  ];
  var c2 = r.detectConflict('s1', actions2);
  assertEq(c2.conflict, false, 'RS: !conflict same val');
  // different target
  var c3 = r.detectConflict('s1', [
    { targetId: 'a', value: 'x', ts: 1 },
    { targetId: 'b', value: 'y', ts: 2 }
  ]);
  assertEq(c3.conflict, false, 'RS: !conflict diff target');
  // errors
  var e = r.detectConflict('s1', null);
  assertEq(e.error, 'invalid_input', 'RS: null');
  var e2 = r.detectConflict('s1', [{}]);
  assertEq(e2.conflict, false, 'RS: 1 action');
}

function testActionLog() {
  var r = new RealTimeSync();
  r.createSession('s1');
  r.broadcast('s1', { a: 1 });
  r.broadcast('s1', { a: 2 });
  var log = r.getActionLog();
  assertEq(log.length, 2, 'RS: 2 log');
  // session filter
  r.createSession('s2');
  r.broadcast('s2', { b: 1 });
  var s1Log = r.getActionLog('s1');
  assertEq(s1Log.length, 2, 'RS: 2 s1 log');
  // limited
  var l = r.getActionLog(null, 1);
  assertEq(l.length, 1, 'RS: 1 limited');
}

function testBufferDrop() {
  var r = new RealTimeSync({ maxBufferSize: 3 });
  r.createSession('s1');
  for (var i = 0; i < 5; i++) r.broadcast('s1', { n: i });
  var log = r.getActionLog();
  assertEq(log.length, 3, 'RS: 3 buffered');
  var m = r.getMetrics();
  assert(m.drops >= 1, 'RS: drops');
}

function testSessionStateSet() {
  var r = new RealTimeSync();
  r.createSession('s1');
  var s = r.setSessionState('s1', 'syncing');
  assertEq(s.success, true, 'RS: set state');
  assertEq(r.getSessionState('s1'), 'syncing', 'RS: state syncing');
  // not found
  var e = r.setSessionState('not_in', 'x');
  assertEq(e.error, 'not_found', 'RS: not found');
}

function testMetrics() {
  var r = new RealTimeSync();
  r.createSession('s1');
  r.broadcast('s1', { a: 1 });
  r.broadcast('s1', { a: 2 });
  r.receive('s1', {}, 30);
  var m = r.getMetrics();
  assertEq(m.broadcasts, 2, 'RS: 2 broadcasts');
  assertEq(m.receptions, 1, 'RS: 1 reception');
  assert(m.avgLatency > 0, 'RS: avg > 0');
}

function testSummary() {
  var r = new RealTimeSync();
  r.createSession('s1');
  r.createSession('s2');
  r.joinSession('s1', 'p1');
  r.joinSession('s2', 'p2');
  r.joinSession('s2', 'p3');
  var s = r.getSummary();
  assertEq(s.totalSessions, 2, 'RS: 2');
  assertEq(s.totalParticipants, 3, 'RS: 3 parts');
}

function testClear() {
  var r = new RealTimeSync();
  r.createSession('s1');
  r.broadcast('s1', {});
  var c = r.clear();
  assertEq(c.success, true, 'RS: clear');
  assertEq(r.getSession('s1'), null, 'RS: 0 sessions');
  assertEq(r.getActionLog().length, 0, 'RS: 0 log');
}

function testConstants() {
  assertEq(SYNC_STATE.CONNECTED, 'connected', 'RS: STATE.CONNECTED');
  assertEq(SYNC_STATE.IN_SYNC, 'in_sync', 'RS: STATE.IN_SYNC');
}

testEmpty();
testCreateSession();
testJoinLeave();
testBroadcast();
testReceive();
testDetectConflict();
testActionLog();
testBufferDrop();
testSessionStateSet();
testMetrics();
testSummary();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
