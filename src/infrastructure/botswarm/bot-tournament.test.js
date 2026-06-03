'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'bot-tournament.js'), 'utf8'));
var BotTournament = window.BotTournament;
var TOURNAMENT_FORMAT = window.TOURNAMENT_FORMAT;
var TOURNAMENT_STATUS = window.TOURNAMENT_STATUS;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var t = new BotTournament();
  assertEq(t.participantCount(), 0, 'TT: empty');
  assertEq(t.getStatus(), 'pending', 'TT: pending');
}

function testRegister() {
  var t = new BotTournament();
  var r = t.register({ id: 'p1', name: 'Alice' });
  assertEq(r.success, true, 'TT: register p1');
  assertEq(t.participantCount(), 1, 'TT: 1 participant');
  // duplicate
  var r2 = t.register({ id: 'p1' });
  assertEq(r2.error, 'already_registered', 'TT: dup');
  // errors
  var e1 = t.register(null);
  assertEq(e1.error, 'invalid_participant', 'TT: null');
  var e2 = t.register({});
  assertEq(e2.error, 'invalid_participant', 'TT: no id');
  // full
  var t2 = new BotTournament({ maxParticipants: 1 });
  t2.register({ id: 'p1' });
  var r3 = t2.register({ id: 'p2' });
  assertEq(r3.error, 'tournament_full', 'TT: full');
}

function testDeregister() {
  var t = new BotTournament();
  t.register({ id: 'p1' });
  t.register({ id: 'p2' });
  var r = t.deregister('p1');
  assertEq(r.success, true, 'TT: deregister');
  assertEq(t.participantCount(), 1, 'TT: 1 left');
  var e = t.deregister('not_in');
  assertEq(e.error, 'not_found', 'TT: not found');
}

function testStart() {
  var t = new BotTournament();
  t.register({ id: 'p1' });
  var r = t.start();
  assertEq(r.error, 'not_enough_participants', 'TT: < 2');
  t.register({ id: 'p2' });
  t.register({ id: 'p3' });
  t.register({ id: 'p4' });
  var r2 = t.start();
  assertEq(r2.success, true, 'TT: start');
  assertEq(t.getStatus(), 'active', 'TT: active');
  // start again
  var r3 = t.start();
  assertEq(r3.error, 'already_started', 'TT: already started');
}

function testSingleElim() {
  var t = new BotTournament({ format: 'single_elim' });
  for (var i = 1; i <= 4; i++) t.register({ id: 'p' + i });
  var r = t.start();
  assertEq(r.format, 'single_elim', 'TT: single elim');
  assertEq(r.totalRounds, 2, 'TT: 2 rounds');
  // 4 players → 2 first-round matches
  assertEq(t.matches.length, 2, 'TT: 2 matches');
  assertEq(t.rounds.length, 1, 'TT: 1 round array');
  // play first round
  var r1Matches = t.getRound(1);
  for (var j = 0; j < r1Matches.length; j++) {
    t.reportResult(r1Matches[j].matchId, { winner: r1Matches[j].p1 });
  }
  // advance
  var adv = t.advanceRound();
  assertEq(adv.success, true, 'TT: advance');
  // play final
  var finalMatches = t.getRound(2);
  if (finalMatches.length > 0) {
    t.reportResult(finalMatches[0].matchId, { winner: finalMatches[0].p1 });
  }
  var adv2 = t.advanceRound();
  assertEq(adv2.winner !== null, true, 'TT: winner');
}

function testByes() {
  var t = new BotTournament({ format: 'single_elim' });
  for (var i = 1; i <= 3; i++) t.register({ id: 'p' + i });
  t.start();
  // 3 players → 4 bracket, 1 bye
  var r1 = t.getRound(1);
  // find a match with bye
  var byeMatch = null;
  for (var i = 0; i < r1.length; i++) {
    if (!r1[i].p2 || !r1[i].p1) { byeMatch = r1[i]; break; }
  }
  // the bye should have already been recorded
  if (byeMatch) {
    assertEq(byeMatch.status === 'completed' || byeMatch.winner !== null, true, 'TT: bye handled');
  }
}

function testRoundRobin() {
  var t = new BotTournament({ format: 'round_robin' });
  for (var i = 1; i <= 4; i++) t.register({ id: 'p' + i });
  var r = t.start();
  assertEq(r.format, 'round_robin', 'TT: round robin');
  // 4 players → 6 matches (n*(n-1)/2)
  assertEq(t.matches.length, 6, 'TT: 6 matches');
  // play all
  for (var i = 0; i < t.matches.length; i++) {
    t.reportResult(t.matches[i].matchId, { winner: t.matches[i].p1 });
  }
  var adv = t.advanceRound();
  assertEq(adv.success, true, 'TT: RR advance');
  assert(adv.winner !== null, 'TT: RR winner');
  // standings
  var standings = t.getRRStandings();
  assertEq(standings.length, 4, 'TT: 4 standings');
  assert(standings[0].points > 0, 'TT: top has points');
}

