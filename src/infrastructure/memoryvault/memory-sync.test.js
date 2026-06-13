'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-sync.js'), 'utf8'));
var MemorySync = window.MemorySync;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var s = new MemorySync();
  assertEq(typeof s.localUpdate, 'function', 'Sync: init');
  var u1 = s.localUpdate('a', 1);
  assertEq(u1.v, 1, 'Sync: v=1');
  // Receive matching
  var r1 = s.receiveRemote({ v: 1, key: 'b', value: 2 });
  assertEq(r1.merged, true, 'Sync: merge');
  assertEq(r1.conflict, false, 'Sync: no conflict');
  // Stale
  var r2 = s.receiveRemote({ v: 0, key: 'x', value: 0 });
  assertEq(r2.skipped, true, 'Sync: stale skipped');
  // Conflict
  var r3 = s.receiveRemote({ v: 10, key: 'c', value: 3 });
  assertEq(r3.conflict, true, 'Sync: conflict detected');
  assertEq(s.conflicts, 1, 'Sync: conflicts=1');
  // Invalid
  var r4 = s.receiveRemote(null);
  assertEq(r4.error, 'invalid_update', 'Sync: invalid');
  // Queue
  s.queue({ v: 2, key: 'q1', value: 1 });
  s.queue({ v: 3, key: 'q2', value: 2 });
  assertEq(s.pending.length, 2, 'Sync: 2 pending');
  var flushed = s.flushPending();
  assertEq(flushed.length, 2, 'Sync: flushed 2');
  assertEq(s.pending.length, 0, 'Sync: pending=0 after flush');
  // Stats
  var st = s.getStats();
  assertEq(st.localVersion, 1, 'Sync: stats localV=1');
  assertEq(st.conflicts, 1, 'Sync: stats conflicts=1');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
