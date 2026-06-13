'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-replica.js'), 'utf8'));
var MemoryReplica = window.MemoryReplica;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var r = new MemoryReplica({ quorum: 2 });
  assertEq(typeof r.addReplica, 'function', 'Replica: init');
  r.addReplica('r1', 'leader');
  r.addReplica('r2', 'follower');
  r.addReplica('r3', 'follower');
  assertEq(r.replicas.length, 3, 'Replica: 3 replicas');
  assertEq(r.getLeader(), 'r1', 'Replica: leader=r1');
  var prop = r.propose({ op: 'set', val: 1 });
  assertEq(prop.version, 1, 'Replica: propose v1');
  assert(prop.quorum, 'Replica: quorum met');
  // Election
  r.electLeader('r2');
  assertEq(r.getLeader(), 'r2', 'Replica: new leader r2');
  // Stats
  var st = r.getStats();
  assertEq(st.leader, 'r2', 'Replica: stats leader=r2');
  assertEq(st.replicaCount, 3, 'Replica: stats count=3');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
