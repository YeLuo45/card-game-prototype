'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'chat-system.js'), 'utf8'));
var ChatSystem = window.ChatSystem;
var CHANNEL_TYPE = window.CHANNEL_TYPE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var c = new ChatSystem(); assertEq(c.getSummary().totalChannels, 0, 'CS: 0'); }
function testCreateChannel() {
  var c = new ChatSystem();
  var r = c.createChannel('global', { name: 'Global' });
  assertEq(r.success, true, 'CS: create');
  var r2 = c.createChannel('global');
  assertEq(r2.error, 'exists', 'CS: exists');
  // delete
  var d = c.deleteChannel('global');
  assertEq(d.success, true, 'CS: delete');
  var d2 = c.deleteChannel('not_in');
  assertEq(d2.error, 'not_found', 'CS: not found');
}
function testJoinLeave() {
  var c = new ChatSystem();
  c.createChannel('team1', { members: [] });
  var j = c.joinChannel('team1', 'p1');
  assertEq(j.success, true, 'CS: join');
  var j2 = c.joinChannel('team1', 'p1');
  assertEq(j2.error, 'already_member', 'CS: dup');
  var l = c.leaveChannel('team1', 'p1');
  assertEq(l.success, true, 'CS: leave');
  var l2 = c.leaveChannel('team1', 'not_in');
  assertEq(l2.error, 'not_member', 'CS: not member');
  // not found
  var j3 = c.joinChannel('not_in', 'p1');
  assertEq(j3.error, 'not_found', 'CS: not found');
  // password
  c.createChannel('priv', { password: 'secret' });
  var j4 = c.joinChannel('priv', 'p1');
  assertEq(j4.error, 'password_required', 'CS: !pw');
  var j5 = c.joinChannel('priv', 'p1', { password: 'secret' });
  assertEq(j5.success, true, 'CS: pw ok');
}
function testSend() {
  var c = new ChatSystem();
  c.createChannel('global');
  var s = c.send('global', 'p1', 'hello');
  assertEq(s.success, true, 'CS: send');
  assertEq(c.getHistory('global').length, 1, 'CS: 1');
  // not found
  var s1 = c.send('not_in', 'p1', 'x');
  assertEq(s1.error, 'not_found', 'CS: not found');
  // invalid
  var s2 = c.send('global', 'p1', '');
  assertEq(s2.error, 'invalid_message', 'CS: empty');
  // too long
  var long = new Array(501).join('a');
  var s3 = c.send('global', 'p1', long);
  assertEq(s3.error, 'message_too_long', 'CS: long');
  // profanity
  var s4 = c.send('global', 'p1', 'this is a badword test');
  assertEq(s4.error, 'profanity', 'CS: profanity');
  // banned
  c.ban('p2');
  var s5 = c.send('global', 'p2', 'x');
  assertEq(s5.error, 'banned', 'CS: banned');
  // muted
  c.mute('p3', 60000);
  var s6 = c.send('global', 'p3', 'x');
  assertEq(s6.error, 'muted', 'CS: muted');
  c.unmute('p3');
  var s7 = c.send('global', 'p3', 'x');
  assertEq(s7.success, true, 'CS: unmuted');
  // ban cycle
  c.unban('p2');
  var s8 = c.send('global', 'p2', 'x');
  assertEq(s8.success, true, 'CS: unbanned');
}
function testEmote() {
  var c = new ChatSystem();
  c.createChannel('global');
  var r = c.emote('global', 'p1', 'wave');
  assertEq(r.success, true, 'CS: emote');
  var msg = c.getHistory('global')[0];
  assertEq(msg.isEmote, true, 'CS: isEmote');
  assert(msg.message.indexOf('wave') !== -1, 'CS: wave');
}
function testSystem() {
  var c = new ChatSystem();
  c.createChannel('global');
  var r = c.system('global', 'Match starts in 30s');
  assertEq(r.success, true, 'CS: system');
  var msg = c.getHistory('global')[0];
  assertEq(msg.type, 'system', 'CS: type');
  // not found
  var r2 = c.system('not_in', 'x');
  assertEq(r2.error, 'not_found', 'CS: not found');
}
function testWhisper() {
  var c = new ChatSystem();
  var r = c.whisper('p1', 'p2', 'secret');
  assertEq(r.success, true, 'CS: whisper');
  var hist = c.getHistory('whisper_p1_p2');
  assertEq(hist.length, 1, 'CS: 1 whisper');
  assertEq(hist[0].isWhisper, true, 'CS: isWhisper');
}
function testHistoryLimit() {
  var c = new ChatSystem({ maxMessages: 5 });
  c.createChannel('c');
  for (var i = 0; i < 10; i++) c.send('c', 'p1', 'm' + i);
  var h = c.getHistory('c');
  assertEq(h.length, 5, 'CS: 5 capped');
}
function testGetHistory() {
  var c = new ChatSystem();
  c.createChannel('c');
  c.send('c', 'p1', 'a');
  c.send('c', 'p1', 'b');
  var h = c.getHistory('c', 1);
  assertEq(h.length, 1, 'CS: 1 limited');
  var h2 = c.getHistory('c');
  assertEq(h2.length, 2, 'CS: 2');
  assertEq(c.getHistory('not_in'), null, 'CS: null');
}
function testGetChannels() {
  var c = new ChatSystem();
  c.createChannel('g1');
  c.createChannel('g2', { members: ['p1'] });
  var ch = c.getChannels();
  assertEq(ch.length, 2, 'CS: 2');
  // for p1
  var ch2 = c.getChannels('p1');
  // g1 has no members restriction so p1 might see it
  // g2 has p1 as member
  assert(ch2.length >= 1, 'CS: visible');
}
function testIsMutedBanned() {
  var c = new ChatSystem();
  c.mute('p1', 60000);
  assertEq(c.isMuted('p1'), true, 'CS: muted');
  assertEq(c.isMuted('p2'), false, 'CS: !muted');
  c.ban('p3');
  assertEq(c.isBanned('p3'), true, 'CS: banned');
  c.unban('p3');
  assertEq(c.isBanned('p3'), false, 'CS: !banned');
}
function testMetrics() {
  var c = new ChatSystem();
  c.createChannel('c');
  c.send('c', 'p1', 'hi');
  c.emote('c', 'p1', 'wave');
  c.system('c', 'go');
  var m = c.getMetrics();
  assertEq(m.messages, 1, 'CS: 1 msg');
  assertEq(m.emotes, 1, 'CS: 1 emote');
  assertEq(m.system, 1, 'CS: 1 system');
}
function testSummary() {
  var c = new ChatSystem();
  c.createChannel('a');
  c.createChannel('b');
  var s = c.getSummary();
  assertEq(s.totalChannels, 2, 'CS: 2');
}
function testClear() {
  var c = new ChatSystem();
  c.createChannel('a');
  c.mute('p1', 60000);
  c.clear();
  assertEq(c.getSummary().totalChannels, 0, 'CS: 0');
  assertEq(c.isMuted('p1'), false, 'CS: !muted');
}
function testConstants() { assertEq(CHANNEL_TYPE.GLOBAL, 'global', 'CS: GLOBAL'); }

testEmpty(); testCreateChannel(); testJoinLeave(); testSend(); testEmote(); testSystem(); testWhisper(); testHistoryLimit(); testGetHistory(); testGetChannels(); testIsMutedBanned(); testMetrics(); testSummary(); testClear(); testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
