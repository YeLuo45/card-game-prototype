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
eval(fs.readFileSync(path.join(__dirname, 'strategy-profile.js'), 'utf8'));
var StrategyProfile = window.StrategyProfile;
var STRATEGY_ARCHETYPES = window.STRATEGY_ARCHETYPES;
var FederatedSyncManager = window.FederatedSyncManager;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertApprox(a, b, msg) { assert(Math.abs(a - b) <= 0.01, msg + ' (expected ~' + b + ', got ' + a + ')'); }

// =========== StrategyProfile: empty / no sync ===========
{
  var sp = new StrategyProfile();
  assertEq(sp.profile.totalGames, 0, 'SP: empty totalGames');
  assertEq(sp.profile.totalWins, 0, 'SP: empty wins');
  assertEq(Object.keys(sp.profile.decks).length, 0, 'SP: no decks');
  assertEq(sp.profile.archetype, 'unknown', 'SP: unknown archetype');
  var s = sp.getStats();
  assertEq(s.winRate, 0, 'SP: empty winRate');
  assertEq(s.mmr, 1000, 'SP: default mmr');
  assertEq(s.peak, 1000, 'SP: default peak');
}

// =========== StrategyProfile: recordMatch ===========
{
  var sp = new StrategyProfile(null, { playerId: 'p1' });
  var r1 = sp.recordMatch('deckA', 'Aggro Deck', 'win', [{ id: 'c1', name: 'Combo 1' }]);
  assertEq(r1.success, true, 'SP: record win');
  assertEq(r1.totalGames, 1, 'SP: totalGames 1');
  var r2 = sp.recordMatch('deckA', 'Aggro Deck', 'loss', [{ id: 'c1', name: 'Combo 1' }]);
  assertEq(r2.totalGames, 2, 'SP: totalGames 2');
  var r3 = sp.recordMatch('deckB', 'Control', 'draw', []);
  assertEq(r3.totalGames, 3, 'SP: totalGames 3');
  // invalid
  var rInv1 = sp.recordMatch('d', 'd', 'invalid');
  assertEq(rInv1.error, 'invalid_result', 'SP: invalid result');
  var rInv2 = sp.recordMatch(null);
  assertEq(rInv2.error, 'deck_id_required', 'SP: missing deck id');
  // deck stats
  var dA = sp.getDeckStats('deckA');
  assertEq(dA.games, 2, 'SP: deckA games 2');
  assertEq(dA.wins, 1, 'SP: deckA wins 1');
  assertApprox(dA.winRate, 0.5, 'SP: deckA winRate');
  var dB = sp.getDeckStats('deckB');
  assertEq(dB.draws, 1, 'SP: deckB draws 1');
  var dMissing = sp.getDeckStats('missing');
  assert(dMissing === null, 'SP: missing deck null');
  // combos
  var topCombos = sp.getTopCombos(5);
  assertEq(topCombos.length, 1, 'SP: 1 combo');
  assertEq(topCombos[0].id, 'c1', 'SP: combo c1');
  assertEq(topCombos[0].uses, 2, 'SP: combo uses 2');
  assertEq(topCombos[0].wins, 1, 'SP: combo wins 1');
  // top decks
  var topDecks = sp.getTopDecks(2);
  assertEq(topDecks.length, 2, 'SP: 2 decks');
  assertEq(topDecks[0].id, 'deckA', 'SP: top deck is deckA');
  // match log
  var log = sp.getMatchLog();
  assertEq(log.length, 3, 'SP: log 3');
  var log2 = sp.getMatchLog(2);
  assertEq(log2.length, 2, 'SP: log 2 limit');
  var logByDeck = sp.getMatchLogByDeck('deckA');
  assertEq(logByDeck.length, 2, 'SP: log by deck');
  var logByDeck2 = sp.getMatchLogByDeck();
  assertEq(logByDeck2.error, 'deck_id_required', 'SP: log no deck');
  // multiple combos
  sp.recordMatch('deckA', 'Aggro Deck', 'win', [{ id: 'c1', name: 'Combo 1' }, { id: 'c2', name: 'Combo 2' }]);
  var t2 = sp.getTopCombos(5);
  assertEq(t2.length, 2, 'SP: 2 combos now');
}

