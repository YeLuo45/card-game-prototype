'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-retention.js'), 'utf8'));
var MemoryRetention = window.MemoryRetention;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var fakeNow = 1000000;
  var r = new MemoryRetention({ archiveAfter: 1000, now: function () { return fakeNow; } });
  assertEq(typeof r.add, 'function', 'Ret: init');
  r.add('a', { x: 1 });
  r.add('b', { x: 2 });
  assertEq(r.active().length, 2, 'Ret: 2 active');
  fakeNow += 500;
  r.sweep();
  assertEq(r.active().length, 2, 'Ret: still 2 (within window)');
  fakeNow += 2000;
  var sw = r.sweep();
  assertEq(sw.archived, 2, 'Ret: 2 archived');
  assertEq(r.active().length, 0, 'Ret: 0 active after sweep');
  assertEq(r.archived.length, 2, 'Ret: 2 in archive');
  // No entries
  var empty = new MemoryRetention();
  assertEq(empty.sweep().archived, 0, 'Ret: empty sweep=0');
  // Stats
  var st = r.getStats();
  assertEq(st.archived, 2, 'Ret: stats archived=2');
  assert(st.windowMs > 0, 'Ret: windowMs set');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
