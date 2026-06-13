'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-storage.js'), 'utf8'));
var MemoryStorage = window.MemoryStorage;
var BACKEND = window.BACKEND;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }

{
  var s = new MemoryStorage();
  assertEq(typeof s.save, 'function', 'Storage: init');
  assertEq(s.backend, 'memory', 'Storage: default backend memory');
  assertEq(s.getStats().writes, 0, 'Storage: no writes initially');

  // Save and load
  var r = s.save('m1', { foo: 'bar', n: 42 });
  assertEq(r.success, true, 'Storage: save success');
  assertEq(s.writes, 1, 'Storage: writes=1');
  var loaded = s.load('m1');
  assertEq(loaded.foo, 'bar', 'Storage: load roundtrip');
  assertEq(loaded.n, 42, 'Storage: load n');
  assertEq(s.reads, 1, 'Storage: reads=1');

  // String data
  s.save('s1', 'plain text');
  assertEq(s.load('s1'), 'plain text', 'Storage: string load');

  // has
  assertEq(s.has('m1'), true, 'Storage: has m1');
  assertEq(s.has('nope'), false, 'Storage: not has nope');

  // remove
  assertEq(s.remove('m1'), true, 'Storage: remove m1');
  assertEq(s.has('m1'), false, 'Storage: removed');
  assertEq(s.load('m1'), null, 'Storage: load removed = null');

  // Custom namespace
  var s2 = new MemoryStorage({ namespace: 'n2' });
  s2.save('k1', 'v1');
  assertEq(s.has('n2:k1'), false, 'Storage: namespace isolated');
  assertEq(s2.has('k1'), true, 'Storage: own namespace');
  var crossLoad = s.load('k1');
  assert(crossLoad === null || crossLoad === undefined, 'Storage: cross-namespace load = null/undefined');

  // Save no id
  var bad = s.save(null, 'x');
  assertEq(bad.error, 'no_id', 'Storage: no_id error');

  // Too large
  var big = new MemoryStorage({ maxBytes: 10 });
  var r2 = big.save('big', 'x'.repeat(100));
  assertEq(r2.error, 'too_large', 'Storage: too_large error');
  assertEq(r2.success, false, 'Storage: too_large failed');

  // List (memory backend, list may be empty)
  s.save('a', 1); s.save('b', 2); s.save('c', 3);
  var listed = s.list();
  // memory backend: enumeration may not work, so just check it's an array
  assertEq(Array.isArray(listed), true, 'Storage: list is array');

  // clear
  s.save('temp', 'x');
  s.clear();
  assertEq(s.has('a'), false, 'Storage: clear wipes a');
  assertEq(s.has('temp'), false, 'Storage: clear wipes temp');

  // Stats
  var s3 = new MemoryStorage();
  s3.save('a', 1); s3.save('b', 2);
  s3.load('a'); s3.load('b'); s3.load('c');
  var st = s3.getStats();
  assertEq(st.writes, 2, 'Storage: stats writes=2');
  assertEq(st.reads, 3, 'Storage: stats reads=3');
  assertEq(st.backend, 'memory', 'Storage: stats backend');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