// =========== StrategyProfile: archetype detection ===========
{
  var sp = new StrategyProfile();
  // < 5 games = unknown
  sp.recordMatch('d1', 'd1', 'win', []);
  assertEq(sp.profile.archetype, 'unknown', 'SP: < 5 games unknown');
  // aggro: high win rate, short games, few combos
  for (var i = 0; i < 5; i++) {
    sp.recordMatch('d1', 'Aggro', 'win', []);
  }
  assertEq(sp.profile.archetype, 'aggro', 'SP: aggro detected (high WR)');
  // combo: many combos + high WR
  var sp2 = new StrategyProfile();
  for (var j = 0; j < 6; j++) {
    var combos = [];
    for (var k = 0; k < 6; k++) combos.push({ id: 'cx' + k, name: 'cx' + k });
    sp2.recordMatch('d1', 'Combo', 'win', combos);
  }
  assertEq(sp2.profile.archetype, 'combo', 'SP: combo detected (many combos)');
  // midrange fallback
  var sp3 = new StrategyProfile();
  for (var m = 0; m < 5; m++) sp3.recordMatch('d1', 'd1', 'loss', [{ id: 'c1' }]);
  assertEq(sp3.profile.archetype, 'midrange', 'SP: midrange fallback');
  // detectArchetype
  var a = sp.detectArchetype();
  assertEq(typeof a.archetype, 'string', 'SP: detectArchetype returns');
}

// =========== StrategyProfile: updateRating (ELO-like) ===========
{
  var sp = new StrategyProfile();
  var r = sp.updateRating('win', 1000);
  assertEq(typeof r.newMmr, 'number', 'SP: rating newMmr');
  assertEq(r.change > 0, true, 'SP: win vs equal opponent +change');
  // win vs much weaker = small change
  var r2 = sp.updateRating('win', 200);
  assertEq(r2.change < 16, true, 'SP: weak opponent small change');
  // loss to equal = negative
  sp.profile.rating.mmr = 1000;
  var r3 = sp.updateRating('loss', 1000);
  assertEq(r3.change < 0, true, 'SP: loss negative');
  // draw = 0
  sp.profile.rating.mmr = 1000;
  var r4 = sp.updateRating('draw', 1000);
  assertEq(r4.change, 0, 'SP: draw zero change');
  // peak tracked
  sp.profile.rating.peak = 1500;
  var r5 = sp.updateRating('loss', 500);
  assertEq(sp.profile.rating.peak, 1500, 'SP: peak not decreased');
  // floor
  sp.profile.rating.mmr = 0;
  var r6 = sp.updateRating('loss', 3000);
  assertEq(sp.profile.rating.mmr, 0, 'SP: rating floor');
  // ceiling
  sp.profile.rating.mmr = 3000;
  var r7 = sp.updateRating('win', 0);
  assertEq(sp.profile.rating.mmr, 3000, 'SP: rating ceiling');
  // missing opponent rating
  var r8 = sp.updateRating('win');
  assertEq(typeof r8.newMmr, 'number', 'SP: rating no opponent');
}

// =========== StrategyProfile: with sync ===========
{
  var sharedCloud = new InMemoryCloudStore();
  var fsm = new FederatedSyncManager({ cloudStore: sharedCloud });
  var sp = new StrategyProfile(fsm, { playerId: 'p1' });
  sp.recordMatch('deckA', 'Deck A', 'win', [{ id: 'c1' }]);
  sp.syncToCloud();
  assertEq(sharedCloud.exists('strategy_profile'), true, 'SP: synced to shared cloud');
  // simulate another device sharing same cloud
  var fsm2 = new FederatedSyncManager({ cloudStore: sharedCloud });
  var sp2 = new StrategyProfile(fsm2, { playerId: 'p1' });
  var loaded = sp2.loadFromCloud();
  assertEq(loaded.success, true, 'SP: load from cloud');
  assertEq(sp2.profile.totalGames, 1, 'SP: loaded games 1');
  // no sync
  var sp3 = new StrategyProfile(null);
  var noSync = sp3.syncToCloud();
  assertEq(noSync.error, 'no_sync', 'SP: no_sync error');
  var noSync2 = sp3.loadFromCloud();
  assertEq(noSync2.error, 'no_sync', 'SP: no_sync load error');
}

