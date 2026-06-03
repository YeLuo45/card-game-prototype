'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'coop-mission.js'), 'utf8'));
var CoopMission = window.CoopMission;
var MISSION_STATUS = window.MISSION_STATUS;
var OBJECTIVE_TYPE = window.OBJECTIVE_TYPE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var m = new CoopMission(); assertEq(m.getMission('x'), null, 'CM: 0'); }
function testCreate() {
  var m = new CoopMission();
  var c = m.create({ name: 'Dragon Slayer', objectives: [{ type: 'kill', target: 'dragon', count: 1 }] });
  assertEq(c.success, true, 'CM: create');
  assertEq(c.mission.objectives.length, 1, 'CM: 1 obj');
  // errors
  var e1 = m.create({ name: 'X' });
  assertEq(e1.error, 'objectives_required', 'CM: no obj');
  var e2 = m.create({ objectives: [{}] });
  assertEq(e2.error, 'name_required', 'CM: no name');
}
function testStart() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ count: 1 }], minPlayers: 2 });
  var s = m.start(c.missionId, ['p1', 'p2']);
  assertEq(s.success, true, 'CM: start');
  // not enough
  var c2 = m.create({ name: 'M2', objectives: [{ count: 1 }], minPlayers: 3 });
  var s2 = m.start(c2.missionId, ['p1', 'p2']);
  assertEq(s2.error, 'not_enough_players', 'CM: !enough');
  // too many
  var c3 = m.create({ name: 'M3', objectives: [{ count: 1 }], maxPlayers: 1 });
  var s3 = m.start(c3.missionId, ['p1', 'p2']);
  assertEq(s3.error, 'too_many_players', 'CM: too many');
  // invalid state (already started)
  var s4 = m.start(c.missionId, ['p1', 'p2']);
  assertEq(s4.error, 'invalid_state', 'CM: invalid');
  // not found
  var s5 = m.start('not_in', []);
  assertEq(s5.error, 'not_found', 'CM: not found');
  // invalid players
  var s6 = m.start(c2.missionId, 'not array');
  assertEq(s6.error, 'invalid_players', 'CM: invalid');
}
function testContribute() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ id: 'o1', type: 'kill', count: 3 }] });
  m.start(c.missionId, ['p1', 'p2']);
  var r = m.contribute(c.missionId, 'o1', 'p1', 2);
  assertEq(r.success, true, 'CM: contribute');
  assertEq(r.progress, 2, 'CM: progress 2');
  assertEq(r.completed, false, 'CM: !completed');
  var r2 = m.contribute(c.missionId, 'o1', 'p2', 2);
  assertEq(r2.completed, true, 'CM: completed');
  assertEq(r2.progress, 3, 'CM: progress 3');
  // already completed
  var r3 = m.contribute(c.missionId, 'o1', 'p1', 1);
  assertEq(r3.error, 'already_completed', 'CM: already done');
  // objective not found
  var r4 = m.contribute(c.missionId, 'no_obj', 'p1', 1);
  assertEq(r4.error, 'objective_not_found', 'CM: no obj');
  // invalid amount
  var r5 = m.contribute(c.missionId, 'o1', 'p1', -1);
  assertEq(r5.error, 'invalid_amount', 'CM: neg');
  // not in progress
  var c2 = m.create({ name: 'M2', objectives: [{ count: 1 }] });
  var r6 = m.contribute(c2.missionId, 'o0', 'p1', 1);
  assertEq(r6.error, 'invalid_state', 'CM: !progress');
}
function testComplete() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ count: 1 }] });
  m.start(c.missionId, ['p1']);
  m.contribute(c.missionId, c.mission.objectives[0].id, 'p1', 1);
  var r = m.complete(c.missionId);
  assertEq(r.success, true, 'CM: complete');
  // not in progress
  var r2 = m.complete(c.missionId);
  assertEq(r2.error, 'invalid_state', 'CM: invalid state');
  // incomplete
  var c2 = m.create({ name: 'M2', objectives: [{ count: 1 }] });
  m.start(c2.missionId, ['p1']);
  var r3 = m.complete(c2.missionId);
  assertEq(r3.success, false, 'CM: incomplete');
  assertEq(m.getMission(c2.missionId).status, 'failed', 'CM: failed');
}
function testFail() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ count: 1 }] });
  m.start(c.missionId, ['p1']);
  var r = m.fail(c.missionId, 'wipe');
  assertEq(r.success, true, 'CM: fail');
  assertEq(m.getMission(c.missionId).status, 'failed', 'CM: failed');
  assertEq(m.getMission(c.missionId).failReason, 'wipe', 'CM: reason');
}
function testGetProgress() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ count: 1 }, { count: 1 }, { count: 1 }] });
  m.start(c.missionId, ['p1']);
  m.contribute(c.missionId, c.mission.objectives[0].id, 'p1', 1);
  var p = m.getProgress(c.missionId);
  assertEq(p.completedObjectives, 1, 'CM: 1 done');
  assert(Math.abs(p.percent - 1/3) < 0.01, 'CM: ~33%');
}
function testListMissions() {
  var m = new CoopMission();
  m.create({ name: 'A', objectives: [{ count: 1 }] });
  m.create({ name: 'B', objectives: [{ count: 1 }] });
  var all = m.listMissions();
  assertEq(all.length, 2, 'CM: 2');
  var av = m.listMissions({ status: 'available' });
  assertEq(av.length, 2, 'CM: 2 avail');
}
function testGetContributors() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ id: 'o1', count: 5 }] });
  m.start(c.missionId, ['p1', 'p2']);
  m.contribute(c.missionId, 'o1', 'p1', 2);
  m.contribute(c.missionId, 'o1', 'p2', 3);
  var cont = m.getContributors(c.missionId, 'o1');
  assertEq(cont.p1, 2, 'CM: p1 2');
  assertEq(cont.p2, 3, 'CM: p2 3');
  // not found
  var c2 = m.getContributors('not_in', 'o1');
  assertEq(c2, null, 'CM: null not found');
  var c3 = m.getContributors(c.missionId, 'not_in');
  assertEq(c3, null, 'CM: null obj');
}
function testDistributeRewards() {
  var m = new CoopMission();
  var c = m.create({ name: 'M', objectives: [{ count: 1 }], rewards: { exp: 100, gold: 50, items: ['sword'] } });
  m.start(c.missionId, ['p1', 'p2']);
  m.contribute(c.missionId, c.mission.objectives[0].id, 'p1', 1);
  m.complete(c.missionId);
  var d = m.distributeRewards(c.missionId);
  assertEq(d.success, true, 'CM: distribute');
  assertEq(d.distribution.p1.exp, 50, 'CM: 50 exp');
  assertEq(d.distribution.p2.exp, 50, 'CM: 50 exp');
  assertEq(d.distribution.p1.gold, 25, 'CM: 25 gold');
  // not completed
  var c2 = m.create({ name: 'M2', objectives: [{ count: 1 }] });
  var d2 = m.distributeRewards(c2.missionId);
  assertEq(d2.error, 'mission_not_completed', 'CM: not done');
  // not found
  var d3 = m.distributeRewards('not_in');
  assertEq(d3.error, 'not_found', 'CM: not found');
}
function testMetrics() {
  var m = new CoopMission();
  m.create({ name: 'M', objectives: [{ count: 1 }] });
  var mt = m.getMetrics();
  assertEq(mt.created, 1, 'CM: 1 created');
}
function testSummary() {
  var m = new CoopMission();
  m.create({ name: 'A', objectives: [{ count: 1 }] });
  m.create({ name: 'B', objectives: [{ count: 1 }] });
  var s = m.getSummary();
  assertEq(s.total, 2, 'CM: 2');
  assertEq(s.byStatus.available, 2, 'CM: 2 avail');
}
function testClear() {
  var m = new CoopMission();
  m.create({ name: 'A', objectives: [{ count: 1 }] });
  m.clear();
  assertEq(m.listMissions().length, 0, 'CM: 0');
}
function testConstants() {
  assertEq(MISSION_STATUS.IN_PROGRESS, 'in_progress', 'CM: STATUS');
  assertEq(OBJECTIVE_TYPE.KILL, 'kill', 'CM: TYPE');
}

testEmpty(); testCreate(); testStart(); testContribute(); testComplete(); testFail(); testGetProgress(); testListMissions(); testGetContributors(); testDistributeRewards(); testMetrics(); testSummary(); testClear(); testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
