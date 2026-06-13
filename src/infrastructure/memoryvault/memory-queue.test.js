'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-queue.js'), 'utf8'));
var MemoryQueue = window.MemoryQueue;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var q = new MemoryQueue();
  assertEq(typeof q.enqueue, 'function', 'Queue: init');
  q.enqueue('a');
  q.enqueue('b');
  q.enqueue('c');
  assertEq(q.size(), 3, 'Queue: size=3');
  assertEq(q.dequeue(), 'a', 'Queue: FIFO dequeue a');
  assertEq(q.dequeue(), 'b', 'Queue: FIFO dequeue b');
  assertEq(q.peek(), 'c', 'Queue: peek c');
  // LIFO
  var ql = new MemoryQueue({ mode: 'lifo' });
  ql.enqueue(1); ql.enqueue(2); ql.enqueue(3);
  assertEq(ql.dequeue(), 3, 'Queue: LIFO dequeue 3');
  assertEq(ql.dequeue(), 2, 'Queue: LIFO dequeue 2');
  // Empty
  assertEq(new MemoryQueue().dequeue(), null, 'Queue: empty dequeue null');
  // Process
  var qp = new MemoryQueue();
  var processed = [];
  qp.enqueue(1); qp.enqueue(2); qp.enqueue(3);
  qp.process(function (x) { processed.push(x * 2); });
  assertEq(processed.length, 3, 'Queue: processed 3');
  assertEq(processed[0], 2, 'Queue: 1*2=2');
  // Process with failure
  var qf = new MemoryQueue();
  qf.enqueue(1); qf.enqueue(2);
  qf.process(function (x) { if (x === 1) throw new Error('fail'); });
  assertEq(qf.failed, 1, 'Queue: failed=1');
  assertEq(qf.processed, 1, 'Queue: processed=1');
  // Stats
  var st = q.getStats();
  assertEq(st.mode, 'fifo', 'Queue: stats mode');
  // Clear
  q.clear();
  assertEq(q.size(), 0, 'Queue: clear');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
