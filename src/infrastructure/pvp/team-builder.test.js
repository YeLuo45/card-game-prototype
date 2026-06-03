'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'team-builder.js'), 'utf8'));
var TeamBuilder = window.TeamBuilder;
var TEAM_SIDE = window.TEAM_SIDE;
var ROLE_TYPE = window.ROLE_TYPE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var t = new TeamBuilder();
  assertEq(t.listTeams().length, 0, 'TB: 0 teams');
  var s = t.getSummary();
  assertEq(s.totalTeams, 0, 'TB: 0');
}

function testCreateTeam() {
  var t = new TeamBuilder();
  var c = t.createTeam({ name: 'Alpha', side: 'alpha' });
  assertEq(c.success, true, 'TB: create');
  assertEq(c.team.side, 'alpha', 'TB: side');
  assertEq(c.team.members.length, 0, 'TB: 0 members');
}

function testAddMember() {
  var t = new TeamBuilder();
  var c = t.createTeam({});
  var r = t.addMember(c.teamId, { playerId: 'p1', role: 'tank' });
  assertEq(r.success, true, 'TB: add');
  assertEq(c.team.members.length, 1, 'TB: 1 member');
  assertEq(c.team.members[0].role, 'tank', 'TB: tank');
  // duplicate
  var r2 = t.addMember(c.teamId, { playerId: 'p1' });
  assertEq(r2.error, 'already_member', 'TB: dup');
  // full
  var c2 = t.createTeam({ maxSize: 1 });
  t.addMember(c2.teamId, { playerId: 'p1' });
  var r3 = t.addMember(c2.teamId, { playerId: 'p2' });
  assertEq(r3.error, 'team_full', 'TB: full');
  // errors
  var r4 = t.addMember('not_found', { playerId: 'p' });
  assertEq(r4.error, 'not_found', 'TB: not found');
  var r5 = t.addMember(c.teamId, null);
  assertEq(r5.error, 'invalid_member', 'TB: null');
  var r6 = t.addMember(c.teamId, {});
  assertEq(r6.error, 'invalid_member', 'TB: no id');
}

function testRemoveMember() {
  var t = new TeamBuilder();
  var c = t.createTeam({});
  t.addMember(c.teamId, { playerId: 'p1' });
  var r = t.removeMember(c.teamId, 'p1');
  assertEq(r.success, true, 'TB: remove');
  assertEq(c.team.members.length, 0, 'TB: 0');
  var r2 = t.removeMember(c.teamId, 'not_in');
  assertEq(r2.error, 'not_in_team', 'TB: not in');
}

function testAssignRole() {
  var t = new TeamBuilder();
  var c = t.createTeam({});
  t.addMember(c.teamId, { playerId: 'p1', role: 'dps' });
  var r = t.assignRole(c.teamId, 'p1', 'healer');
  assertEq(r.success, true, 'TB: assign');
  assertEq(c.team.members[0].role, 'healer', 'TB: healer');
  // not in
  var r2 = t.assignRole(c.teamId, 'not_in', 'tank');
  assertEq(r2.error, 'not_in_team', 'TB: not in');
}

function testAutoBalance() {
  var t = new TeamBuilder();
  var players = [
    { playerId: 'a', rating: 1500 },
    { playerId: 'b', rating: 1200 },
    { playerId: 'c', rating: 1000 },
    { playerId: 'd', rating: 800 }
  ];
  var r = t.autoBalance(players, { teamSize: 2 });
  assertEq(r.success, true, 'TB: balance');
  assertEq(r.teamCount, 2, 'TB: 2 teams');
  assertEq(r.teams[0].members.length, 2, 'TB: 2 each');
  // snake draft: team 0 should have a (1500) and d (800)
  assertEq(r.teams[0].members[0].playerId, 'a', 'TB: a first');
  assertEq(r.teams[1].members[0].playerId, 'b', 'TB: b first');
  // errors
  var r1 = t.autoBalance(null);
  assertEq(r1.error, 'invalid_players', 'TB: null');
  var r2 = t.autoBalance([]);
  assertEq(r2.error, 'no_players', 'TB: empty');
}

function testFormation() {
  var t = new TeamBuilder();
  var c = t.createTeam({ maxSize: 5 });
  var r = t.applyFormation(c.teamId, '1-1-1');
  assertEq(r.success, true, 'TB: 1-1-1');
  assertEq(r.total, 3, 'TB: 3 total');
  // invalid
  var r2 = t.applyFormation(c.teamId, 'a-b-c');
  assertEq(r2.error, 'invalid_formation', 'TB: invalid');
  var r3 = t.applyFormation(c.teamId, '3-3');
  assertEq(r3.error, 'formation_exceeds_max', 'TB: exceeds');
  // 2-2
  var r4 = t.applyFormation(c.teamId, '2-2');
  assertEq(r4.success, true, 'TB: 2-2');
  assertEq(r4.total, 4, 'TB: 4 total');
}

function testGetFormationSlots() {
  var t = new TeamBuilder();
  var c = t.createTeam({ maxSize: 5 });
  t.applyFormation(c.teamId, '2-1-2');
  t.addMember(c.teamId, { playerId: 'p1' });
  t.addMember(c.teamId, { playerId: 'p2' });
  var r = t.getFormationSlots(c.teamId);
  assertEq(r.total, 5, 'TB: 5 slots');
  assertEq(r.slots.length, 5, 'TB: 5 array');
  assertEq(r.slots[0].assigned, 'p1', 'TB: p1 assigned');
  assertEq(r.slots[1].assigned, 'p2', 'TB: p2 assigned');
  assertEq(r.slots[2].assigned, null, 'TB: 2 unassigned');
  // no formation
  var c2 = t.createTeam({});
  var r2 = t.getFormationSlots(c2.teamId);
  assertEq(r2.total, 0, 'TB: 0 no formation');
}

