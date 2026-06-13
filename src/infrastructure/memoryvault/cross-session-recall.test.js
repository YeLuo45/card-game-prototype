'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'dream-memory-store.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'cross-session-recall.js'), 'utf8'));
var DreamMemoryStore = window.DreamMemoryStore;
var CrossSessionRecall = window.CrossSessionRecall;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var r = new CrossSessionRecall();
  assertEq(typeof r.search, 'function', 'Recall: init');
  assertEq(r.search('x').length, 0, 'Recall: no store = empty');
  var store = new DreamMemoryStore();
  var rec = new CrossSessionRecall(store);
  assertEq(rec.search('').length, 0, 'Recall: empty query');
  assertEq(rec.search(null).length, 0, 'Recall: null query');
  store.save('episodic', 'L4', 'dragon attack wins battle', { sessionId: 's1' });
  store.save('episodic', 'L4', 'dragon attack wins fight', { sessionId: 's1' });
  store.save('episodic', 'L4', 'totally unrelated text', { sessionId: 's2' });
  store.save('semantic', 'L2', 'dragon lore knowledge');
  var results = rec.search('dragon');
  assert(results.length > 0, 'Recall: search dragon');
  assertEq(results.length, 3, 'Recall: 3 matches for dragon');
  assert(results[0].score > 0, 'Recall: top has score');
  var bySess = rec.searchBySession('dragon', 's1');
  assertEq(bySess.length, 2, 'Recall: bySession s1=2');
  var noSess = rec.searchBySession('dragon', 'nonexist');
  assertEq(noSess.length, 0, 'Recall: bySession nonexistent');
  var byType = rec.searchByType('dragon', 'episodic');
  assertEq(byType.length, 2, 'Recall: byType episodic=2');
  var stats = rec.getStats();
  assertEq(stats.maxResults, 20, 'Recall: stats maxResults');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
