'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'match-room.js'), 'utf8'));
var MatchRoom = window.MatchRoom;
var ROOM_STATUS = window.ROOM_STATUS;
var ROOM_TYPE = window.ROOM_TYPE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var r = new MatchRoom();
  assertEq(r.listRooms().length, 0, 'MR: 0 rooms');
  var s = r.getSummary();
  assertEq(s.totalRooms, 0, 'MR: 0');
}

function testCreate() {
  var r = new MatchRoom();
  var c = r.create({ name: 'Test Room', type: 'ranked' });
  assertEq(c.success, true, 'MR: create');
  assertEq(c.room.status, 'waiting', 'MR: waiting');
  assertEq(c.room.type, 'ranked', 'MR: ranked');
  assertEq(c.room.players.length, 0, 'MR: 0 players');
  // with host
  var c2 = r.create({ name: 'H', hostId: 'host1' });
  assertEq(c2.room.host, 'host1', 'MR: auto host');
  assertEq(c2.room.players.length, 1, 'MR: 1 player');
  // max rooms
  var r2 = new MatchRoom({ maxRooms: 1 });
  r2.create({});
  var c3 = r2.create({});
  assertEq(c3.error, 'max_rooms_reached', 'MR: max');
}

function testJoin() {
  var r = new MatchRoom();
  var c = r.create({ name: 'R1' });
  var j = r.join(c.roomId, 'p1');
  assertEq(j.success, true, 'MR: join');
  assertEq(j.role, 'player', 'MR: role');
  assertEq(c.room.players.length, 1, 'MR: 1');
  // duplicate
  var j2 = r.join(c.roomId, 'p1');
  assertEq(j2.error, 'already_joined', 'MR: dup');
  // full
  var c2 = r.create({ name: 'F', maxPlayers: 1 });
  r.join(c2.roomId, 'p1');
  var j3 = r.join(c2.roomId, 'p2');
  assertEq(j3.error, 'room_full', 'MR: full');
  // not found
  var j4 = r.join('not_found', 'p1');
  assertEq(j4.error, 'not_found', 'MR: not found');
}

function testJoinSpectator() {
  var r = new MatchRoom();
  var c = r.create({});
  r.join(c.roomId, 'p1');
  // p1 ready/start to make in_progress
  r.setReady(c.roomId, 'p1', true);
  r.start(c.roomId, 'p1');
  var j = r.join(c.roomId, 'p2', { spectate: true });
  assertEq(j.success, true, 'MR: spec join');
  assertEq(j.role, 'spectator', 'MR: spec role');
  assertEq(c.room.spectators.length, 1, 'MR: 1 spec');
}

function testJoinPassword() {
  var r = new MatchRoom();
  var c = r.create({ password: 'secret' });
  // no password
  var j0 = r.join(c.roomId, 'p1');
  assertEq(j0.error, 'password_required', 'MR: required');
  // wrong password
  var j1 = r.join(c.roomId, 'p1', { password: 'wrong' });
  assertEq(j1.error, 'wrong_password', 'MR: wrong');
  // correct password
  var j2 = r.join(c.roomId, 'p1', { password: 'secret' });
  assertEq(j2.success, true, 'MR: right');
}

function testJoinRoomStates() {
  var r = new MatchRoom();
  var c = r.create({});
  r.join(c.roomId, 'p1');
  r.setReady(c.roomId, 'p1', true);
  r.start(c.roomId, 'p1');
  // new join without spectate should fail
  var j = r.join(c.roomId, 'p2');
  assertEq(j.error, 'in_progress', 'MR: in_progress');
  // close
  r.close(c.roomId);
  var j2 = r.join(c.roomId, 'p3', { spectate: true });
  assertEq(j2.error, 'room_closed', 'MR: closed');
}

function testLeave() {
  var r = new MatchRoom();
  var c = r.create({ hostId: 'h1' });
  r.join(c.roomId, 'p1');
  var l = r.leave(c.roomId, 'p1');
  assertEq(l.success, true, 'MR: leave');
  assertEq(c.room.players.length, 1, 'MR: 1 left (host)');
  assertEq(c.room.host, 'h1', 'MR: host unchanged');
  // host leaves → new host
  var l2 = r.leave(c.roomId, 'h1');
  assertEq(l2.success, true, 'MR: host leave');
  assertEq(c.room.players.length, 0, 'MR: 0');
  assertEq(c.room.host, null, 'MR: no host');
  // not in room
  var l3 = r.leave(c.roomId, 'not_in');
  assertEq(l3.error, 'not_in_room', 'MR: not in');
  // not found
  var l4 = r.leave('not_found', 'p1');
  assertEq(l4.error, 'not_found', 'MR: not found');
}

function testSetReady() {
  var r = new MatchRoom();
  var c = r.create({});
  r.join(c.roomId, 'p1');
  var s = r.setReady(c.roomId, 'p1', true);
  assertEq(s.success, true, 'MR: ready');
  assertEq(c.room.players[0].ready, true, 'MR: ready flag');
  // not in
  var s2 = r.setReady(c.roomId, 'not_in', true);
  assertEq(s2.error, 'not_in_room', 'MR: not in');
}

function testKick() {
  var r = new MatchRoom();
  var c = r.create({ hostId: 'h1' });
  r.join(c.roomId, 'p1');
  r.join(c.roomId, 'p2');
  // not host
  var k1 = r.kick(c.roomId, 'p1', 'p2');
  assertEq(k1.error, 'not_host', 'MR: not host');
  // host kick
  var k2 = r.kick(c.roomId, 'h1', 'p2');
  assertEq(k2.success, true, 'MR: kick');
  assertEq(c.room.players.length, 2, 'MR: 2 left (h1, p1)');
}