// =========== StrategyProfile: export/import ===========
{
  var sp = new StrategyProfile(null, { playerId: 'p1' });
  sp.recordMatch('d1', 'd1', 'win', [{ id: 'c1' }]);
  var exp = sp.exportProfile();
  assertEq(typeof exp, 'string', 'SP: export string');
  var parsed = JSON.parse(exp);
  assertEq(parsed.format, 'strategy-profile-v1', 'SP: export format');
  assertEq(parsed.profile.totalGames, 1, 'SP: export games');
  var sp2 = new StrategyProfile();
  var imp = sp2.importProfile(exp);
  assertEq(imp.success, true, 'SP: import success');
  assertEq(sp2.profile.totalGames, 1, 'SP: import games');
  // errors
  var e1 = sp2.importProfile(null);
  assertEq(e1.error, 'invalid_input', 'SP: import null');
  var e2 = sp2.importProfile('not json');
  assertEq(e2.error, 'parse_error', 'SP: import bad json');
  var e3 = sp2.importProfile('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'SP: import bad format');
  var e4 = sp2.importProfile('{"format":"strategy-profile-v1"}');
  assertEq(e4.error, 'invalid_profile', 'SP: import no profile');
}

// =========== StrategyProfile: mergeProfiles ===========
{
  var sharedCloud2 = new InMemoryCloudStore();
  var fsmA = new FederatedSyncManager({ cloudStore: sharedCloud2 });
  var sp1 = new StrategyProfile(fsmA, { playerId: 'p1' });
  sp1.recordMatch('d1', 'd1', 'win', [{ id: 'c1' }]);
  sp1.recordMatch('d1', 'd1', 'win', [{ id: 'c1' }]);
  var sp2 = new StrategyProfile(null, { playerId: 'p2' });
  sp2.recordMatch('d2', 'd2', 'loss', [{ id: 'c2' }]);
  var p2Profile = sp2.getProfile();
  var merged = sp1.mergeProfiles(p2Profile);
  assertEq(merged.success, true, 'SP: merge success');
  assertEq(sp1.profile.totalGames, 3, 'SP: merge totalGames');
  assertEq(Object.keys(sp1.profile.decks).length, 2, 'SP: merge 2 decks');
  // errors
  var m1 = sp1.mergeProfiles(null);
  assertEq(m1.error, 'invalid_other', 'SP: merge null');
  var m2 = sp1.mergeProfiles({});
  assertEq(m2.error, 'missing_totalGames', 'SP: merge no totalGames');
}

// =========== StrategyProfile: clear / deleteDeck ===========
{
  var sp = new StrategyProfile(null, { playerId: 'p1' });
  sp.recordMatch('d1', 'd1', 'win', []);
  sp.recordMatch('d2', 'd2', 'loss', []);
  var c = sp.clear();
  assertEq(c.success, true, 'SP: clear');
  assertEq(sp.profile.totalGames, 0, 'SP: clear games');
  sp.recordMatch('d1', 'd1', 'win', []);
  var d = sp.deleteDeck('d1');
  assertEq(d.success, true, 'SP: delete deck');
  var d2 = sp.deleteDeck('missing');
  assertEq(d2.error, 'not_found', 'SP: delete missing');
}

// =========== StrategyProfile: getProfile returns deep copy ===========
{
  var sp = new StrategyProfile(null, { playerId: 'p1' });
  sp.recordMatch('d1', 'd1', 'win', []);
  var p = sp.getProfile();
  p.totalGames = 999;
  assertEq(sp.profile.totalGames, 1, 'SP: getProfile deep copy');
}

// =========== StrategyProfile: STRATEGY_ARCHETYPES constants ===========
{
  assertEq(STRATEGY_ARCHETYPES.AGGRO, 'aggro', 'SP: AGGRO const');
  assertEq(STRATEGY_ARCHETYPES.CONTROL, 'control', 'SP: CONTROL const');
}

console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
