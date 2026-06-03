'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'bot-arena.js'), 'utf8'));
var BotArena = window.BotArena;
var ARENA_STATUS = window.ARENA_STATUS;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var a = new BotArena();
  assertEq(a.getAllGames().length, 0, 'AR: 0 games');
  assertEq(a.getActiveGames().length, 0, 'AR: 0 active');
  var s = a.getStats();
  assertEq(s.gamesPlayed, 0, 'AR: 0 played');
}

function testStartGame() {
  var a = new BotArena();
  var r = a.startGame('b1', 'b2');
  assertEq(r.success, true, 'AR: start game');
  assertEq(r.game.bot1, 'b1', 'AR: bot1');
  assertEq(r.game.bot2, 'b2', 'AR: bot2');
  assertEq(r.game.status, 'running', 'AR: running');
  // current game
  var cur = a.getCurrentGame();
  assert(cur !== null, 'AR: current set');
  // errors
  var e1 = a.startGame(null, 'b2');
  assertEq(e1.error, 'invalid_bots', 'AR: null');
  var e2 = a.startGame('b1', 'b1');
  assertEq(e2.error, 'same_bot', 'AR: same');
  // arena full
  var a2 = new BotArena({ maxGames: 1 });
  a2.startGame('a', 'b');
  var r3 = a2.startGame('c', 'd');
  assertEq(r3.error, 'arena_full', 'AR: full');
}

function testRecordMove() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  var r = a.recordMove(g.gameId, 'b1', 'play_card', { card: 'c1' });
  assertEq(r.success, true, 'AR: move');
  assertEq(r.turn, 1, 'AR: turn 1');
  var r2 = a.recordMove(g.gameId, 'b2', 'attack', { dmg: 5 });
  assertEq(r2.turn, 2, 'AR: turn 2');
  // errors
  var e1 = a.recordMove('not_found', 'b1', 'x');
  assertEq(e1.error, 'not_found', 'AR: not found');
  var e2 = a.recordMove(g.gameId, 'b1', null);
  assertEq(e2.error, 'invalid_action', 'AR: null action');
}

function testMaxTurns() {
  var a = new BotArena({ maxTurnsPerGame: 3 });
  var g = a.startGame('b1', 'b2');
  a.recordMove(g.gameId, 'b1', 'a');
  a.recordMove(g.gameId, 'b2', 'b');
  a.recordMove(g.gameId, 'b1', 'c');
  var r = a.recordMove(g.gameId, 'b2', 'd');
  assertEq(r.error, 'max_turns', 'AR: max turns');
}

function testUpdateState() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  var r = a.updateState(g.gameId, { hp: 100, mp: 50 });
  assertEq(r.success, true, 'AR: state');
  assertEq(r.state.hp, 100, 'AR: hp');
  r = a.updateState(g.gameId, { mp: 30 });
  assertEq(r.state.hp, 100, 'AR: hp preserved');
  assertEq(r.state.mp, 30, 'AR: mp updated');
  // errors
  var e1 = a.updateState('not_found', {});
  assertEq(e1.error, 'not_found', 'AR: not found');
  var e2 = a.updateState(g.gameId, 'str');
  assertEq(e2.error, 'invalid_state', 'AR: invalid');
}

function testEndGame() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  a.recordMove(g.gameId, 'b1', 'attack');
  var r = a.endGame(g.gameId, { winner: 'b1', score1: 100, score2: 50 });
  assertEq(r.success, true, 'AR: end');
  assertEq(r.game.status, 'completed', 'AR: completed');
  assertEq(r.game.winner, 'b1', 'AR: winner b1');
  assert(r.game.duration >= 0, 'AR: duration');
  // current cleared
  assertEq(a.getCurrentGame(), null, 'AR: current cleared');
  // stats updated
  var s = a.getStats();
  assertEq(s.gamesPlayed, 1, 'AR: 1 played');
  assertEq(s.wins.bot1, 1, 'AR: bot1 1 win');
  // already completed
  var e1 = a.endGame(g.gameId, { winner: 'b1' });
  assertEq(e1.error, 'already_completed', 'AR: dup');
  // not found
  var e2 = a.endGame('not_found', {});
  assertEq(e2.error, 'not_found', 'AR: not found');
  // draw
  var g2 = a.startGame('c', 'd');
  a.endGame(g2.gameId, { draw: true });
  var s2 = a.getStats();
  assertEq(s2.wins.draw, 1, 'AR: 1 draw');
}

