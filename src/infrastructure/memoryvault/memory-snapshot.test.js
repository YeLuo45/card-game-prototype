'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-snapshot.js'), 'utf8'));
var MemorySnapshot = window.MemorySnapshot;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var s = new MemorySnapshot();
  assertEq(typeof s.capture, 'function', 'Snap: init');
  var s1 = s.capture({ a: 1, b: 2 }, 'v1');
  var s2 = s.capture({ a: 1, b: 3, c: 4 }, 'v2');
  assertEq(s.snapshots.length, 2, 'Snap: 2 snapshots');
  assertEq(s1.label, 'v1', 'Snap: label');
  var r1 = s.restore(s1.id);
  assertEq(r1.a, 1, 'Snap: restore s1.a');
  r1.a = 999;
  var r1b = s.restore(s1.id);
  assertEq(r1b.a, 1, 'Snap: deep copy');
  var d = s.diff(s1.id, s2.id);
  assertEq(d.added.length, 1, 'Snap: diff added=1');
  assertEq(d.changed.length, 1, 'Snap: diff changed=1');
  assertEq(d.removed.length, 0, 'Snap: diff removed=0');
  assertEq(d.added[0], 'c', 'Snap: added c');
  assertEq(s.restore('nonexist'), null, 'Snap: missing=null');
  assertEq(s.diff('a', 'b'), null, 'Snap: diff missing=null');
  var lst = s.list();
  assertEq(lst.length, 2, 'Snap: list length');
  assertEq(lst[0].label, 'v1', 'Snap: list label');
  assertEq(s.delete(s1.id), true, 'Snap: delete');
  assertEq(s.snapshots.length, 1, 'Snap: after delete');
  assertEq(s.delete('nope'), false, 'Snap: delete nonexist');
  var s2x = new MemorySnapshot({ maxSnapshots: 2 });
  s2x.capture({ n: 1 }); s2x.capture({ n: 2 }); s2x.capture({ n: 3 });
  assertEq(s2x.snapshots.length, 2, 'Snap: max enforced');
  var snapNull = s.capture(null, 'null');
  assertEq(typeof snapNull.state, 'object', 'Snap: null capture');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