function testCheckRequirements() {
  var t = new TeamBuilder();
  var c = t.createTeam({
    requiredRoles: [{ role: 'tank', count: 1 }, { role: 'healer', count: 1 }]
  });
  t.addMember(c.teamId, { playerId: 'p1', role: 'tank' });
  var r = t.checkRequirements(c.teamId);
  assertEq(r.satisfied, false, 'TB: !satisfied');
  assertEq(r.missing.length, 1, 'TB: 1 missing');
  t.addMember(c.teamId, { playerId: 'p2', role: 'healer' });
  var r2 = t.checkRequirements(c.teamId);
  assertEq(r2.satisfied, true, 'TB: satisfied');
  // errors
  var r3 = t.checkRequirements('not_in');
  assertEq(r3.error, 'not_found', 'TB: not found');
}

function testSetRequiredRoles() {
  var t = new TeamBuilder();
  var c = t.createTeam({});
  var r = t.setRequiredRoles(c.teamId, [{ role: 'tank', count: 2 }]);
  assertEq(r.success, true, 'TB: set');
  assertEq(c.team.requiredRoles.length, 1, 'TB: 1 req');
  // errors
  var r2 = t.setRequiredRoles('not_in', []);
  assertEq(r2.error, 'not_found', 'TB: not found');
  var r3 = t.setRequiredRoles(c.teamId, 'not arr');
  assertEq(r3.error, 'invalid_input', 'TB: invalid');
}

function testTeamStats() {
  var t = new TeamBuilder();
  var c = t.createTeam({});
  t.addMember(c.teamId, { playerId: 'a', role: 'tank', level: 10, rating: 1500 });
  t.addMember(c.teamId, { playerId: 'b', role: 'dps', level: 5, rating: 1000 });
  var s = t.getTeamStats(c.teamId);
  assertEq(s.size, 2, 'TB: 2 size');
  assertEq(s.averageRating, 1250, 'TB: 1250 avg');
  assertEq(s.averageLevel, 7.5, 'TB: 7.5 avg lvl');
  assertEq(s.roleDistribution.tank, 1, 'TB: 1 tank');
  assertEq(s.roleDistribution.dps, 1, 'TB: 1 dps');
}

function testCompareBalance() {
  var t = new TeamBuilder();
  var c1 = t.createTeam({});
  var c2 = t.createTeam({});
  // balanced
  t.addMember(c1.teamId, { playerId: 'a', rating: 1500 });
  t.addMember(c1.teamId, { playerId: 'b', rating: 1300 });
  t.addMember(c2.teamId, { playerId: 'c', rating: 1450 });
  t.addMember(c2.teamId, { playerId: 'd', rating: 1350 });
  var r = t.compareBalance(c1.teamId, c2.teamId);
  assertEq(r.balanced, true, 'TB: balanced');
  assert(r.ratingDiff < 200, 'TB: diff < 200');
  // imbalanced
  t.addMember(c1.teamId, { playerId: 'e', rating: 2000 });  // boost team 1
  var r2 = t.compareBalance(c1.teamId, c2.teamId);
  assertEq(r2.balanced, false, 'TB: imbalanced');
  // not found
  var r3 = t.compareBalance('not_in1', 'not_in2');
  assertEq(r3.error, 'not_found', 'TB: not found');
}

function testListTeams() {
  var t = new TeamBuilder();
  t.createTeam({ side: 'alpha' });
  t.createTeam({ side: 'beta' });
  t.createTeam({ side: 'alpha' });
  var all = t.listTeams();
  assertEq(all.length, 3, 'TB: 3 all');
  var alpha = t.listTeams({ side: 'alpha' });
  assertEq(alpha.length, 2, 'TB: 2 alpha');
}

function testDeleteTeam() {
  var t = new TeamBuilder();
  var c = t.createTeam({});
  var r = t.deleteTeam(c.teamId);
  assertEq(r.success, true, 'TB: delete');
  assertEq(t.getTeam(c.teamId), null, 'TB: gone');
  var r2 = t.deleteTeam('not_in');
  assertEq(r2.error, 'not_found', 'TB: not in');
}

function testMetrics() {
  var t = new TeamBuilder();
  t.createTeam({});
  t.createTeam({});
  t.addMember(Object.keys(t.teams)[0], { playerId: 'p1' });
  t.addMember(Object.keys(t.teams)[1], { playerId: 'p2' });
  var m = t.getMetrics();
  assertEq(m.teamsCreated, 2, 'TB: 2 created');
  assertEq(m.assignments, 2, 'TB: 2 assigned');
}

function testSummary() {
  var t = new TeamBuilder();
  t.createTeam({});
  t.createTeam({});
  var s = t.getSummary();
  assertEq(s.totalTeams, 2, 'TB: 2');
}

function testClear() {
  var t = new TeamBuilder();
  t.createTeam({});
  var c = t.clear();
  assertEq(c.success, true, 'TB: clear');
  assertEq(t.listTeams().length, 0, 'TB: 0');
}

function testConstants() {
  assertEq(TEAM_SIDE.ALPHA, 'alpha', 'TB: SIDE.ALPHA');
  assertEq(ROLE_TYPE.TANK, 'tank', 'TB: ROLE.TANK');
}

testEmpty();
testCreateTeam();
testAddMember();
testRemoveMember();
testAssignRole();
testAutoBalance();
testFormation();
testGetFormationSlots();
testCheckRequirements();
testSetRequiredRoles();
testTeamStats();
testCompareBalance();
testListTeams();
testDeleteTeam();
testMetrics();
testSummary();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