function testPauseResume() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  var p = a.pauseGame(g.gameId);
  assertEq(p.success, true, 'AR: pause');
  // cannot move while paused
  var m = a.recordMove(g.gameId, 'b1', 'a');
  assertEq(m.error, 'game_not_running', 'AR: paused cant move');
  var r = a.resumeGame(g.gameId);
  assertEq(r.success, true, 'AR: resume');
  var m2 = a.recordMove(g.gameId, 'b1', 'a');
  assertEq(m2.success, true, 'AR: move after resume');
  // errors
  var e1 = a.pauseGame('not_found');
  assertEq(e1.error, 'not_found', 'AR: pause not found');
  var e2 = a.resumeGame('not_found');
  assertEq(e2.error, 'not_found', 'AR: resume not found');
  // double pause (pause again after resume)
  a.pauseGame(g.gameId);
  var e3 = a.pauseGame(g.gameId);
  assertEq(e3.error, 'not_running', 'AR: not running');
  // resume not paused
  a.endGame(g.gameId, { winner: 'b1' });
  var e4 = a.resumeGame(g.gameId);
  assertEq(e4.error, 'not_paused', 'AR: not paused');
}

function testReplay() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  a.updateState(g.gameId, { hp: 100 });
  a.recordMove(g.gameId, 'b1', 'attack', { dmg: 5 });
  a.updateState(g.gameId, { hp: 95 });
  a.recordMove(g.gameId, 'b2', 'heal', { amount: 10 });
  a.updateState(g.gameId, { hp: 105 });
  var r = a.getReplay(g.gameId);
  assertEq(r.totalTurns, 2, 'AR: 2 turns');
  assertEq(r.moves.length, 2, 'AR: 2 moves');
  assertEq(r.stateChanges.length, 3, 'AR: 3 state changes');
  // not found
  var e = a.getReplay('not_found');
  assertEq(e.error, 'not_found', 'AR: not found');
}

function testReplayAt() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  a.updateState(g.gameId, { hp: 100 });
  a.recordMove(g.gameId, 'b1', 'attack');
  a.updateState(g.gameId, { hp: 90 });
  a.recordMove(g.gameId, 'b2', 'heal');
  a.updateState(g.gameId, { hp: 100 });
  var r = a.replayAt(g.gameId, 0);
  assertEq(r.state.hp, 100, 'AR: turn 0 hp 100');
  var r2 = a.replayAt(g.gameId, 1);
  assertEq(r2.state.hp, 90, 'AR: turn 1 hp 90');
  var r3 = a.replayAt(g.gameId, 2);
  assertEq(r3.state.hp, 100, 'AR: turn 2 hp 100');
  // not found
  var e = a.replayAt('not_found', 1);
  assertEq(e.error, 'not_found', 'AR: not found');
}

function testBotStats() {
  var a = new BotArena();
  // b1 wins 2, loses 1
  for (var i = 0; i < 3; i++) {
    var g = a.startGame('b1', 'b2');
    var winner = i < 2 ? 'b1' : 'b2';
    a.endGame(g.gameId, { winner: winner });
  }
  // draw
  var g2 = a.startGame('b1', 'c');
  a.endGame(g2.gameId, { draw: true });
  var s1 = a.getBotStats('b1');
  assertEq(s1.wins, 2, 'AR: b1 2 wins');
  assertEq(s1.losses, 1, 'AR: b1 1 loss');
  assertEq(s1.draws, 1, 'AR: b1 1 draw');
  assertEq(s1.totalGames, 4, 'AR: b1 4 games');
  // unknown bot
  var s2 = a.getBotStats('unknown');
  assertEq(s2.totalGames, 0, 'AR: 0 unknown');
}

