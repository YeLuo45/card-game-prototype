'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
global.localStorage = (function () {
  var store = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
})();
eval(fs.readFileSync(path.join(__dirname, 'sync-manager.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'leaderboard-cloud.js'), 'utf8'));
var LeaderboardCloud = window.LeaderboardCloud;
var LEADERBOARD_WINDOWS = window.LEADERBOARD_WINDOWS;
var LEADERBOARD_REGIONS = window.LEADERBOARD_REGIONS;
var FederatedSyncManager = window.FederatedSyncManager;
var InMemoryCloudStore = window.InMemoryCloudStore;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

function testEmpty() {
  var lb = new LeaderboardCloud();
  assertEq(Object.keys(lb.entries).length, 0, 'LB: empty entries');
  assertEq(lb.submissions.length, 0, 'LB: empty submissions');
  assertEq(lb.currentSeason, 's1', 'LB: default season');
  var stats = lb.getStats();
  assertEq(stats.totalPlayers, 0, 'LB: 0 players');
  assertEq(stats.currentSeason, 's1', 'LB: stats season');
}

function testSubmit() {
  var lb = new LeaderboardCloud();
  var r = lb.submitScore('p1', 'Alice', 1000, 'global');
  assertEq(r.success, true, 'LB: submit success');
  assertEq(r.bestScore, 1000, 'LB: bestScore 1000');
  assertEq(r.rank.rank, 1, 'LB: rank 1');
  // higher score
  lb.submitScore('p2', 'Bob', 1500, 'global');
  var r3 = lb.submitScore('p1', 'Alice', 1200, 'global');
  assertEq(r3.bestScore, 1200, 'LB: best updated');
  // invalid
  var e1 = lb.submitScore('p1', 'Alice', 'not number');
  assertEq(e1.error, 'invalid_score', 'LB: invalid score');
  var e2 = lb.submitScore('p1', 'Alice', -1);
  assertEq(e2.error, 'negative_score', 'LB: negative');
  var e3 = lb.submitScore('p1', 'Alice', 99999999);
  assertEq(e3.error, 'score_too_high', 'LB: too high');
  var e4 = lb.submitScore('', 'Alice', 100);
  assertEq(e4.error, 'invalid_player', 'LB: invalid player');
  var e5 = lb.submitScore('p3', 'C', 100, 'invalid_region');
  assertEq(e5.error, 'invalid_region', 'LB: invalid region');
  // null/undefined score
  var e6 = lb.submitScore('p1', 'A', null);
  assertEq(e6.error, 'invalid_score', 'LB: null score');
  var e7 = lb.submitScore('p1', 'A', NaN);
  assertEq(e7.error, 'invalid_score', 'LB: NaN score');
  // missing name
  var e8 = lb.submitScore('p4', null, 800);
  assertEq(e8.success, true, 'LB: missing name');
  assertEq(e8.rank.rank, 3, 'LB: p4 rank 3');
}

function testGetTop() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  lb.submitScore('p2', 'Bob', 2000);
  lb.submitScore('p3', 'Charlie', 1500);
  lb.submitScore('p4', 'Dave', 800);
  var top = lb.getTopN(3);
  assertEq(top.length, 3, 'LB: top 3');
  assertEq(top[0].playerId, 'p2', 'LB: top1 p2');
  assertEq(top[0].rank, 1, 'LB: rank 1');
  assertEq(top[1].playerId, 'p3', 'LB: top2 p3');
  assertEq(top[2].playerId, 'p1', 'LB: top3 p1');
  // all
  var all = lb.getTopN(10);
  assertEq(all.length, 4, 'LB: all 4');
  // default limit
  var def = lb.getTopN();
  assert(def.length > 0, 'LB: default works');
  // bad limit
  var bad = lb.getTopN(0);
  assert(bad.length > 0, 'LB: bad limit');
  var bad2 = lb.getTopN(-1);
  assert(bad2.length > 0, 'LB: negative limit');
}

function testRank() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  lb.submitScore('p2', 'Bob', 2000);
  lb.submitScore('p3', 'Charlie', 1500);
  var r1 = lb.getPlayerRank('p1');
  assertEq(r1.rank, 3, 'LB: p1 rank 3');
  assertEq(r1.total, 3, 'LB: total 3');
  var r2 = lb.getPlayerRank('p2');
  assertEq(r2.rank, 1, 'LB: p2 rank 1');
  var r3 = lb.getPlayerRank('missing');
  assert(r3 === null, 'LB: missing null');
}

function testTimeWindow() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  lb.submitScore('p2', 'Bob', 2000);
  // all-time
  var all = lb.getTopN(10, 'all_time');
  assertEq(all.length, 2, 'LB: all_time 2');
  // daily (both should be in since just submitted)
  var daily = lb.getTopN(10, 'daily');
  assertEq(daily.length, 2, 'LB: daily 2');
  // weekly
  var weekly = lb.getTopN(10, 'weekly');
  assertEq(weekly.length, 2, 'LB: weekly 2');
  // monthly
  var monthly = lb.getTopN(10, 'monthly');
  assertEq(monthly.length, 2, 'LB: monthly 2');
  // invalid window defaults to all_time
  var inv = lb.getTopN(10, 'invalid');
  assertEq(inv.length, 2, 'LB: invalid window');
  // rank with window
  var r = lb.getPlayerRank('p1', 'daily');
  assert(r !== null, 'LB: rank daily');
}

