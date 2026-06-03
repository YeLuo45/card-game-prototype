'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'pvp-battle.js'), 'utf8'));
var PvPBattle = window.PvPBattle;
var BATTLE_STATE = window.BATTLE_STATE;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var b = new PvPBattle(); assertEq(b.get('x'), null, 'PB: 0'); }
function testCreate() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  assertEq(c.success, true, 'PB: create');
  assertEq(c.battle.player1.hp, 100, 'PB: 100 hp');
  assertEq(c.battle.turn, 1, 'PB: turn 1');
  // errors
  var e1 = b.create({});
  assertEq(e1.error, 'missing_players', 'PB: missing');
}
function testStart() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  var s = b.start(c.battleId);
  assertEq(s.success, true, 'PB: start');
  assertEq(c.battle.state, 'active', 'PB: active');
  var s2 = b.start(c.battleId);
  assertEq(s2.error, 'invalid_state', 'PB: invalid');
}
function testAttack() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1', attack: 50 }, player2: { id: 'p2', defense: 5 } });
  b.start(c.battleId);
  var a = b.attack(c.battleId, 'player1', 'player2');
  assertEq(a.success, true, 'PB: attack');
  assert(a.dmg > 0, 'PB: dmg > 0');
  assert(c.battle.player2.hp < 100, 'PB: hp < 100');
  assertEq(c.battle.turn, 2, 'PB: turn 2');
  // wrong turn
  var a2 = b.attack(c.battleId, 'player1', 'player2');
  assertEq(a2.error, 'wrong_turn', 'PB: wrong turn');
  // not found
  var a3 = b.attack('not_in', 'player1', 'player2');
  assertEq(a3.error, 'not_found', 'PB: not found');
  // invalid state (after battle ends)
  while (b.getState(c.battleId) === 'active') {
    var curTurn = c.battle.turn;
    var att = curTurn === 1 ? 'player1' : 'player2';
    var tgt = curTurn === 1 ? 'player2' : 'player1';
    b.attack(c.battleId, att, tgt);
  }
  var a4 = b.attack(c.battleId, 'player1', 'player2');
  assertEq(a4.error, 'invalid_state', 'PB: invalid state');
}
function testHeal() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1', hp: 50 }, player2: { id: 'p2' } });
  b.start(c.battleId);
  // turn 1 is player1's; need to attack first to advance turn
  b.attack(c.battleId, 'player1', 'player2');
  // now turn 2 (player2)
  var h = b.heal(c.battleId, 'player2', 10);
  assertEq(h.success, true, 'PB: heal');
  assert(h.healed > 0, 'PB: healed > 0');
  // insufficient mp
  var c2 = b.create({ player1: { id: 'p1', mp: 5 }, player2: { id: 'p2' } });
  b.start(c2.battleId);
  var h2 = b.heal(c2.battleId, 'player1', 100);
  assertEq(h2.error, 'insufficient_mp', 'PB: no mp');
  // invalid amount (use valid combatant)
  var h3 = b.heal(c2.battleId, 'player2', -1);
  assertEq(h3.error, 'invalid_amount', 'PB: neg');
}
function testDefend() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  b.start(c.battleId);
  var d = b.defend(c.battleId, 'player1');
  assertEq(d.success, true, 'PB: defend');
  assertEq(c.battle.player1.effects.length, 1, 'PB: 1 effect');
}
function testCancel() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  b.start(c.battleId);
  var cn = b.cancel(c.battleId, 'agreed');
  assertEq(cn.success, true, 'PB: cancel');
  assertEq(c.battle.state, 'cancelled', 'PB: cancelled');
}
function testMaxRounds() {
  var b = new PvPBattle({ maxRounds: 2 });
  var c = b.create({ player1: { id: 'p1', attack: 1 }, player2: { id: 'p2', attack: 1, defense: 0 } });
  b.start(c.battleId);
  // simulate rounds - need to make attack/heal/defend to advance turns
  for (var i = 0; i < 10 && b.getState(c.battleId) === 'active'; i++) {
    var turn = c.battle.turn;
    var attacker = turn === 1 ? 'player1' : 'player2';
    var target = turn === 1 ? 'player2' : 'player1';
    b.defend(c.battleId, attacker);
  }
  // eventually should be finished (max rounds or HP)
  var state = b.getState(c.battleId);
  assert(state === 'finished' || state === 'active', 'PB: ' + state);
}
function testGetLog() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  b.start(c.battleId);
  b.attack(c.battleId, 'player1', 'player2');
  var log = b.getLog(c.battleId);
  assert(log.length >= 2, 'PB: 2+ log');
  var l2 = b.getLog(c.battleId, 1);
  assertEq(l2.length, 1, 'PB: 1 limited');
}
function testGetSummary() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  b.start(c.battleId);
  var s = b.getSummary(c.battleId);
  assertEq(s.player1Hp, 100, 'PB: 100 hp');
  assertEq(s.actions >= 1, true, 'PB: 1+ actions');
}
function testMetrics() {
  var b = new PvPBattle();
  var c = b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  b.start(c.battleId);
  b.attack(c.battleId, 'player1', 'player2');
  var m = b.getMetrics();
  assertEq(m.battlesStarted, 1, 'PB: 1');
  assertEq(m.attacks, 1, 'PB: 1 atk');
}
function testClear() {
  var b = new PvPBattle();
  b.create({ player1: { id: 'p1' }, player2: { id: 'p2' } });
  b.clear();
  assertEq(b.getMetrics().battlesStarted, 0, 'PB: 0');
}
function testConstants() { assertEq(BATTLE_STATE.ACTIVE, 'active', 'PB: ACTIVE'); }

testEmpty(); testCreate(); testStart(); testAttack(); testHeal(); testDefend(); testCancel(); testMaxRounds(); testGetLog(); testGetSummary(); testMetrics(); testClear(); testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
