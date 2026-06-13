'use strict';
var fs = require('fs'), path = require('path');
global.window = global;
// Load all 29 engines
['memory-encoder','memory-storage','memory-retrieval','memory-index','memory-schema',
 'memory-type','memory-relation','memory-snapshot',
 'memory-query','memory-shard','memory-replica','memory-stream','memory-sync','memory-cache','memory-queue',
 'memory-lifecycle','memory-event','memory-watcher','memory-audit','memory-quota','memory-retention',
 'memory-share','memory-consensus','memory-delegate','memory-conflict',
 'memory-learn','memory-reflect','memory-evolve','memory-adapt'
].forEach(function (m) {
  eval(fs.readFileSync(path.join(__dirname, m + '.js'), 'utf8'));
});
eval(fs.readFileSync(path.join(__dirname, 'memory-orchestrator.js'), 'utf8'));
var MemoryOrchestrator = window.MemoryOrchestrator;
var passed = 0, failed = 0;
function assert(c, msg) { if (c) { passed++; } else { failed++; console.log('  FAIL: ' + msg); } }
function assertEq(a, b, msg) { assert(a === b, msg + ' (expected ' + b + ', got ' + a + ')'); }
function assertClose(a, b, eps, msg) { assert(Math.abs(a - b) < eps, msg + ' (expected ~' + b + ', got ' + a + ')'); }

{
  var orch = new MemoryOrchestrator();
  assertEq(typeof orch.mastery, 'function', 'Orchestrator: init');

  // Empty mastery
  var m0 = orch.mastery();
  assertEq(m0.mastery, 0, 'Orchestrator: empty mastery=0');

  // Register some engines
  var e1 = new window.MemoryEncoder();
  e1.encode('hello', 'hash');
  e1.encode('world', 'hash');
  var e2 = new window.MemoryStorage();
  e2.save('a', 1); e2.save('b', 2); e2.save('c', 3);
  var e3 = new window.MemoryIndex();
  e3.add({ id: 'd1', content: 'dragon attack wins battle' });
  e3.add({ id: 'd2', content: 'dragon lore' });
  e3.add({ id: 'd3', content: 'cats are nice' });
  var e4 = new window.MemoryLearn();
  e4.record('m1', 'read'); e4.record('m1', 'read');
  var e5 = new window.MemoryEvent();
  e5.append('create', { id: 'm1' });

  assertEq(orch.register('MemoryEncoder', e1).success, true, 'Orchestrator: register Encoder');
  assertEq(orch.register('MemoryStorage', e2).success, true, 'Orchestrator: register Storage');
  assertEq(orch.register('MemoryIndex', e3).success, true, 'Orchestrator: register Index');
  assertEq(orch.register('MemoryLearn', e4).success, true, 'Orchestrator: register Learn');
  assertEq(orch.register('MemoryEvent', e5).success, true, 'Orchestrator: register Event');

  // Unknown engine
  var r = orch.register('FakeEngine', {});
  assertEq(r.error, 'unknown_engine', 'Orchestrator: unknown engine');

  // Mastery
  var m1 = orch.mastery();
  assert(m1.engineCount === 5, 'Orchestrator: 5 engines');
  assert(m1.mastery > 0, 'Orchestrator: mastery>0');
  assert(m1.density > 0, 'Orchestrator: density>0');
  assert(m1.coherence >= 0 && m1.coherence <= 1, 'Orchestrator: coherence 0-1');
  assert(m1.resonance >= 0, 'Orchestrator: resonance>=0');
  assertEq(typeof m1.topEngine, 'string', 'Orchestrator: topEngine is string');

  // Snapshot
  var snap = orch.snapshot();
  assertEq(snap.engines, 5, 'Orchestrator: snap engines=5');
  assert(snap.values.MemoryEncoder > 0, 'Orchestrator: Encoder value>0');
  assert(snap.values.MemoryStorage > 0, 'Orchestrator: Storage value>0');

  // Adapt
  var ad1 = orch.adapt('low_mastery');
  assertEq(typeof ad1.action, 'string', 'Orchestrator: adapt action');
  assertEq(typeof ad1.mastery.mastery, 'number', 'Orchestrator: mastery in adapt');

  // Add more engines → higher density
  var e6 = new window.MemorySnapshot();
  e6.capture({ v: 1 });
  var e7 = new window.MemoryAudit();
  e7.log('view', 'u1', {});
  orch.register('MemorySnapshot', e6);
  orch.register('MemoryAudit', e7);
  var m2 = orch.mastery();
  assert(m2.engineCount === 7, 'Orchestrator: now 7 engines');

  // Stats
  var st = orch.getStats();
  assertEq(st.registeredEngines, 7, 'Orchestrator: stats engines=7');
  assert(st.snapshotCount > 0, 'Orchestrator: stats snapshots>0');
}
console.log('Passed: ' + passed + '/' + (passed + failed));
if (failed > 0) process.exit(1);
