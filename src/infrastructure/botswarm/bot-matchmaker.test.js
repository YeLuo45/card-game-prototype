'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'bot-matchmaker.js'), 'utf8'));
var BotMatchmaker = window.BotMatchmaker;
var MATCH_STRATEGY = window.MATCH_STRATEGY;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var m = new BotMatchmaker();
  assertEq(m.getQueueSize(), 0, 'MM: empty');
  assertEq(m.getActiveMatches().length, 0, 'MM: 0 active');
  assertEq(m.getMatches().length, 0, 'MM: 0 matches');
  var s = m.getStats();
  assertEq(s.queueSize, 0, 'MM: stats 0');
}

function testJoinQueue() {
  var m = new BotMatchmaker();
  var r = m.joinQueue('b1');
  assertEq(r.success, true, 'MM: join b1');
  assertEq(m.getQueueSize(), 1, 'MM: 1 in queue');
  // duplicate
  var r2 = m.joinQueue('b1');
  assertEq(r2.error, 'already_in_queue', 'MM: dup');
  // invalid
  var e1 = m.joinQueue('');
  assertEq(e1.error, 'invalid_bot', 'MM: empty');
  var e2 = m.joinQueue(null);
  assertEq(e2.error, 'invalid_bot', 'MM: null');
  // queue full
  var m2 = new BotMatchmaker({ maxQueueSize: 2 });
  m2.joinQueue('a');
  m2.joinQueue('b');
  var r3 = m2.joinQueue('c');
  assertEq(r3.error, 'queue_full', 'MM: full');
}

function testLeaveQueue() {
  var m = new BotMatchmaker();
  m.joinQueue('b1');
  m.joinQueue('b2');
  var r = m.leaveQueue('b1');
  assertEq(r.success, true, 'MM: leave');
  assertEq(m.getQueueSize(), 1, 'MM: 1 left');
  var e = m.leaveQueue('not_in');
  assertEq(e.error, 'not_in_queue', 'MM: not in queue');
}

function testElo() {
  var m = new BotMatchmaker();
  var e = m.getElo('new_bot');
  assertEq(e, 1000, 'MM: default 1000');
  m.setElo('b1', 1500);
  assertEq(m.getElo('b1'), 1500, 'MM: set 1500');
  // all
  m.setElo('b2', 1200);
  var all = m.getAllElos();
  assertEq(all.b1, 1500, 'MM: all b1');
  assertEq(all.b2, 1200, 'MM: all b2');
  // invalid
  var e2 = m.setElo('b1', 'not num');
  assertEq(e2.error, 'invalid_rating', 'MM: invalid');
}

function testFindMatch() {
  var m = new BotMatchmaker();
  m.setElo('b1', 1000);
  m.setElo('b2', 1100);
  m.setElo('b3', 800);
  m.joinQueue('b1');
  m.joinQueue('b2');
  m.joinQueue('b3');
  // ELO strategy
  var r = m.findMatch('b1', 'elo');
  assertEq(r.success, true, 'MM: find ELO');
  assertEq(r.opponent, 'b2', 'MM: nearest ELO b2');
  assertEq(r.eloDiff, 100, 'MM: diff 100');
  // diverse
  var r2 = m.findMatch('b1', 'diverse');
  assertEq(r2.opponent, 'b3', 'MM: diverse b3');
  // balanced
  var r3 = m.findMatch('b1', 'balanced');
  assertEq(r3.success, true, 'MM: balanced');
  // random
  var r4 = m.findMatch('b1', 'random');
  assert(['b2', 'b3'].indexOf(r4.opponent) !== -1, 'MM: random valid');
  // no opponents
  var m2 = new BotMatchmaker();
  m2.joinQueue('alone');
  var r5 = m2.findMatch('alone');
  assertEq(r5.error, 'no_opponents', 'MM: no opponents');
  // not in queue
  var r6 = m.findMatch('not_in_queue');
  assertEq(r6.error, 'bot_not_in_queue', 'MM: not in queue');
  // invalid strategy
  var r7 = m.findMatch('b1', 'invalid_strat');
  assertEq(r7.error, 'invalid_strategy', 'MM: invalid strat');
}

