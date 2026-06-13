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
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'memory-consolidation.js'), 'utf8'));
var DreamMemoryStore = window.DreamMemoryStore;
var MemoryConsolidator = window.MemoryConsolidator;
var STRATEGY = window.STRATEGY;

var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

// =========== STRATEGY enum ===========
{
  assertEq(STRATEGY.KEEP_FIRST, 'keep_first', 'STRATEGY.KEEP_FIRST');
  assertEq(STRATEGY.KEEP_LAST, 'keep_last', 'STRATEGY.KEEP_LAST');
  assertEq(STRATEGY.KEEP_HIGHEST_IMPORTANCE, 'keep_highest', 'STRATEGY.KEEP_HIGHEST_IMPORTANCE');
  assertEq(STRATEGY.MERGE_CONTENT, 'merge_content', 'STRATEGY.MERGE_CONTENT');
  assertEq(STRATEGY.KEEP_NEWEST, 'keep_newest', 'STRATEGY.KEEP_NEWEST');
}

// =========== Basic ===========
{
  var c = new MemoryConsolidator();
  assertEq(typeof c.consolidations, 'object', 'Consolidator: init consolidations');
  assertEq(c.getConsolidationCount(), 0, 'Consolidator: count 0');
  var s1 = c.consolidate(['x', 'y']);
  assertEq(s1.error, 'no_store', 'Consolidator: no_store');
  var store = new DreamMemoryStore();
  c.setStore(store);
  var bad = c.consolidate(['only']);
  assertEq(bad.error, 'need_min_2', 'Consolidator: need min 2');
}

// =========== Similarity ===========
{
  var c2 = new MemoryConsolidator();
  assertEq(c2._similarity(null, null), 0, 'Sim: null null = 0');
  assertEq(c2._similarity({a:1}, {a:1}), 1.0, 'Sim: identical');
  var s = c2._similarity('hello world', 'hello there');
  assert(s > 0 && s < 1, 'Sim: partial match between 0 and 1');
  var s2 = c2._similarity('foo bar', 'baz qux');
  assertEq(s2, 0, 'Sim: no overlap = 0');
}

// =========== Consolidate ===========
{
  var store = new DreamMemoryStore();
  var c = new MemoryConsolidator({ store: store, strategy: STRATEGY.KEEP_HIGHEST_IMPORTANCE, similarityThreshold: 0.3 });
  var r1 = store.save('episodic', 'L4', 'dragon attack wins battle');
  var r2 = store.save('episodic', 'L4', 'dragon attack wins fight');
  var r3 = store.save('episodic', 'L4', 'completely different content');
  var ids = [r1.id, r2.id, r3.id];
  var result = c.consolidate(ids);
  assertEq(result.success, true, 'Consolidate: success');
  assertEq(result.removed.length, 1, 'Consolidate: 1 removed');
  assertEq(store.size(), 2, 'Consolidate: store size 2');
  assertEq(c.getConsolidationCount(), 1, 'Consolidate: history +1');
}

// =========== Consolidate by layer ===========
{
  var store = new DreamMemoryStore();
  var c = new MemoryConsolidator({ store: store, strategy: STRATEGY.KEEP_FIRST, similarityThreshold: 0.3 });
  store.save('episodic', 'L4', 'apple banana cherry');
  store.save('episodic', 'L4', 'apple banana date');
  store.save('semantic', 'L2', 'apple banana elderberry');
  var result = c.consolidateLayer('L4');
  assertEq(result.success, true, 'Layer consolidate: success');
  assertEq(store.size(), 2, 'Layer consolidate: size 2');
  var result2 = c.consolidateLayer('L3');
  assertEq(result2.error, 'insufficient', 'Layer consolidate: insufficient');
}

// =========== Strategy variations ===========
{
  var store1 = new DreamMemoryStore();
  var c1 = new MemoryConsolidator({ store: store1, strategy: STRATEGY.KEEP_FIRST, similarityThreshold: 0.3 });
  var s1a = store1.save('episodic', 'L4', 'X1 Y1 Z1');
  var s1b = store1.save('episodic', 'L4', 'X1 Y1 Z2');
  var r1 = c1.consolidate([s1a.id, s1b.id]);
  var store2 = new DreamMemoryStore();
  var c2 = new MemoryConsolidator({ store: store2, strategy: STRATEGY.KEEP_LAST, similarityThreshold: 0.3 });
  var s2a = store2.save('episodic', 'L4', 'X1 Y1 Z1');
  var s2b = store2.save('episodic', 'L4', 'X1 Y1 Z2');
  var r2 = c2.consolidate([s2a.id, s2b.id]);
  assertEq(r1.success, true, 'Strategy FIRST: success');
  assertEq(r2.success, true, 'Strategy LAST: success');
}

// =========== Stats ===========
{
  var store = new DreamMemoryStore();
  var c = new MemoryConsolidator({ store: store, similarityThreshold: 0.3 });
  store.save('episodic', 'L4', 'foo bar baz');
  store.save('episodic', 'L4', 'foo bar qux');
  var all = store.listByType('episodic');
  c.consolidate([all[0].id, all[1].id]);
  var stats = c.getStats();
  assertEq(stats.consolidations, 1, 'Stats: consolidations=1');
  assertEq(stats.totalMerged, 1, 'Stats: merged=1');
  assertEq(stats.strategy, 'keep_highest', 'Stats: strategy');
}

console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
