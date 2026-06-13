'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-conflict.js'), 'utf8'));
var MemoryConflict = window.MemoryConflict;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var c = new MemoryConflict();
  assertEq(typeof c.resolve, 'function', 'Conflict: init');
  // LWW
  var a = { val: 1, ts: 100 };
  var b = { val: 2, ts: 200 };
  var r1 = c.resolve(a, b);
  assertEq(r1.merged.val, 2, 'Conflict: LWW picked newer');
  // CRDT
  var c2 = new MemoryConflict({ strategy: 'crdt' });
  var x = { a: 1, b: { c: 2 } };
  var y = { a: 1, b: { c: 3, d: 4 } };
  var r2 = c2.resolve(x, y);
  assertEq(r2.merged.a, 1, 'Conflict: CRDT same');
  assertEq(r2.merged.b.c, 2, 'Conflict: CRDT b.c=2 (a wins for equal-key different-value)');
  assertEq(r2.merged.b.d, 4, 'Conflict: CRDT b.d=4 (new field)');
  // MANUAL
  var c3 = new MemoryConflict({ strategy: 'manual' });
  var r3 = c3.resolve({ x: 1 }, { x: 2 });
  assertEq(r3.merged.needsReview, true, 'Conflict: manual needs review');
  // Null
  var r4 = c.resolve(null, { v: 1 });
  assertEq(r4.merged.v, 1, 'Conflict: null a');
  // Stats
  var st = c.getStats();
  assert(st.conflicts > 0, 'Conflict: stats conflicts>0');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
