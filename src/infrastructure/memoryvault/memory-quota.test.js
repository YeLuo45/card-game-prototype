'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-quota.js'), 'utf8'));
var MemoryQuota = window.MemoryQuota;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var q = new MemoryQuota({ maxEntries: 3, maxBytes: 1000 });
  assertEq(typeof q.add, 'function', 'Quota: init');
  assertEq(q.add('a', 100).success, true, 'Quota: add a');
  assertEq(q.add('b', 100).success, true, 'Quota: add b');
  assertEq(q.add('c', 100).success, true, 'Quota: add c');
  // Eviction
  assertEq(q.add('d', 100).success, true, 'Quota: add d (evicts a)');
  assertEq(q.entries['a'], undefined, 'Quota: a evicted');
  assertEq(q.evictions, 1, 'Quota: evictions=1');
  // Quota exceeded
  var qb = new MemoryQuota({ maxBytes: 200 });
  qb.add('a', 100);
  qb.add('b', 100);
  var r = qb.add('c', 100);
  assertEq(r.error, 'quota_exceeded', 'Quota: exceeded');
  // No id
  assertEq(q.add(null).error, 'no_id', 'Quota: no_id');
  // Remove
  assertEq(q.remove('b'), true, 'Quota: remove b');
  assertEq(q.entries['b'], undefined, 'Quota: b removed');
  assertEq(q.remove('nope'), false, 'Quota: remove nonexist');
  // Stats
  var st = q.getStats();
  assert(st.bytes > 0, 'Quota: bytes>0');
  assertEq(st.maxEntries, 3, 'Quota: max entries=3');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
