'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'leaderboard.js'), 'utf8'));
var Leaderboard = window.Leaderboard;
var PERIOD = window.PERIOD;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() { var l = new Leaderboard(); assertEq(l.getPlayer('x'), null, 'LB: 0'); }
function testGetOrCreate() {
  var l = new Leaderboard();
  var p = l.getOrCreate('p1');
  assertEq(p.rating, 1000, 'LB: 1000');
  // idempotent
  var p2 = l.getOrCreate('p1');
  assertEq(p2.rating, 1000, 'LB: same');
}
function testRecordMatch() {
  var l = new Leaderboard();
  var r = l.recordMatch('p1', 'p2');
  assertEq(r.winner.wins, 1, 'LB: 1 win');
  assertEq(r.loser.losses, 1, 'LB: 1 loss');
  assert(r.winner.rating > 1000, 'LB: winner ELO up');
  assert(r.loser.rating < 1000, 'LB: loser ELO down');
  // streak
  assertEq(r.winner.currentStreak, 1, 'LB: 1 streak');
  // consecutive losses for p2
  l.recordMatch('p1', 'p2');
  assertEq(l.getPlayer('p2').currentStreak, -2, 'LB: -2 streak');
}
function testRecordDraw() {
  var l = new Leaderboard();
  var r = l.recordDraw('p1', 'p2');
  assertEq(r.player1.draws, 1, 'LB: 1 draw');
  assertEq(r.player2.draws, 1, 'LB: 1 draw');
  assertEq(r.player1.rating, 1000, 'LB: 1000 (equal)');
  assertEq(r.player2.rating, 1000, 'LB: 1000 (equal)');
}
function testGetRank() {
  var l = new Leaderboard();
  l.recordMatch('a', 'c');
  l.recordMatch('a', 'b');
  l.recordMatch('a', 'd');
  l.recordMatch('b', 'd');  // d loses 2, others lose 1
  var r = l.getRank('a');
  assertEq(r.rank, 1, 'LB: a rank 1');
  var r2 = l.getRank('d');
  assertEq(r2.rank, 4, 'LB: d rank 4');
  assertEq(l.getRank('unknown'), null, 'LB: null');
}
function testGetTop() {
  var l = new Leaderboard();
  l.recordMatch('a', 'd');
  l.recordMatch('a', 'c');
  l.recordMatch('b', 'e');
  var top = l.getTop(2);
  assertEq(top.length, 2, 'LB: 2 top');
  assertEq(top[0].playerId, 'a', 'LB: a top');
  // all
  var all = l.getTop();
  assertEq(all.length, 5, 'LB: 5 all');
}
function testSetRating() {
  var l = new Leaderboard();
  var r = l.setRating('p1', 1500);
  assertEq(r.success, true, 'LB: set');
  assertEq(l.getPlayer('p1').rating, 1500, 'LB: 1500');
}
function testGetRecent() {
  var l = new Leaderboard();
  l.recordMatch('a', 'b');
  l.recordMatch('a', 'c');
  l.recordMatch('a', 'd');
  var recent = l.getRecent(Date.now() - 60000);
  assertEq(recent[0].playerId, 'a', 'LB: a top recent');
  assertEq(recent[0].recentWins, 3, 'LB: 3 wins');
}
function testStartSeason() {
  var l = new Leaderboard();
  var s = l.startSeason('s1');
  assertEq(s.success, true, 'LB: start season');
  assertEq(l.currentSeason, 's1', 'LB: current');
  // exists
  var s2 = l.startSeason('s1');
  assertEq(s2.error, 'season_exists', 'LB: exists');
}
function testEndSeason() {
  var l = new Leaderboard();
  l.recordMatch('a', 'b');
  l.recordMatch('a', 'c');
  l.startSeason('s1');
  var e = l.endSeason('s1');
  assertEq(e.success, true, 'LB: end');
  // ratings reset
  assertEq(l.getPlayer('a').rating, 1000, 'LB: reset 1000');
  // season stats saved
  assert(l.getPlayer('a').seasonStats.s1, 'LB: season stats');
  // rankings recorded
  assert(e.rankings, 'LB: rankings');
  // not found
  var e2 = l.endSeason('not_in');
  assertEq(e2.error, 'not_found', 'LB: not found');
}
function testGetHistory() {
  var l = new Leaderboard();
  l.recordMatch('a', 'b');
  l.recordMatch('a', 'c');
  l.recordMatch('a', 'd');
  var hist = l.getHistory('a');
  assertEq(hist.length, 3, 'LB: 3 history');
  var hist2 = l.getHistory('a', 2);
  assertEq(hist2.length, 2, 'LB: 2 limited');
}
function testMetrics() {
  var l = new Leaderboard();
  l.recordMatch('a', 'b');
  var m = l.getMetrics();
  assertEq(m.matches, 1, 'LB: 1 match');
  assertEq(m.updates, 2, 'LB: 2 updates');
}
function testSummary() {
  var l = new Leaderboard();
  l.recordMatch('a', 'b');
  l.recordMatch('a', 'c');
  l.recordMatch('b', 'd');
  var s = l.getSummary();
  assertEq(s.totalPlayers, 4, 'LB: 4');
  assertEq(s.top3[0].playerId, 'a', 'LB: a top');
}
function testClear() {
  var l = new Leaderboard();
  l.recordMatch('a', 'b');
  l.clear();
  assertEq(l.getPlayer('a'), null, 'LB: 0 players');
}
function testConstants() { assertEq(PERIOD.DAILY, 'daily', 'LB: DAILY'); }

testEmpty(); testGetOrCreate(); testRecordMatch(); testRecordDraw(); testGetRank(); testGetTop(); testSetRating(); testGetRecent(); testStartSeason(); testEndSeason(); testGetHistory(); testMetrics(); testSummary(); testClear(); testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
