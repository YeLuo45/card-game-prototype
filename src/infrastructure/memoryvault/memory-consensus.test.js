'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
eval(fs.readFileSync(path.join(__dirname, 'memory-consensus.js'), 'utf8'));
var MemoryConsensus = window.MemoryConsensus;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
{
  var c = new MemoryConsensus();
  assertEq(typeof c.addNode, 'function', 'Consensus: init');
  c.addNode('n1'); c.addNode('n2'); c.addNode('n3');
  assertEq(c.nodes.length, 3, 'Consensus: 3 nodes');
  // Election
  var r = c.startElection('n1');
  assertEq(r.elected, true, 'Consensus: n1 elected');
  assertEq(c.getLeader(), 'n1', 'Consensus: leader=n1');
  // Append log
  var lr = c.appendLog({ op: 'set', val: 1 });
  assertEq(lr.success, true, 'Consensus: append success');
  assertEq(c.log.length, 2, 'Consensus: log=2 (election + append)'); // election + append
  // Reject non-leader
  c.phase = 'follower';
  var bad = c.appendLog({ op: 'x' });
  assertEq(bad.error, 'not_leader', 'Consensus: not_leader');
  // Unknown candidate
  var unk = c.startElection('n999');
  assertEq(unk.error, 'unknown_candidate', 'Consensus: unknown candidate');
  // Stats
  var st = c.getStats();
  assertEq(st.nodes, 3, 'Consensus: stats nodes=3');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
