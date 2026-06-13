'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-stream.js'), 'utf8'));
var MemoryStream = window.MemoryStream;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var s = new MemoryStream();
  assertEq(typeof s.subscribe, 'function', 'Stream: init');
  var received = [];
  var sub = s.subscribe(function (e) { received.push(e); });
  assertEq(sub.id, 0, 'Stream: sub id=0');
  s.emit({ type: 'add', val: 1 });
  s.emit({ type: 'add', val: 2 });
  assertEq(received.length, 2, 'Stream: 2 received');
  s.unsubscribe(0);
  s.emit({ type: 'add', val: 3 });
  assertEq(received.length, 2, 'Stream: post-unsubscribe no receive');
  assertEq(s.unsubscribe(99), false, 'Stream: invalid unsubscribe');
  // Backpressure
  var s2 = new MemoryStream({ backpressure: 3 });
  s2.subscribe(function () {});
  for (var i = 0; i < 10; i++) s2.emit({ n: i });
  // Flush
  var flushed = s2.flush();
  assertEq(flushed.length, 3, 'Stream: backpressure kept 3');
  // Invalid subscribe
  var r = s2.subscribe(null);
  assertEq(r.error, 'invalid_subscriber', 'Stream: invalid sub');
  // Stats
  var st = s.getStats();
  assertEq(st.subscribers, 0, 'Stream: stats subscribers=0 (unsubscribed)');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
