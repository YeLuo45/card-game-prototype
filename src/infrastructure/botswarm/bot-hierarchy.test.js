'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'bot-hierarchy.js'), 'utf8'));
var BotHierarchy = window.BotHierarchy;
var HIERARCHY_ROLES = window.HIERARCHY_ROLES;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var h = new BotHierarchy();
  assertEq(h.getRole('any'), null, 'BH: no role');
  assertEq(h.getRank('any'), -1, 'BH: -1 rank');
  var s = h.getSummary();
  assertEq(s.totalAssigned, 0, 'BH: 0 assigned');
  var v = h.validate();
  assertEq(v.valid, true, 'BH: empty valid');
}

function testAssign() {
  var h = new BotHierarchy();
  var r = h.assign('a1', 'worker');
  assertEq(r.success, true, 'BH: assign worker');
  assertEq(h.getRole('a1'), 'worker', 'BH: role worker');
  assertEq(h.getRank('a1'), 0, 'BH: rank 0');
  // change role
  var r2 = h.assign('a1', 'scout');
  assertEq(r2.previous, 'worker', 'BH: previous');
  assertEq(h.getRank('a1'), 1, 'BH: rank 1');
  // errors
  var e1 = h.assign(null, 'worker');
  assertEq(e1.error, 'invalid_agent', 'BH: null agent');
  var e2 = h.assign('a1', 'invalid_role');
  assertEq(e2.error, 'invalid_role', 'BH: invalid role');
  // supervisor must be id
  var e3 = h.assign('a2', 'worker', 'worker');
  assertEq(e3.error, 'supervisor_must_be_id', 'BH: sup is role');
}

function testUnassign() {
  var h = new BotHierarchy();
  h.assign('a1', 'worker');
  var r = h.unassign('a1');
  assertEq(r.success, true, 'BH: unassign');
  assertEq(r.previousRole, 'worker', 'BH: prev role');
  assertEq(h.getRole('a1'), null, 'BH: gone');
  var e = h.unassign('not_in');
  assertEq(e.error, 'not_assigned', 'BH: not assigned');
}

function testSupervisor() {
  var h = new BotHierarchy();
  h.assign('queen1', 'queen');
  h.assign('leader1', 'leader', 'queen1');
  h.assign('worker1', 'worker', 'leader1');
  assertEq(h.getSupervisor('worker1'), 'leader1', 'BH: worker sup leader');
  assertEq(h.getSupervisor('leader1'), 'queen1', 'BH: leader sup queen');
  assertEq(h.getSupervisor('queen1'), null, 'BH: queen no sup');
  var subs = h.getSubordinates('leader1');
  assertEq(subs.length, 1, 'BH: leader 1 sub');
  assertEq(subs[0], 'worker1', 'BH: sub worker1');
  var qsubs = h.getSubordinates('queen1');
  assertEq(qsubs.length, 1, 'BH: queen 1 sub');
  // reassign
  h.assign('worker1', 'worker', 'queen1');
  assertEq(h.getSupervisor('worker1'), 'queen1', 'BH: re-assigned');
  var subs2 = h.getSubordinates('leader1');
  assertEq(subs2.length, 0, 'BH: leader 0 sub now');
}

function testChain() {
  var h = new BotHierarchy();
  h.assign('queen1', 'queen');
  h.assign('leader1', 'leader', 'queen1');
  h.assign('tactic1', 'tactic', 'leader1');
  h.assign('worker1', 'worker', 'tactic1');
  var chain = h.getChain('worker1');
  assertEq(chain.length, 3, 'BH: chain 3');
  assertEq(chain[0], 'tactic1', 'BH: chain 0');
  var coc = h.getChainOfCommand('worker1');
  assertEq(coc.length, 4, 'BH: coc 4');
  assertEq(coc[0], 'queen1', 'BH: coc queen first');
  // no chain
  var h2 = new BotHierarchy();
  h2.assign('a1', 'worker');
  var c2 = h2.getChain('a1');
  assertEq(c2.length, 0, 'BH: no chain');
}

function testPromoteDemote() {
  var h = new BotHierarchy();
  h.assign('a1', 'worker');
  h.assign('a2', 'leader');
  var p = h.promote('a1');
  assertEq(p.success, true, 'BH: promote');
  assertEq(p.role, 'scout', 'BH: promoted to scout');
  // cannot promote queen
  h.assign('q1', 'queen');
  var p2 = h.promote('q1');
  assertEq(p2.error, 'already_top', 'BH: top');
  // demote leader
  var d = h.demote('a2');
  assertEq(d.success, true, 'BH: demote');
  assertEq(d.role, 'tactic', 'BH: demoted to tactic');
  // cannot demote worker (a1 is now scout after promote; demote to worker first)
  var dFirst = h.demote('a1');
  assertEq(dFirst.success, true, 'BH: scout->worker');
  assertEq(dFirst.role, 'worker', 'BH: now worker');
  var d2 = h.demote('a1');
  assertEq(d2.error, 'already_bottom', 'BH: bottom');
  // metrics
  var m = h.getMetrics();
  assert(m.promotions >= 1, 'BH: promotions');
  assert(m.demotions >= 1, 'BH: demotions');
}