function testRoundRobinDraw() {
  var t = new BotTournament({ format: 'round_robin' });
  t.register({ id: 'p1' });
  t.register({ id: 'p2' });
  t.start();
  var m = t.matches[0];
  var r = t.reportResult(m.matchId, { draw: true });
  assertEq(r.success, true, 'TT: draw reported');
  assertEq(m.draw, true, 'TT: draw flag set');
  var standings = t.getRRStandings();
  assertEq(standings[0].draws, 1, 'TT: 1 draw');
}

function testReportResult() {
  var t = new BotTournament({ format: 'single_elim' });
  t.register({ id: 'p1' });
  t.register({ id: 'p2' });
  t.start();
  var m = t.matches[0];
  var r = t.reportResult(m.matchId, { winner: 'p1' });
  assertEq(r.success, true, 'TT: report');
  assertEq(m.winner, 'p1', 'TT: winner p1');
  // already completed
  var r2 = t.reportResult(m.matchId, { winner: 'p2' });
  assertEq(r2.error, 'already_completed', 'TT: dup');
  // not found
  var r3 = t.reportResult('not_found', { winner: 'p1' });
  assertEq(r3.error, 'match_not_found', 'TT: not found');
  // invalid
  var r4 = t.reportResult(m.matchId, null);
  assertEq(r4.error, 'invalid_result', 'TT: invalid');
  var r5 = t.reportResult(m.matchId, {});
  assertEq(r5.error, 'invalid_result', 'TT: empty');
}

function testProgress() {
  var t = new BotTournament({ format: 'single_elim' });
  for (var i = 1; i <= 4; i++) t.register({ id: 'p' + i });
  t.start();
  var p = t.getProgress();
  assertEq(p.total, 2, 'TT: 2 total');
  assertEq(p.completed, 0, 'TT: 0 done');
  t.reportResult(t.matches[0].matchId, { winner: t.matches[0].p1 });
  var p2 = t.getProgress();
  assertEq(p2.completed, 1, 'TT: 1 done');
  assert(p2.percent > 0, 'TT: percent > 0');
}

function testSummary() {
  var t = new BotTournament({ name: 'MyCup' });
  for (var i = 1; i <= 8; i++) t.register({ id: 'p' + i });
  t.start();
  var s = t.getSummary();
  assertEq(s.name, 'MyCup', 'TT: name');
  assertEq(s.format, 'single_elim', 'TT: format');
  assertEq(s.participants, 8, 'TT: 8 participants');
  assertEq(s.matches, 4, 'TT: 4 matches first round');
}

function testAdvanceIncomplete() {
  var t = new BotTournament({ format: 'single_elim' });
  for (var i = 1; i <= 4; i++) t.register({ id: 'p' + i });
  t.start();
  // only complete one match
  t.reportResult(t.matches[0].matchId, { winner: t.matches[0].p1 });
  var r = t.advanceRound();
  assertEq(r.error, 'current_round_incomplete', 'TT: incomplete');
}

function testGetMatch() {
  var t = new BotTournament();
  t.register({ id: 'p1' });
  t.register({ id: 'p2' });
  t.start();
  var m = t.getMatch(t.matches[0].matchId);
  assert(m !== null, 'TT: found');
  var m2 = t.getMatch('not_found');
  assertEq(m2, null, 'TT: not found');
}

function testExportBracket() {
  var t = new BotTournament();
  t.register({ id: 'p1' });
  t.register({ id: 'p2' });
  t.start();
  var exp = t.exportBracket();
  var parsed = JSON.parse(exp);
  assertEq(parsed.participants.length, 2, 'TT: export 2');
  assertEq(parsed.matches.length, 1, 'TT: export 1');
  assertEq(parsed.format, 'single_elim', 'TT: export format');
}

function testListParticipants() {
  var t = new BotTournament();
  t.register({ id: 'p1', name: 'Alice' });
  t.register({ id: 'p2', name: 'Bob' });
  var list = t.listParticipants();
  assertEq(list.length, 2, 'TT: 2 list');
  assertEq(list[0].id, 'p1', 'TT: p1');
}

function testConstants() {
  assertEq(TOURNAMENT_FORMAT.SINGLE_ELIM, 'single_elim', 'TT: FORMAT.SE');
  assertEq(TOURNAMENT_FORMAT.ROUND_ROBIN, 'round_robin', 'TT: FORMAT.RR');
  assertEq(TOURNAMENT_STATUS.PENDING, 'pending', 'TT: STATUS.PENDING');
}

testEmpty();
testRegister();
testDeregister();
testStart();
testSingleElim();
testByes();
testRoundRobin();
testRoundRobinDraw();
testReportResult();
testProgress();
testSummary();
testAdvanceIncomplete();
testGetMatch();
testExportBracket();
testListParticipants();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