function testTransferHost() {
  var r = new MatchRoom();
  var c = r.create({ hostId: 'h1' });
  r.join(c.roomId, 'p1');
  var t = r.transferHost(c.roomId, 'h1', 'p1');
  assertEq(t.success, true, 'MR: transfer');
  assertEq(c.room.host, 'p1', 'MR: new host');
  // not host
  var t2 = r.transferHost(c.roomId, 'h1', 'p1');
  assertEq(t2.error, 'not_host', 'MR: not host');
  // not in
  var t3 = r.transferHost(c.roomId, 'p1', 'unknown');
  assertEq(t3.error, 'not_in_room', 'MR: not in');
}

function testStart() {
  var r = new MatchRoom();
  var c = r.create({ hostId: 'h1' });
  r.join(c.roomId, 'p1');
  r.setReady(c.roomId, 'p1', true);
  // not host
  var s1 = r.start(c.roomId, 'not_host');
  assertEq(s1.error, 'not_host', 'MR: not host');
  // no players (try without joining)
  var c2 = r.create({});
  var s2 = r.start(c2.roomId, 'h1');
  // h1 isn't host of c2 (no host auto-assigned)
  // skip
  // valid
  var s3 = r.start(c.roomId, 'h1');
  assertEq(s3.success, true, 'MR: start');
  assertEq(c.room.status, 'in_progress', 'MR: in_progress');
  // start again
  var s4 = r.start(c.roomId, 'h1');
  assertEq(s4.error, 'invalid_state', 'MR: invalid');
}

function testFinish() {
  var r = new MatchRoom();
  var c = r.create({ hostId: 'h1' });
  r.join(c.roomId, 'p1');
  r.setReady(c.roomId, 'p1', true);
  r.start(c.roomId, 'h1');
  var f = r.finish(c.roomId, { winner: 'p1' });
  assertEq(f.success, true, 'MR: finish');
  assertEq(c.room.status, 'finished', 'MR: finished');
  assertEq(c.room.results.winner, 'p1', 'MR: winner');
  // not in progress
  var f2 = r.finish(c.roomId, {});
  assertEq(f2.error, 'invalid_state', 'MR: invalid');
}

function testClose() {
  var r = new MatchRoom();
  var c = r.create({});
  var cl = r.close(c.roomId);
  assertEq(cl.success, true, 'MR: close');
  assertEq(c.room.status, 'closed', 'MR: closed');
  // not found
  var cl2 = r.close('not_found');
  assertEq(cl2.error, 'not_found', 'MR: not found');
}

function testListRooms() {
  var r = new MatchRoom();
  r.create({ name: 'A', type: 'ranked' });
  r.create({ name: 'B', type: 'casual' });
  r.create({ name: 'C', type: 'ranked' });
  var all = r.listRooms();
  assertEq(all.length, 3, 'MR: 3 all');
  var ranked = r.listRooms({ type: 'ranked' });
  assertEq(ranked.length, 2, 'MR: 2 ranked');
  var open = r.listOpenRooms();
  assertEq(open.length, 3, 'MR: 3 open');
  // fill one
  r.join(all[0].roomId, 'p1');
  r.join(all[0].roomId, 'p2');
  r.join(all[0].roomId, 'p3');
  r.join(all[0].roomId, 'p4');
  r.join(all[0].roomId, 'p5');
  r.join(all[0].roomId, 'p6');
  r.join(all[0].roomId, 'p7');
  r.join(all[0].roomId, 'p8');
  var open2 = r.listOpenRooms();
  assertEq(open2.length, 2, 'MR: 2 open after fill');
}

function testGetPlayerRoom() {
  var r = new MatchRoom();
  var c = r.create({});
  r.join(c.roomId, 'p1');
  var pr = r.getPlayerRoom('p1');
  assertEq(pr.roomId, c.roomId, 'MR: room found');
  // spectator
  r.start(c.roomId, 'p1');
  r.join(c.roomId, 'spec1', { spectate: true });
  var pr2 = r.getPlayerRoom('spec1');
  assertEq(pr2.roomId, c.roomId, 'MR: spec room');
  // not in
  assertEq(r.getPlayerRoom('unknown'), null, 'MR: null');
}

function testMetrics() {
  var r = new MatchRoom();
  r.create({});
  r.join(Object.keys(r.rooms)[0], 'p1');
  var m = r.getMetrics();
  assertEq(m.created, 1, 'MR: 1 created');
  assertEq(m.joined, 1, 'MR: 1 joined');
}

function testSummary() {
  var r = new MatchRoom();
  r.create({});
  r.create({});
  r.create({});
  var s = r.getSummary();
  assertEq(s.totalRooms, 3, 'MR: 3');
  assertEq(s.statusDistribution.waiting, 3, 'MR: 3 waiting');
}

function testClear() {
  var r = new MatchRoom();
  r.create({});
  var c = r.clear();
  assertEq(c.success, true, 'MR: clear');
  assertEq(r.listRooms().length, 0, 'MR: 0');
}

function testConstants() {
  assertEq(ROOM_STATUS.WAITING, 'waiting', 'MR: STATUS.WAITING');
  assertEq(ROOM_TYPE.PVP, 'pvp', 'MR: TYPE.PVP');
}

testEmpty();
testCreate();
testJoin();
testJoinSpectator();
testJoinPassword();
testJoinRoomStates();
testLeave();
testSetReady();
testKick();
testTransferHost();
testStart();
testFinish();
testClose();
testListRooms();
testGetPlayerRoom();
testMetrics();
testSummary();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