function testAvoidRematch() {
  var m = new BotMatchmaker({ avoidRematch: true });
  m.setElo('b1', 1000);
  m.setElo('b2', 1000);
  m.setElo('b3', 1000);
  m.joinQueue('b1');
  m.joinQueue('b2');
  m.joinQueue('b3');
  // create and complete b1-b2 match
  var cm = m.createMatch('b1', 'b2');
  m.completeMatch(cm.matchId, { winner: 'b1' });
  // rejoin
  m.joinQueue('b1');
  m.joinQueue('b2');
  m.joinQueue('b3');
  var r = m.findMatch('b1', 'elo');
  // should pick b3 (not b2)
  assertEq(r.opponent, 'b3', 'MM: avoid b2');
  // no valid
  var m2 = new BotMatchmaker({ avoidRematch: true });
  m2.setElo('b1', 1000);
  m2.setElo('b2', 1000);
  m2.joinQueue('b1');
  m2.joinQueue('b2');
  var cm2 = m2.createMatch('b1', 'b2');
  m2.completeMatch(cm2.matchId, { winner: 'b1' });
  m2.joinQueue('b1');
  m2.joinQueue('b2');
  var r2 = m2.findMatch('b1', 'elo');
  assertEq(r2.error, 'no_valid_opponent', 'MM: no valid');
}

function testCreateMatch() {
  var m = new BotMatchmaker();
  m.setElo('b1', 1200);
  m.setElo('b2', 800);
  m.joinQueue('b1');
  m.joinQueue('b2');
  var r = m.createMatch('b1', 'b2');
  assertEq(r.success, true, 'MM: create');
  assertEq(m.getActiveMatches().length, 1, 'MM: 1 active');
  assertEq(m.getQueueSize(), 0, 'MM: queue empty');
  // errors
  var e1 = m.createMatch(null, 'b2');
  assertEq(e1.error, 'invalid_bots', 'MM: null');
  var e2 = m.createMatch('b1', 'b1');
  assertEq(e2.error, 'same_bot', 'MM: same');
}

function testCompleteMatch() {
  var m = new BotMatchmaker();
  m.setElo('b1', 1200);
  m.setElo('b2', 800);
  m.joinQueue('b1');
  m.joinQueue('b2');
  var r = m.createMatch('b1', 'b2');
  var cm = m.completeMatch(r.matchId, { winner: 'b1', score1: 100, score2: 50 });
  assertEq(cm.success, true, 'MM: complete');
  assertEq(m.getActiveMatches().length, 0, 'MM: 0 active');
  assertEq(m.getMatches().length, 1, 'MM: 1 completed');
  // ELO updated
  var b1Elo = m.getElo('b1');
  assert(b1Elo > 1200, 'MM: b1 ELO up: ' + b1Elo);
  // draw
  m.joinQueue('b1');
  m.joinQueue('b2');
  var r2 = m.createMatch('b1', 'b2');
  m.completeMatch(r2.matchId, { draw: true });
  // not found
  var e1 = m.completeMatch('not_found', { winner: 'b1' });
  assertEq(e1.error, 'not_found', 'MM: not found');
}

function testGetBotStats() {
  var m = new BotMatchmaker();
  m.setElo('b1', 1000);
  m.setElo('b2', 1000);
  // 2 wins, 1 loss
  for (var i = 0; i < 3; i++) {
    m.joinQueue('b1');
    m.joinQueue('b2');
    var r = m.createMatch('b1', 'b2');
    var winner = i < 2 ? 'b1' : 'b2';
    m.completeMatch(r.matchId, { winner: winner });
  }
  var s1 = m.getBotStats('b1');
  assertEq(s1.wins, 2, 'MM: b1 2 wins');
  assertEq(s1.losses, 1, 'MM: b1 1 loss');
  assertEq(s1.draws, 0, 'MM: b1 0 draws');
  assertEq(s1.totalMatches, 3, 'MM: b1 3 matches');
  // with draws
  m.joinQueue('b1');
  m.joinQueue('b2');
  var r3 = m.createMatch('b1', 'b2');
  m.completeMatch(r3.matchId, { draw: true });
  var s2 = m.getBotStats('b1');
  assertEq(s2.draws, 1, 'MM: b1 1 draw');
  assertEq(s2.totalMatches, 4, 'MM: b1 4 matches');
}