function testRegion() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000, 'na');
  lb.submitScore('p2', 'Bob', 2000, 'eu');
  lb.submitScore('p3', 'Charlie', 1500, 'global');
  var global = lb.getTopN(10, 'all_time', 'global');
  assertEq(global.length, 3, 'LB: global 3');
  var na = lb.getRegionLeaderboard('na');
  assertEq(na.length, 1, 'LB: na 1');
  assertEq(na[0].playerId, 'p1', 'LB: na p1');
  var eu = lb.getRegionLeaderboard('eu');
  assertEq(eu[0].playerId, 'p2', 'LB: eu p2');
  var sa = lb.getRegionLeaderboard('sa');
  assertEq(sa.length, 0, 'LB: sa empty');
  // invalid region for getRegionLeaderboard
  var inv = lb.getRegionLeaderboard();
  assertEq(inv.error, 'invalid_region', 'LB: invalid region');
}

function testSeason() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  var cur = lb.getCurrentSeason();
  assertEq(cur, 's1', 'LB: current s1');
  var sl = lb.getSeasonLeaderboard('s1');
  assertEq(sl.length, 1, 'LB: s1 lb 1');
  var newS = lb.startNewSeason('s2');
  assertEq(newS.success, true, 'LB: new season');
  assertEq(lb.getCurrentSeason(), 's2', 'LB: current s2');
  lb.submitScore('p2', 'Bob', 2000);
  var s1Lb = lb.getSeasonLeaderboard('s1');
  assertEq(s1Lb.length, 1, 'LB: s1 has 1');
  var s2Lb = lb.getSeasonLeaderboard('s2');
  assertEq(s2Lb.length, 1, 'LB: s2 has 1');
  assertEq(s2Lb[0].playerId, 'p2', 'LB: s2 has p2');
  // seasons list
  var seasons = lb.getSeasons();
  assertEq(seasons.length, 2, 'LB: 2 seasons');
  // errors
  var e1 = lb.startNewSeason('s2');
  assertEq(e1.error, 'season_exists', 'LB: exists');
  var e2 = lb.startNewSeason('');
  assertEq(e2.error, 'invalid_season', 'LB: invalid');
  var e3 = lb.getSeasonLeaderboard('');
  assertEq(e3.error, 'invalid_season', 'LB: get invalid');
}

function testCloudSync() {
  var sharedCloud = new InMemoryCloudStore();
  var fsm = new FederatedSyncManager({ cloudStore: sharedCloud });
  var lb = new LeaderboardCloud(fsm);
  lb.submitScore('p1', 'Alice', 1000);
  lb.submitScore('p2', 'Bob', 2000);
  var pub = lb.publishToCloud();
  assertEq(pub.success, true, 'LB: publish');
  var fsm2 = new FederatedSyncManager({ cloudStore: sharedCloud });
  var lb2 = new LeaderboardCloud(fsm2);
  var load = lb2.loadFromCloud();
  assertEq(load.success, true, 'LB: load');
  assertEq(Object.keys(lb2.entries).length, 2, 'LB: 2 entries loaded');
  // no sync
  var lb3 = new LeaderboardCloud(null);
  var ns1 = lb3.publishToCloud();
  assertEq(ns1.error, 'no_sync', 'LB: no_sync pub');
  var ns2 = lb3.loadFromCloud();
  assertEq(ns2.error, 'no_sync', 'LB: no_sync load');
}