function testLayer() {
  var h = new BotHierarchy();
  h.assign('w1', 'worker');
  h.assign('w2', 'worker');
  h.assign('s1', 'scout');
  var workers = h.getLayer('worker');
  assertEq(workers.length, 2, 'BH: 2 workers');
  var scouts = h.getLayer('scout');
  assertEq(scouts.length, 1, 'BH: 1 scout');
  var none = h.getLayer('queen');
  assertEq(none.length, 0, 'BH: 0 queen');
  var l0 = h.getLayerByRank(0);
  assertEq(l0.length, 2, 'BH: rank 0 2');
}

function testSubtree() {
  var h = new BotHierarchy();
  h.assign('q', 'queen');
  h.assign('l1', 'leader', 'q');
  h.assign('l2', 'leader', 'q');
  h.assign('w1', 'worker', 'l1');
  h.assign('w2', 'worker', 'l1');
  h.assign('w3', 'worker', 'l2');
  var sub = h.getSubtree('q');
  assertEq(sub.length, 6, 'BH: 6 in subtree');
  var sub1 = h.getSubtree('l1');
  assertEq(sub1.length, 3, 'BH: 3 in l1 subtree');
}

function testValidate() {
  var h = new BotHierarchy();
  // empty valid
  var v1 = h.validate();
  assertEq(v1.valid, true, 'BH: empty valid');
  // normal hierarchy
  h.assign('q', 'queen');
  h.assign('l', 'leader', 'q');
  h.assign('w', 'worker', 'l');
  var v2 = h.validate();
  assertEq(v2.valid, true, 'BH: normal valid');
  // multiple queens
  h.assign('q2', 'queen');
  var v3 = h.validate();
  assertEq(v3.valid, false, 'BH: 2 queens invalid');
  assert(v3.issues.length > 0, 'BH: has issues');
}

function testSnapshot() {
  var h = new BotHierarchy();
  h.assign('a1', 'worker');
  h.assign('a2', 'leader', 'a1');
  var s = h.snapshot();
  assertEq(s.assignments.a1, 'worker', 'BH: snap a1');
  var h2 = new BotHierarchy();
  var r = h2.restore(s);
  assertEq(r.success, true, 'BH: restore');
  assertEq(h2.getRole('a1'), 'worker', 'BH: restored a1');
  // invalid
  var e = h2.restore(null);
  assertEq(e.error, 'invalid_snapshot', 'BH: invalid');
}

function testDistribution() {
  var h = new BotHierarchy();
  h.assign('w1', 'worker');
  h.assign('w2', 'worker');
  h.assign('s1', 'scout');
  h.assign('q1', 'queen');
  var d = h.getDistribution();
  assertEq(d.worker, 2, 'BH: 2 workers');
  assertEq(d.scout, 1, 'BH: 1 scout');
  assertEq(d.queen, 1, 'BH: 1 queen');
  assertEq(d.tactic, 0, 'BH: 0 tactic');
}

function testHistory() {
  var h = new BotHierarchy();
  h.assign('a1', 'worker');
  h.promote('a1');
  h.promote('a1');
  var hist = h.getHistory();
  assert(hist.length >= 2, 'BH: history has entries');
  var limited = h.getHistory(1);
  assertEq(limited.length, 1, 'BH: limited 1');
}

function testClear() {
  var h = new BotHierarchy();
  h.assign('a1', 'worker');
  h.assign('a2', 'leader', 'a1');
  var c = h.clear();
  assertEq(c.success, true, 'BH: clear');
  assertEq(h.getRole('a1'), null, 'BH: gone');
  assertEq(h.getSubordinates('a1').length, 0, 'BH: 0 subs');
}

function testConstants() {
  assertEq(HIERARCHY_ROLES.QUEEN, 'queen', 'BH: QUEEN');
  assertEq(HIERARCHY_ROLES.WORKER, 'worker', 'BH: WORKER');
}

testEmpty();
testAssign();
testUnassign();
testSupervisor();
testChain();
testPromoteDemote();
testLayer();
testSubtree();
testValidate();
testSnapshot();
testDistribution();
testHistory();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
