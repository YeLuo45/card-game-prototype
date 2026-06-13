'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-cache.js'), 'utf8'));
var MemoryCache = window.MemoryCache;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var c = new MemoryCache();
  assertEq(typeof c.set, 'function', 'Cache: init');
  c.set('a', 1);
  c.set('b', 2);
  assertEq(c.get('a'), 1, 'Cache: get a');
  assertEq(c.get('b'), 2, 'Cache: get b');
  assertEq(c.get('nope'), null, 'Cache: miss null');
  assertEq(c.hits, 2, 'Cache: hits=2');
  assertEq(c.misses, 1, 'Cache: misses=1');
  // LRU eviction
  var c2 = new MemoryCache({ maxSize: 2 });
  c2.set('a', 1);
  c2.set('b', 2);
  c2.set('c', 3);
  assertEq(c2.get('a'), null, 'Cache: LRU evicted a');
  assertEq(c2.get('b'), 2, 'Cache: b still');
  // LFU eviction
  var c3 = new MemoryCache({ maxSize: 2, policy: 'lfu' });
  c3.set('a', 1);
  c3.set('b', 2);
  c3.get('a'); c3.get('a'); c3.get('b');
  c3.set('c', 3); // evicts a or b based on access count
  assertEq(c3.getStats().size, 2, 'Cache: LFU size=2');
  // TTL
  var c4 = new MemoryCache();
  c4.set('x', 'v', 1);
  assertEq(c4.get('x'), 'v', 'Cache: fresh');
  // Invalidate
  assertEq(c4.invalidate('x'), true, 'Cache: invalidate');
  assertEq(c4.get('x'), null, 'Cache: invalidated');
  assertEq(c4.invalidate('nope'), false, 'Cache: invalidate nonexist');
  // Stats
  var st = c.getStats();
  assertEq(st.size, 2, 'Cache: stats size=2');
  assert(st.hitRate > 0, 'Cache: stats hitRate>0');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
