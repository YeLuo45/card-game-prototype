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
eval(fs.readFileSync(path.join(__dirname, 'meta-game-sync.js'), 'utf8'));
var MetaGameSync = window.MetaGameSync;
var META_TIERS = window.META_TIERS;
var META_SORT_KEYS = window.META_SORT_KEYS;
var FederatedSyncManager = window.FederatedSyncManager;
var InMemoryCloudStore = window.InMemoryCloudStore;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertApprox(a, b, msg) { assert(Math.abs(a - b) <= 0.01, msg + ' (expected ~' + b + ', got ' + a + ')'); }

// =========== MetaGameSync: empty ===========
{
  var mgs = new MetaGameSync();
  assertEq(mgs.version, 0, 'MGS: empty version');
  assertEq(Object.keys(mgs.localStats).length, 0, 'MGS: no stats');
  assertEq(mgs.banlist.length, 0, 'MGS: empty banlist');
  assertEq(mgs.getSummary().localCardCount, 0, 'MGS: summary 0 cards');
}

// =========== MetaGameSync: recordUsage ===========
{
  var mgs = new MetaGameSync();
  var r = mgs.recordUsage('c1', 'win');
  assertEq(r.success, true, 'MGS: record win');
  assertEq(r.uses, 1, 'MGS: uses 1');
  assertApprox(r.winRate, 1, 'MGS: winRate 1');
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c1', 'loss');
  mgs.recordUsage('c1', 'draw');
  var u = mgs.getCardUsage('c1');
  assertEq(u.uses, 4, 'MGS: 4 uses');
  assertEq(u.wins, 2, 'MGS: 2 wins');
  assertEq(u.losses, 1, 'MGS: 1 loss');
  assertEq(u.draws, 1, 'MGS: 1 draw');
  assertApprox(u.winRate, 0.5, 'MGS: wr 0.5');
  var u2 = mgs.getCardUsage('missing');
  assert(u2 === null, 'MGS: missing null');
  // invalid
  var inv1 = mgs.recordUsage('', 'win');
  assertEq(inv1.error, 'invalid_card', 'MGS: invalid card');
  var inv2 = mgs.recordUsage(null, 'win');
  assertEq(inv2.error, 'invalid_card', 'MGS: null card');
}

// =========== MetaGameSync: getTopCards (3 sort modes) ===========
{
  var mgs = new MetaGameSync();
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c2', 'win');
  mgs.recordUsage('c2', 'win');
  mgs.recordUsage('c2', 'loss');
  mgs.recordUsage('c3', 'win');
  mgs.recordUsage('c3', 'loss');
  mgs.recordUsage('c3', 'loss');
  var topUses = mgs.getTopCards(3, 'uses');
  assertEq(topUses[0].cardId, 'c1', 'MGS: top uses c1');
  var topWR = mgs.getTopCards(3, 'winRate');
  assertEq(topWR[0].cardId, 'c1', 'MGS: top wr c1');
  var topPop = mgs.getTopCards(3, 'popularity');
  assertEq(topPop[0].cardId, 'c1', 'MGS: top pop c1');
  // invalid sort falls back to uses
  var topInv = mgs.getTopCards(3, 'invalid');
  assertEq(topInv[0].cardId, 'c1', 'MGS: invalid sort uses');
  // no limit defaults to 10
  var all = mgs.getTopCards();
  assertEq(all.length, 3, 'MGS: all 3');
}