function testExportImport() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  a.recordMove(g.gameId, 'b1', 'attack');
  a.endGame(g.gameId, { winner: 'b1' });
  var exp = a.exportGame(g.gameId);
  assertEq(typeof exp, 'string', 'AR: export string');
  var a2 = new BotArena();
  var imp = a2.importGame(exp);
  assertEq(imp.success, true, 'AR: import');
  assertEq(a2.getGame(g.gameId).bot1, 'b1', 'AR: imported');
  // export all
  var expAll = a.exportAll();
  var parsed = JSON.parse(expAll);
  assertEq(parsed.format, 'arena-all-v1', 'AR: export all format');
  // errors
  var e1 = a2.importGame(null);
  assertEq(e1.error, 'invalid_input', 'AR: null import');
  var e2 = a2.importGame('not json');
  assertEq(e2.error, 'parse_error', 'AR: bad json');
  var e3 = a2.importGame('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'AR: bad format');
  // export not found
  var e4 = a.exportGame('not_found');
  assertEq(e4.error, 'not_found', 'AR: export not found');
}

function testGameLog() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  a.recordMove(g.gameId, 'b1', 'attack');
  a.endGame(g.gameId, { winner: 'b1' });
  var log = a.getGameLog();
  assert(log.length >= 3, 'AR: log has entries');
  var types = log.map(function (e) { return e.type; });
  assert(types.indexOf('game_start') !== -1, 'AR: start in log');
  assert(types.indexOf('move') !== -1, 'AR: move in log');
  assert(types.indexOf('game_end') !== -1, 'AR: end in log');
  var limited = a.getGameLog(2);
  assertEq(limited.length, 2, 'AR: limited');
}

function testClearCompleted() {
  var a = new BotArena();
  var g1 = a.startGame('b1', 'b2');
  a.endGame(g1.gameId, { winner: 'b1' });
  var g2 = a.startGame('c', 'd');
  var r = a.clearCompleted();
  assertEq(r.success, true, 'AR: clear');
  assertEq(r.removed, 1, 'AR: 1 removed');
  assertEq(a.getGame(g1.gameId), null, 'AR: g1 gone');
  assert(a.getGame(g2.gameId) !== null, 'AR: g2 kept');
}

function testClear() {
  var a = new BotArena();
  var g = a.startGame('b1', 'b2');
  a.recordMove(g.gameId, 'b1', 'attack');
  var c = a.clear();
  assertEq(c.success, true, 'AR: clear');
  assertEq(a.getAllGames().length, 0, 'AR: 0 games');
  assertEq(a.getStats().gamesPlayed, 0, 'AR: 0 played');
  assertEq(a.getCurrentGame(), null, 'AR: no current');
}

function testGetActiveGames() {
  var a = new BotArena();
  var g1 = a.startGame('b1', 'b2');
  var g2 = a.startGame('c', 'd');
  a.endGame(g1.gameId, { winner: 'b1' });
  var active = a.getActiveGames();
  assertEq(active.length, 1, 'AR: 1 active');
  assertEq(active[0].gameId, g2.gameId, 'AR: g2 active');
}

function testConstants() {
  assertEq(ARENA_STATUS.RUNNING, 'running', 'AR: STATUS.RUNNING');
  assertEq(ARENA_STATUS.COMPLETED, 'completed', 'AR: STATUS.COMPLETED');
}

testEmpty();
testStartGame();
testRecordMove();
testMaxTurns();
testUpdateState();
testEndGame();
testPauseResume();
testReplay();
testReplayAt();
testBotStats();
testExportImport();
testGameLog();
testClearCompleted();
testClear();
testGetActiveGames();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
