'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'spectator.js'), 'utf8'));
var Spectator = window.Spectator;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var s = new Spectator(); assertEq(s.listSessions().length, 0, 'SP: 0'); }
function testCreateSession() {
  var s = new Spectator();
  var c = s.createSession('m1');
  assertEq(c.success, true, 'SP: create');
  assertEq(c.session.matchId, 'm1', 'SP: m1');
  assertEq(c.session.spectators.length, 0, 'SP: 0');
}
function testEndSession() {
  var s = new Spectator();
  var c = s.createSession('m1');
  var e = s.endSession(c.sessionId);
  assertEq(e.success, true, 'SP: end');
  assert(c.session.endedAt !== null, 'SP: ended');
  var e2 = s.endSession('not_in');
  assertEq(e2.error, 'not_found', 'SP: not found');
}
function testJoin() {
  var s = new Spectator();
  var c = s.createSession('m1');
  var j = s.join(c.sessionId, 'sp1');
  assertEq(j.success, true, 'SP: join');
  assertEq(s.getSpectatorCount(c.sessionId), 1, 'SP: 1');
  var j2 = s.join(c.sessionId, 'sp1');
  assertEq(j2.error, 'already_joined', 'SP: dup');
  // full
  var c2 = s.createSession('m2', { maxSpectators: 1 });
  s.join(c2.sessionId, 'a');
  var j3 = s.join(c2.sessionId, 'b');
  assertEq(j3.error, 'session_full', 'SP: full');
  // ended
  s.endSession(c.sessionId);
  var j4 = s.join(c.sessionId, 'sp2');
  assertEq(j4.error, 'session_ended', 'SP: ended');
  // not found
  var j5 = s.join('not_in', 'sp1');
  assertEq(j5.error, 'not_found', 'SP: not found');
}
function testLeave() {
  var s = new Spectator();
  var c = s.createSession('m1');
  s.join(c.sessionId, 'sp1');
  var l = s.leave(c.sessionId, 'sp1');
  assertEq(l.success, true, 'SP: leave');
  var l2 = s.leave(c.sessionId, 'not_in');
  assertEq(l2.error, 'not_in_session', 'SP: not in');
  // not found
  var l3 = s.leave('not_in', 'sp1');
  assertEq(l3.error, 'not_found', 'SP: not found');
}
function testSwitchCamera() {
  var s = new Spectator();
  var c = s.createSession('m1', { cameraFocus: 'overview' });
  s.join(c.sessionId, 'sp1');
  var sw = s.switchCamera(c.sessionId, 'sp1', 'player1');
  assertEq(sw.success, true, 'SP: switch');
  assertEq(c.session.spectators[0].cameraFocus, 'player1', 'SP: focus');
  // not in
  var sw2 = s.switchCamera(c.sessionId, 'not_in', 'player1');
  assertEq(sw2.error, 'not_in_session', 'SP: not in');
  // not found
  var sw3 = s.switchCamera('not_in', 'sp1', 'p1');
  assertEq(sw3.error, 'not_found', 'SP: not found');
}
function testChat() {
  var s = new Spectator();
  var c = s.createSession('m1');
  s.join(c.sessionId, 'sp1');
  var ch = s.sendChat(c.sessionId, 'sp1', 'gg');
  assertEq(ch.success, true, 'SP: chat');
  // not in
  var ch2 = s.sendChat(c.sessionId, 'not_in', 'hi');
  assertEq(ch2.error, 'not_in_session', 'SP: not in');
  // invalid
  var ch3 = s.sendChat(c.sessionId, 'sp1', '');
  assertEq(ch3.error, 'invalid_message', 'SP: empty');
  // disabled
  s.setAllowChat(c.sessionId, false);
  var ch4 = s.sendChat(c.sessionId, 'sp1', 'x');
  assertEq(ch4.error, 'chat_disabled', 'SP: disabled');
  // not found
  var ch5 = s.sendChat('not_in', 'sp1', 'x');
  assertEq(ch5.error, 'not_found', 'SP: not found');
}
function testGetChat() {
  var s = new Spectator();
  var c = s.createSession('m1');
  s.join(c.sessionId, 'sp1');
  s.sendChat(c.sessionId, 'sp1', 'msg1');
  s.sendChat(c.sessionId, 'sp1', 'msg2');
  var chat = s.getChat(c.sessionId);
  assertEq(chat.length, 2, 'SP: 2');
  var l = s.getChat(c.sessionId, 1);
  assertEq(l.length, 1, 'SP: 1 limited');
  var n = s.getChat('not_in');
  assertEq(n, null, 'SP: null');
}
function testKick() {
  var s = new Spectator();
  var c = s.createSession('m1');
  s.join(c.sessionId, 'sp1');
  var k = s.kick(c.sessionId, 'sp1');
  assertEq(k.success, true, 'SP: kick');
  assertEq(s.getSpectatorCount(c.sessionId), 0, 'SP: 0');
}
function testGetSession() {
  var s = new Spectator();
  var c = s.createSession('m1');
  assertEq(s.getSession(c.sessionId).matchId, 'm1', 'SP: found');
  assertEq(s.getSession('not_in'), null, 'SP: null');
}
function testListSpectators() {
  var s = new Spectator();
  var c = s.createSession('m1');
  s.join(c.sessionId, 'sp1');
  s.join(c.sessionId, 'sp2');
  var list = s.listSpectators(c.sessionId);
  assertEq(list.length, 2, 'SP: 2');
  assertEq(s.listSpectators('not_in'), null, 'SP: null');
}
function testListSessions() {
  var s = new Spectator();
  s.createSession('m1');
  s.createSession('m2');
  assertEq(s.listSessions().length, 2, 'SP: 2 sessions');
}
function testMetrics() {
  var s = new Spectator();
  s.createSession('m1');
  s.join(Object.keys(s.sessions)[0], 'sp1');
  s.sendChat(Object.keys(s.sessions)[0], 'sp1', 'hi');
  var m = s.getMetrics();
  assertEq(m.sessionsCreated, 1, 'SP: 1 created');
  assertEq(m.joined, 1, 'SP: 1 joined');
  assertEq(m.messages, 1, 'SP: 1 message');
}
function testSummary() {
  var s = new Spectator();
  var c = s.createSession('m1');
  s.join(c.sessionId, 'sp1');
  var sum = s.getSummary();
  assertEq(sum.totalSessions, 1, 'SP: 1');
  assertEq(sum.totalSpectators, 1, 'SP: 1 spec');
}
function testClear() {
  var s = new Spectator();
  s.createSession('m1');
  s.clear();
  assertEq(s.listSessions().length, 0, 'SP: 0');
}

testEmpty(); testCreateSession(); testEndSession(); testJoin(); testLeave(); testSwitchCamera(); testChat(); testGetChat(); testKick(); testGetSession(); testListSpectators(); testListSessions(); testMetrics(); testSummary(); testClear();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