function testMerge() {
  var lb1 = new LeaderboardCloud();
  lb1.submitScore('p1', 'Alice', 1000);
  var lb2 = new LeaderboardCloud();
  lb2.submitScore('p2', 'Bob', 2000);
  var merged = lb1.mergeEntries(lb2.entries);
  assertEq(merged.success, true, 'LB: merge');
  assertEq(merged.added, 1, 'LB: 1 added');
  assertEq(Object.keys(lb1.entries).length, 2, 'LB: 2 total');
  // merge same player: should keep higher bestScore and accumulate totalScore
  lb2.submitScore('p1', 'Alice', 1500);
  lb1.mergeEntries(lb2.entries);
  assertEq(lb1.entries['p1'].bestScore, 1500, 'LB: bestScore updated');
  assertEq(lb1.entries['p1'].totalScore, 2500, 'LB: totalScore accumulated');
  // errors
  var e1 = lb1.mergeEntries(null);
  assertEq(e1.error, 'invalid_other', 'LB: merge null');
  var e2 = lb1.mergeEntries('not obj');
  assertEq(e2.error, 'invalid_other', 'LB: merge str');
}

function testSubmissions() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  lb.submitScore('p1', 'Alice', 1500);
  lb.submitScore('p2', 'Bob', 2000);
  var subs = lb.getSubmissions();
  assertEq(subs.length, 3, 'LB: 3 subs');
  var p1Subs = lb.getSubmissions('p1');
  assertEq(p1Subs.length, 2, 'LB: p1 2 subs');
  var limited = lb.getSubmissions(null, 1);
  assertEq(limited.length, 1, 'LB: limited 1');
}

function testExportImport() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  lb.startNewSeason('s2');
  lb.submitScore('p2', 'Bob', 2000);
  var exp = lb.exportLeaderboard();
  assertEq(typeof exp, 'string', 'LB: export string');
  var parsed = JSON.parse(exp);
  assertEq(parsed.format, 'leaderboard-v1', 'LB: format');
  var lb2 = new LeaderboardCloud();
  var imp = lb2.importLeaderboard(exp);
  assertEq(imp.success, true, 'LB: import');
  assertEq(lb2.currentSeason, 's2', 'LB: imported season');
  // errors
  var e1 = lb2.importLeaderboard(null);
  assertEq(e1.error, 'invalid_input', 'LB: import null');
  var e2 = lb2.importLeaderboard('not json');
  assertEq(e2.error, 'parse_error', 'LB: import bad json');
  var e3 = lb2.importLeaderboard('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'LB: import bad format');
}

function testGetPlayer() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000, 'na');
  var p = lb.getPlayer('p1');
  assertEq(p.playerName, 'Alice', 'LB: player name');
  assertEq(p.bestScore, 1000, 'LB: best 1000');
  assertEq(p.gamesPlayed, 1, 'LB: 1 game');
  var p2 = lb.getPlayer('missing');
  assert(p2 === null, 'LB: missing null');
}

function testClear() {
  var lb = new LeaderboardCloud();
  lb.submitScore('p1', 'Alice', 1000);
  var c = lb.clear();
  assertEq(c.success, true, 'LB: clear');
  assertEq(Object.keys(lb.entries).length, 0, 'LB: clear entries');
}

function testConstants() {
  assertEq(LEADERBOARD_WINDOWS.DAILY, 'daily', 'LB: WINDOWS.DAILY');
  assertEq(LEADERBOARD_REGIONS.GLOBAL, 'global', 'LB: REGIONS.GLOBAL');
}

testEmpty();
testSubmit();
testGetTop();
testRank();
testTimeWindow();
testRegion();
testSeason();
testCloudSync();
testMerge();
testSubmissions();
testExportImport();
testGetPlayer();
testClear();
testConstants();
console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