// =========== MetaGameSync: banlist ===========
{
  var mgs = new MetaGameSync();
  var b1 = mgs.banCard('c1', 'too strong');
  assertEq(b1.success, true, 'MGS: ban');
  assertEq(b1.banlistSize, 1, 'MGS: banlist size 1');
  assertEq(mgs.isBanned('c1'), true, 'MGS: c1 banned');
  assertEq(mgs.isBanned('c2'), false, 'MGS: c2 not banned');
  var banlist = mgs.getBanlist();
  assertEq(banlist[0], 'c1', 'MGS: banlist has c1');
  // re-ban
  var b2 = mgs.banCard('c1');
  assertEq(b2.banlistSize, 1, 'MGS: re-ban noop');
  // unban
  var u = mgs.unbanCard('c1');
  assertEq(u.success, true, 'MGS: unban');
  assertEq(mgs.isBanned('c1'), false, 'MGS: c1 not banned');
  // unban not banned
  var u2 = mgs.unbanCard('c1');
  assertEq(u2.error, 'not_banned', 'MGS: not_banned error');
  // invalid ban
  var inv = mgs.banCard('', 'reason');
  assertEq(inv.error, 'invalid_card', 'MGS: invalid ban');
  // patches
  mgs.banCard('c2', 'meta reason');
  var patches = mgs.getPatches();
  assert(patches.length >= 2, 'MGS: patches recorded');
  var lastP = patches[patches.length - 1];
  assertEq(lastP.type, 'ban', 'MGS: last patch type ban');
}

// =========== MetaGameSync: tier list ===========
{
  var mgs = new MetaGameSync();
  var s1 = mgs.setTier('c1', 'S');
  assertEq(s1.success, true, 'MGS: set S');
  mgs.setTier('c2', 'A');
  mgs.setTier('c3', 'B');
  mgs.setTier('c4', 'F');
  var tl = mgs.getTierList();
  assertEq(tl.length, 4, 'MGS: 4 tiers');
  assertEq(tl[0].cardId, 'c1', 'MGS: S first');
  assertEq(tl[3].tier, 'F', 'MGS: F last');
  var sCards = mgs.getCardsByTier('S');
  assertEq(sCards[0], 'c1', 'MGS: S card c1');
  var aCards = mgs.getCardsByTier('A');
  assertEq(aCards[0], 'c2', 'MGS: A card c2');
  var fCards = mgs.getCardsByTier('F');
  assertEq(fCards[0], 'c4', 'MGS: F card c4');
  var invT = mgs.setTier('c1', 'X');
  assertEq(invT.error, 'invalid_tier', 'MGS: invalid tier');
  var invT2 = mgs.getCardsByTier('X');
  assertEq(invT2.error, 'invalid_tier', 'MGS: get invalid tier');
  var empty = mgs.getCardsByTier('D');
  assertEq(empty.length, 0, 'MGS: empty D tier');
  // invalid card
  var invC = mgs.setTier('', 'A');
  assertEq(invC.error, 'invalid_card', 'MGS: invalid card tier');
}

// =========== MetaGameSync: cloud publish/load ===========
{
  var sharedCloud = new InMemoryCloudStore();
  var fsm = new FederatedSyncManager({ cloudStore: sharedCloud });
  var mgs = new MetaGameSync(fsm);
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c2', 'loss');
  mgs.banCard('c3', 'reason');
  mgs.setTier('c1', 'S');
  var pub = mgs.publishToCloud();
  assertEq(pub.success, true, 'MGS: publish');
  assertEq(mgs.version, 1, 'MGS: version 1 after publish');
  // reload from another FSM
  var fsm2 = new FederatedSyncManager({ cloudStore: sharedCloud });
  var mgs2 = new MetaGameSync(fsm2);
  var load = mgs2.loadFromCloud();
  assertEq(load.success, true, 'MGS: load');
  assertEq(mgs2.banlist.length, 1, 'MGS: loaded banlist');
  assertEq(mgs2.tierList['c1'], 'S', 'MGS: loaded tier');
  // no sync
  var mgs3 = new MetaGameSync(null);
  var ns1 = mgs3.publishToCloud();
  assertEq(ns1.error, 'no_sync', 'MGS: no_sync publish');
  var ns2 = mgs3.loadFromCloud();
  assertEq(ns2.error, 'no_sync', 'MGS: no_sync load');
}

