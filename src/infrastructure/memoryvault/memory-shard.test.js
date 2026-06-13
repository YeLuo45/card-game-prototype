'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-shard.js'), 'utf8'));
var MemoryShard = window.MemoryShard;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var s = new MemoryShard({ shardCount: 4 });
  assertEq(typeof s.put, 'function', 'Shard: init');
  assertEq(s.shardCount, 4, 'Shard: 4 shards');
  assertEq(s.strategy, 'hash', 'Shard: default hash');
  // Determinism
  var sid1 = s.route('key1');
  var sid1b = s.route('key1');
  assertEq(sid1, sid1b, 'Shard: route deterministic');
  assert(sid1 >= 0 && sid1 < 4, 'Shard: route in range');
  // Put + get
  s.put('key1', 'v1');
  s.put('key2', 'v2');
  s.put('key3', 'v3');
  assertEq(s.get('key1'), 'v1', 'Shard: get key1');
  assertEq(s.get('key2'), 'v2', 'Shard: get key2');
  assertEq(s.get('nope'), null, 'Shard: missing');
  // Distribution
  var dist = s.getShardDistribution();
  assertEq(dist.length, 4, 'Shard: dist 4 entries');
  var total = dist.reduce(function (s, x) { return s + x.count; }, 0);
  assertEq(total, 3, 'Shard: total 3');
  // Strategy range
  var sr = new MemoryShard({ strategy: 'range' });
  assertEq(sr.route('abc'), sr.route('abc'), 'Shard: range deterministic');
  // Strategy consistent
  var sc = new MemoryShard({ strategy: 'consistent' });
  assertEq(sc.route('x'), sc.route('x'), 'Shard: consistent deterministic');
  // Stats
  var st = s.getStats();
  assertEq(st.total, 3, 'Shard: stats total=3');
  assertEq(st.shardCount, 4, 'Shard: stats shards=4');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