function testLeaderboard() {
  var m = new BotMatchmaker();
  m.setElo('a', 1500);
  m.setElo('b', 1200);
  m.setElo('c', 1800);
  m.setElo('d', 900);
  var lb = m.getLeaderboard();
  assertEq(lb[0].botId, 'c', 'MM: top c');
  assertEq(lb[1].botId, 'a', 'MM: 2nd a');
  assertEq(lb[2].botId, 'b', 'MM: 3rd b');
  // limited
  var lb2 = m.getLeaderboard(2);
  assertEq(lb2.length, 2, 'MM: 2 limited');
}

function testGetMatches() {
  var m = new BotMatchmaker();
  m.joinQueue('a');
  m.joinQueue('b');
  m.joinQueue('c');
  var r1 = m.createMatch('a', 'b');
  m.completeMatch(r1.matchId, { winner: 'a' });
  m.joinQueue('a');
  m.joinQueue('c');
  var r2 = m.createMatch('a', 'c');
  m.completeMatch(r2.matchId, { winner: 'c' });
  var all = m.getMatches();
  assertEq(all.length, 2, 'MM: 2 matches');
  var aMatches = m.getMatches('a');
  assertEq(aMatches.length, 2, 'MM: a 2 matches');
  var bMatches = m.getMatches('b');
  assertEq(bMatches.length, 1, 'MM: b 1 match');
  var limited = m.getMatches(null, 1);
  assertEq(limited.length, 1, 'MM: limited 1');
}

function testGetActiveMatch() {
  var m = new BotMatchmaker();
  m.joinQueue('a');
  m.joinQueue('b');
  var r = m.createMatch('a', 'b');
  var am = m.getActiveMatch(r.matchId);
  assert(am !== null, 'MM: active match');
  assertEq(am.status, 'active', 'MM: active status');
  var am2 = m.getActiveMatch('not_found');
  assertEq(am2, null, 'MM: null not found');
}

function testStats() {
  var m = new BotMatchmaker();
  m.joinQueue('a');
  m.joinQueue('b');
  var r = m.createMatch('a', 'b');
  m.completeMatch(r.matchId, { winner: 'a' });
  var s = m.getStats();
  assertEq(s.activeMatches, 0, 'MM: 0 active');
  assertEq(s.totalMatches, 1, 'MM: 1 total');
  assertEq(s.ratedBots >= 2, true, 'MM: 2+ rated');
}

function testClear() {
  var m = new BotMatchmaker();
  m.setElo('a', 1500);
  m.joinQueue('a');
  m.joinQueue('b');
  var c = m.clear();
  assertEq(c.success, true, 'MM: clear');
  assertEq(m.getQueueSize(), 0, 'MM: 0 queue');
  assertEq(Object.keys(m.eloRatings).length, 0, 'MM: 0 ratings');
  assertEq(m.matchCounter, 0, 'MM: 0 counter');
}

function testConstants() {
  assertEq(MATCH_STRATEGY.ELO, 'elo', 'MM: STRAT.ELO');
  assertEq(MATCH_STRATEGY.RANDOM, 'random', 'MM: STRAT.RANDOM');
}

testEmpty();
testJoinQueue();
testLeaveQueue();
testElo();
testFindMatch();
testAvoidRematch();
testCreateMatch();
testCompleteMatch();
testGetBotStats();
testLeaderboard();
testGetMatches();
testGetActiveMatch();
testStats();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