// =========== MetaGameSync: mergeWithGlobal ===========
{
  var mgs = new MetaGameSync();
  var globalData = {
    localStats: {
      'c1': { cardId: 'c1', uses: 100, wins: 60, losses: 40, draws: 0 },
      'c2': { cardId: 'c2', uses: 50, wins: 30, losses: 20, draws: 0 }
    }
  };
  var m1 = mgs.mergeWithGlobal(globalData);
  assertEq(m1.success, true, 'MGS: merge success');
  assertEq(mgs.globalStats['c1'].contributors, 1, 'MGS: contributors 1');
  // merge again
  mgs.mergeWithGlobal(globalData);
  assertEq(mgs.globalStats['c1'].contributors, 2, 'MGS: contributors 2');
  assertEq(mgs.globalStats['c1'].uses, 200, 'MGS: uses 200');
  // invalid
  var mE1 = mgs.mergeWithGlobal(null);
  assertEq(mE1.error, 'invalid_global', 'MGS: merge null');
  var mE2 = mgs.mergeWithGlobal('not obj');
  assertEq(mE2.error, 'invalid_global', 'MGS: merge string');
}

// =========== MetaGameSync: getMetaReport ===========
{
  var mgs = new MetaGameSync();
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c1', 'win');
  mgs.recordUsage('c2', 'loss');
  mgs.banCard('c3', 'op');
  mgs.setTier('c1', 'S');
  mgs.setTier('c2', 'B');
  var report = mgs.getMetaReport();
  assertEq(report.totalCardsTracked, 2, 'MGS: 2 cards tracked');
  assertEq(report.totalBanned, 1, 'MGS: 1 banned');
  assertEq(report.tierCounts.S, 1, 'MGS: 1 S tier');
  assertEq(report.tierCounts.B, 1, 'MGS: 1 B tier');
  assert(report.topCardsByUsage.length > 0, 'MGS: top cards exists');
  assert(report.topCardsByWinRate.length > 0, 'MGS: top WR exists');
}

// =========== MetaGameSync: export/import ===========
{
  var mgs = new MetaGameSync();
  mgs.recordUsage('c1', 'win');
  mgs.banCard('c2', 'reason');
  mgs.setTier('c1', 'S');
  var exp = mgs.exportMeta();
  assertEq(typeof exp, 'string', 'MGS: export string');
  var mgs2 = new MetaGameSync();
  var imp = mgs2.importMeta(exp);
  assertEq(imp.success, true, 'MGS: import');
  assertEq(mgs2.banlist[0], 'c2', 'MGS: imported ban');
  // errors
  var e1 = mgs2.importMeta(null);
  assertEq(e1.error, 'invalid_input', 'MGS: import null');
  var e2 = mgs2.importMeta('not json');
  assertEq(e2.error, 'parse_error', 'MGS: import bad json');
  var e3 = mgs2.importMeta('{"format":"other"}');
  assertEq(e3.error, 'unknown_format', 'MGS: import bad format');
}

// =========== MetaGameSync: getPatches with limit ===========
{
  var mgs = new MetaGameSync();
  for (var i = 0; i < 5; i++) mgs.banCard('c' + i, 'r' + i);
  var p1 = mgs.getPatches(3);
  assertEq(p1.length, 3, 'MGS: patches limit 3');
  var p2 = mgs.getPatches();
  assertEq(p2.length, 5, 'MGS: patches all 5');
}

// =========== MetaGameSync: clear ===========
{
  var mgs = new MetaGameSync();
  mgs.recordUsage('c1', 'win');
  mgs.banCard('c2');
  mgs.setTier('c1', 'S');
  var c = mgs.clear();
  assertEq(c.success, true, 'MGS: clear');
  assertEq(Object.keys(mgs.localStats).length, 0, 'MGS: clear stats');
  assertEq(mgs.banlist.length, 0, 'MGS: clear banlist');
  assertEq(mgs.version, 0, 'MGS: clear version');
}

// =========== MetaGameSync: META_TIERS / META_SORT_KEYS ===========
{
  assertEq(META_TIERS.S, 'S', 'MGS: TIERS.S');
  assertEq(META_SORT_KEYS.WIN_RATE, 'winRate', 'MGS: SORT.WIN_RATE');
}

console.log('\n===== Summary =====');
console.log('Passed: ' + passed + '/' + (passed + failed) + ' = ' + (passed * 100 / (passed + failed)).toFixed(1) + '%');
console.log('Threshold 99%: ' + (passed / (passed + failed) >= 0.99 ? 'PASS' : 'FAIL'));
if (failed > 0) process.exit(1);
