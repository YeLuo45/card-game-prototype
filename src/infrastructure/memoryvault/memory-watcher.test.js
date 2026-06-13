'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-watcher.js'), 'utf8'));
var MemoryWatcher = window.MemoryWatcher;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var w = new MemoryWatcher();
  assertEq(typeof w.watch, 'function', 'Watcher: init');
  var received = [];
  var wid = w.watch('m1', function (v) { received.push(v); });
  assertEq(wid.id, 0, 'Watcher: id=0');
  var fired = w.notify('m1', 'hello');
  assertEq(fired, 1, 'Watcher: fired=1');
  assertEq(received.length, 1, 'Watcher: 1 received');
  assertEq(received[0], 'hello', 'Watcher: hello');
  // Wildcard
  var wAll = [];
  w.watch('*', function (v, k) { wAll.push(k + '=' + v); });
  w.notify('anykey', 'val');
  assertEq(wAll.length, 1, 'Watcher: wildcard fired');
  // No match (no listener for this specific key, but wildcard '*' catches it → 1)
  var fired2 = w.notify('nomatch', 'v');
  assertEq(fired2, 1, 'Watcher: only wildcard fires');
  // Unwatch
  assertEq(w.unwatch(wid.id), true, 'Watcher: unwatch');
  w.notify('m1', 'after');
  assertEq(received.length, 1, 'Watcher: no fire after unwatch');
  assertEq(w.unwatch(99), false, 'Watcher: invalid unwatch');
  // Invalid callback
  var r = w.watch('x', null);
  assertEq(r.error, 'invalid_callback', 'Watcher: invalid callback');
  // Stats
  var st = w.getStats();
  assert(st.watcherCount >= 1, 'Watcher: stats count>=1');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
