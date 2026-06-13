'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-query.js'), 'utf8'));
var MemoryQuery = window.MemoryQuery;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var q = new MemoryQuery();
  assertEq(typeof q.execute, 'function', 'Query: init');
  var entries = [
    { id: 'm1', type: 'episodic', level: 5 },
    { id: 'm2', type: 'semantic', level: 8 },
    { id: 'm3', type: 'episodic', level: 3 }
  ];
  var r1 = q.execute(entries, 'type eq episodic');
  assertEq(r1.length, 2, 'Query: type=episodic → 2');
  var r2 = q.execute(entries, 'level gt 4');
  assertEq(r2.length, 2, 'Query: level>4 → 2');
  var r3 = q.execute(entries, 'type in episodic,semantic');
  assertEq(r3.length, 3, 'Query: type in → 3');
  var r4 = q.execute(entries, 'id contains m');
  assertEq(r4.length, 3, 'Query: id contains m → 3');
  // Invalid query
  assertEq(q.execute(entries, 'garbled').length, 0, 'Query: invalid query');
  assertEq(q.execute(entries, null).length, 0, 'Query: null query');
  assertEq(q.execute(null, 'type eq x').length, 0, 'Query: null entries');
  // AND
  var andRes = q.and(entries, [{ field: 'type', op: 'eq', value: 'episodic' }, { field: 'level', op: 'gt', value: '4' }]);
  assertEq(andRes.length, 1, 'Query: AND → 1');
  assertEq(andRes[0].id, 'm1', 'Query: AND top m1');
  // Stats — 4 execute calls above (3 successful + 1 invalid + 1 null = 4 successful records since invalid query returns early and doesn't push)
  q.execute(entries, 'type eq episodic');
  assert(q.getStats().queries >= 4, 'Query: stats queries>=4');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
